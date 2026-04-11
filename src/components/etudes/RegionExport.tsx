import { useState, useMemo } from 'react';

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

interface RegionExportProps {
  data: DepartementData[];
}

const REGIONS: Record<string, { nom: string; depts: string[] }> = {
  'idf': { nom: 'Ile-de-France', depts: ['75', '77', '78', '91', '92', '93', '94', '95'] },
  'hdf': { nom: 'Hauts-de-France', depts: ['02', '59', '60', '62', '80'] },
  'nor': { nom: 'Normandie', depts: ['14', '27', '50', '61', '76'] },
  'bre': { nom: 'Bretagne', depts: ['22', '29', '35', '56'] },
  'pdl': { nom: 'Pays de la Loire', depts: ['44', '49', '53', '72', '85'] },
  'cvl': { nom: 'Centre-Val de Loire', depts: ['18', '28', '36', '37', '41', '45'] },
  'ges': { nom: 'Grand Est', depts: ['08', '10', '51', '52', '54', '55', '57', '67', '68', '88'] },
  'bfc': { nom: 'Bourgogne-Franche-Comte', depts: ['21', '25', '39', '58', '70', '71', '89', '90'] },
  'ara': { nom: 'Auvergne-Rhone-Alpes', depts: ['01', '03', '07', '15', '26', '38', '42', '43', '63', '69', '73', '74'] },
  'naq': { nom: 'Nouvelle-Aquitaine', depts: ['16', '17', '19', '23', '24', '33', '40', '47', '64', '79', '86', '87'] },
  'occ': { nom: 'Occitanie', depts: ['09', '11', '12', '30', '31', '32', '34', '46', '48', '65', '66', '81', '82'] },
  'pac': { nom: 'Provence-Alpes-Cote d\'Azur', depts: ['04', '05', '06', '13', '83', '84'] },
  'cor': { nom: 'Corse', depts: ['2A', '2B'] },
};

export default function RegionExport({ data }: RegionExportProps) {
  const [selectedRegion, setSelectedRegion] = useState('');

  const regionData = useMemo(() => {
    if (!selectedRegion) return null;
    const region = REGIONS[selectedRegion];
    if (!region) return null;
    const depts = data
      .filter((d) => region.depts.includes(d.code))
      .sort((a, b) => a.ratio_100k - b.ratio_100k);
    const totalAudios = depts.reduce((s, d) => s + d.audios, 0);
    const totalPop = depts.reduce((s, d) => s + d.population_totale, 0);
    const avgRatio = totalPop > 0 ? Math.round((totalAudios / totalPop) * 100000 * 100) / 100 : 0;
    return { region, depts, totalAudios, totalPop, avgRatio };
  }, [data, selectedRegion]);

  const handleCopyCSV = () => {
    if (!regionData) return;
    const header = 'Departement;Code;Audioprothesistes;Population;Pop 60+;Ratio/100k;Niveau';
    const rows = regionData.depts.map(
      (d) => `${d.nom};${d.code};${d.audios};${d.population_totale};${d.population_60plus};${d.ratio_100k};${d.niveau}`
    );
    const csv = [header, ...rows].join('\n');
    navigator.clipboard.writeText(csv);
  };

  return (
    <div className="bg-white rounded-2xl border border-[#1B2E4A]/10 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-[#1B2E4A]/5">
        <div className="flex items-center gap-2 mb-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1B2E4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <h3 className="font-sans text-lg font-bold text-[#1B2E4A]">
            Donnees par region (pour les journalistes)
          </h3>
        </div>
        <p className="font-sans text-sm text-[#1B2E4A]/50">
          Selectionnez une region pour afficher et copier les donnees departementales.
        </p>
      </div>

      <div className="px-6 py-4">
        <label htmlFor="region-select" className="sr-only">Choisir une region</label>
        <select
          id="region-select"
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value)}
          className="w-full max-w-sm px-4 py-3 rounded-lg border border-[#1B2E4A]/20 font-sans text-base text-[#1B2E4A] bg-white focus:outline-none focus:ring-2 focus:ring-[#D97B3D]"
        >
          <option value="">Choisir une region...</option>
          {Object.entries(REGIONS).map(([key, r]) => (
            <option key={key} value={key}>{r.nom}</option>
          ))}
        </select>
      </div>

      {regionData && (
        <>
          {/* Region summary */}
          <div className="px-6 pb-3">
            <div className="flex flex-wrap gap-4 text-sm font-sans">
              <span className="text-[#1B2E4A]"><strong>{regionData.depts.length}</strong> departements</span>
              <span className="text-[#1B2E4A]"><strong>{regionData.totalAudios}</strong> audioprothesistes</span>
              <span className="text-[#1B2E4A]">Ratio regional : <strong>{regionData.avgRatio}</strong> / 100k</span>
            </div>
          </div>

          {/* Compact table */}
          <div className="px-6 pb-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#1B2E4A]/10">
                  <th className="py-2 pr-3 font-sans font-semibold text-[#1B2E4A]/50">Departement</th>
                  <th className="py-2 pr-3 font-sans font-semibold text-[#1B2E4A]/50 text-right">Audios</th>
                  <th className="py-2 pr-3 font-sans font-semibold text-[#1B2E4A]/50 text-right">Population</th>
                  <th className="py-2 font-sans font-semibold text-[#1B2E4A]/50 text-right">Ratio</th>
                </tr>
              </thead>
              <tbody>
                {regionData.depts.map((d) => (
                  <tr key={d.code} className="border-b border-[#1B2E4A]/5 last:border-0">
                    <td className="py-2 pr-3 font-sans text-[#1B2E4A]">{d.nom} ({d.code})</td>
                    <td className="py-2 pr-3 font-sans text-[#1B2E4A] text-right tabular-nums">{d.audios}</td>
                    <td className="py-2 pr-3 font-sans text-[#1B2E4A] text-right tabular-nums">{d.population_totale.toLocaleString('fr-FR')}</td>
                    <td className="py-2 font-sans font-semibold text-right tabular-nums" style={{ color: d.niveau === 'rouge' ? '#C62828' : d.niveau === 'orange' ? '#E65100' : d.niveau === 'jaune' ? '#F57F17' : '#2E7D32' }}>
                      {d.ratio_100k}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Copy button */}
          <div className="px-6 py-4 bg-[#F8F5F0] border-t border-[#1B2E4A]/5">
            <button
              type="button"
              onClick={handleCopyCSV}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1B2E4A] text-white font-sans text-sm font-semibold rounded-lg hover:bg-[#2a4570] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
              Copier les donnees (CSV)
            </button>
            <span className="ml-3 font-sans text-xs text-[#1B2E4A]/40">Format tableur, pret a coller</span>
          </div>
        </>
      )}
    </div>
  );
}
