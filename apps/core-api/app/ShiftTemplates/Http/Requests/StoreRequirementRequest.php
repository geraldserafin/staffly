<?php

namespace App\ShiftTemplates\Http\Requests;

use App\ShiftTemplates\Enums\RequirementType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRequirementRequest extends FormRequest
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
        $organizationId = $this->route('shiftTemplate')->organization_id;
        $isHeadcount = $this->input('type') === RequirementType::Headcount->value;
        $isCoverage = $this->input('type') === RequirementType::Coverage->value;

        return [
            'type' => ['required', Rule::enum(RequirementType::class)],
            'skill_id' => [
                // Coverage must name a skill; headcount may be Any (null).
                Rule::requiredIf($isCoverage),
                'nullable',
                'uuid',
                Rule::exists('skills', 'id')->where('organization_id', $organizationId),
            ],
            'count' => [
                // Headcount needs a count; coverage ignores it.
                Rule::requiredIf($isHeadcount),
                'nullable',
                'integer',
                'min:1',
            ],
            // Null = every day the template runs; set = only these ISO weekdays (additive).
            'days' => ['nullable', 'array'],
            'days.*' => ['integer', 'min:1', 'max:7'],
        ];
    }
}
