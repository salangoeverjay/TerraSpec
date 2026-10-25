<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Http;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Every outgoing HTTP call must be faked, so no test can reach Gemini, OpenAI or Anthropic
        Http::preventStrayRequests();

        // No real AI key either, even one exported in the shell or CI (a test that needs a key sets a fake one)
        config([
            'services.gemini.api_key' => null,
            'services.openai.api_key' => null,
            'services.anthropic.api_key' => null,
        ]);
    }
}
