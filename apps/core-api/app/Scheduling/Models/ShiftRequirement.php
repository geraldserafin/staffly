<?php

namespace App\Scheduling\Models;

use App\ShiftTemplates\Enums\RequirementType;
use App\Skills\Models\Skill;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShiftRequirement extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'type',
        'count',
        'skill_id',
    ];

    /**
     * @return array<string, mixed>
     */
    protected function casts(): array
    {
        return [
            'type' => RequirementType::class,
            'count' => 'integer',
        ];
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(ScheduledShift::class, 'scheduled_shift_id');
    }

    public function skill(): BelongsTo
    {
        return $this->belongsTo(Skill::class);
    }
}
