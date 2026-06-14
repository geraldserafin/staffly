<?php

namespace App\ShiftTemplates\Models;

use App\Organizations\Models\Organization;
use App\ShiftTemplates\Enums\RecurrenceFrequency;
use App\Teams\Models\Team;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ShiftTemplate extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'name',
        'start_time',
        'end_time',
        'recurrence_frequency',
        'recurrence_days',
    ];

    /**
     * @return array<string, mixed>
     */
    protected function casts(): array
    {
        return [
            'recurrence_frequency' => RecurrenceFrequency::class,
            'recurrence_days' => 'array',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function requirements(): HasMany
    {
        return $this->hasMany(ShiftTemplateRequirement::class);
    }
}
