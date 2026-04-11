/**
 * AudiogramSimulator — Outil educatif interactif
 * 2 curseurs (frequence + intensite) + grille SVG audiogramme + zones BIAP
 * PAS de diagnostic, PAS de recommandation produit
 */
import { useState, useCallback, useMemo } from 'react';

const BIAP_LEVELS = [
  { min: 0, max: 20, label: 'Audition normale', color: '#22c55e' },
  { min: 21, max: 40, label: 'Perte legere', color: '#eab308' },
  { min: 41, max: 70, label: 'Perte moyenne', color: '#f97316' },
  { min: 71, max: 90, label: 'Perte severe', color: '#ef4444' },
  { min: 91, max: 120, label: 'Perte profonde', color: '#991b1b' },
] as const;

const FREQUENCIES = [125, 250, 500, 1000, 2000, 4000, 8000] as const;
const FREQ_LABELS = ['125', '250', '500', '1k', '2k', '4k', '8k'] as const;

/** Convertit une frequence log en position X dans la grille SVG */
function freqToX(freq: number, left: number, width: number): number {
  const logMin = Math.log2(125);
  const logMax = Math.log2(8000);
  const ratio = (Math.log2(freq) - logMin) / (logMax - logMin);
  return left + ratio * width;
}

/** Convertit une intensite dB en position Y dans la grille SVG */
function dbToY(db: number, top: number, height: number): number {
  return top + (db / 120) * height;
}

function getBiapLevel(db: number): (typeof BIAP_LEVELS)[number] {
  for (const level of BIAP_LEVELS) {
    if (db <= level.max) return level;
  }
  return BIAP_LEVELS[BIAP_LEVELS.length - 1];
}

/** Trouve la frequence standard la plus proche */
function snapToNearestFreq(value: number): number {
  let closest = FREQUENCIES[0];
  let minDist = Infinity;
  for (const f of FREQUENCIES) {
    const dist = Math.abs(Math.log2(f) - Math.log2(value));
    if (dist < minDist) {
      minDist = dist;
      closest = f;
    }
  }
  return closest;
}

