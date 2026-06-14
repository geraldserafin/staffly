<?php

namespace App\Scheduling\Models;

use App\Teams\Models\Team;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeamRule extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'min_rest_hours',
        'max_hours_per_week',
        'max_consecutive_days',
    ];

    /**
     * @return array<string, mixed>
     */
    protected function casts(): array
    {
        return [
            'min_rest_hours' => 'integer',
            'max_hours_per_week' => 'integer',
            'max_consecutive_days' => 'integer',
        ];
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }
}
