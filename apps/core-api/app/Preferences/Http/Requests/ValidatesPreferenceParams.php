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
            PreferenceType::PreferredShiftType->value => (array_key_exists('type', $params) && ! is_string($params['type']))
                ? $fail('preferred_shift_type requires params.type (string).') : null,

            PreferenceType::HoursTarget->value => (array_key_exists('target', $params) && (! is_int($params['target']) || $params['target'] < 1))
                ? $fail('hours_target requires params.target (positive integer).') : null,

            PreferenceType::Weekend->value => (array_key_exists('mode', $params) && ! in_array($params['mode'], ['prefer', 'avoid'], true))
                ? $fail('weekend requires params.mode of prefer|avoid.') : null,

            PreferenceType::MaxConsecutiveDays->value => (array_key_exists('max', $params) && (! is_int($params['max']) || $params['max'] < 1))
                ? $fail('max_consecutive_days requires params.max (positive integer).') : null,

            PreferenceType::PreferredDaysOff->value => (array_key_exists('days', $params) && ! $this->validDaysList($params['days']))
                ? $fail('preferred_days_off requires params.days (array of ISO weekdays 1-7).') : null,

            default => null, // avoid_fast_rotation takes no params
        };
    }

    private function validDaysList(mixed $days): bool
    {
        if (! is_array($days)) {
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
