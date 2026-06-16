<?php

namespace App\Scheduling\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PreviewSolveRequest extends FormRequest
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
            // Candidate equity dial to try without persisting it to the schedule;
            // omitted = preview with the schedule's stored lambda.
            'lambda' => ['nullable', 'numeric', 'between:0,1'],
        ];
    }
}
