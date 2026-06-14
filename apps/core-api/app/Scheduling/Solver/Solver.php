<?php

namespace App\Scheduling\Solver;

interface Solver
{
    /**
     * @param  array<string, mixed>  $request  flat solve request (shifts, members, locked, rules)
     * @return array<string, mixed>            { assignments: [{shiftId, memberId}], diagnostics: {...} }
     */
    public function solve(array $request): array;
}
