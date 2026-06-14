<?php

namespace App\Scheduling\Solver;

use Illuminate\Support\Facades\Http;

/**
 * Forwards the solve request to the Python OR-Tools service over HTTP.
 */
class HttpSolver implements Solver
{
    public function __construct(
        private readonly string $url,
        private readonly int $timeout,
    ) {}

    /**
     * @param  array<string, mixed>  $request
     * @return array<string, mixed>
     */
    public function solve(array $request): array
    {
        $response = Http::timeout($this->timeout)
            ->acceptJson()
            ->asJson()
            ->post(rtrim($this->url, '/').'/solve', $request)
            ->throw();

        return $response->json();
    }
}
