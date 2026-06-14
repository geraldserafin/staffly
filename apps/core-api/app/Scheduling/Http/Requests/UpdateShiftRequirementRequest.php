<?php

namespace App\Scheduling\Http\Requests;

use App\ShiftTemplates\Enums\RequirementType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateShiftRequirementRequest extends FormRequest
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
        $organizationId = $this->route('shiftRequirement')->shift->schedule->team->organization_id;

        return [
            'type' => ['sometimes', Rule::enum(RequirementType::class)],
            'skill_id' => [
                'sometimes',
                'nullable',
                'uuid',
                Rule::exists('skills', 'id')->where('organization_id', $organizationId),
            ],
            'count' => ['sometimes', 'nullable', 'integer', 'min:1'],
        ];
    }
}
