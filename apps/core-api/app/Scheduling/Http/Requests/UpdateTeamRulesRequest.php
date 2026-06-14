<?php

namespace App\Scheduling\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTeamRulesRequest extends FormRequest
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
            'min_rest_hours' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'max_hours_per_week' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'max_consecutive_days' => ['sometimes', 'nullable', 'integer', 'min:1'],
        ];
    }
}
