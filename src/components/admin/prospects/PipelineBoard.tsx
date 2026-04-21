// PipelineBoard.tsx — kanban 5 colonnes avec drag & drop dnd-kit.
// Statut 'perdu' volontairement exclu (PRD §6.9 — D16) :
//   - Pas de colonne Perdu ici
//   - Les prospects perdu sont simplement non rendus
//   - Pour basculer en Perdu, l'utilisateur passe par la vue Liste

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
}

// Ordre d'affichage des 5 colonnes (perdu exclu — D16)
const KANBAN_COLUMNS: Exclude<ProspectStatus, 'perdu'>[] = [
  'prospect',
  'contacte',
  'rdv',
  'proposition',
  'signe',
];

export default function PipelineBoard({ prospects, onMove }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } })
  );

  const activeProspect = activeId ? prospects.find((p) => p.id === activeId) : null;

  // Groupement par statut — les 'perdu' ne sont jamais rendus en kanban
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
    if (activeP.status === toStatus) return; // drop même colonne → no-op

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
          />
        ))}
      </div>

      <DragOverlay>
        {activeProspect ? <PipelineCard prospect={activeProspect} isDragOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
