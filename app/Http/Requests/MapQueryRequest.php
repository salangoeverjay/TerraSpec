<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class MapQueryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'question' => ['required', 'string', 'min:3', 'max:500'],
        ];
    }
}
