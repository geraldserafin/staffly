<?php

namespace App\Availability\Http\Requests;

use App\Availability\Enums\AvailabilityKind;
use App\Availability\Enums\AvailabilityRecurrence;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAvailabilityRequest extends FormRequest
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
            'kind' => ['required', Rule::enum(AvailabilityKind::class)],
            'recurrence' => ['nullable', Rule::enum(AvailabilityRecurrence::class)],

            // Recurring weekly window.
            'days' => ['nullable', 'required_with:recurrence', 'array'],
            'days.*' => ['integer', 'min:1', 'max:7'],
            // Times go together; null/null = all day. end < start = overnight (no order check).
            'start_time' => ['nullable', 'date_format:H:i', 'required_with:end_time'],
            'end_time' => ['nullable', 'date_format:H:i', 'required_with:start_time'],

            // One-off span (when not recurring).
            'start_at' => ['nullable', 'required_without:recurrence', 'date'],
            'end_at' => ['nullable', 'required_without:recurrence', 'date', 'after:start_at'],

            'reason' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $isRecurring = $this->filled('recurrence');

            // Recurring and one-off shapes are mutually exclusive.
            if ($isRecurring && ($this->filled('start_at') || $this->filled('end_at'))) {
                $validator->errors()->add('recurrence', 'A recurring entry cannot also have a one-off start_at/end_at.');
            }

            if (! $isRecurring && ($this->filled('days') || $this->filled('start_time'))) {
                $validator->errors()->add('recurrence', 'Weekly fields require a recurrence of "weekly".');
            }
        });
    }
}
