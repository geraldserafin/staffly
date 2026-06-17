<?php

return [
    // Python OR-Tools CP-SAT service.
    'url' => env('SOLVER_URL', 'http://127.0.0.1:8000'),

    'timeout' => (int) env('SOLVER_TIMEOUT', 120),

    // History-based fairness: how many recent published periods feed the equity
    // bias, and the exponential decay applied per step back (most recent = full
    // weight, each older period multiplied by `decay` again).
    'fairness' => [
        'history_window' => (int) env('SOLVER_FAIRNESS_WINDOW', 3),
        'decay' => (float) env('SOLVER_FAIRNESS_DECAY', 0.5),
    ],
];
