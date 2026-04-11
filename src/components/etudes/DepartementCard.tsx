interface DepartementData {
  code: string;
  nom: string;
  audios: number;
  population_totale: number;
  population_60plus: number;
  ratio_100k: number;
  rang: number;
  niveau: 'vert' | 'jaune' | 'orange' | 'rouge';
}

interface DepartementCardProps {
  dept: DepartementData;
  moyenneNationale: number;
  totalDepts: number;
  onClose: () => void;
}

const NIVEAU_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  vert: { bg: '#E8F5E9', text: '#2E7D32', label: 'Bien dote' },
  jaune: { bg: '#FFF8E1', text: '#F57F17', label: 'Correct' },
  orange: { bg: '#FFF3E0', text: '#E65100', label: 'Sous-dote' },
  rouge: { bg: '#FFEBEE', text: '#C62828', label: 'Desert auditif' },
};

export default function DepartementCard({ dept, moyenneNationale, totalDepts, onClose }: DepartementCardProps) {
  const niv = NIVEAU_STYLES[dept.niveau];
  const pctVsMoyenne = Math.round((dept.ratio_100k / moyenneNationale) * 100);
  const barWidth = Math.min(pctVsMoyenne, 200); // cap at 200% for display

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(27,46,74,0.1)] border border-[#1B2E4A]/10 overflow-hidden">
      {/* Header with badge */}
      <div className="flex items-start justify-between px-6 pt-6 pb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-sans text-2xl font-bold text-[#1B2E4A]">
              {dept.nom}
              <span className="text-[#1B2E4A]/40 font-normal ml-2">({dept.code})</span>
            </h3>
            <span
              className="inline-block px-3 py-1 rounded-full font-sans text-sm font-semibold"
              style={{ backgroundColor: niv.bg, color: niv.text }}
            >
              {niv.label}
            </span>
          </div>
          <p className="font-sans text-sm text-[#1B2E4A]/50">
            Rang {dept.rang} sur {totalDepts} departements
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-[#F8F5F0] transition-colors text-[#1B2E4A]/40 hover:text-[#1B2E4A]"
          aria-label="Fermer la fiche"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Main stat */}
      <div className="px-6 pb-4">
        <div className="flex items-baseline gap-2 mb-3">
          <span className="font-serif text-5xl font-bold" style={{ color: niv.text }}>
            {dept.ratio_100k}
          </span>
          <span className="font-sans text-base text-[#1B2E4A]/60">
            audioprothesistes pour 100 000 habitants
          </span>
        </div>

        {/* Comparison bar vs national average */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="font-sans text-xs text-[#1B2E4A]/50">
              {pctVsMoyenne < 100
                ? `${100 - pctVsMoyenne} % en dessous de la moyenne`
                : pctVsMoyenne > 100
                  ? `${pctVsMoyenne - 100} % au-dessus de la moyenne`
                  : 'Dans la moyenne nationale'}
            </span>
            <span className="font-sans text-xs text-[#1B2E4A]/50">
              Moyenne : {moyenneNationale}
            </span>
          </div>
          <div className="relative h-3 bg-[#F8F5F0] rounded-full overflow-hidden">
            {/* Average marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-[#1B2E4A]/30 z-10"
              style={{ left: '50%' }}
            />
            {/* Department bar */}
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min((barWidth / 200) * 100, 100)}%`,
                backgroundColor: niv.text,
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="font-sans text-[10px] text-[#1B2E4A]/30">0</span>
            <span className="font-sans text-[10px] text-[#1B2E4A]/30">moy.</span>
            <span className="font-sans text-[10px] text-[#1B2E4A]/30">2x moy.</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 border-t border-[#1B2E4A]/5">
        <div className="px-4 py-4 text-center border-r border-[#1B2E4A]/5">
          <p className="font-serif text-2xl font-bold text-[#1B2E4A]">{dept.audios}</p>
          <p className="font-sans text-xs text-[#1B2E4A]/50 mt-1">Audioprothesistes</p>
        </div>
        <div className="px-4 py-4 text-center border-r border-[#1B2E4A]/5">
          <p className="font-serif text-2xl font-bold text-[#1B2E4A]">
            {(dept.population_totale / 1000).toFixed(0)}k
          </p>
          <p className="font-sans text-xs text-[#1B2E4A]/50 mt-1">Population</p>
        </div>
        <div className="px-4 py-4 text-center">
          <p className="font-serif text-2xl font-bold text-[#1B2E4A]">
            {(dept.population_60plus / 1000).toFixed(0)}k
          </p>
          <p className="font-sans text-xs text-[#1B2E4A]/50 mt-1">Population 60+</p>
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 py-4 bg-[#F8F5F0]">
        <a
          href="/trouver-audioprothesiste"
          className="block w-full text-center px-4 py-3 bg-[#B55E28] text-white font-sans font-semibold rounded-lg hover:bg-[#9A4D1C] transition-colors"
        >
          Trouver un audioprothesiste dans ce departement
        </a>
      </div>
    </div>
  );
}
