<?php

namespace App\Preferences\Http\Requests;

use App\Preferences\Enums\PreferenceType;
use Illuminate\Contracts\Validation\Validator;

trait ValidatesPreferenceParams
{
    /**
     * Validate the per-type shape of the params jsonb.
     */
    protected function validateParamsFor(Validator $validator, ?string $type, mixed $params): void
    {
        $params = is_array($params) ? $params : [];
        $fail = fn (string $message) => $validator->errors()->add('params', $message);

        match ($type) {
            PreferenceType::PreferredShiftType->value => (empty($params['type']) || ! is_string($params['type']))
                ? $fail('preferred_shift_type requires params.type (string).') : null,

            PreferenceType::MonthlyHoursTarget->value => (! isset($params['target']) || ! is_int($params['target']) || $params['target'] < 1)
                ? $fail('monthly_hours_target requires params.target (positive integer).') : null,

            PreferenceType::Weekend->value => (! in_array($params['mode'] ?? null, ['prefer', 'avoid'], true))
                ? $fail('weekend requires params.mode of prefer|avoid.') : null,

            PreferenceType::MaxConsecutiveDays->value => (! isset($params['max']) || ! is_int($params['max']) || $params['max'] < 1)
                ? $fail('max_consecutive_days requires params.max (positive integer).') : null,

            PreferenceType::PreferredDaysOff->value => (! $this->validDaysList($params['days'] ?? null))
                ? $fail('preferred_days_off requires params.days (array of ISO weekdays 1-7).') : null,

            default => null, // avoid_fast_rotation takes no params
        };
    }

    private function validDaysList(mixed $days): bool
    {
        if (! is_array($days) || $days === []) {
            return false;
        }

        foreach ($days as $day) {
            if (! is_int($day) || $day < 1 || $day > 7) {
                return false;
            }
        }

        return true;
    }
}
