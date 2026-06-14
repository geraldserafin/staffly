<?php

namespace App\Scheduling\Http\Requests;

use App\Scheduling\Models\ShiftAssignment;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAssignmentRequest extends FormRequest
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
        $shift = $this->route('scheduledShift');
        $teamId = $shift->schedule->team_id;

        return [
            'memberId' => [
                'required',
                'uuid',
                // Member must belong to the shift's team.
                Rule::exists('member_team', 'member_id')->where('team_id', $teamId),
                // No assigning the same member to the same shift twice.
                Rule::unique('shift_assignments', 'member_id')->where('scheduled_shift_id', $shift->getKey()),
            ],
            'locked' => ['nullable', 'boolean'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $memberId = $this->input('memberId');

            if (! $memberId) {
                return;
            }

            $shift = $this->route('scheduledShift');

            // Double-booking across all teams/schedules: any assignment of this
            // member to a shift overlapping [start_at, end_at).
            $overlaps = (new ShiftAssignment)->newQuery()
                ->where('member_id', $memberId)
                ->whereHas('shift', function (Builder $query) use ($shift): void {
                    $query->whereKeyNot($shift->getKey())
                        ->where('start_at', '<', $shift->end_at)
                        ->where('end_at', '>', $shift->start_at);
                })
                ->exists();

            if ($overlaps) {
                $validator->errors()->add('memberId', 'Member is already assigned to an overlapping shift.');
            }
        });
    }
}
