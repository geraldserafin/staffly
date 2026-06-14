<?php

namespace App\Preferences\Http\Requests;

use App\Preferences\Enums\PreferenceMode;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePreferenceRequest extends FormRequest
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
        // type is fixed after creation (one per type per member); only the
        // tunables change here.
        return [
            'params' => ['sometimes', 'array'],
            'weight' => ['sometimes', 'integer', 'between:1,5'],
            'mode' => ['sometimes', Rule::enum(PreferenceMode::class)],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if (! $this->has('params')) {
                return;
            }

            $type = $this->route('preference')->type->value;
            $this->validateParamsFor($validator, $type, $this->input('params'));
        });
    }
}
