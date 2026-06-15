<?php

namespace App\ShiftTemplates\Http\Requests;

use App\ShiftTemplates\Enums\RecurrenceFrequency;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateShiftTemplateRequest extends FormRequest
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
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'category' => ['sometimes', 'nullable', 'string', 'max:255'],
            'start_time' => ['sometimes', 'required', 'date_format:H:i'],
            'end_time' => ['sometimes', 'required', 'date_format:H:i'],
            'rest_hours_after' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'recurrence_frequency' => ['sometimes', 'nullable', Rule::enum(RecurrenceFrequency::class)],
            'recurrence_days' => ['sometimes', 'nullable', 'array'],
            'recurrence_days.*' => ['integer', 'min:1', 'max:31'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($this->input('recurrence_frequency') !== RecurrenceFrequency::Weekly->value) {
                return;
            }

            foreach ((array) $this->input('recurrence_days', []) as $day) {
                if ((int) $day > 7) {
                    $validator->errors()->add('recurrence_days', 'Weekly recurrence days must be 1-7 (Mon-Sun).');
                    break;
                }
            }
        });
    }
}
