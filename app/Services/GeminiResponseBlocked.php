<?php

namespace App\Services;

use RuntimeException;

/**
 * Gemini refused to answer this request (safety filter, recitation, blocked prompt). It is about the
 * request, not the model, so no model is put on cooldown and no other model is tried.
 */
class GeminiResponseBlocked extends RuntimeException
{
    public function __construct(public readonly string $reason)
    {
        parent::__construct("Gemini declined to answer ({$reason}).");
    }
}
