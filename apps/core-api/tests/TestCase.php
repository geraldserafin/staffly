<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Tests\Support\ActsAsMember;

abstract class TestCase extends BaseTestCase
{
    use ActsAsMember;
}
