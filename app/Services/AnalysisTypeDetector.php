<?php

namespace App\Services;

/**
 * Reads the land use a plain-language question is about. One detector for the chat, its chips and
 * live calculation, and the "/suitability/nlp" endpoint, so they never disagree.
 */
class AnalysisTypeDetector
{
    /**
     * Checked in this exact order; the first match wins. Reforestation goes first so "plant trees" is
     * not read as an industrial "plant", and industrial goes before residential so "warehouse" is not
     * read as "house". Keywords match whole words (plurals allowed), so "restore" is not "store" and
     * "report" is not "port". Tree words are mangrove names only, the species TerraSpec recommends.
     *
     * @var array<string, array<int, string>>
     */
    private const KEYWORDS = [
        'reforestation' => ['tree', 'reforest', 'reforestation', 'forest', 'mangrove', 'species', 'native species',
            'seedling', 'nursery', 'watershed', 'planting', 'plant trees', 'greening',
            'bakawan', 'bakhaw', 'pagatpat', 'api-api', 'nipa'],
        'commercial' => ['grocery', 'store', 'mall', 'market', 'shop', 'retail',
            'restaurant', 'cafe', 'bakery', 'pharmacy', 'clinic',
            'hospital', 'school', 'hotel', 'gasoline', 'hardware', 'commercial', 'business'],
        'industrial' => ['factory', 'warehouse', 'plant', 'industrial', 'industry',
            'manufacturing', 'manufacture', 'storage', 'logistics', 'port'],
        'residential' => ['house', 'subdivision', 'condo', 'housing', 'residential', 'residence', 'resident',
            'apartment', 'home', 'dwelling', 'living', 'neighborhood'],
        'agricultural' => ['farm', 'crop', 'rice', 'banana', 'coconut',
            'agricultural', 'agriculture', 'plantation', 'irrigation', 'harvest'],
    ];

    public function detect(string $question): string
    {
        $text = strtolower($question);

        foreach (self::KEYWORDS as $type => $words) {
            foreach ($words as $word) {
                if (preg_match('/\b'.preg_quote($word, '/').'(s|es)?\b/', $text)) {
                    return $type;
                }
            }
        }

        return 'commercial';
    }
}
