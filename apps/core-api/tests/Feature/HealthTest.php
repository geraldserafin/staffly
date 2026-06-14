<?php

namespace Tests\Feature;

use Tests\TestCase;

class HealthTest extends TestCase
{
    public function test_health_endpoint_responds(): void
    {
        $this->get('/up')->assertOk();
    }

    public function test_ping_returns_json(): void
    {
        $this->getJson('/ping')
            ->assertOk()
            ->assertExactJson(['message' => 'pong']);
    }
}
