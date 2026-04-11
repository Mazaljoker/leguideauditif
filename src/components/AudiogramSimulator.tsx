/**
 * AudiogramSimulator v2 — Outil educatif interactif
 * Click/tap sur grille, curseurs accessibles, exemples predefinis, zone parole
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

const PRESETS = [
  { label: 'Normal', freqIdx: 3, db: 10, desc: 'Audition normale a 1 000 Hz' },
  { label: 'Presbyacousie', freqIdx: 5, db: 55, desc: 'Perte typique sur les aigus (4 000 Hz)' },
  { label: 'Perte severe', freqIdx: 3, db: 80, desc: 'Perte severe a 1 000 Hz' },
] as const;

/** Frequences log → position X */
function freqToX(freq: number, left: number, width: number): number {
  const logMin = Math.log2(125);
  const logMax = Math.log2(8000);
  return left + ((Math.log2(freq) - logMin) / (logMax - logMin)) * width;
}

/** dB → position Y */
function dbToY(db: number, top: number, height: number): number {
  return top + (db / 120) * height;
}

/** Position X → index de frequence le plus proche */
function xToFreqIndex(x: number, left: number, width: number): number {
  const logMin = Math.log2(125);
  const logMax = Math.log2(8000);
  const ratio = Math.max(0, Math.min(1, (x - left) / width));
  const logFreq = logMin + ratio * (logMax - logMin);
  const freq = Math.pow(2, logFreq);
  let closest = 0;
  let minDist = Infinity;
  for (let i = 0; i < FREQUENCIES.length; i++) {
    const dist = Math.abs(Math.log2(FREQUENCIES[i]) - Math.log2(freq));
    if (dist < minDist) { minDist = dist; closest = i; }
  }
  return closest;
}

/** Position Y → dB (arrondi a 5) */
function yToDb(y: number, top: number, height: number): number {
  const raw = ((y - top) / height) * 120;
  return Math.round(Math.max(0, Math.min(120, raw)) / 5) * 5;
}

function getBiapLevel(db: number): (typeof BIAP_LEVELS)[number] {
  for (const level of BIAP_LEVELS) {
    if (db <= level.max) return level;
  }
  return BIAP_LEVELS[BIAP_LEVELS.length - 1];
}

