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

/* ===== Component ===== */
export default function DepartementRanking({ data, selectedDept, onSelectDept }: DepartementRankingProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('rang');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'nom' ? 'asc' : 'asc');
    }
  };

  const filtered = useMemo(() => {
    let result = [...data];

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (d) => d.nom.toLowerCase().includes(q) || d.code.includes(q)
      );
    }

    // Sort
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
      {/* Search bar */}
      <div className="mb-4">
        <label htmlFor="dept-search" className="sr-only">
          Rechercher un departement
        </label>
        <input
          id="dept-search"
          type="search"
          placeholder="Rechercher un departement (nom ou code)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-3 rounded-lg border border-[#1B2E4A]/20 font-sans text-base text-marine bg-white placeholder:text-[#1B2E4A]/40 focus:outline-none focus:ring-2 focus:ring-[#D97B3D] focus:border-transparent"
        />
      </div>

      {/* Table wrapper for horizontal scroll on mobile */}
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
              <th scope="col" className="px-3 py-3 text-left font-sans text-sm font-semibold">
                Niveau
              </th>
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
                  <td className="px-3 py-3 font-sans text-sm text-marine tabular-nums">
                    {dept.population_totale.toLocaleString('fr-FR')}
                  </td>
                  <td className="px-3 py-3 font-sans text-sm text-marine tabular-nums">
                    {dept.population_60plus.toLocaleString('fr-FR')}
                  </td>
                  <td className="px-3 py-3 font-sans text-sm text-marine font-semibold tabular-nums">
                    {dept.ratio_100k}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className="inline-block px-2 py-0.5 rounded-full font-sans text-xs font-semibold"
                      style={{ backgroundColor: niv.bg, color: niv.text }}
                    >
                      {niv.label}
                    </span>
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
