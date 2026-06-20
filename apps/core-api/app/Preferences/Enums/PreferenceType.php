<?php

namespace App\Preferences\Enums;

enum PreferenceType: string
{
    case PreferredShiftType = 'preferred_shift_type';   // params: {shiftIds: [...]} of shift templates the member prefers
    case HoursTarget = 'hours_target';                  // params: {target} per org payroll period
    case Weekend = 'weekend';                           // params: {mode: prefer|avoid}
    case MaxConsecutiveDays = 'max_consecutive_days';   // params: {max}
    case AvoidFastRotation = 'avoid_fast_rotation';     // no params
    case PreferredDaysOff = 'preferred_days_off';       // params: {days: [1-7]}
}
