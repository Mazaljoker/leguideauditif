import { useState, useMemo } from 'react';

/* ===== Types ===== */
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

type SortKey = 'rang' | 'nom' | 'audios' | 'population_totale' | 'population_60plus' | 'ratio_100k';
type SortDir = 'asc' | 'desc';

interface DepartementRankingProps {
  data: DepartementData[];
  selectedDept: string | null;
  onSelectDept: (code: string | null) => void;
}

/* ===== Colour badges ===== */
const NIVEAU_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  vert: { bg: '#E8F5E9', text: '#2E7D32', label: 'Bien dote' },
  jaune: { bg: '#FFF8E1', text: '#F57F17', label: 'Correct' },
  orange: { bg: '#FFF3E0', text: '#E65100', label: 'Sous-dote' },
  rouge: { bg: '#FFEBEE', text: '#C62828', label: 'Desert' },
};

/* ===== Mini ranking row ===== */
function MiniRow({ dept, onSelect }: { dept: DepartementData; onSelect: () => void }) {
  const niv = NIVEAU_COLORS[dept.niveau];
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-[#F8F5F0] transition-colors rounded-lg"
    >
      <span className="font-sans text-sm font-bold text-[#1B2E4A]/40 w-6 text-right">{dept.rang}</span>
      <span
        className="w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: niv.text }}
      />
      <span className="font-sans text-sm font-medium text-[#1B2E4A] flex-1 truncate">
        {dept.nom}
      </span>
      <span className="font-sans text-sm font-bold tabular-nums" style={{ color: niv.text }}>
        {dept.ratio_100k}
      </span>
    </button>
  );
}

