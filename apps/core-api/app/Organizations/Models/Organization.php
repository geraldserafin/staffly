<?php

namespace App\Organizations\Models;

use App\Organizations\Enums\PayrollPeriod;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Organization extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'name',
        'payroll_period',
    ];

    /**
     * @return array<string, mixed>
     */
    protected function casts(): array
    {
        return [
            'payroll_period' => PayrollPeriod::class,
        ];
    }
}
