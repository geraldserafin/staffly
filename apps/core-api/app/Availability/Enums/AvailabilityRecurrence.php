<?php

namespace App\Availability\Enums;

enum AvailabilityRecurrence: string
{
    // days = ISO weekdays 1-7 (the day the window starts on).
    case Weekly = 'weekly';
}
