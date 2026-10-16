<?php

namespace App\Services;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

/**
 * Documents the AI assistant may answer from: reference notes (resources/knowledge/*.md, e.g. CLUP
 * facts with page numbers) and official ordinance texts (resources/knowledge/ordinance/*.md|txt).
 *
 * Reference notes are always included. Ordinance texts are included in full while they fit the
 * character budget; beyond that, the sections whose words best match the question are chosen.
 */
class KnowledgeBaseService
{
    private const ORDINANCE_BUDGET = 120_000;

    private const STOP_WORDS = ['the', 'and', 'for', 'are', 'what', 'which', 'where', 'with', 'this', 'that', 'can', 'how', 'does', 'from', 'into', 'about', 'there', 'panabo', 'city'];

    public function __construct(private ?string $basePath = null)
    {
        $this->basePath ??= resource_path('knowledge');
    }

    public function hasOrdinance(): bool
    {
        return $this->ordinanceFiles() !== [];
    }

    /**
     * Knowledge text for the system prompt, each document fenced and labelled with its source.
     */
    public function build(string $question = ''): string
    {
        $blocks = [];

        foreach ($this->referenceFiles() as $file) {
            $blocks[] = $this->fence('REFERENCE', basename($file), trim(File::get($file)));
        }

        $ordinance = $this->ordinanceText($question);
        $blocks[] = $ordinance !== ''
            ? $ordinance
            : "=== OFFICIAL ORDINANCE TEXT ===\nNot loaded yet. The Panabo City Zoning Ordinance text has not been added to TerraSpec.";

        return implode("\n\n", $blocks);
    }

    private function ordinanceText(string $question): string
    {
        $docs = array_map(fn (string $file) => ['name' => basename($file), 'text' => trim(File::get($file))], $this->ordinanceFiles());

        if (array_sum(array_map(fn (array $d) => mb_strlen($d['text']), $docs)) <= self::ORDINANCE_BUDGET) {
            return implode("\n\n", array_map(fn (array $d) => $this->fence('OFFICIAL ORDINANCE', $d['name'], $d['text']), $docs));
        }

        // Too long for the prompt: keep the best-matching sections (split on Markdown headings)
        $terms = $this->terms($question);
        $sections = [];
        foreach ($docs as $doc) {
            $title = Str::of($doc['text'])->before("\n")->trim()->toString();
            foreach (preg_split('/^(?=#{1,3} )/m', $doc['text']) as $section) {
                $section = trim($section);
                if ($section === '') {
                    continue;
                }
                $words = $this->terms($section);
                $sections[] = [
                    'name' => $doc['name'],
                    'title' => $title,
                    'text' => $section,
                    'score' => count(array_intersect($terms, $words)),
                ];
            }
        }

        usort($sections, fn (array $a, array $b) => $b['score'] <=> $a['score']);

        $chosen = [];
        $used = 0;
        foreach ($sections as $section) {
            $length = mb_strlen($section['text']);
            if ($used + $length > self::ORDINANCE_BUDGET) {
                continue;
            }
            $chosen[] = $this->fence('OFFICIAL ORDINANCE (excerpt)', "{$section['name']}: {$section['title']}", $section['text']);
            $used += $length;
        }

        return implode("\n\n", $chosen);
    }

    /**
     * @return array<int, string>
     */
    private function referenceFiles(): array
    {
        return $this->files($this->basePath, ['md']);
    }

    /**
     * @return array<int, string>
     */
    private function ordinanceFiles(): array
    {
        return array_values(array_filter(
            $this->files($this->basePath.DIRECTORY_SEPARATOR.'ordinance', ['md', 'txt']),
            fn (string $file) => strtolower(basename($file)) !== 'readme.md',
        ));
    }

    /**
     * @param  array<int, string>  $extensions
     * @return array<int, string>
     */
    private function files(string $directory, array $extensions): array
    {
        if (! File::isDirectory($directory)) {
            return [];
        }

        $files = array_filter(
            File::files($directory),
            fn ($file) => in_array(strtolower($file->getExtension()), $extensions, true),
        );
        $paths = array_map(fn ($file) => $file->getPathname(), $files);
        sort($paths);

        return array_values($paths);
    }

    /**
     * @return array<int, string>
     */
    private function terms(string $text): array
    {
        preg_match_all('/[a-z0-9-]{3,}/', Str::lower(Str::ascii($text)), $matches);

        return array_values(array_unique(array_diff($matches[0], self::STOP_WORDS)));
    }

    private function fence(string $kind, string $name, string $text): string
    {
        return "=== {$kind}: {$name} ===\n{$text}\n=== END {$name} ===";
    }
}