/* ===== Full table ===== */
function FullTable({ data, selectedDept, onSelectDept, search, setSearch }: {
  data: DepartementData[];
  selectedDept: string | null;
  onSelectDept: (code: string | null) => void;
  search: string;
  setSearch: (s: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('rang');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    let result = [...data];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (d) => d.nom.toLowerCase().includes(q) || d.code.includes(q)
      );
    }
    result.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal, 'fr') : bVal.localeCompare(aVal, 'fr');
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return result;
  }, [data, search, sortKey, sortDir]);

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => {
    const isActive = sortKey === field;
    const arrow = isActive ? (sortDir === 'asc' ? ' \u2191' : ' \u2193') : '';
    return (
      <th
        scope="col"
        className="px-3 py-3 text-left font-sans text-sm font-semibold text-marine cursor-pointer hover:text-orange select-none whitespace-nowrap"
        onClick={() => handleSort(field)}
        aria-sort={isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort(field); } }}
      >
        {label}{arrow}
      </th>
    );
  };

  return (
    <div>
      <div className="mb-4">
        <label htmlFor="dept-search-full" className="sr-only">Rechercher un departement</label>
        <input
          id="dept-search-full"
          type="search"
          placeholder="Rechercher un departement (nom ou code)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-3 rounded-lg border border-[#1B2E4A]/20 font-sans text-base text-marine bg-white placeholder:text-[#1B2E4A]/40 focus:outline-none focus:ring-2 focus:ring-[#D97B3D] focus:border-transparent"
        />
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#1B2E4A]/10 shadow-sm">
        <table className="w-full text-left" role="table">
          <thead className="bg-[#1B2E4A] text-white">
            <tr>
              <SortHeader label="Rang" field="rang" />
              <SortHeader label="Departement" field="nom" />
              <SortHeader label="Audios" field="audios" />
              <SortHeader label="Population" field="population_totale" />
              <SortHeader label="Pop. 60+" field="population_60plus" />
              <SortHeader label="Ratio / 100k" field="ratio_100k" />
              <th scope="col" className="px-3 py-3 text-left font-sans text-sm font-semibold">Niveau</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((dept) => {
              const niv = NIVEAU_COLORS[dept.niveau];
              const isSelected = dept.code === selectedDept;
              return (
                <tr
                  key={dept.code}
                  id={`dept-row-${dept.code}`}
                  className={`border-b border-[#1B2E4A]/5 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#D97B3D]/10 ring-2 ring-inset ring-[#D97B3D]'
                      : 'hover:bg-[#F8F5F0] even:bg-white odd:bg-[#FAFAF8]'
                  }`}
                  onClick={() => onSelectDept(dept.code === selectedDept ? null : dept.code)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectDept(dept.code === selectedDept ? null : dept.code);
                    }
                  }}
                  aria-selected={isSelected}
                >
                  <td className="px-3 py-3 font-sans text-sm text-marine font-medium">{dept.rang}</td>
                  <td className="px-3 py-3 font-sans text-sm text-marine font-medium whitespace-nowrap">
                    {dept.nom} <span className="text-[#1B2E4A]/40">({dept.code})</span>
                  </td>
                  <td className="px-3 py-3 font-sans text-sm text-marine tabular-nums">{dept.audios}</td>
                  <td className="px-3 py-3 font-sans text-sm text-marine tabular-nums">{dept.population_totale.toLocaleString('fr-FR')}</td>
                  <td className="px-3 py-3 font-sans text-sm text-marine tabular-nums">{dept.population_60plus.toLocaleString('fr-FR')}</td>
                  <td className="px-3 py-3 font-sans text-sm text-marine font-semibold tabular-nums">{dept.ratio_100k}</td>
                  <td className="px-3 py-3">
                    <span
                      className="inline-block px-2 py-0.5 rounded-full font-sans text-xs font-semibold"
                      style={{ backgroundColor: niv.bg, color: niv.text }}
                    >{niv.label}</span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center font-sans text-sm text-[#1B2E4A]/50">
                  Aucun departement ne correspond a votre recherche.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 font-sans text-xs text-[#1B2E4A]/40">
        {filtered.length} departement{filtered.length > 1 ? 's' : ''} affiche{filtered.length > 1 ? 's' : ''}
        {search.trim() ? ` sur ${data.length}` : ''}
      </p>
    </div>
  );
}

/* ===== Main component ===== */
export default function DepartementRanking({ data, selectedDept, onSelectDept }: DepartementRankingProps) {
  const [showFullTable, setShowFullTable] = useState(false);
  const [search, setSearch] = useState('');

  const sorted = useMemo(() => [...data].sort((a, b) => a.ratio_100k - b.ratio_100k), [data]);

  // Exclude DOM-TOM for metro rankings
  const metroSorted = useMemo(
    () => sorted.filter((d) => !['971', '972', '973', '974', '976'].includes(d.code)),
    [sorted]
  );

  const worst10 = metroSorted.slice(0, 10);
  const best5 = [...metroSorted].reverse().slice(0, 5);

  if (showFullTable) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-sans text-lg font-bold text-[#1B2E4A]">
            Classement complet des 101 departements
          </h3>
          <button
            type="button"
            onClick={() => setShowFullTable(false)}
            className="font-sans text-sm font-medium text-[#9A5515] underline hover:no-underline"
          >
            Revenir aux mini-classements
          </button>
        </div>
        <FullTable
          data={data}
          selectedDept={selectedDept}
          onSelectDept={onSelectDept}
          search={search}
          setSearch={setSearch}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Top 10 worst — full width table */}
      <div className="bg-white rounded-xl border border-[#1B2E4A]/10 shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-3 bg-[#FFEBEE] border-b border-[#C62828]/10">
          <h3 className="font-sans text-sm font-bold text-[#C62828]">
            Les 10 departements les plus sous-dotes (metropole)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#1B2E4A]/10">
                <th className="px-4 py-2.5 font-sans text-xs font-semibold text-[#1B2E4A]/50">Rang</th>
                <th className="px-4 py-2.5 font-sans text-xs font-semibold text-[#1B2E4A]/50">Departement</th>
                <th className="px-4 py-2.5 font-sans text-xs font-semibold text-[#1B2E4A]/50 text-right">Ratio / 100k</th>
                <th className="px-4 py-2.5 font-sans text-xs font-semibold text-[#1B2E4A]/50 text-center">Statut</th>
                <th className="px-4 py-2.5 font-sans text-xs font-semibold text-[#1B2E4A]/50">Action</th>
              </tr>
            </thead>
            <tbody>
              {worst10.map((dept) => {
                const niv = NIVEAU_COLORS[dept.niveau];
                return (
                  <tr
                    key={dept.code}
                    className="border-b border-[#1B2E4A]/5 last:border-0 hover:bg-[#F8F5F0] cursor-pointer transition-colors"
                    onClick={() => onSelectDept(dept.code)}
                  >
                    <td className="px-4 py-3 font-sans text-sm font-bold text-[#1B2E4A]/40">{dept.rang}</td>
                    <td className="px-4 py-3 font-sans text-sm font-medium text-[#1B2E4A] whitespace-nowrap">
                      {dept.nom} <span className="text-[#1B2E4A]/30">({dept.code})</span>
                    </td>
                    <td className="px-4 py-3 font-sans text-sm font-bold tabular-nums text-right" style={{ color: niv.text }}>
                      {dept.ratio_100k}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full font-sans text-xs font-semibold" style={{ backgroundColor: niv.bg, color: niv.text }}>
                        {niv.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href="/trouver-audioprothesiste"
                        className="font-sans text-xs font-semibold text-[#9A5515] underline hover:no-underline whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Trouver un centre
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Best 5 — compact */}
      <div className="bg-white rounded-xl border border-[#1B2E4A]/10 shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-3 bg-[#E8F5E9] border-b border-[#2E7D32]/10">
          <h3 className="font-sans text-sm font-bold text-[#2E7D32]">
            Les 5 departements les mieux dotes
          </h3>
        </div>
        <div className="py-1">
          {best5.map((dept) => (
            <MiniRow key={dept.code} dept={dept} onSelect={() => onSelectDept(dept.code)} />
          ))}
        </div>
      </div>

      {/* Show full table button */}
      <button
        type="button"
        onClick={() => setShowFullTable(true)}
        className="w-full py-3 px-4 bg-white border border-[#1B2E4A]/15 rounded-xl font-sans text-sm font-medium text-[#1B2E4A] hover:bg-[#F8F5F0] transition-colors"
      >
        Voir le classement complet des 101 departements
      </button>
    </div>
  );
}
