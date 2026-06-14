<?php

namespace App\Preferences\Models;

use App\Members\Models\Member;
use App\Preferences\Enums\PreferenceMode;
use App\Preferences\Enums\PreferenceType;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MemberPreference extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'type',
        'params',
        'weight',
        'mode',
        'hard_approved',
    ];

    /**
     * @return array<string, mixed>
     */
    protected function casts(): array
    {
        return [
            'type' => PreferenceType::class,
            'params' => 'array',
            'weight' => 'integer',
            'mode' => PreferenceMode::class,
            'hard_approved' => 'boolean',
        ];
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    /**
     * A preference acts as a hard constraint only when requested hard AND approved.
     */
    public function isEffectiveHard(): bool
    {
        return $this->mode === PreferenceMode::Hard && $this->hard_approved;
    }
}
