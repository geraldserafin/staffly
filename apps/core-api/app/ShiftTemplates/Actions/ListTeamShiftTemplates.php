<?php

namespace App\ShiftTemplates\Actions;

use App\ShiftTemplates\Models\ShiftTemplate;
use App\Teams\Models\Team;
use Illuminate\Support\Collection;

class ListTeamShiftTemplates
{
    /**
     * Templates that generate shifts for this team: those scoped to it plus the
     * org-wide ones (no team scope).
     *
     * @return Collection<int, ShiftTemplate>
     */
    public function handle(Team $team): Collection
    {
        return (new ShiftTemplate)->newQuery()
            ->where('organization_id', $team->organization_id)
            ->with(['requirements', 'teams'])
            ->get()
            ->filter(fn (ShiftTemplate $template) => $template->appliesToTeam($team))
            ->values();
    }
}
