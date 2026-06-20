<?php

namespace App\Members\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreMemberRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'priority' => ['sometimes', 'integer', 'min:1'],
            'role' => ['sometimes', 'string', 'in:owner,manager,member'],
            'teamIds' => ['sometimes', 'array'],
            'teamIds.*' => ['string', 'uuid'],
        ];
    }
}
