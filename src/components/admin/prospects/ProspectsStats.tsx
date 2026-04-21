// ProspectsStats.tsx — mirror React de ProspectsStats.astro.
// Consomme ProspectStats calculé par le parent (ProspectsPage) via buildStats.

import StatTile from '../ui/react/StatTile';
import { formatEuros } from '../../../lib/prospects';
import type { ProspectStats } from '../../../types/prospect';

interface Props {
  stats: ProspectStats;
}

export default function ProspectsStats({ stats }: Props) {
  const slotsLeft = stats.fondateurSlotsMax - stats.fondateurSlotsUsed;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <StatTile
        label="Pipeline actif"
        value={stats.pipelineActif}
        hint={`${stats.pipelineActifThisMonth} ce mois-ci`}
      />
      <StatTile
        label="RDV cette semaine"
        value={stats.rdvThisWeek}
        hint={`${stats.rdvToday} aujourd'hui`}
      />
      <StatTile
        label="Propositions"
        value={stats.propositions}
        hint={`${formatEuros(stats.propositionsMrrTotal)} MRR potentiel`}
      />
      <StatTile
        label="Slots Fondateur"
        value={`${stats.fondateurSlotsUsed} / ${stats.fondateurSlotsMax}`}
        hint={`${slotsLeft} slots restants`}
        variant="fondateur"
      />
    </div>
  );
}
