<?php

namespace App\Organizations\Http\Requests;

use App\Organizations\Enums\PayrollPeriod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateOrganizationRequest extends FormRequest
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
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'payroll_period' => ['sometimes', Rule::enum(PayrollPeriod::class)],
        ];
    }
}
