<?php

namespace App\Availability\Models;

use App\Availability\Enums\ResponseStatus;
use App\Members\Models\Member;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AvailabilityResponse extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'status',
        'submitted_at',
    ];

    /**
     * @return array<string, mixed>
     */
    protected function casts(): array
    {
        return [
            'status' => ResponseStatus::class,
            'submitted_at' => 'datetime',
        ];
    }

    public function request(): BelongsTo
    {
        return $this->belongsTo(AvailabilityRequest::class, 'availability_request_id');
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }
}
