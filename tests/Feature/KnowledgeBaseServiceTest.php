<?php

use App\Services\KnowledgeBaseService;
use Illuminate\Support\Facades\File;

beforeEach(function () {
    $this->dir = storage_path('framework/testing/knowledge-'.uniqid());
    File::ensureDirectoryExists($this->dir.'/ordinance');
    File::put($this->dir.'/clup.md', "# CLUP notes\n- Urbanizable land: 1,467.97 ha. [CLUP p.144]");
    File::put($this->dir.'/ordinance/README.md', 'Instructions for adding ordinance files.');
});

afterEach(function () {
    File::deleteDirectory($this->dir);
});

it('includes reference notes and reports a missing ordinance', function () {
    $kb = new KnowledgeBaseService($this->dir);

    expect($kb->hasOrdinance())->toBeFalse()
        ->and($kb->build())->toContain('1,467.97 ha')
        ->and($kb->build())->toContain('Not loaded yet')
        ->and($kb->build())->not->toContain('Instructions for adding ordinance files');
});

it('loads official ordinance text when a file is added', function () {
    File::put($this->dir.'/ordinance/zoning-ordinance.md', "# Ordinance No. 1: Zoning Ordinance\n## Section 5. General Commercial Zone\nRetail and offices are allowed.");

    $kb = new KnowledgeBaseService($this->dir);

    expect($kb->hasOrdinance())->toBeTrue()
        ->and($kb->build())->toContain('OFFICIAL ORDINANCE: zoning-ordinance.md')
        ->and($kb->build())->toContain('Section 5. General Commercial Zone');
});

it('picks the sections matching the question when the ordinance is too long', function () {
    $filler = str_repeat('Lorem ipsum dolor sit amet. ', 2500);
    $text = "# Ordinance No. 1: Zoning Ordinance\n";
    foreach (range(1, 4) as $i) {
        $text .= "## Section {$i}. Residential Zone rules\n{$filler}\n";
    }
    $text .= "## Section 9. Mangrove Buffer\nNo structures within the mangrove buffer.\n";
    File::put($this->dir.'/ordinance/zoning-ordinance.md', $text);

    $built = (new KnowledgeBaseService($this->dir))->build('Can I build near the mangrove buffer?');

    expect($built)->toContain('Section 9. Mangrove Buffer')
        ->and($built)->toContain('excerpt')
        ->and(mb_strlen($built))->toBeLessThan(mb_strlen($text));
});
