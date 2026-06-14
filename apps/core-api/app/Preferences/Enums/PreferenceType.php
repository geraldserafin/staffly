<?php

namespace App\Preferences\Enums;

enum PreferenceType: string
{
    case PreferredShiftType = 'preferred_shift_type';   // params: {type}
    case MonthlyHoursTarget = 'monthly_hours_target';   // params: {target}
    case Weekend = 'weekend';                           // params: {mode: prefer|avoid}
    case MaxConsecutiveDays = 'max_consecutive_days';   // params: {max}
    case AvoidFastRotation = 'avoid_fast_rotation';     // no params
    case PreferredDaysOff = 'preferred_days_off';       // params: {days: [1-7]}
}
