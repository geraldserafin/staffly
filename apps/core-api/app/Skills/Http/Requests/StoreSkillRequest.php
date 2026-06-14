<?php

namespace App\Skills\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSkillRequest extends FormRequest
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
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('skills', 'name')->where('organization_id', $organizationId),
            ],
        ];
    }
}
