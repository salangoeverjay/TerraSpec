<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class GenerateReportRequest extends FormRequest
{
    public const TYPES = [
        'Suitability Summary',
        'Environmental Clearance',
        'Zone Compliance Check',
        'Reforestation Plan',
        'Comparative Analysis',
        'Hazard Assessment',
    ];

    public const LAND_USES = ['commercial', 'residential', 'industrial', 'agricultural', 'reforestation'];

    public const SECTIONS = [
        'Executive Summary',
        'MCDA Scores',
        'Zone Compliance',
        'Environmental Flags',
        'Hazard Data',
        'Recommendations',
    ];

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
            'type' => ['required', Rule::in(self::TYPES)],
            'barangay' => ['exclude_if:type,Comparative Analysis', 'required', 'string', 'exists:zone_units,unit_name'],
            'land_use' => ['nullable', Rule::in(self::LAND_USES)],
            'sections' => ['nullable', 'array'],
            'sections.*' => [Rule::in(self::SECTIONS)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'barangay.exists' => 'Choose one of the 40 barangays of Panabo City.',
        ];
    }
}
