<?php

namespace App\Console\Commands;

use App\Services\ChatbotBenchmarkService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Comparative study of language models for the TerraSpec AI assistant: every model gets the same
 * grounded prompt and benchmark questions; answers are scored for accuracy, grounding and scope.
 */
class BenchmarkChatbotModels extends Command
{
    protected $signature = 'chatbot:benchmark
        {--models=gemini-2.5-flash : Comma-separated Gemini API model ids}
        {--questions= : Comma-separated question ids to run (default: all)}
        {--repeat=1 : Times to ask each question}
        {--delay=1 : Seconds to wait between requests}';

    protected $description = 'Benchmark language models on the TerraSpec AI questions (accuracy, grounding, latency, tokens)';

    public function handle(ChatbotBenchmarkService $benchmark): int
    {
        $models = array_filter(array_map('trim', explode(',', (string) $this->option('models'))));
        $repeat = max(1, (int) $this->option('repeat'));
        $delay = max(0, (float) $this->option('delay'));
        $only = array_filter(array_map('trim', explode(',', (string) $this->option('questions'))));
        $questions = array_values(array_filter($benchmark->questions(), fn (array $q) => $only === [] || in_array($q['id'], $only, true)));
        $results = [];

        foreach ($models as $model) {
            $this->info("Model: {$model}");

            foreach ($questions as $question) {
                for ($run = 1; $run <= $repeat; $run++) {
                    $results[] = $this->runOne($benchmark, $model, $question, $run);
                    usleep((int) ($delay * 1_000_000));
                }
            }
        }

        $path = 'benchmarks/chatbot-'.now()->format('Ymd-His').'.json';
        Storage::disk('local')->put($path, json_encode([
            'run_at' => now()->toIso8601String(),
            'models' => $models,
            'repeat' => $repeat,
            'results' => $results,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        $this->newLine();
        $this->table(
            ['Model', 'Passed', 'Accuracy', 'Avg latency (s)', 'Avg input tok', 'Avg output tok', 'Errors'],
            collect($results)->groupBy('model')->map(fn ($rows, $model) => [
                $model,
                $rows->where('pass', true)->count().'/'.$rows->count(),
                round($rows->where('pass', true)->count() / $rows->count() * 100, 1).'%',
                round($rows->whereNull('error')->avg('latency_ms') / 1000, 2),
                (int) $rows->whereNull('error')->avg('input_tokens'),
                (int) $rows->whereNull('error')->avg('output_tokens'),
                $rows->whereNotNull('error')->count(),
            ])->values()->all(),
        );
        $this->info('Saved '.Storage::disk('local')->path($path));

        return self::SUCCESS;
    }

    /**
     * @param  array<string, mixed>  $question
     * @return array<string, mixed>
     */
    private function runOne(ChatbotBenchmarkService $benchmark, string $model, array $question, int $run): array
    {
        $base = ['model' => $model, 'run' => $run, 'id' => $question['id'], 'category' => $question['category'], 'question' => $question['question'], 'expected' => $question['expected']];

        for ($attempt = 1; $attempt <= 4; $attempt++) {
            try {
                $reply = $benchmark->ask($model, $question['question']);
                $score = $benchmark->score($question, $reply['answer']);
                $this->line(sprintf('  %s %-12s %5.1fs', $score['pass'] ? '<fg=green>PASS</>' : '<fg=red>FAIL</>', $question['id'], $reply['latency_ms'] / 1000));

                return [...$base, ...$reply, ...$score, 'error' => null];
            } catch (Throwable $e) {
                // Rate limits and overloads: back off and try again
                if ($attempt < 4 && preg_match('/quota|rate|overloaded|unavailable|429|503|timed out/i', $e->getMessage())) {
                    sleep(15 * $attempt);

                    continue;
                }
                $this->line("  <fg=yellow>ERR</>  {$question['id']} ".mb_strimwidth($e->getMessage(), 0, 120, '…'));

                return [...$base, 'answer' => '', 'pass' => false, 'error' => $e->getMessage()];
            }
        }

        return [...$base, 'answer' => '', 'pass' => false, 'error' => 'No response'];
    }
}
