/**
 * AudiogramSimulator v3 — Audiogramme complet interactif
 * 7 points draggables (un par frequence), courbe, perte moyenne BIAP
 * PAS de diagnostic, PAS de recommandation produit
 */
import { useState, useCallback, useMemo, useRef } from 'react';

const BIAP_LEVELS = [
  { min: 0, max: 20, label: 'Audition normale', color: '#16a34a', bg: '#dcfce7' },
  { min: 21, max: 40, label: 'Perte legere', color: '#ca8a04', bg: '#fef9c3' },
  { min: 41, max: 70, label: 'Perte moyenne', color: '#ea580c', bg: '#ffedd5' },
  { min: 71, max: 90, label: 'Perte severe', color: '#dc2626', bg: '#fee2e2' },
  { min: 91, max: 120, label: 'Perte profonde', color: '#991b1b', bg: '#fecaca' },
] as const;

const FREQUENCIES = [125, 250, 500, 1000, 2000, 4000, 8000] as const;
const FREQ_LABELS = ['125', '250', '500', '1k', '2k', '4k', '8k'] as const;

/** Frequences utilisees pour le calcul BIAP (500, 1000, 2000, 4000 Hz) */
const BIAP_FREQ_INDICES = [2, 3, 4, 5] as const;

const PRESETS = [
  {
    label: 'Normal',
    values: [5, 5, 10, 10, 10, 15, 15],
    desc: 'Audition normale, tous seuils < 20 dB',
  },
  {
    label: 'Presbyacousie',
    values: [10, 10, 15, 25, 40, 55, 65],
    desc: 'Perte typique liee a l\'age : chute sur les aigus',
  },
  {
    label: 'Transmission',
    values: [40, 40, 45, 45, 40, 40, 35],
    desc: 'Perte plate ~40 dB, oreille interne intacte',
  },
  {
    label: 'Severe',
    values: [50, 55, 65, 75, 80, 85, 90],
    desc: 'Perte severe a profonde, appareillage indispensable',
  },
] as const;

// ─── Geometrie SVG ──────────────────────────────────────────
const SVG_W = 600;
const SVG_H = 420;
const PAD = { top: 28, right: 16, bottom: 44, left: 48 };
const GRID_W = SVG_W - PAD.left - PAD.right;
const GRID_H = SVG_H - PAD.top - PAD.bottom;

function freqToX(idx: number): number {
  return PAD.left + (idx / (FREQUENCIES.length - 1)) * GRID_W;
}

function dbToY(db: number): number {
  return PAD.top + (db / 120) * GRID_H;
}

function yToDb(y: number): number {
  const raw = ((y - PAD.top) / GRID_H) * 120;
  return Math.round(Math.max(0, Math.min(120, raw)) / 5) * 5;
}

function xToFreqIndex(x: number): number {
  const ratio = (x - PAD.left) / GRID_W;
  return Math.round(Math.max(0, Math.min(FREQUENCIES.length - 1, ratio * (FREQUENCIES.length - 1))));
}

function getBiapLevel(db: number): (typeof BIAP_LEVELS)[number] {
  for (const level of BIAP_LEVELS) {
    if (db <= level.max) return level;
  }
  return BIAP_LEVELS[BIAP_LEVELS.length - 1];
}

