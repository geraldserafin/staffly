<?php

namespace App\Scheduling\Models;

use App\Scheduling\Enums\SolveStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SolveRun extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'status',
        'diagnostics',
    ];

    /**
     * @return array<string, mixed>
     */
    protected function casts(): array
    {
        return [
            'status' => SolveStatus::class,
            'diagnostics' => 'array',
        ];
    }

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(Schedule::class);
    }
}
