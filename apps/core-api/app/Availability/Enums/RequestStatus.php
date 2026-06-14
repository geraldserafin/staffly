<?php

namespace App\Availability\Enums;

enum RequestStatus: string
{
    case Open = 'open';
    case Closed = 'closed';
}
