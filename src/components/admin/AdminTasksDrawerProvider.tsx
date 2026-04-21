// AdminTasksDrawerProvider.tsx — wrapper qui gère :
// - FAB en bas à droite (caché sur /admin/tasks — redondant)
// - Drawer latéral sur click FAB ou shortcut "t"
// - Raccourci clavier global "t" (ignoré si input/textarea focus)

import { useEffect, useState } from 'react';
import TaskDrawer from './tasks/TaskDrawer';

interface Props {
  urgentCount: number;
  currentPath: string;
}

function CheckSquareIcon() {
  return (
    <svg
      className="w-6 h-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

export default function AdminTasksDrawerProvider({ urgentCount, currentPath }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  // Masqué sur /admin/tasks (redondant) — déjà sur la page des tâches.
  const hideFab = currentPath === '/admin/tasks' || currentPath === '/admin/tasks/';

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ignore si champ de saisie actif (input/textarea/select/contenteditable)
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable
      ) {
        return;
      }
      if (e.key === 't' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        setIsOpen(true);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      {!hideFab && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-30 w-14 h-14 bg-[#D97B3D] hover:bg-[#c46a2e] text-white rounded-full shadow-lg flex items-center justify-center transition-all focus:outline-2 focus:outline-offset-2 focus:outline-[#1B2E4A]"
          aria-label="Ouvrir les tâches (raccourci : t)"
          title="Tâches (t)"
        >
          <CheckSquareIcon />
          {urgentCount > 0 && (
            <span
              className="absolute -top-1 -right-1 bg-[#B34444] text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center"
              aria-label={`${urgentCount} tâches urgentes`}
            >
              {urgentCount}
            </span>
          )}
        </button>
      )}

      <TaskDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
