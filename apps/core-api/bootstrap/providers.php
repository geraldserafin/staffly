<?php

return [
    App\Providers\AppServiceProvider::class,
    App\Organizations\OrganizationServiceProvider::class,
    App\Members\MemberServiceProvider::class,
    App\Teams\TeamServiceProvider::class,
    App\Skills\SkillServiceProvider::class,
    App\ShiftTemplates\ShiftTemplateServiceProvider::class,
    App\Scheduling\SchedulingServiceProvider::class,
    App\Availability\AvailabilityServiceProvider::class,
];
