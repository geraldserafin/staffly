<?php

namespace App\ShiftTemplates\Enums;

enum RecurrenceFrequency: string
{
    // recurrence_days = ISO weekdays 1-7 (Mon=1 .. Sun=7)
    case Weekly = 'weekly';

    // recurrence_days = days of month 1-31
    case Monthly = 'monthly';
}