// ─── Composant ──────────────────────────────────────────────
export default function AudiogramSimulator() {
  const [values, setValues] = useState<number[]>([10, 10, 15, 15, 15, 20, 20]);
  const [selected, setSelected] = useState(3); // 1000 Hz par defaut
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Perte moyenne BIAP (500, 1000, 2000, 4000 Hz)
  const biapAverage = useMemo(() => {
    const sum = BIAP_FREQ_INDICES.reduce((acc, idx) => acc + values[idx], 0);
    return Math.round(sum / BIAP_FREQ_INDICES.length);
  }, [values]);

  const averageLevel = useMemo(() => getBiapLevel(biapAverage), [biapAverage]);
  const selectedLevel = useMemo(() => getBiapLevel(values[selected]), [values, selected]);

  const updatePoint = useCallback((idx: number, db: number) => {
    setValues(prev => {
      const next = [...prev];
      next[idx] = db;
      return next;
    });
    setActivePreset(null);
  }, []);

  const handlePreset = useCallback((idx: number) => {
    setValues([...PRESETS[idx].values]);
    setActivePreset(idx);
  }, []);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updatePoint(selected, Number(e.target.value));
  }, [selected, updatePoint]);

  // ─── SVG interaction (click + drag) ───────────────────────
  const getSvgCoords = useCallback((e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: (clientX - rect.left) * (SVG_W / rect.width),
      y: (clientY - rect.top) * (SVG_H / rect.height),
    };
  }, []);

  const handleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (dragging !== null) return; // click apres drag, ignorer
    const coords = getSvgCoords(e);
    if (!coords) return;
    if (coords.x < PAD.left || coords.x > PAD.left + GRID_W) return;
    if (coords.y < PAD.top || coords.y > PAD.top + GRID_H) return;
    const idx = xToFreqIndex(coords.x);
    const db = yToDb(coords.y);
    setSelected(idx);
    updatePoint(idx, db);
  }, [dragging, getSvgCoords, updatePoint]);

  const handlePointDown = useCallback((idx: number, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDragging(idx);
    setSelected(idx);
  }, []);

  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (dragging === null) return;
    const coords = getSvgCoords(e);
    if (!coords) return;
    updatePoint(dragging, yToDb(coords.y));
  }, [dragging, getSvgCoords, updatePoint]);

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  // Courbe polyline
  const curvePath = values.map((db, i) => `${freqToX(i)},${dbToY(db)}`).join(' ');

  // Zone de parole
  const speechX1 = freqToX(2); // 500 Hz
  const speechX2 = freqToX(5); // 4000 Hz

  return (
    <div className="bg-[#F8F5F0] border border-[#E8E4DF] rounded-2xl p-5 sm:p-7 my-8">
      {/* Header */}
      <h3 className="font-sans text-xl font-bold text-[#1B2E4A] mb-1">
        Simulateur d'audiogramme
      </h3>
      <p className="font-sans text-sm text-[#6B6560] mb-4">
        Cliquez sur la grille pour placer les points, ou glissez-les pour dessiner votre audiogramme.
      </p>

      {/* Presets */}
      <div className="flex flex-wrap gap-2 mb-4">
        {PRESETS.map((p, i) => (
          <button
            type="button"
            key={p.label}
            onClick={() => handlePreset(i)}
            className="font-sans text-[13px] font-medium px-4 py-2 rounded-lg border transition-all"
            style={{
              backgroundColor: activePreset === i ? '#1B2E4A' : '#fff',
              color: activePreset === i ? '#fff' : '#1B2E4A',
              borderColor: activePreset === i ? '#1B2E4A' : '#CBD5E1',
            }}
            aria-label={p.desc}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Curseur pour le point selectionne */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5 bg-white rounded-xl px-4 py-3 border border-[#E2E8F0]">
        <label htmlFor="sim-db" className="font-sans text-sm font-semibold text-[#1B2E4A] shrink-0">
          {FREQ_LABELS[selected]} Hz :{' '}
          <span style={{ color: selectedLevel.color }}>{values[selected]} dB</span>
        </label>
        <input
          id="sim-db"
          type="range"
          min={0}
          max={120}
          step={5}
          value={values[selected]}
          onChange={handleSliderChange}
          aria-label={`Intensite a ${FREQUENCIES[selected]} Hz : ${values[selected]} decibels`}
          aria-valuemin={0}
          aria-valuemax={120}
          aria-valuenow={values[selected]}
          className="sim-slider flex-1"
          style={{ '--slider-color': selectedLevel.color } as React.CSSProperties}
        />
        <span className="font-sans text-xs text-[#94A3B8] shrink-0">{values[selected]} dB</span>
      </div>

      {/* Grille SVG */}
      <div className="overflow-hidden -mx-2 px-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full mx-auto select-none"
          style={{ maxWidth: 600, cursor: dragging !== null ? 'grabbing' : 'crosshair', touchAction: 'none' }}
          role="img"
          aria-label={`Audiogramme complet — perte moyenne ${biapAverage} dB : ${averageLevel.label}`}
          onClick={handleSvgClick}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        >
          {/* Bandes BIAP */}
          {BIAP_LEVELS.map((band) => {
            const y1 = dbToY(band.min);
            const y2 = dbToY(Math.min(band.max, 120));
            return (
              <rect key={band.label} x={PAD.left} y={y1} width={GRID_W} height={y2 - y1}
                fill={band.color} opacity={0.08} />
            );
          })}

          {/* Zone de parole */}
          <rect x={speechX1} y={dbToY(15)} width={speechX2 - speechX1}
            height={dbToY(65) - dbToY(15)} fill="#1B2E4A" opacity={0.04} rx="4" />
          <text x={(speechX1 + speechX2) / 2} y={dbToY(18)} textAnchor="middle"
            fill="#1B2E4A" fontSize="9" fontFamily="Inter, sans-serif" fontWeight="500"
            opacity={0.3} dominantBaseline="central">
            Zone de la parole
          </text>

          {/* Lignes horizontales dB */}
          {[0, 20, 40, 60, 80, 100, 120].map((d) => {
            const y = dbToY(d);
            return (
              <g key={`db-${d}`}>
                <line x1={PAD.left} y1={y} x2={PAD.left + GRID_W} y2={y}
                  stroke="#CBD5E1" strokeWidth={d % 40 === 0 ? '0.8' : '0.4'} />
                <text x={PAD.left - 6} y={y} textAnchor="end" fill="#64748B"
                  fontSize="10" fontFamily="Inter, sans-serif" dominantBaseline="central">
                  {d}
                </text>
              </g>
            );
          })}

          {/* Lignes verticales frequences */}
          {FREQUENCIES.map((_, i) => {
            const x = freqToX(i);
            return (
              <g key={`freq-${i}`}>
                <line x1={x} y1={PAD.top} x2={x} y2={PAD.top + GRID_H}
                  stroke="#CBD5E1" strokeWidth="0.4" />
                <text x={x} y={PAD.top + GRID_H + 14} textAnchor="middle"
                  fill="#64748B" fontSize="10" fontFamily="Inter, sans-serif">
                  {FREQ_LABELS[i]}
                </text>
              </g>
            );
          })}

          {/* Labels axes */}
          <text x={PAD.left + GRID_W / 2} y={SVG_H - 4} textAnchor="middle"
            fill="#1B2E4A" fontSize="11" fontFamily="Inter, sans-serif" fontWeight="600">
            Frequences (Hz)
          </text>
          <text x={12} y={PAD.top + GRID_H / 2} textAnchor="middle"
            fill="#1B2E4A" fontSize="11" fontFamily="Inter, sans-serif" fontWeight="600"
            transform={`rotate(-90, 12, ${PAD.top + GRID_H / 2})`}>
            Intensite (dB HL)
          </text>

          {/* Bordure */}
          <rect x={PAD.left} y={PAD.top} width={GRID_W} height={GRID_H}
            fill="none" stroke="#94A3B8" strokeWidth="1" />

          {/* Ligne moyenne BIAP (pointillee) */}
          <line x1={PAD.left} y1={dbToY(biapAverage)} x2={PAD.left + GRID_W} y2={dbToY(biapAverage)}
            stroke={averageLevel.color} strokeWidth="1.5" strokeDasharray="6 4" opacity={0.5} />
          <text x={PAD.left + GRID_W + 2} y={dbToY(biapAverage)} fill={averageLevel.color}
            fontSize="9" fontFamily="Inter, sans-serif" fontWeight="600" dominantBaseline="central">
            Moy.
          </text>

          {/* Courbe audiogramme */}
          <polyline
            points={curvePath}
            fill="none"
            stroke="#dc2626"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={0.8}
          />

          {/* Points interactifs */}
          {values.map((db, i) => {
            const x = freqToX(i);
            const y = dbToY(db);
            const isSelected = i === selected;
            const ptLevel = getBiapLevel(db);
            return (
              <g key={`pt-${i}`}
                onMouseDown={(e) => handlePointDown(i, e)}
                onTouchStart={(e) => handlePointDown(i, e)}
                style={{ cursor: 'grab' }}
              >
                {/* Zone de touch elargie (44px) */}
                <circle cx={x} cy={y} r="22" fill="transparent" />

                {/* Halo selection */}
                {isSelected && (
                  <circle cx={x} cy={y} r="18" fill={ptLevel.color} opacity={0.12}
                    className="sim-halo" />
                )}

                {/* Cercle principal — O rouge (convention oreille droite) */}
                <circle cx={x} cy={y}
                  r={isSelected ? 11 : 8}
                  fill={isSelected ? ptLevel.color : '#dc2626'}
                  stroke="#fff" strokeWidth={isSelected ? 3 : 2.5}
                  className="drop-shadow-md"
                />

                {/* Label dB sur le point selectionne */}
                {isSelected && (
                  <>
                    <rect x={x + 15} y={y - 12} width="48" height="20" rx="4"
                      fill={ptLevel.color} opacity={0.92} />
                    <text x={x + 39} y={y - 2} textAnchor="middle" fill="#fff"
                      fontSize="10" fontFamily="Inter, sans-serif" fontWeight="700"
                      dominantBaseline="central">
                      {db} dB
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Resultat global */}
      <div className="mt-5 rounded-xl px-5 py-4 font-sans border-2"
        style={{ backgroundColor: averageLevel.bg, borderColor: averageLevel.color }}>
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg"
            style={{ backgroundColor: averageLevel.color }} aria-hidden="true">
            {biapAverage <= 20 ? '\u2713' : biapAverage <= 70 ? '!' : '\u26A0'}
          </span>
          <div className="flex-1">
            <p className="text-base font-bold text-[#1B2E4A] mb-1">
              Perte moyenne : <span style={{ color: averageLevel.color }}>{biapAverage} dB — {averageLevel.label}</span>
            </p>
            <p className="text-sm text-[#1B2E4A] opacity-75 mb-2">
              Moyenne calculee sur 500, 1 000, 2 000 et 4 000 Hz (classification BIAP).
            </p>
            {/* Detail par frequence */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#6B6560]">
              {values.map((db, i) => (
                <span key={i} className="inline-flex items-center gap-1"
                  style={{ fontWeight: i === selected ? 700 : 400,
                    color: i === selected ? getBiapLevel(db).color : undefined }}>
                  {FREQ_LABELS[i]}: {db} dB
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legende BIAP */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
        {BIAP_LEVELS.map((band) => {
          const isActive = biapAverage >= band.min && biapAverage <= band.max;
          return (
            <div key={band.label}
              className="flex items-center gap-2 rounded-lg px-3 py-2 font-sans text-xs"
              style={{
                backgroundColor: isActive ? band.bg : '#fff',
                border: isActive ? `2px solid ${band.color}` : '1px solid #E2E8F0',
              }}>
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: band.color }} />
              <span className="text-[#1B2E4A] font-medium leading-tight">
                {band.min}-{band.max} dB<br />
                <span className="font-normal text-[#6B6560]">{band.label}</span>
              </span>
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <p className="mt-5 font-sans text-xs text-[#94A3B8] leading-relaxed">
        Cet outil est a visee educative uniquement. Il ne constitue pas un examen
        medical et ne remplace en aucun cas un audiogramme professionnel realise en
        cabine insonorisee. Consultez un audioprothesiste ou un ORL pour un bilan
        auditif complet.
      </p>

      {/* Styles */}
      <style>{`
        .sim-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 6px;
          background: #E2E8F0;
          cursor: pointer;
          min-height: 44px;
          outline: none;
        }
        .sim-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--slider-color, #D97B3D);
          border: 3px solid #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.18);
          cursor: grab;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .sim-slider::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 2px 12px rgba(0,0,0,0.25);
        }
        .sim-slider::-webkit-slider-thumb:active { cursor: grabbing; }
        .sim-slider::-moz-range-thumb {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--slider-color, #D97B3D);
          border: 3px solid #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.18);
          cursor: grab;
        }
        .sim-slider:focus-visible {
          outline: 3px solid rgba(217, 123, 61, 0.4);
          outline-offset: 2px;
        }
        @keyframes sim-pulse {
          0%, 100% { r: 18; opacity: 0.12; }
          50% { r: 24; opacity: 0.06; }
        }
        .sim-halo { animation: sim-pulse 2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .sim-halo { animation: none; }
          .sim-slider::-webkit-slider-thumb { transition: none; }
        }
      `}</style>
    </div>
  );
}
