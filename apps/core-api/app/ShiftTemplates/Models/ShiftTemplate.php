<?php

namespace App\ShiftTemplates\Models;

use App\Organizations\Models\Organization;
use App\ShiftTemplates\Enums\RecurrenceFrequency;
use App\Teams\Models\Team;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ShiftTemplate extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'name',
        'start_time',
        'end_time',
        'rest_hours_after',
        'recurrence_frequency',
        'recurrence_days',
    ];

    /**
     * @return array<string, mixed>
     */
    protected function casts(): array
    {
        return [
            'rest_hours_after' => 'integer',
            'recurrence_frequency' => RecurrenceFrequency::class,
            'recurrence_days' => 'array',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * Teams this template is scoped to. Empty = applies to all the org's teams.
     */
    public function teams(): BelongsToMany
    {
        return $this->belongsToMany(Team::class, 'shift_template_team')->withTimestamps();
    }

    /** Whether this template generates shifts for the given team. */
    public function appliesToTeam(Team $team): bool
    {
        return $this->teams->isEmpty() || $this->teams->contains($team);
    }

    public function requirements(): HasMany
    {
        return $this->hasMany(ShiftTemplateRequirement::class);
    }
}
