<?php

namespace App\Availability\Enums;

enum ResponseStatus: string
{
    case Pending = 'pending';
    case Submitted = 'submitted';
}
