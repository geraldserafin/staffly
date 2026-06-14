<?php

namespace App\Preferences\Enums;

enum PreferenceMode: string
{
    // Penalised when violated, weighted by importance.
    case Soft = 'soft';

    // A constraint — but only effective once a manager approves it.
    case Hard = 'hard';
}
