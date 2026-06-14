<?php

return [
    // "stub" = in-process greedy solver; "http" = Python OR-Tools service.
    'driver' => env('SOLVER_DRIVER', 'stub'),

    'url' => env('SOLVER_URL', 'http://127.0.0.1:8000'),

    'timeout' => (int) env('SOLVER_TIMEOUT', 120),
];
