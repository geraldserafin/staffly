<?php

namespace App\Scheduling\Http\Requests;

use App\ShiftTemplates\Enums\RequirementType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreShiftRequirementRequest extends FormRequest
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
        $organizationId = $this->route('scheduledShift')->schedule->team->organization_id;
        $isHeadcount = $this->input('type') === RequirementType::Headcount->value;
        $isCoverage = $this->input('type') === RequirementType::Coverage->value;

        return [
            'type' => ['required', Rule::enum(RequirementType::class)],
            'skill_id' => [
                Rule::requiredIf($isCoverage),
                'nullable',
                'uuid',
                Rule::exists('skills', 'id')->where('organization_id', $organizationId),
            ],
            'count' => [
                Rule::requiredIf($isHeadcount),
                'nullable',
                'integer',
                'min:1',
            ],
        ];
    }
}
