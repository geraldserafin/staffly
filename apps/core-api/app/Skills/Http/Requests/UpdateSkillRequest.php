<?php

namespace App\Skills\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSkillRequest extends FormRequest
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
        $skill = $this->route('skill');

        return [
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('skills', 'name')
                    ->where('organization_id', $skill->organization_id)
                    ->ignore($skill->getKey()),
            ],
        ];
    }
}
