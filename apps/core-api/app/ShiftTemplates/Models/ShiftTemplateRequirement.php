<?php

namespace App\ShiftTemplates\Models;

use App\Skills\Models\Skill;
use App\ShiftTemplates\Enums\RequirementType;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShiftTemplateRequirement extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'type',
        'count',
        'skill_id',
        'days',
    ];

    /**
     * @return array<string, mixed>
     */
    protected function casts(): array
    {
        return [
            'type' => RequirementType::class,
            'count' => 'integer',
            'days' => 'array',
        ];
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(ShiftTemplate::class, 'shift_template_id');
    }

    public function skill(): BelongsTo
    {
        return $this->belongsTo(Skill::class);
    }
}