export default function AudiogramSimulator() {
  const [freqIndex, setFreqIndex] = useState(3); // 1000 Hz par defaut
  const [db, setDb] = useState(30);

  const freq = FREQUENCIES[freqIndex];
  const level = useMemo(() => getBiapLevel(db), [db]);

  const handleFreqChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFreqIndex(Number(e.target.value));
  }, []);

  const handleDbChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDb(Number(e.target.value));
  }, []);

  // Dimensions SVG
  const svgW = 560;
  const svgH = 380;
  const pad = { top: 30, right: 20, bottom: 40, left: 50 };
  const gridW = svgW - pad.left - pad.right;
  const gridH = svgH - pad.top - pad.bottom;

  const pointX = freqToX(freq, pad.left, gridW);
  const pointY = dbToY(db, pad.top, gridH);

  return (
    <div className="bg-[#F8F5F0] border border-gray-200 rounded-2xl p-5 sm:p-6 my-8">
      <h3 className="font-sans text-lg font-bold text-[#1B2E4A] mb-1">
        Simulateur d'audiogramme educatif
      </h3>
      <p className="font-sans text-sm text-gray-500 mb-5">
        Deplacez les curseurs pour explorer les differents degres de perte auditive
        selon la classification BIAP.
      </p>

      {/* Curseurs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="sim-freq"
            className="font-sans text-xs font-semibold text-gray-600"
          >
            Frequence : {freq.toLocaleString('fr-FR')} Hz
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
            className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-[#D97B3D] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#D97B3D]/40"
            style={{ minHeight: '44px' }}
          />
          <div className="flex justify-between font-sans text-[10px] text-gray-400">
            <span>125 Hz (graves)</span>
            <span>8 000 Hz (aigus)</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="sim-db"
            className="font-sans text-xs font-semibold text-gray-600"
          >
            Intensite : {db} dB HL
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
            className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-[#D97B3D] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#D97B3D]/40"
            style={{ minHeight: '44px' }}
          />
          <div className="flex justify-between font-sans text-[10px] text-gray-400">
            <span>0 dB (normal)</span>
            <span>120 dB (profond)</span>
          </div>
        </div>
      </div>

      {/* Grille SVG */}
      <div className="overflow-x-auto -mx-2 px-2">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full max-w-[560px] mx-auto"
          role="img"
          aria-label={`Audiogramme montrant un point a ${freq} Hz et ${db} dB, correspondant a : ${level.label}`}
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
                opacity={0.12}
              />
            );
          })}

          {/* Labels BIAP a droite */}
          {BIAP_LEVELS.map((band) => {
            const yMid = dbToY((band.min + Math.min(band.max, 120)) / 2, pad.top, gridH);
            return (
              <text
                key={`label-${band.label}`}
                x={pad.left + gridW - 4}
                y={yMid}
                textAnchor="end"
                fill={band.color}
                fontSize="9"
                fontFamily="Inter, sans-serif"
                fontWeight="600"
                dominantBaseline="central"
              >
                {band.label}
              </text>
            );
          })}

          {/* Lignes horizontales dB */}
          {[0, 20, 40, 60, 80, 100, 120].map((d) => {
            const y = dbToY(d, pad.top, gridH);
            return (
              <g key={`db-${d}`}>
                <line
                  x1={pad.left}
                  y1={y}
                  x2={pad.left + gridW}
                  y2={y}
                  stroke="#CBD5E1"
                  strokeWidth="0.5"
                />
                <text
                  x={pad.left - 8}
                  y={y}
                  textAnchor="end"
                  fill="#64748B"
                  fontSize="10"
                  fontFamily="Inter, sans-serif"
                  dominantBaseline="central"
                >
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
                <line
                  x1={x}
                  y1={pad.top}
                  x2={x}
                  y2={pad.top + gridH}
                  stroke="#CBD5E1"
                  strokeWidth="0.5"
                />
                <text
                  x={x}
                  y={pad.top + gridH + 16}
                  textAnchor="middle"
                  fill="#64748B"
                  fontSize="10"
                  fontFamily="Inter, sans-serif"
                >
                  {FREQ_LABELS[i]}
                </text>
              </g>
            );
          })}

          {/* Labels axes */}
          <text
            x={pad.left + gridW / 2}
            y={svgH - 4}
            textAnchor="middle"
            fill="#1B2E4A"
            fontSize="11"
            fontFamily="Inter, sans-serif"
            fontWeight="600"
          >
            Frequences (Hz)
          </text>
          <text
            x={12}
            y={pad.top + gridH / 2}
            textAnchor="middle"
            fill="#1B2E4A"
            fontSize="11"
            fontFamily="Inter, sans-serif"
            fontWeight="600"
            transform={`rotate(-90, 12, ${pad.top + gridH / 2})`}
          >
            Intensite (dB HL)
          </text>

          {/* Bordure grille */}
          <rect
            x={pad.left}
            y={pad.top}
            width={gridW}
            height={gridH}
            fill="none"
            stroke="#94A3B8"
            strokeWidth="1"
          />

          {/* Point selectionne */}
          <circle
            cx={pointX}
            cy={pointY}
            r="8"
            fill={level.color}
            stroke="#fff"
            strokeWidth="2.5"
            className="drop-shadow-sm"
            style={{ transition: 'cx 0.15s ease, cy 0.15s ease, fill 0.15s ease' }}
          />
          <circle
            cx={pointX}
            cy={pointY}
            r="3"
            fill="#fff"
            style={{ transition: 'cx 0.15s ease, cy 0.15s ease' }}
          />
        </svg>
      </div>

      {/* Resultat dynamique */}
      <div
        className="mt-4 rounded-xl px-4 py-3 font-sans text-sm border"
        style={{
          backgroundColor: `${level.color}12`,
          borderColor: `${level.color}40`,
        }}
      >
        <p className="text-[#1B2E4A]">
          A <strong>{freq.toLocaleString('fr-FR')} Hz</strong> et{' '}
          <strong>{db} dB HL</strong>, cela correspond a :{' '}
          <span className="font-bold" style={{ color: level.color }}>
            {level.label}
          </span>{' '}
          selon la classification BIAP.
        </p>
      </div>

      {/* Legende */}
      <div className="mt-3 flex flex-wrap gap-2">
        {BIAP_LEVELS.map((band) => (
          <span
            key={band.label}
            className="inline-flex items-center gap-1.5 font-sans text-[10px] text-gray-600"
          >
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: band.color }}
            />
            {band.min}-{band.max} dB : {band.label}
          </span>
        ))}
      </div>

      {/* Disclaimer YMYL */}
      <p className="mt-4 font-sans text-[11px] text-gray-400 leading-relaxed">
        Cet outil est a visee educative uniquement. Il ne constitue pas un examen
        medical et ne remplace en aucun cas un audiogramme professionnel realise en
        cabine insonorisee. Consultez un audioprothesiste ou un ORL pour un bilan
        auditif complet.
      </p>
    </div>
  );
}
