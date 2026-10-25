<?php

namespace App\Http\Controllers;

use App\Http\Requests\MapQueryRequest;
use App\Services\GeminiClient;
use App\Services\GeminiResponseBlocked;
use App\Services\MapQueryInterpreterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * POST /api/map/interpret: natural-language question -> validated map filters (Gemini structured output).
 */
class MapQueryController extends Controller
{
    public function __invoke(MapQueryRequest $request, MapQueryInterpreterService $interpreter): JsonResponse
    {
        try {
            return response()->json(['data' => $interpreter->interpret($request->validated('question'))]);
        } catch (GeminiResponseBlocked) {
            return response()->json(['message' => 'The AI could not turn that question into map filters. Try asking about zones, barangays, hazards or a land use.'], 422);
        } catch (RuntimeException $e) {
            Log::warning('Map query interpreter unavailable', ['error' => $e->getMessage()]);

            return response()->json(['message' => GeminiClient::ALL_MODELS_BUSY_REPLY], 503);
        }
    }
}
