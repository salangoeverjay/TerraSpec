<?php

namespace App\Http\Controllers;

use App\Http\Requests\ChatbotRequest;
use App\Services\GeminiChatService;
use Illuminate\Http\JsonResponse;

class ChatbotController extends Controller
{
    public function __invoke(ChatbotRequest $request, GeminiChatService $geminiChatService): JsonResponse
    {
        return response()->json(
            $geminiChatService->reply(
                $request->validated('prompt'),
                $request->validated('context', []),
            )
        );
    }
}
