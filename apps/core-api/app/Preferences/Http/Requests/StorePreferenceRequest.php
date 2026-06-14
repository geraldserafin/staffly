<?php

namespace App\Preferences\Http\Requests;

use App\Preferences\Enums\PreferenceMode;
use App\Preferences\Enums\PreferenceType;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePreferenceRequest extends FormRequest
{
    use ValidatesPreferenceParams;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $memberId = $this->route('member')->getKey();

        return [
            'type' => [
                'required',
                Rule::enum(PreferenceType::class),
                // One preference per type per member.
                Rule::unique('member_preferences', 'type')->where('member_id', $memberId),
            ],
            'params' => ['nullable', 'array'],
            'weight' => ['nullable', 'integer', 'between:1,5'],
            // mode is a request; hard approval is granted separately by a manager.
            'mode' => ['nullable', Rule::enum(PreferenceMode::class)],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $this->validateParamsFor($validator, $this->input('type'), $this->input('params'));
        });
    }
}
