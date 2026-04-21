// PipelineBoard.tsx — kanban 5 colonnes avec drag & drop dnd-kit.
// Phase 4 : col-sum calculés (Ancienneté moy. Prospect, MRR actif Signé).
// Statut 'perdu' volontairement exclu (PRD §6.9 / D16).

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import PipelineColumn from './PipelineColumn';
import PipelineCard from './PipelineCard';
import {
  PROSPECT_STATUS_LABELS,
  type Prospect,
  type ProspectStatus,
} from '../../../types/prospect';

interface Props {
  prospects: Prospect[];
  onMove: (id: string, fromStatus: ProspectStatus, toStatus: ProspectStatus) => Promise<void>;
  onCardClick?: (id: string) => void;
}

const KANBAN_COLUMNS: Exclude<ProspectStatus, 'perdu'>[] = [
  'prospect',
  'contacte',
  'rdv',
  'proposition',
  'signe',
];

function buildColSum(
  status: Exclude<ProspectStatus, 'perdu'>,
  prospects: Prospect[]
): { label: string; value: string } | undefined {
  if (status === 'prospect') {
    if (prospects.length === 0) return undefined;
    const now = Date.now();
    const totalDays = prospects.reduce((sum, p) => {
      const created = new Date(p.created_at).getTime();
      const days = Math.max(0, Math.floor((now - created) / 86400000));
      return sum + days;
    }, 0);
    const avgDays = Math.round(totalDays / prospects.length);
    return { label: 'Ancienneté moy.', value: `${avgDays}j` };
  }

  if (status === 'signe') {
    const total = prospects
      .filter((p) => p.mrr_potentiel != null)
      .reduce((sum, p) => sum + Number(p.mrr_potentiel), 0);
    if (total === 0) return undefined;
    return {
      label: 'MRR actif',
      value: new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(total),
    };
  }

  return undefined;
}

export default function PipelineBoard({ prospects, onMove, onCardClick }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } })
  );

  const activeProspect = activeId ? prospects.find((p) => p.id === activeId) : null;

  const prospectsByStatus = KANBAN_COLUMNS.reduce(
    (acc, status) => {
      acc[status] = prospects.filter((p) => p.status === status);
      return acc;
    },
    {} as Record<Exclude<ProspectStatus, 'perdu'>, Prospect[]>
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const overId = String(over.id);
    if (!overId.startsWith('column-')) return;

    const toStatus = overId.replace('column-', '') as ProspectStatus;
    const activeP = prospects.find((p) => p.id === active.id);
    if (!activeP) return;
    if (activeP.status === toStatus) return;

    await onMove(activeP.id, activeP.status, toStatus);
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-[repeat(5,82vw)] md:grid-cols-5 gap-3 mb-6 overflow-x-auto pb-2 snap-x snap-mandatory md:snap-none">
        {KANBAN_COLUMNS.map((status) => (
          <PipelineColumn
            key={status}
            status={status}
            prospects={prospectsByStatus[status]}
            label={PROSPECT_STATUS_LABELS[status]}
            count={prospectsByStatus[status].length}
            colSum={buildColSum(status, prospectsByStatus[status])}
            onCardClick={onCardClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeProspect ? <PipelineCard prospect={activeProspect} isDragOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
