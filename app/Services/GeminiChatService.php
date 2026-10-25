<?php

namespace App\Services;

/**
 * TerraSpec AI chat and report narratives: builds the grounded prompt, asks Gemini through the
 * client, and ties the answer back to TerraSpec's own records.
 */
class GeminiChatService
{
    public const ALL_MODELS_BUSY_REPLY = GeminiClient::ALL_MODELS_BUSY_REPLY;

    public const BLOCKED_REPLY = 'I can\'t answer that question. Please rephrase it as a question about land use, zoning, hazards, suitability or reforestation in Panabo City.';

    public const TRUNCATED_NOTE = '(This answer was cut short. Ask a narrower question for the full details.)';

    public function __construct(
        private GeminiClient $client,
        private ChatPromptBuilder $prompts,
        private ChatResponseGrounder $grounder,
    ) {}

    /**
     * @param  array<string, mixed>  $context  what the user sees on screen
     * @return array<string, mixed>
     */
    public function reply(string $prompt, array $context = []): array
    {
        $intent = $this->grounder->intent($prompt);

        try {
            $result = $this->client->generate(
                $this->prompts->systemPrompt($prompt),
                $this->prompts->userPrompt($prompt, $context),
                // Room for models that think before answering; the visible answer stays short
                ['temperature' => 0.1, 'topP' => 0.9, 'maxOutputTokens' => 2048],
            );
        } catch (GeminiResponseBlocked) {
            return [
                'answer' => self::BLOCKED_REPLY,
                'model' => null,
                'fallback_used' => false,
                'truncated' => false,
                'recommended_zones' => [],
                'detected_intent' => $intent,
                'extracted_entities' => [],
                'live_calculation' => null,
            ];
        }

        $answer = trim($result['text']);

        return [
            'answer' => $result['truncated'] ? "{$answer}\n\n".self::TRUNCATED_NOTE : $answer,
            'model' => $result['model'],
            'fallback_used' => $result['fallback_used'],
            'truncated' => $result['truncated'],
            'recommended_zones' => $this->grounder->recommendedZones($answer, $prompt, $intent),
            'detected_intent' => $intent,
            'extracted_entities' => $this->grounder->entities($prompt, $answer),
            'live_calculation' => $this->grounder->liveCalculation($prompt),
        ];
    }

    /**
     * Executive summary for a PDF report, or '' when the AI cannot answer (the report then uses its template text).
     *
     * @param  array<string, mixed>  $ctx
     */
    public function generateNarrative(array $ctx): string
    {
        try {
            $result = $this->client->generate(
                ChatPromptBuilder::NARRATIVE_SYSTEM,
                $this->prompts->narrativePrompt($ctx),
                ['temperature' => 0.25, 'maxOutputTokens' => 1024],
            );

            // A cut-off summary would end mid-sentence in an official report
            return $result['truncated'] ? '' : $this->grounder->narrative($result['text']);
        } catch (\Throwable) {
            return '';
        }
    }
}
