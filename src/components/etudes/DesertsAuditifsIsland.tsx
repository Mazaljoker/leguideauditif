import { useState, useCallback, useEffect, useRef } from 'react';
import DesertAuditifsMap from './DesertAuditifsMap';
import DepartementRanking from './DepartementRanking';

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

interface Props {
  data: DepartementData[];
}

export default function DesertsAuditifsIsland({ data }: Props) {
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const handleSelectDept = useCallback((code: string | null) => {
    setSelectedDept(code);
  }, []);

  // Scroll table row into view when selected from map
  useEffect(() => {
    if (selectedDept && tableRef.current) {
      const row = tableRef.current.querySelector(`#dept-row-${selectedDept}`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedDept]);

  return (
    <div>
      <div className="mb-12">
        <h2 className="font-sans text-2xl font-bold text-[#1B2E4A] mb-6" id="carte">
          Carte interactive des deserts auditifs
        </h2>
        <DesertAuditifsMap
          data={data}
          selectedDept={selectedDept}
          onSelectDept={handleSelectDept}
        />
      </div>

      <div ref={tableRef}>
        <h2 className="font-sans text-2xl font-bold text-[#1B2E4A] mb-6" id="classement">
          Classement des 101 departements
        </h2>
        <DepartementRanking
          data={data}
          selectedDept={selectedDept}
          onSelectDept={handleSelectDept}
        />
      </div>
    </div>
  );
}
