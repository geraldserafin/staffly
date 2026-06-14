<?php

namespace App\Availability\Enums;

enum AvailabilityKind: string
{
    // Positive window — member can work then (allowlist when any exist).
    case Available = 'available';

    // Time off — member cannot work then (always wins over Available).
    case Unavailable = 'unavailable';
}
