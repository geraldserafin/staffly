<?php

namespace App\Availability\Models;

use App\Availability\Enums\RequestStatus;
use App\Teams\Models\Team;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AvailabilityRequest extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'start_date',
        'end_date',
        'deadline',
    ];

    /**
     * @return array<string, mixed>
     */
    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'deadline' => 'date',
            'status' => RequestStatus::class,
        ];
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function responses(): HasMany
    {
        return $this->hasMany(AvailabilityResponse::class);
    }
}
