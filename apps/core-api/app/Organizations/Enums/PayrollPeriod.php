<?php

namespace App\Organizations\Enums;

enum PayrollPeriod: string
{
    case Week = 'week';
    case Biweekly = 'biweekly';
    case Month = 'month';
}
