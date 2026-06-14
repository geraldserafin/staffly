<?php

namespace App\Scheduling\Models;

use App\Scheduling\Enums\ScheduleStatus;
use App\Teams\Models\Team;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Schedule extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'name',
        'start_date',
        'end_date',
        'status',
        'weights',
    ];

    /**
     * @return array<string, mixed>
     */
    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'status' => ScheduleStatus::class,
            'weights' => 'array',
        ];
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function shifts(): HasMany
    {
        return $this->hasMany(ScheduledShift::class);
    }
}
