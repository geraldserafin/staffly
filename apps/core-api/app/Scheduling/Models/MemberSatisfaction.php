<?php

namespace App\Scheduling\Models;

use App\Members\Models\Member;
use App\Teams\Models\Team;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A member's realised dissatisfaction for one published schedule's period.
 * Feeds back into the solver's equity objective so unfairness rotates over time
 * (last period's worst-off are favoured this period).
 */
class MemberSatisfaction extends Model
{
    use HasFactory;
    use HasUuids;

    protected $table = 'member_satisfaction';

    protected $fillable = [
        'period_start',
        'period_end',
        'dissatisfaction',
    ];

    /**
     * @return array<string, mixed>
     */
    protected function casts(): array
    {
        return [
            'period_start' => 'date',
            'period_end' => 'date',
            'dissatisfaction' => 'integer',
        ];
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(Schedule::class);
    }
}
