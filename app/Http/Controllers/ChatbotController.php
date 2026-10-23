<?php

namespace App\Http\Controllers;

use App\Http\Requests\ChatbotRequest;
use App\Services\GeminiChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class ChatbotController extends Controller
{
    public function __invoke(ChatbotRequest $request, GeminiChatService $geminiChatService): JsonResponse
    {
        try {
            return response()->json(
                $geminiChatService->reply(
                    $request->validated('prompt'),
                    $request->validated('context', []),
                )
            );
        } catch (RuntimeException $e) {
            // Out of quota on every model, or a configuration problem: tell the user plainly
            Log::warning('AI assistant unavailable', ['error' => $e->getMessage()]);

            return response()->json(['message' => GeminiChatService::ALL_MODELS_BUSY_REPLY], 503);
        }
    }
}
