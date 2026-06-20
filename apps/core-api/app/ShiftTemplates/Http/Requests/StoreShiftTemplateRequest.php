<?php

namespace App\ShiftTemplates\Http\Requests;

use App\ShiftTemplates\Enums\RecurrenceFrequency;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreShiftTemplateRequest extends FormRequest
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
        $organizationId = $this->route('organization')->getKey();

        return [
            'name' => ['required', 'string', 'max:255'],
            // Times only (H:i). end before start is allowed = overnight shift.
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i'],
            'rest_hours_after' => ['nullable', 'integer', 'min:0'],
            // Empty/absent = applies to all the org's teams; set = scoped to these.
            'team_ids' => ['nullable', 'array'],
            'team_ids.*' => [
                'uuid',
                Rule::exists('teams', 'id')->where('organization_id', $organizationId),
            ],
            // Recurrence is optional; frequency and days go together.
            'recurrence_frequency' => ['nullable', 'required_with:recurrence_days', Rule::enum(RecurrenceFrequency::class)],
            'recurrence_days' => ['nullable', 'required_with:recurrence_frequency', 'array'],
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
