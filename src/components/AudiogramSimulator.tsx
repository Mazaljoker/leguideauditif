/**
 * AudiogramSimulator v6 — 2 grilles OD/OG + lead capture contextuel
 * Formulaire lead gen quand perte > 20 dB — pre-remplit le type de perte
 * PAS de diagnostic, PAS de recommandation produit
 */
import { useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';

// ─── Constantes ─────────────────────────────────────────────
const BIAP_LEVELS = [
  { min: 0, max: 20, label: 'Audition normale', color: '#16a34a', bg: '#dcfce7' },
  { min: 21, max: 40, label: 'Perte legere', color: '#ca8a04', bg: '#fef9c3' },
  { min: 41, max: 70, label: 'Perte moyenne', color: '#ea580c', bg: '#ffedd5' },
  { min: 71, max: 90, label: 'Perte severe', color: '#dc2626', bg: '#fee2e2' },
  { min: 91, max: 120, label: 'Perte profonde', color: '#991b1b', bg: '#fecaca' },
] as const;

const FREQUENCIES = [125, 250, 500, 1000, 2000, 4000, 8000] as const;
const FREQ_LABELS = ['125', '250', '500', '1k', '2k', '4k', '8k'] as const;
const BIAP_FREQ_INDICES = [2, 3, 4, 5] as const;

type Ear = 'right' | 'left';
const EAR_CFG = {
  right: { label: 'Oreille droite', short: 'OD', color: '#dc2626', symbol: 'O' },
  left: { label: 'Oreille gauche', short: 'OG', color: '#2563eb', symbol: 'X' },
} as const;

const PRESETS = [
  { label: 'Normal', right: [5, 5, 10, 10, 10, 15, 15], left: [5, 10, 10, 10, 15, 15, 20] },
  { label: 'Presbyacousie', right: [10, 10, 15, 25, 40, 55, 65], left: [10, 15, 20, 30, 45, 60, 70] },
  { label: 'Asymetrique', right: [10, 10, 15, 15, 20, 25, 30], left: [15, 20, 30, 45, 55, 65, 70] },
  { label: 'Severe', right: [50, 55, 65, 75, 80, 85, 90], left: [55, 60, 70, 80, 85, 90, 95] },
] as const;

// ─── Geometrie SVG (par grille) ─────────────────────────────
const SVG_W = 320;
const SVG_H = 360;
const PAD = { top: 24, right: 10, bottom: 40, left: 40 };
const GRID_W = SVG_W - PAD.left - PAD.right;
const GRID_H = SVG_H - PAD.top - PAD.bottom;

function freqToX(idx: number): number {
  return PAD.left + (idx / (FREQUENCIES.length - 1)) * GRID_W;
}
function dbToY(db: number): number {
  return PAD.top + (db / 120) * GRID_H;
}
function yToDb(y: number): number {
  return Math.round(Math.max(0, Math.min(120, ((y - PAD.top) / GRID_H) * 120)) / 5) * 5;
}
function xToFreqIndex(x: number): number {
  const ratio = (x - PAD.left) / GRID_W;
  return Math.round(Math.max(0, Math.min(FREQUENCIES.length - 1, ratio * (FREQUENCIES.length - 1))));
}
function getBiapLevel(db: number): (typeof BIAP_LEVELS)[number] {
  for (const level of BIAP_LEVELS) { if (db <= level.max) return level; }
  return BIAP_LEVELS[BIAP_LEVELS.length - 1];
}
function calcBiapAvg(values: number[]): number {
  return Math.round(BIAP_FREQ_INDICES.reduce((s, i) => s + values[i], 0) / BIAP_FREQ_INDICES.length);
}

// ─── Sous-composant : une grille pour une oreille ───────────
interface EarGridProps {
  ear: Ear;
  values: number[];
  selected: number;
  dragging: boolean;
  onPointDown: (idx: number, e: React.MouseEvent | React.TouchEvent) => void;
  onGridClick: (idx: number, db: number) => void;
  onDragMove: (db: number) => void;
  onDragEnd: () => void;
  onSelect: (idx: number) => void;
}

function EarGrid({ ear, values, selected, dragging, onPointDown, onGridClick, onDragMove, onDragEnd, onSelect }: EarGridProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const cfg = EAR_CFG[ear];
  const avg = calcBiapAvg(values);
  const avgLevel = getBiapLevel(avg);

  const getSvgCoords = useCallback((e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    let cx: number, cy: number;
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      cx = e.touches[0].clientX; cy = e.touches[0].clientY;
    } else {
      cx = e.clientX; cy = e.clientY;
    }
    return { x: (cx - rect.left) * (SVG_W / rect.width), y: (cy - rect.top) * (SVG_H / rect.height) };
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (dragging) return;
    const c = getSvgCoords(e);
    if (!c || c.x < PAD.left || c.x > PAD.left + GRID_W || c.y < PAD.top || c.y > PAD.top + GRID_H) return;
    onGridClick(xToFreqIndex(c.x), yToDb(c.y));
  }, [dragging, getSvgCoords, onGridClick]);

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!dragging) return;
    const c = getSvgCoords(e);
    if (c) onDragMove(yToDb(c.y));
  }, [dragging, getSvgCoords, onDragMove]);

  const curvePath = values.map((db, i) => `${freqToX(i)},${dbToY(db)}`).join(' ');

  const renderSymbol = (cx: number, cy: number, isSelected: boolean) => {
    const r = isSelected ? 10 : 7;
    if (ear === 'right') {
      return (
        <>
          <circle cx={cx} cy={cy} r={r} fill="#fff" stroke={cfg.color} strokeWidth={isSelected ? 2.5 : 2} />
          <circle cx={cx} cy={cy} r={isSelected ? 3.5 : 2.5} fill={cfg.color} />
        </>
      );
    }
    const s = isSelected ? 5 : 3.5;
    return (
      <>
        <circle cx={cx} cy={cy} r={r} fill="#fff" stroke={cfg.color} strokeWidth={isSelected ? 2.5 : 2} />
        <line x1={cx - s} y1={cy - s} x2={cx + s} y2={cy + s} stroke={cfg.color} strokeWidth={isSelected ? 2.5 : 2} strokeLinecap="round" />
        <line x1={cx + s} y1={cy - s} x2={cx - s} y2={cy + s} stroke={cfg.color} strokeWidth={isSelected ? 2.5 : 2} strokeLinecap="round" />
      </>
    );
  };

  return (
    <div className="flex-1 min-w-0">
      {/* Titre oreille */}
      <div className="flex items-center gap-2 mb-2">
        <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: cfg.color }}>{cfg.symbol}</span>
        <span className="font-sans text-sm font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full select-none"
        style={{ cursor: dragging ? 'grabbing' : 'crosshair', touchAction: 'none' }}
        role="img"
        aria-label={`${cfg.label} — ${avg} dB : ${avgLevel.label}`}
        onClick={handleClick}
        onMouseMove={handleMove}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
        onTouchMove={handleMove}
        onTouchEnd={onDragEnd}
      >
        {/* Bandes BIAP */}
        {BIAP_LEVELS.map((band) => (
          <rect key={band.label} x={PAD.left} y={dbToY(band.min)}
            width={GRID_W} height={dbToY(Math.min(band.max, 120)) - dbToY(band.min)}
            fill={band.color} opacity={0.07} />
        ))}

        {/* Grille */}
        {[0, 20, 40, 60, 80, 100, 120].map((d) => (
          <g key={`db-${d}`}>
            <line x1={PAD.left} y1={dbToY(d)} x2={PAD.left + GRID_W} y2={dbToY(d)}
              stroke="#CBD5E1" strokeWidth={d % 40 === 0 ? '0.7' : '0.35'} />
            <text x={PAD.left - 5} y={dbToY(d)} textAnchor="end" fill="#64748B"
              fontSize="9" fontFamily="Inter, sans-serif" dominantBaseline="central">{d}</text>
          </g>
        ))}
        {FREQUENCIES.map((_, i) => (
          <g key={`f-${i}`}>
            <line x1={freqToX(i)} y1={PAD.top} x2={freqToX(i)} y2={PAD.top + GRID_H}
              stroke="#CBD5E1" strokeWidth="0.35" />
            <text x={freqToX(i)} y={PAD.top + GRID_H + 13} textAnchor="middle"
              fill="#64748B" fontSize="9" fontFamily="Inter, sans-serif">{FREQ_LABELS[i]}</text>
          </g>
        ))}

        {/* Label axe X */}
        <text x={PAD.left + GRID_W / 2} y={SVG_H - 4} textAnchor="middle"
          fill="#1B2E4A" fontSize="10" fontFamily="Inter, sans-serif" fontWeight="600">
          Frequences (Hz)
        </text>

        {/* Bordure */}
        <rect x={PAD.left} y={PAD.top} width={GRID_W} height={GRID_H}
          fill="none" stroke="#94A3B8" strokeWidth="0.8" />

        {/* Ligne moyenne BIAP */}
        <line x1={PAD.left} y1={dbToY(avg)} x2={PAD.left + GRID_W} y2={dbToY(avg)}
          stroke={avgLevel.color} strokeWidth="1.2" strokeDasharray="5 3" opacity={0.5} />

        {/* Courbe */}
        <polyline points={curvePath} fill="none" stroke={cfg.color}
          strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" opacity={0.85} />

        {/* Points */}
        {values.map((db, i) => {
          const x = freqToX(i);
          const y = dbToY(db);
          const isSel = i === selected;
          return (
            <g key={`p-${i}`}
              onMouseDown={(e) => onPointDown(i, e)}
              onTouchStart={(e) => onPointDown(i, e)}
              onClick={(e) => { e.stopPropagation(); onSelect(i); }}
              style={{ cursor: 'grab' }}>
              {/* Zone touch */}
              <circle cx={x} cy={y} r="20" fill="transparent" />
              {/* Halo */}
              {isSel && <circle cx={x} cy={y} r="16" fill={cfg.color} opacity={0.12} className="sim-halo" />}
              {/* Symbole */}
              {renderSymbol(x, y, isSel)}
              {/* Label dB */}
              {isSel && (
                <>
                  <rect x={x > PAD.left + GRID_W / 2 ? x - 58 : x + 14} y={y - 11}
                    width="44" height="18" rx="4" fill={cfg.color} opacity={0.9} />
                  <text x={x > PAD.left + GRID_W / 2 ? x - 36 : x + 36} y={y - 2}
                    textAnchor="middle" fill="#fff" fontSize="10" fontFamily="Inter, sans-serif"
                    fontWeight="700" dominantBaseline="central">{db} dB</text>
                </>
              )}
            </g>
          );
        })}
      </svg>

      {/* Resultat sous la grille */}
      <div className="mt-2 rounded-lg px-3 py-2 border-2 font-sans"
        style={{ backgroundColor: avgLevel.bg, borderColor: avgLevel.color }}>
        <p className="text-sm font-bold" style={{ color: avgLevel.color }}>
          {avg} dB — {avgLevel.label}
        </p>
        <div className="flex flex-wrap gap-x-2 text-[10px] text-[#6B6560] mt-0.5">
          {values.map((db, i) => (
            <span key={i} style={{ fontWeight: i === selected ? 700 : 400,
              color: i === selected ? cfg.color : undefined }}>
              {FREQ_LABELS[i]}:{db}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal ────────────────────────────────────
export default function AudiogramSimulator() {
  const [right, setRight] = useState<number[]>([10, 10, 15, 15, 15, 20, 20]);
  const [left, setLeft] = useState<number[]>([10, 15, 15, 15, 20, 25, 25]);
  const [activeEar, setActiveEar] = useState<Ear>('right');
  const [selectedR, setSelectedR] = useState(3);
  const [selectedL, setSelectedL] = useState(3);
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const [dragging, setDragging] = useState<{ ear: Ear; idx: number } | null>(null);

  const selected = activeEar === 'right' ? selectedR : selectedL;
  const values = activeEar === 'right' ? right : left;
  const earCfg = EAR_CFG[activeEar];
  const selectedLevel = getBiapLevel(values[selected]);

  const avgR = useMemo(() => calcBiapAvg(right), [right]);
  const avgL = useMemo(() => calcBiapAvg(left), [left]);
  const asymmetry = Math.abs(avgR - avgL);
  const worstAvg = Math.max(avgR, avgL);
  const worstLevel = getBiapLevel(worstAvg);

  // Lead form state
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadError, setLeadError] = useState('');
  const [showLeadForm, setShowLeadForm] = useState(false);

  const handleLeadSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLeadLoading(true);
    setLeadError('');
    const form = e.currentTarget;
    const formData = new FormData(form);

    const { error: dbError } = await supabase.from('leads').insert({
      first_name: formData.get('prenom') as string,
      phone: formData.get('tel') as string,
      zip_code: formData.get('cp') as string,
      hearing_loss_type: worstAvg <= 20 ? 'normal' : worstAvg <= 40 ? 'legere' : worstAvg <= 70 ? 'moyenne' : worstAvg <= 90 ? 'severe' : 'profonde',
      source: 'audiogramme-simulator',
    });

    setLeadLoading(false);
    if (dbError) {
      setLeadError('Une erreur est survenue. Veuillez reessayer.');
    } else {
      setLeadSubmitted(true);
    }
  }, [worstAvg]);

  const updatePoint = useCallback((ear: Ear, idx: number, db: number) => {
    (ear === 'right' ? setRight : setLeft)(prev => { const n = [...prev]; n[idx] = db; return n; });
    setActivePreset(null);
  }, []);

  const handlePreset = useCallback((idx: number) => {
    setRight([...PRESETS[idx].right]);
    setLeft([...PRESETS[idx].left]);
    setActivePreset(idx);
  }, []);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updatePoint(activeEar, selected, Number(e.target.value));
  }, [activeEar, selected, updatePoint]);

  // Handlers pour chaque grille
  const makeHandlers = useCallback((ear: Ear) => ({
    onPointDown: (idx: number, e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation(); e.preventDefault();
      setDragging({ ear, idx });
      setActiveEar(ear);
      (ear === 'right' ? setSelectedR : setSelectedL)(idx);
    },
    onGridClick: (idx: number, db: number) => {
      setActiveEar(ear);
      (ear === 'right' ? setSelectedR : setSelectedL)(idx);
      updatePoint(ear, idx, db);
    },
    onDragMove: (db: number) => {
      if (dragging && dragging.ear === ear) updatePoint(ear, dragging.idx, db);
    },
    onDragEnd: () => setDragging(null),
    onSelect: (idx: number) => {
      setActiveEar(ear);
      (ear === 'right' ? setSelectedR : setSelectedL)(idx);
    },
  }), [dragging, updatePoint]);

  return (
    <div className="bg-[#F8F5F0] border border-[#E8E4DF] rounded-2xl p-5 sm:p-7 my-8">
      {/* Header */}
      <h3 className="font-sans text-xl font-bold text-[#1B2E4A] mb-1">
        Simulateur d'audiogramme bilateral
      </h3>
      <p className="font-sans text-sm text-[#6B6560] mb-4">
        Cliquez sur chaque grille ou glissez les points pour dessiner l'audiogramme de chaque oreille.
      </p>

      {/* Presets */}
      <div className="flex flex-wrap gap-2 mb-4">
        {PRESETS.map((p, i) => (
          <button type="button" key={p.label} onClick={() => handlePreset(i)}
            className="font-sans text-[13px] font-medium px-3.5 py-2 rounded-lg border transition-all"
            style={{
              backgroundColor: activePreset === i ? '#1B2E4A' : '#fff',
              color: activePreset === i ? '#fff' : '#1B2E4A',
              borderColor: activePreset === i ? '#1B2E4A' : '#CBD5E1',
            }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Curseur point selectionne */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5 bg-white rounded-xl px-4 py-3 border border-[#E2E8F0]">
        <label htmlFor="sim-db" className="font-sans text-sm font-semibold shrink-0"
          style={{ color: earCfg.color }}>
          {earCfg.symbol} {FREQ_LABELS[selected]} Hz : {values[selected]} dB
        </label>
        <input id="sim-db" type="range" min={0} max={120} step={5}
          value={values[selected]} onChange={handleSliderChange}
          aria-label={`${earCfg.label}, ${FREQUENCIES[selected]} Hz : ${values[selected]} decibels`}
          className="sim-slider flex-1"
          style={{ '--slider-color': earCfg.color } as React.CSSProperties} />
        <span className="font-sans text-xs shrink-0" style={{ color: selectedLevel.color }}>
          {values[selected]} dB — {selectedLevel.label}
        </span>
      </div>

      {/* ─── 2 grilles cote a cote ───────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-4">
        <EarGrid ear="right" values={right} selected={selectedR}
          dragging={dragging?.ear === 'right'} {...makeHandlers('right')} />
        <EarGrid ear="left" values={left} selected={selectedL}
          dragging={dragging?.ear === 'left'} {...makeHandlers('left')} />
      </div>

      {/* Alerte asymetrie */}
      {asymmetry >= 15 && (
        <div className="mt-4 rounded-xl px-4 py-3 bg-[#fef2f2] border-2 border-[#dc2626] font-sans">
          <p className="text-sm font-bold text-[#dc2626] mb-0.5">
            Asymetrie : {asymmetry} dB entre les deux oreilles
          </p>
          <p className="text-xs text-[#991b1b]">
            Une difference superieure a 15 dB justifie une consultation ORL pour ecarter une cause
            retrocochelaire (tumeur du nerf auditif). Cet outil est educatif — consultez un professionnel.
          </p>
        </div>
      )}

      {/* ─── Lead capture contextuel (perte > 20 dB) ──── */}
      {worstAvg > 20 && !leadSubmitted && (
        <div className="mt-5 rounded-2xl border-2 border-[#D97B3D] bg-white p-5 sm:p-6 font-sans">
          <div className="flex items-start gap-3 mb-4">
            <span className="shrink-0 w-10 h-10 rounded-full bg-[#D97B3D] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </span>
            <div>
              <h4 className="text-base font-bold text-[#1B2E4A]">
                Vos resultats suggerent une {worstLevel.label.toLowerCase()}
              </h4>
              <p className="text-sm text-[#6B6560] mt-0.5">
                Demandez un bilan auditif gratuit pres de chez vous — un audioprothesiste vous rappelle sous 48h.
              </p>
            </div>
          </div>

          {!showLeadForm ? (
            <button
              type="button"
              onClick={() => setShowLeadForm(true)}
              className="w-full py-3.5 rounded-xl bg-[#D97B3D] text-white font-sans text-base font-bold transition-all hover:bg-[#c46a2e]"
              style={{ minHeight: 52 }}
            >
              Demander un bilan gratuit
            </button>
          ) : (
            <form onSubmit={handleLeadSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="lead-prenom" className="text-xs font-semibold text-[#1B2E4A]">Prenom</label>
                <input id="lead-prenom" name="prenom" type="text" required minLength={2}
                  className="px-3 py-2.5 border border-[#CBD5E1] rounded-lg text-sm focus:ring-2 focus:ring-[#D97B3D]/30 focus:border-[#D97B3D] outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="lead-tel" className="text-xs font-semibold text-[#1B2E4A]">Telephone</label>
                <input id="lead-tel" name="tel" type="tel" required pattern="^(\+33|0)[1-9]\d{8}$"
                  placeholder="06 12 34 56 78"
                  className="px-3 py-2.5 border border-[#CBD5E1] rounded-lg text-sm focus:ring-2 focus:ring-[#D97B3D]/30 focus:border-[#D97B3D] outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="lead-cp" className="text-xs font-semibold text-[#1B2E4A]">Code postal</label>
                <input id="lead-cp" name="cp" type="text" required pattern="^\d{5}$"
                  placeholder="75011"
                  className="px-3 py-2.5 border border-[#CBD5E1] rounded-lg text-sm focus:ring-2 focus:ring-[#D97B3D]/30 focus:border-[#D97B3D] outline-none" />
              </div>

              <div className="sm:col-span-3">
                <label className="flex items-start gap-2 text-[11px] text-[#94A3B8] mt-1">
                  <input type="checkbox" required className="mt-0.5 accent-[#D97B3D]" />
                  <span>
                    J'accepte d'etre contacte par un audioprothesiste partenaire.{' '}
                    <a href="/politique-confidentialite/" className="text-[#D97B3D] underline">Confidentialite</a>
                  </span>
                </label>
              </div>

              {leadError && (
                <p className="sm:col-span-3 text-xs text-red-500">{leadError}</p>
              )}

              <div className="sm:col-span-3 flex gap-3 items-center">
                <button type="submit" disabled={leadLoading}
                  className="flex-1 py-3 rounded-xl bg-[#D97B3D] text-white font-sans text-base font-bold transition-all hover:bg-[#c46a2e] disabled:opacity-50"
                  style={{ minHeight: 48 }}>
                  {leadLoading ? 'Envoi...' : 'Etre rappele gratuitement'}
                </button>
                <button type="button" onClick={() => setShowLeadForm(false)}
                  className="text-sm text-[#94A3B8] hover:text-[#64748B]">
                  Annuler
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Confirmation lead */}
      {leadSubmitted && (
        <div className="mt-5 rounded-2xl border-2 border-[#16a34a] bg-[#dcfce7] p-5 text-center font-sans">
          <p className="text-base font-bold text-[#16a34a] mb-1">
            Votre demande a bien ete envoyee
          </p>
          <p className="text-sm text-[#166534]">
            Un audioprothesiste proche de chez vous vous contactera sous 48h pour un bilan gratuit.
          </p>
        </div>
      )}

      {/* Legende BIAP */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
        {BIAP_LEVELS.map((band) => {
          const worst = Math.max(avgR, avgL);
          const isActive = worst >= band.min && worst <= band.max;
          return (
            <div key={band.label} className="flex items-center gap-2 rounded-lg px-3 py-2 font-sans text-xs"
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
