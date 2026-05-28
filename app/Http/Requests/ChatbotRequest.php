<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ChatbotRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'prompt' => ['required', 'string', 'max:2000'],
            'context' => ['sometimes', 'array'],
            'context.selection' => ['sometimes', 'string', 'max:255'],
            'context.suitability' => ['sometimes', 'numeric', 'between:0,100'],
            'context.weights' => ['sometimes', 'array'],
            'context.weights.*' => ['sometimes', 'numeric', 'between:0,1'],
        ];
    }
}
