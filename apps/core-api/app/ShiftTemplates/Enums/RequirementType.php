<?php

namespace App\ShiftTemplates\Enums;

enum RequirementType: string
{
    // Consumes distinct people who hold the skill (Any if skill is null).
    case Headcount = 'headcount';

    // A capability that must be present on the shift; no extra headcount.
    case Coverage = 'coverage';
}