export default function AudiogramSimulator() {
  const [freqIndex, setFreqIndex] = useState(3);
  const [db, setDb] = useState(30);
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const freq = FREQUENCIES[freqIndex];
  const level = useMemo(() => getBiapLevel(db), [db]);

  const handleFreqChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFreqIndex(Number(e.target.value));
    setActivePreset(null);
  }, []);

  const handleDbChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDb(Number(e.target.value));
    setActivePreset(null);
  }, []);

  const handlePreset = useCallback((idx: number) => {
    const p = PRESETS[idx];
    setFreqIndex(p.freqIdx);
    setDb(p.db);
    setActivePreset(idx);
  }, []);

  // SVG dimensions
  const svgW = 600;
  const svgH = 400;
  const pad = { top: 24, right: 16, bottom: 44, left: 48 };
  const gridW = svgW - pad.left - pad.right;
  const gridH = svgH - pad.top - pad.bottom;

  const pointX = freqToX(freq, pad.left, gridW);
  const pointY = dbToY(db, pad.top, gridH);

  /** Click/tap sur la grille SVG */
  const handleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Convertir coords ecran → coords SVG
    const scaleX = svgW / rect.width;
    const scaleY = svgH / rect.height;
    const svgX = (clientX - rect.left) * scaleX;
    const svgY = (clientY - rect.top) * scaleY;

    // Verifier qu'on est dans la grille
    if (svgX < pad.left || svgX > pad.left + gridW) return;
    if (svgY < pad.top || svgY > pad.top + gridH) return;

    setFreqIndex(xToFreqIndex(svgX, pad.left, gridW));
    setDb(yToDb(svgY, pad.top, gridH));
    setActivePreset(null);
  }, [gridW, gridH]);

  // Zone de parole (500-4000 Hz)
  const speechX1 = freqToX(500, pad.left, gridW);
  const speechX2 = freqToX(4000, pad.left, gridW);

  return (
    <div className="bg-[#F8F5F0] border border-[#E8E4DF] rounded-2xl p-5 sm:p-7 my-8">
      {/* Header */}
      <h3 className="font-sans text-xl font-bold text-[#1B2E4A] mb-1">
        Simulateur d'audiogramme
      </h3>
      <p className="font-sans text-sm text-[#6B6560] mb-5">
        Cliquez sur la grille ou deplacez les curseurs pour explorer les degres de perte auditive (classification BIAP).
      </p>

      {/* Exemples predefinis */}
      <div className="flex flex-wrap gap-2 mb-5">
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
        <span className="self-center font-sans text-[11px] text-[#94A3B8] ml-1">
          ou cliquez sur la grille
        </span>
      </div>

      {/* Curseurs ameliores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="sim-freq" className="font-sans text-sm font-semibold text-[#1B2E4A]">
            Frequence : <span className="text-[#D97B3D]">{freq.toLocaleString('fr-FR')} Hz</span>
          </label>
          <input
            id="sim-freq"
            type="range"
            min={0}
            max={FREQUENCIES.length - 1}
            step={1}
            value={freqIndex}
            onChange={handleFreqChange}
            aria-label={`Frequence : ${freq} Hertz`}
            aria-valuemin={125}
            aria-valuemax={8000}
            aria-valuenow={freq}
            className="sim-slider"
          />
          <div className="flex justify-between font-sans text-[11px] text-[#94A3B8]">
            <span>125 Hz (graves)</span>
            <span>8 000 Hz (aigus)</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="sim-db" className="font-sans text-sm font-semibold text-[#1B2E4A]">
            Intensite : <span style={{ color: level.color }}>{db} dB HL</span>
          </label>
          <input
            id="sim-db"
            type="range"
            min={0}
            max={120}
            step={5}
            value={db}
            onChange={handleDbChange}
            aria-label={`Intensite : ${db} decibels`}
            aria-valuemin={0}
            aria-valuemax={120}
            aria-valuenow={db}
            className="sim-slider"
            style={{ '--slider-color': level.color } as React.CSSProperties}
          />
          <div className="flex justify-between font-sans text-[11px] text-[#94A3B8]">
            <span>0 dB (normal)</span>
            <span>120 dB (profond)</span>
          </div>
        </div>
      </div>

      {/* Grille SVG — cliquable */}
      <div className="overflow-hidden -mx-2 px-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full mx-auto cursor-crosshair"
          style={{ maxWidth: 600 }}
          role="img"
          aria-label={`Audiogramme : ${freq} Hz, ${db} dB — ${level.label}`}
          onClick={handleSvgClick}
          onTouchStart={handleSvgClick}
        >
          {/* Bandes BIAP */}
          {BIAP_LEVELS.map((band) => {
            const y1 = dbToY(band.min, pad.top, gridH);
            const y2 = dbToY(Math.min(band.max, 120), pad.top, gridH);
            return (
              <rect
                key={band.label}
                x={pad.left}
                y={y1}
                width={gridW}
                height={y2 - y1}
                fill={band.color}
                opacity={0.1}
              />
            );
          })}

          {/* Zone de parole (500-4000 Hz) */}
          <rect
            x={speechX1}
            y={dbToY(20, pad.top, gridH)}
            width={speechX2 - speechX1}
            height={dbToY(60, pad.top, gridH) - dbToY(20, pad.top, gridH)}
            fill="#1B2E4A"
            opacity={0.06}
            rx="4"
          />
          <text
            x={(speechX1 + speechX2) / 2}
            y={dbToY(40, pad.top, gridH)}
            textAnchor="middle"
            fill="#1B2E4A"
            fontSize="9"
            fontFamily="Inter, sans-serif"
            fontWeight="500"
            opacity={0.35}
            dominantBaseline="central"
          >
            Zone de la parole
          </text>

          {/* Lignes horizontales dB */}
          {[0, 20, 40, 60, 80, 100, 120].map((d) => {
            const y = dbToY(d, pad.top, gridH);
            return (
              <g key={`db-${d}`}>
                <line x1={pad.left} y1={y} x2={pad.left + gridW} y2={y}
                  stroke="#CBD5E1" strokeWidth={d % 40 === 0 ? '0.8' : '0.4'} />
                <text x={pad.left - 6} y={y} textAnchor="end" fill="#64748B"
                  fontSize="10" fontFamily="Inter, sans-serif" dominantBaseline="central">
                  {d}
                </text>
              </g>
            );
          })}

          {/* Lignes verticales frequences */}
          {FREQUENCIES.map((f, i) => {
            const x = freqToX(f, pad.left, gridW);
            return (
              <g key={`freq-${f}`}>
                <line x1={x} y1={pad.top} x2={x} y2={pad.top + gridH}
                  stroke="#CBD5E1" strokeWidth="0.4" />
                <text x={x} y={pad.top + gridH + 14} textAnchor="middle"
                  fill="#64748B" fontSize="10" fontFamily="Inter, sans-serif">
                  {FREQ_LABELS[i]}
                </text>
              </g>
            );
          })}

          {/* Labels axes */}
          <text x={pad.left + gridW / 2} y={svgH - 4} textAnchor="middle"
            fill="#1B2E4A" fontSize="11" fontFamily="Inter, sans-serif" fontWeight="600">
            Frequences (Hz)
          </text>
          <text x={12} y={pad.top + gridH / 2} textAnchor="middle"
            fill="#1B2E4A" fontSize="11" fontFamily="Inter, sans-serif" fontWeight="600"
            transform={`rotate(-90, 12, ${pad.top + gridH / 2})`}>
            Intensite (dB HL)
          </text>

          {/* Bordure grille */}
          <rect x={pad.left} y={pad.top} width={gridW} height={gridH}
            fill="none" stroke="#94A3B8" strokeWidth="1" />

          {/* Crosshairs */}
          <line x1={pointX} y1={pad.top} x2={pointX} y2={pad.top + gridH}
            stroke={level.color} strokeWidth="0.8" strokeDasharray="4 3" opacity={0.4}
            style={{ transition: 'x1 0.15s, x2 0.15s' }} />
          <line x1={pad.left} y1={pointY} x2={pad.left + gridW} y2={pointY}
            stroke={level.color} strokeWidth="0.8" strokeDasharray="4 3" opacity={0.4}
            style={{ transition: 'y1 0.15s, y2 0.15s' }} />

          {/* Halo anime */}
          <circle cx={pointX} cy={pointY} r="16" fill={level.color} opacity={0.12}
            className="sim-halo"
            style={{ transition: 'cx 0.15s, cy 0.15s' }} />

          {/* Point principal */}
          <circle cx={pointX} cy={pointY} r="10" fill={level.color}
            stroke="#fff" strokeWidth="3" className="drop-shadow-md"
            style={{ transition: 'cx 0.15s, cy 0.15s, fill 0.15s' }} />
          <circle cx={pointX} cy={pointY} r="3.5" fill="#fff"
            style={{ transition: 'cx 0.15s, cy 0.15s' }} />

          {/* Etiquette sur le point */}
          <rect x={pointX + 14} y={pointY - 12} width="52" height="20" rx="4"
            fill={level.color} opacity={0.9}
            style={{ transition: 'x 0.15s, y 0.15s, fill 0.15s' }} />
          <text x={pointX + 40} y={pointY - 2} textAnchor="middle"
            fill="#fff" fontSize="10" fontFamily="Inter, sans-serif" fontWeight="600"
            dominantBaseline="central"
            style={{ transition: 'x 0.15s, y 0.15s' }}>
            {db} dB
          </text>
        </svg>
      </div>

      {/* Resultat — gros bandeau colore */}
      <div
        className="mt-5 rounded-xl px-5 py-4 font-sans border-2"
        style={{ backgroundColor: level.bg, borderColor: level.color }}
      >
        <div className="flex items-start gap-3">
          <span
            className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg mt-0.5"
            style={{ backgroundColor: level.color }}
            aria-hidden="true"
          >
            {db <= 20 ? '\u2713' : db <= 70 ? '!' : '\u26A0'}
          </span>
          <div>
            <p className="text-base font-bold text-[#1B2E4A] mb-1">
              <span style={{ color: level.color }}>{level.label}</span>
            </p>
            <p className="text-sm text-[#1B2E4A] opacity-80">
              A <strong>{freq.toLocaleString('fr-FR')} Hz</strong> et{' '}
              <strong>{db} dB HL</strong> — classification BIAP.
              {db <= 20 && ' Aucune gene attendue a cette frequence.'}
              {db > 20 && db <= 40 && ' Difficulte a percevoir les voix faibles.'}
              {db > 40 && db <= 70 && ' Difficulte a suivre une conversation sans appareil.'}
              {db > 70 && db <= 90 && ' Seuls les sons forts sont percus.'}
              {db > 90 && ' Quasi-absence de perception a cette frequence.'}
            </p>
          </div>
        </div>
      </div>

      {/* Legende BIAP — vertical, lisible */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
        {BIAP_LEVELS.map((band) => (
          <div
            key={band.label}
            className="flex items-center gap-2 rounded-lg px-3 py-2 font-sans text-xs"
            style={{
              backgroundColor: db >= band.min && db <= band.max ? band.bg : '#fff',
              border: db >= band.min && db <= band.max ? `2px solid ${band.color}` : '1px solid #E2E8F0',
            }}
          >
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: band.color }} />
            <span className="text-[#1B2E4A] font-medium leading-tight">
              {band.min}-{band.max} dB<br />
              <span className="font-normal text-[#6B6560]">{band.label}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Disclaimer YMYL */}
      <p className="mt-5 font-sans text-xs text-[#94A3B8] leading-relaxed">
        Cet outil est a visee educative uniquement. Il ne constitue pas un examen
        medical et ne remplace en aucun cas un audiogramme professionnel realise en
        cabine insonorisee. Consultez un audioprothesiste ou un ORL pour un bilan
        auditif complet.
      </p>

      {/* Styles curseurs + halo */}
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
          0%, 100% { r: 16; opacity: 0.12; }
          50% { r: 22; opacity: 0.06; }
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
