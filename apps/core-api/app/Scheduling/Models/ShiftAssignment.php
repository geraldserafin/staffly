<?php

namespace App\Scheduling\Models;

use App\Members\Models\Member;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShiftAssignment extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'locked',
    ];

    /**
     * @return array<string, mixed>
     */
    protected function casts(): array
    {
        return [
            'locked' => 'boolean',
        ];
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(ScheduledShift::class, 'scheduled_shift_id');
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }
}
