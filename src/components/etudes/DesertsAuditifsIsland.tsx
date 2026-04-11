import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import DesertAuditifsMap from './DesertAuditifsMap';
import DepartementRanking from './DepartementRanking';
import DepartementCard from './DepartementCard';
import RegionExport from './RegionExport';

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

interface Metadata {
  moyenne_nationale: number;
}

interface Props {
  data: DepartementData[];
  metadata: Metadata;
}

export default function DesertsAuditifsIsland({ data, metadata }: Props) {
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<DepartementData[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const selectedData = useMemo(
    () => data.find((d) => d.code === selectedDept) || null,
    [data, selectedDept]
  );

  const handleSelectDept = useCallback((code: string | null) => {
    setSelectedDept(code);
    setSearchQuery('');
    setShowSuggestions(false);
  }, []);

  // Scroll card into view when selected
  useEffect(() => {
    if (selectedDept && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedDept]);

  // Search suggestions
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const q = searchQuery.trim().toLowerCase();

    // Code postal → departement mapping
    const isPostalCode = /^\d{2,5}$/.test(q);
    if (isPostalCode) {
      let deptCode: string;
      if (q.startsWith('97') || q.startsWith('98')) {
        deptCode = q.slice(0, 3);
      } else if (q.startsWith('20')) {
        deptCode = parseInt(q, 10) < 20200 ? '2A' : '2B';
      } else {
        deptCode = q.slice(0, 2);
      }
      const match = data.filter((d) => d.code === deptCode);
      setSuggestions(match);
      return;
    }

    const matches = data.filter(
      (d) => d.nom.toLowerCase().includes(q) || d.code.startsWith(q)
    ).slice(0, 6);
    setSuggestions(matches);
  }, [searchQuery, data]);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div>
      {/* Map */}
      <div className="mb-8">
        <h2 className="font-sans text-2xl font-bold text-[#1B2E4A] mb-6" id="carte">
          Carte interactive des deserts auditifs
        </h2>
        <DesertAuditifsMap
          data={data}
          selectedDept={selectedDept}
          onSelectDept={handleSelectDept}
        />
      </div>

      {/* Search bar */}
      <div ref={searchRef} className="relative mb-8">
        <label htmlFor="dept-search" className="block font-sans text-base font-semibold text-[#1B2E4A] mb-2">
          Recherchez votre departement
        </label>
        <input
          id="dept-search"
          type="search"
          placeholder="Votre code postal ou nom de departement..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          className="w-full max-w-lg px-5 py-4 rounded-xl border-2 border-[#1B2E4A]/15 font-sans text-lg text-[#1B2E4A] bg-white placeholder:text-[#1B2E4A]/30 focus:outline-none focus:ring-2 focus:ring-[#D97B3D] focus:border-[#D97B3D]"
        />

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 max-w-lg mt-1 bg-white rounded-xl border border-[#1B2E4A]/15 shadow-lg overflow-hidden">
            {suggestions.map((dept) => (
              <button
                type="button"
                key={dept.code}
                onClick={() => handleSelectDept(dept.code)}
                className="flex items-center justify-between w-full px-5 py-3 text-left hover:bg-[#F8F5F0] transition-colors border-b border-[#1B2E4A]/5 last:border-0"
              >
                <span className="font-sans text-base text-[#1B2E4A]">
                  {dept.nom} <span className="text-[#1B2E4A]/40">({dept.code})</span>
                </span>
                <span className="font-sans text-sm font-semibold tabular-nums" style={{ color: dept.niveau === 'rouge' ? '#C62828' : dept.niveau === 'orange' ? '#E65100' : dept.niveau === 'jaune' ? '#F57F17' : '#2E7D32' }}>
                  {dept.ratio_100k} / 100k
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Department card (when selected) */}
      {selectedData && (
        <div ref={cardRef} className="mb-8">
          <DepartementCard
            dept={selectedData}
            moyenneNationale={metadata.moyenne_nationale}
            totalDepts={data.length}
            onClose={() => handleSelectDept(null)}
          />
        </div>
      )}

      {/* Rankings */}
      <div className="mb-12">
        <h2 className="font-sans text-2xl font-bold text-[#1B2E4A] mb-6" id="classement">
          Classement par departement
        </h2>
        <DepartementRanking
          data={data}
          selectedDept={selectedDept}
          onSelectDept={handleSelectDept}
        />
      </div>

      {/* Region export for journalists */}
      <div>
        <h2 className="font-sans text-2xl font-bold text-[#1B2E4A] mb-6" id="donnees-region">
          Donnees par region
        </h2>
        <RegionExport data={data} />
      </div>
    </div>
  );
}
