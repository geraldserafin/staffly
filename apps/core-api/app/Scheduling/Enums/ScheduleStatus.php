<?php

namespace App\Scheduling\Enums;

enum ScheduleStatus: string
{
    case Draft = 'draft';
    case Published = 'published';
    case Archived = 'archived';
}
