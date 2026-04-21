// ViewToggle.tsx — toggle Pipeline / Liste.
// Composant contrôlé : le parent (ProspectsPage) gère le state + localStorage.

export type ProspectsView = 'pipeline' | 'list';

interface Props {
  currentView: ProspectsView;
  onChange: (view: ProspectsView) => void;
}

function KanbanIcon() {
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="18" rx="1" />
      <rect x="14" y="3" width="7" height="12" rx="1" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

export default function ViewToggle({ currentView, onChange }: Props) {
  const btnBase =
    'px-3.5 py-1.5 rounded-md text-[13px] font-sans font-medium inline-flex items-center gap-1.5 transition-colors';
  const btnInactive = 'text-[#6B7A90] bg-transparent hover:text-[#1B2E4A]';
  const btnActive = 'bg-[#1B2E4A] text-white';

  return (
    <div
      className="inline-flex bg-white border border-[#E4DED3] rounded-lg p-0.5 gap-0.5"
      role="group"
      aria-label="Changer de vue"
    >
      <button
        type="button"
        onClick={() => onChange('pipeline')}
        aria-pressed={currentView === 'pipeline'}
        className={`${btnBase} ${currentView === 'pipeline' ? btnActive : btnInactive}`}
      >
        <KanbanIcon />
        Pipeline
      </button>
      <button
        type="button"
        onClick={() => onChange('list')}
        aria-pressed={currentView === 'list'}
        className={`${btnBase} ${currentView === 'list' ? btnActive : btnInactive}`}
      >
        <ListIcon />
        Liste
      </button>
    </div>
  );
}
