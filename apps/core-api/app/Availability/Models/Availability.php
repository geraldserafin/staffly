<?php

namespace App\Availability\Models;

use App\Availability\Enums\AvailabilityKind;
use App\Availability\Enums\AvailabilityRecurrence;
use App\Members\Models\Member;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Availability extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'kind',
        'recurrence',
        'days',
        'start_time',
        'end_time',
        'start_at',
        'end_at',
        'reason',
    ];

    /**
     * @return array<string, mixed>
     */
    protected function casts(): array
    {
        return [
            'kind' => AvailabilityKind::class,
            'recurrence' => AvailabilityRecurrence::class,
            'days' => 'array',
            'start_at' => 'datetime',
            'end_at' => 'datetime',
        ];
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }
}
