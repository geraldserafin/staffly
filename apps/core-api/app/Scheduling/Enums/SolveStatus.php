<?php

namespace App\Scheduling\Enums;

enum SolveStatus: string
{
    case Pending = 'pending';
    case Running = 'running';
    case Succeeded = 'succeeded';
    case Failed = 'failed';
}
