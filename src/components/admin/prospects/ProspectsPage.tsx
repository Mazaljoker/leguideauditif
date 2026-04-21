// ProspectsPage.tsx — root React de /admin/prospects.
// Gère le state client : prospects[], isDialogOpen, stats dérivé.
// Le SSR fournit initialProspects via la page Astro.

import { useMemo, useState } from 'react';
import ProspectsHeader from './ProspectsHeader';
import ProspectsStats from './ProspectsStats';
import ProspectsChips from './ProspectsChips';
import ProspectsList from './ProspectsList';
import NewProspectDialog from './NewProspectDialog';
import { buildStats } from '../../../lib/prospects';
import type { Prospect } from '../../../types/prospect';

interface Props {
  initialProspects: Prospect[];
}

export default function ProspectsPage({ initialProspects }: Props) {
  const [prospects, setProspects] = useState<Prospect[]>(initialProspects);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const stats = useMemo(() => buildStats(prospects), [prospects]);

  function handleCreated(p: Prospect) {
    setProspects((prev) => [p, ...prev]);
  }

  function handleSaved(updated: Prospect) {
    setProspects((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
  }

  function handleDeleted(id: string) {
    setProspects((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <>
      <ProspectsHeader onNewClick={() => setIsDialogOpen(true)} />
      <ProspectsStats stats={stats} />
      <ProspectsChips prospects={prospects} />
      <ProspectsList prospects={prospects} onSaved={handleSaved} onDeleted={handleDeleted} />
      <NewProspectDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onCreated={handleCreated}
      />
    </>
  );
}
