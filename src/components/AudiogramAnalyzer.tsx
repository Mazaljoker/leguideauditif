import { useState, useCallback, type FC, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';

/* ────────────────────────────── Types ────────────────────────────── */

const FREQUENCIES = [250, 500, 1000, 2000, 4000, 8000] as const;
type Freq = (typeof FREQUENCIES)[number];

interface ThresholdData {
  right: Partial<Record<Freq, number>>;
  left: Partial<Record<Freq, number>>;
}

interface AnalysisResult {
  ear: 'Oreille droite' | 'Oreille gauche';
  avgConv: number;
  degree: string;
  curveType: string;
  dailyImpact: string;
}

interface Recommendation {
  deviceType: string;
  deviceExplanation: string;
  classe1: string;
  classe2: string;
}

/* ────────────────────────────── Helpers ────────────────────────────── */

function calcAvgConversational(thresholds: Partial<Record<Freq, number>>): number | null {
  const freqs: Freq[] = [500, 1000, 2000, 4000];
  const vals = freqs.map((f) => thresholds[f]).filter((v): v is number => v !== undefined);
  if (vals.length < 3) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function classifyDegree(avg: number): string {
  if (avg <= 20) return 'Audition normale (0-20 dB)';
  if (avg <= 40) return 'Perte legere (21-40 dB)';
  if (avg <= 70) return 'Perte moyenne (41-70 dB)';
  if (avg <= 90) return 'Perte severe (71-90 dB)';
  return 'Perte profonde (>90 dB)';
}

function classifyCurve(thresholds: Partial<Record<Freq, number>>): string {
  const vals = FREQUENCIES.map((f) => thresholds[f]).filter((v): v is number => v !== undefined);
  if (vals.length < 4) return 'Donnees insuffisantes';

  const lowFreqs = [250, 500].map((f) => thresholds[f as Freq]).filter((v): v is number => v !== undefined);
  const highFreqs = [4000, 8000].map((f) => thresholds[f as Freq]).filter((v): v is number => v !== undefined);

  if (lowFreqs.length > 0 && highFreqs.length > 0) {
    const avgLow = lowFreqs.reduce((a, b) => a + b, 0) / lowFreqs.length;
    const avgHigh = highFreqs.reduce((a, b) => a + b, 0) / highFreqs.length;

    if (avgHigh - avgLow > 20) return 'Presbyacousie (pente sur les aigus)';
  }

  const min = Math.min(...vals);
  const max = Math.max(...vals);
  if (max - min < 10) return 'Perte plate';

  // Scotome : creux localise > 15 dB
  for (let i = 1; i < vals.length - 1; i++) {
    if (vals[i] - vals[i - 1] > 15 && vals[i] - vals[i + 1] > 15) {
      return 'Scotome (creux localise)';
    }
  }

  return 'Profil en pente';
}

function dailyImpact(avg: number): string {
  if (avg <= 20)
    return 'Bonne nouvelle : votre audition est dans la zone normale. Pas de difficulte particuliere attendue au quotidien. Un suivi regulier reste recommande apres 60 ans.';
  if (avg <= 40)
    return 'Concretement, vous commencez a rater les chuchotements et les conversations dans le bruit (restaurant, reunion de famille). Les consonnes faibles — f, s, ch — vous echappent. Mes patients me disent souvent : "Je pensais que les gens marmonnaient."';
  if (avg <= 70)
    return 'Suivre une conversation en groupe devient vraiment difficile. Vous montez probablement le volume de la television. La fatigue auditive en fin de journee, ca vous parle ? C\'est un signe frequent a ce stade.';
  if (avg <= 90)
    return 'A ce niveau, la parole sans appareillage est tres difficile a percevoir. Les conversations telephoniques deviennent penibles. Mon conseil : consultez un audioprothesiste sans tarder, un appareillage peut reellement changer votre quotidien.';
  return 'La perception de la parole sans aide auditive est quasi impossible. Un appareillage puissant ou, selon les cas, un implant cochleaire peut etre envisage. Votre ORL et votre audioprothesiste vous guideront vers la meilleure solution.';
}

function analyzeEar(
  thresholds: Partial<Record<Freq, number>>,
  label: 'Oreille droite' | 'Oreille gauche',
): AnalysisResult | null {
  const avg = calcAvgConversational(thresholds);
  if (avg === null) return null;
  return {
    ear: label,
    avgConv: avg,
    degree: classifyDegree(avg),
    curveType: classifyCurve(thresholds),
    dailyImpact: dailyImpact(avg),
  };
}

function getRecommendation(results: AnalysisResult[]): Recommendation {
  const maxAvg = Math.max(...results.map((r) => r.avgConv));
  const hasSteepSlope = results.some((r) => r.curveType.includes('Presbyacousie'));

  if (maxAvg <= 20) {
    return {
      deviceType: 'Aucun appareillage necessaire',
      deviceExplanation:
        'Votre audiogramme ne montre pas de perte auditive significative. Un suivi regulier (tous les 2 ans apres 60 ans) est recommande.',
      classe1: '',
      classe2: '',
    };
  }

  if (maxAvg <= 70) {
    const type = hasSteepSlope ? 'Ecouteur deporte (RIC)' : 'Ecouteur deporte (RIC) ou intra-auriculaire (ITE/CIC)';
    return {
      deviceType: type,
      deviceExplanation: hasSteepSlope
        ? "Le RIC (Receiver-In-Canal) est ideal pour la presbyacousie car il amplifie selectivement les frequences aigues tout en preservant la perception naturelle des graves. C'est l'appareil le plus prescrit en France (70% des adaptations)."
        : 'Avec une perte plate ou moderee, vous avez le choix entre un RIC (discret, derriere l\'oreille) ou un intra-auriculaire (dans le conduit). Le choix depend de votre preference esthetique et de la taille de votre conduit auditif.',
      classe1:
        'Classe 1 (100% Sante) : reste a charge 0 euros apres remboursements Securite sociale + mutuelle. 6 a 12 canaux de reglage, reduction du bruit basique, garantie 4 ans. Un appareil correct pour bien entendre au quotidien.',
      classe2:
        'Classe 2 : technologies avancees (Bluetooth, rechargeable, IA embarquee, 16 a 24 canaux). Plus de confort dans le bruit et plus de fonctionnalites. Reste a charge : 400 a 1 200 euros par oreille selon votre mutuelle.',
    };
  }

  return {
    deviceType: 'Contour d\'oreille (BTE) ou RIC puissant',
    deviceExplanation:
      'Pour une perte severe a profonde, le contour d\'oreille classique (BTE) offre la puissance maximale avec un embout sur mesure. Les RIC "Super Power" avec ecouteur SP sont aussi une option pour plus de discretion, si votre audioprothesiste le juge adapte.',
    classe1:
      'Classe 1 (100% Sante) : reste a charge 0 euros. Modeles contour puissants avec 6 a 12 canaux, reduction du bruit, compatible boucle magnetique. Ca fait le travail pour bien entendre.',
    classe2:
      'Classe 2 : contours haut de gamme avec streaming Bluetooth direct, rechargeable, gestion avancee du bruit. Plus de confort, surtout dans les environnements complexes. Reste a charge : 500 a 1 500 euros par oreille selon votre mutuelle.',
  };
}

/* ────────────────────────── SVG Audiogram ────────────────────────── */

const SVG_W = 520;
const SVG_H = 360;
const PAD = { top: 30, right: 30, bottom: 40, left: 55 };
const PLOT_W = SVG_W - PAD.left - PAD.right;
const PLOT_H = SVG_H - PAD.top - PAD.bottom;

const DB_MIN = -10;
const DB_MAX = 120;
const DB_RANGE = DB_MAX - DB_MIN;

function freqX(freq: Freq): number {
  const idx = FREQUENCIES.indexOf(freq);
  return PAD.left + (idx / (FREQUENCIES.length - 1)) * PLOT_W;
}

function dbY(db: number): number {
  return PAD.top + ((db - DB_MIN) / DB_RANGE) * PLOT_H;
}

const AudiogramSVG: FC<{ data: ThresholdData }> = ({ data }) => {
  const rightPoints = FREQUENCIES.map((f) => {
    const v = data.right[f];
    return v !== undefined ? { x: freqX(f), y: dbY(v), val: v } : null;
  });
  const leftPoints = FREQUENCIES.map((f) => {
    const v = data.left[f];
    return v !== undefined ? { x: freqX(f), y: dbY(v), val: v } : null;
  });

  const makePath = (pts: (null | { x: number; y: number })[]) => {
    const valid = pts.filter((p): p is { x: number; y: number } => p !== null);
    if (valid.length < 2) return '';
    return valid.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  };

  // Zone normale (0-20 dB)
  const normalY1 = dbY(0);
  const normalY2 = dbY(20);

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="w-full max-w-[540px] mx-auto"
      role="img"
      aria-label="Audiogramme interactif montrant les seuils auditifs par frequence"
    >
      {/* Zone audition normale */}
      <rect
        x={PAD.left}
        y={normalY1}
        width={PLOT_W}
        height={normalY2 - normalY1}
        fill="#e8f5e9"
        opacity="0.5"
      />
      <text x={PAD.left + 4} y={normalY1 + 14} fontSize="10" fill="#388e3c" fontFamily="Inter, sans-serif">
        Zone normale
      </text>

      {/* Grille horizontale */}
      {[0, 20, 40, 60, 80, 100, 120].map((db) => (
        <g key={db}>
          <line
            x1={PAD.left}
            y1={dbY(db)}
            x2={PAD.left + PLOT_W}
            y2={dbY(db)}
            stroke="#d1ccc6"
            strokeWidth="0.5"
          />
          <text
            x={PAD.left - 8}
            y={dbY(db) + 4}
            textAnchor="end"
            fontSize="11"
            fill="#4a5568"
            fontFamily="Inter, sans-serif"
          >
            {db}
          </text>
        </g>
      ))}

      {/* Grille verticale + labels frequences */}
      {FREQUENCIES.map((f) => (
        <g key={f}>
          <line
            x1={freqX(f)}
            y1={PAD.top}
            x2={freqX(f)}
            y2={PAD.top + PLOT_H}
            stroke="#d1ccc6"
            strokeWidth="0.5"
          />
          <text
            x={freqX(f)}
            y={PAD.top + PLOT_H + 20}
            textAnchor="middle"
            fontSize="11"
            fill="#4a5568"
            fontFamily="Inter, sans-serif"
          >
            {f >= 1000 ? `${f / 1000}k` : f}
          </text>
        </g>
      ))}

      {/* Labels axes */}
      <text
        x={SVG_W / 2}
        y={SVG_H - 4}
        textAnchor="middle"
        fontSize="12"
        fill="#1B2E4A"
        fontFamily="Inter, sans-serif"
        fontWeight="600"
      >
        Frequence (Hz)
      </text>
      <text
        x={12}
        y={SVG_H / 2}
        textAnchor="middle"
        fontSize="12"
        fill="#1B2E4A"
        fontFamily="Inter, sans-serif"
        fontWeight="600"
        transform={`rotate(-90, 12, ${SVG_H / 2})`}
      >
        Intensite (dB HL)
      </text>

      {/* Courbe droite (rouge) */}
      <path d={makePath(rightPoints)} fill="none" stroke="#d32f2f" strokeWidth="2" />
      {rightPoints.map(
        (p, i) =>
          p && (
            <g key={`r-${i}`}>
              <circle cx={p.x} cy={p.y} r="6" fill="#d32f2f" />
              <text
                x={p.x}
                y={p.y - 10}
                textAnchor="middle"
                fontSize="10"
                fill="#d32f2f"
                fontFamily="Inter, sans-serif"
                fontWeight="600"
              >
                {p.val}
              </text>
            </g>
          ),
      )}

      {/* Courbe gauche (bleu) */}
      <path d={makePath(leftPoints)} fill="none" stroke="#1565c0" strokeWidth="2" />
      {leftPoints.map(
        (p, i) =>
          p && (
            <g key={`l-${i}`}>
              <text
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="14"
                fill="#1565c0"
                fontFamily="Inter, sans-serif"
                fontWeight="700"
              >
                X
              </text>
              <text
                x={p.x + 12}
                y={p.y - 8}
                textAnchor="start"
                fontSize="10"
                fill="#1565c0"
                fontFamily="Inter, sans-serif"
                fontWeight="600"
              >
                {p.val}
              </text>
            </g>
          ),
      )}

      {/* Legende */}
      <g transform={`translate(${PAD.left + 10}, ${PAD.top - 15})`}>
        <circle cx="0" cy="0" r="5" fill="#d32f2f" />
        <text x="10" y="4" fontSize="11" fill="#d32f2f" fontFamily="Inter, sans-serif" fontWeight="600">
          Droite (O)
        </text>
        <text x="100" y="4" fontSize="14" fill="#1565c0" fontFamily="Inter, sans-serif" fontWeight="700">
          X
        </text>
        <text x="115" y="4" fontSize="11" fill="#1565c0" fontFamily="Inter, sans-serif" fontWeight="600">
          Gauche (X)
        </text>
      </g>

      {/* Cadre */}
      <rect
        x={PAD.left}
        y={PAD.top}
        width={PLOT_W}
        height={PLOT_H}
        fill="none"
        stroke="#1B2E4A"
        strokeWidth="1"
      />
    </svg>
  );
};

/* ────────────────────── Main Component ──────────────────── */

const AudiogramAnalyzer: FC = () => {
  const [thresholds, setThresholds] = useState<ThresholdData>({ right: {}, left: {} });
  const [results, setResults] = useState<AnalysisResult[] | null>(null);
  const [showGated, setShowGated] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  const handleThreshold = useCallback(
    (ear: 'right' | 'left', freq: Freq, value: string) => {
      setThresholds((prev) => {
        const next = { ...prev, [ear]: { ...prev[ear] } };
        if (value === '' || isNaN(Number(value))) {
          delete next[ear][freq];
        } else {
          const num = Math.max(-10, Math.min(120, Number(value)));
          next[ear][freq] = num;
        }
        return next;
      });
    },
    [],
  );

  const handleAnalyze = useCallback(() => {
    const right = analyzeEar(thresholds.right, 'Oreille droite');
    const left = analyzeEar(thresholds.left, 'Oreille gauche');
    const res = [right, left].filter((r): r is AnalysisResult => r !== null);
    if (res.length === 0) return;
    setResults(res);
  }, [thresholds]);

  const handleEmailSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!email || !results) return;
      setEmailLoading(true);
      setEmailError('');

      const avgRight = calcAvgConversational(thresholds.right);
      const avgLeft = calcAvgConversational(thresholds.left);

      const { error } = await supabase.from('leads').insert({
        first_name: '',
        phone: '',
        zip_code: '',
        hearing_loss_type: `audiogramme-analyzer|D:${avgRight ?? 'n/a'}|G:${avgLeft ?? 'n/a'}`,
        source: 'outils/analyse-audiogramme',
        email,
      });

      setEmailLoading(false);
      if (error) {
        setEmailError('Une erreur est survenue. Veuillez reessayer.');
      } else {
        setEmailSubmitted(true);
        setShowGated(true);
      }
    },
    [email, results, thresholds],
  );

  const recommendation = results ? getRecommendation(results) : null;

  const hasEnoughData =
    Object.keys(thresholds.right).length >= 4 || Object.keys(thresholds.left).length >= 4;

  return (
    <div className="space-y-8">
      {/* Saisie des seuils */}
      <section className="bg-white rounded-2xl border border-[#e8e4df] p-6 md:p-8">
        <h2 className="font-sans text-xl font-bold text-[#1B2E4A] mb-2">
          Entrez vos seuils auditifs
        </h2>
        <p className="text-sm text-[#4a5568] mb-6">
          Reportez les valeurs en decibels (dB) de votre audiogramme papier pour chaque frequence. Remplissez au minimum 4 frequences par oreille (500, 1000, 2000 et 4000 Hz sont les plus importantes).
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-center">
            <thead>
              <tr>
                <th className="px-2 py-3 text-left text-sm font-semibold text-[#1B2E4A] font-sans">
                  Frequence
                </th>
                {FREQUENCIES.map((f) => (
                  <th
                    key={f}
                    className="px-2 py-3 text-sm font-semibold text-[#1B2E4A] font-sans"
                  >
                    {f >= 1000 ? `${f / 1000} kHz` : `${f} Hz`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(['right', 'left'] as const).map((ear) => (
                <tr key={ear} className={ear === 'right' ? 'bg-[#fef2f2]' : 'bg-[#eff6ff]'}>
                  <td className="px-2 py-3 text-left text-sm font-medium font-sans" style={{ color: ear === 'right' ? '#d32f2f' : '#1565c0' }}>
                    {ear === 'right' ? 'Droite (dB)' : 'Gauche (dB)'}
                  </td>
                  {FREQUENCIES.map((freq) => (
                    <td key={freq} className="px-1 py-2">
                      <label className="sr-only" htmlFor={`${ear}-${freq}`}>
                        Seuil {ear === 'right' ? 'oreille droite' : 'oreille gauche'} a {freq} Hz
                      </label>
                      <input
                        id={`${ear}-${freq}`}
                        type="number"
                        min="-10"
                        max="120"
                        step="5"
                        placeholder="--"
                        className="w-16 md:w-20 rounded-lg border border-[#d1ccc6] px-2 py-2.5 text-center text-base font-sans focus:border-[#D97B3D] focus:outline-none focus:ring-2 focus:ring-[#D97B3D]/20"
                        value={thresholds[ear][freq] ?? ''}
                        onChange={(e) => handleThreshold(ear, freq, e.target.value)}
                        aria-label={`Seuil ${ear === 'right' ? 'oreille droite' : 'oreille gauche'} a ${freq} hertz`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={handleAnalyze}
          disabled={!hasEnoughData}
          className="mt-6 w-full md:w-auto rounded-lg bg-[#D97B3D] px-8 py-3.5 text-lg font-semibold text-white transition-colors hover:bg-[#c46a2e] focus:outline-none focus:ring-2 focus:ring-[#D97B3D]/50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          style={{ minHeight: '48px' }}
        >
          Analyser mon audiogramme
        </button>
      </section>

      {/* Audiogramme SVG (toujours visible si donnees) */}
      {(Object.keys(thresholds.right).length > 0 || Object.keys(thresholds.left).length > 0) && (
        <section className="bg-white rounded-2xl border border-[#e8e4df] p-6 md:p-8">
          <h2 className="font-sans text-xl font-bold text-[#1B2E4A] mb-4">
            Votre audiogramme
          </h2>
          <AudiogramSVG data={thresholds} />
          <p className="text-xs text-[#4a5568] text-center mt-3 font-sans">
            Classification BIAP — O = oreille droite (rouge), X = oreille gauche (bleu)
          </p>
        </section>
      )}

      {/* Resultats gratuits */}
      {results && results.length > 0 && (
        <section className="bg-white rounded-2xl border border-[#e8e4df] p-6 md:p-8">
          <h2 className="font-sans text-xl font-bold text-[#1B2E4A] mb-6">
            Resultats de votre analyse
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            {results.map((r) => (
              <div
                key={r.ear}
                className="rounded-xl border border-[#e8e4df] p-5"
              >
                <h3
                  className="font-sans text-lg font-bold mb-3"
                  style={{ color: r.ear === 'Oreille droite' ? '#d32f2f' : '#1565c0' }}
                >
                  {r.ear}
                </h3>
                <dl className="space-y-3 text-sm font-sans">
                  <div>
                    <dt className="font-semibold text-[#1B2E4A]">Perte moyenne conversationnelle</dt>
                    <dd className="text-[#4a5568]">{r.avgConv} dB HL</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#1B2E4A]">Degre de perte (BIAP)</dt>
                    <dd className="text-[#4a5568]">{r.degree}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#1B2E4A]">Type de courbe</dt>
                    <dd className="text-[#4a5568]">{r.curveType}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>

          {/* Impact quotidien */}
          <div className="mt-6 bg-[#fef9f0] border border-[#f0dcc4] rounded-xl p-5">
            <h3 className="font-sans text-base font-bold text-[#1B2E4A] mb-2">
              Ce que cela signifie au quotidien
            </h3>
            {results.map((r) => (
              <p key={r.ear} className="text-sm text-[#4a5568] mb-2 last:mb-0">
                <strong style={{ color: r.ear === 'Oreille droite' ? '#d32f2f' : '#1565c0' }}>
                  {r.ear} :
                </strong>{' '}
                {r.dailyImpact}
              </p>
            ))}
          </div>

          <div className="mt-4 bg-[#fef9f0] border border-[#f0dcc4] rounded-xl px-5 py-4 text-xs text-[#4a5568] font-sans">
            <strong className="text-[#1B2E4A]">Important :</strong> Cette analyse est indicative et ne remplace pas un bilan auditif complet realise par un audioprothesiste DE ou un medecin ORL. La classification BIAP est basee sur les moyennes conversationnelles (500, 1000, 2000, 4000 Hz). Source : Bureau International d'Audiophonologie (BIAP), recommandation 02/1 bis, 2024.
          </div>
        </section>
      )}

      {/* Section gatee : recommandation appareil */}
      {results && results.length > 0 && !showGated && (
        <section className="bg-white rounded-2xl border-2 border-[#D97B3D] p-6 md:p-8">
          <h2 className="font-sans text-xl font-bold text-[#1B2E4A] mb-2">
            Recommandation d'appareil personnalisee
          </h2>
          <p className="text-sm text-[#4a5568] mb-6">
            Recevez gratuitement notre recommandation basee sur votre audiogramme : type d'appareil adapte, comparaison classe 1 / classe 2, et fourchettes de prix.
          </p>

          {emailSubmitted ? null : (
            <form onSubmit={handleEmailSubmit} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label htmlFor="gated-email" className="sr-only">
                    Votre adresse email
                  </label>
                  <input
                    id="gated-email"
                    type="email"
                    required
                    placeholder="votre@email.fr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-[#d1ccc6] px-4 py-3.5 text-base font-sans focus:border-[#D97B3D] focus:outline-none focus:ring-2 focus:ring-[#D97B3D]/20"
                    aria-label="Votre adresse email"
                  />
                </div>
                <button
                  type="submit"
                  disabled={emailLoading}
                  className="rounded-lg bg-[#D97B3D] px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-[#c46a2e] focus:outline-none focus:ring-2 focus:ring-[#D97B3D]/50 disabled:opacity-60 cursor-pointer whitespace-nowrap"
                  style={{ minHeight: '48px' }}
                >
                  {emailLoading ? 'Envoi...' : 'Voir ma recommandation'}
                </button>
              </div>
              <label className="flex items-start gap-2 text-xs text-[#4a5568]">
                <input type="checkbox" required className="mt-0.5" />
                <span>
                  J'accepte que mon adresse email soit utilisee pour recevoir ma recommandation personnalisee.{' '}
                  <a href="/politique-confidentialite/" className="text-[#D97B3D] underline">
                    Politique de confidentialite
                  </a>
                </span>
              </label>
            </form>
          )}
          {emailError && <p className="text-sm text-red-600 mt-2">{emailError}</p>}
        </section>
      )}

      {/* Contenu gate revele */}
      {showGated && recommendation && (
        <section className="bg-white rounded-2xl border-2 border-[#D97B3D] p-6 md:p-8">
          <h2 className="font-sans text-xl font-bold text-[#1B2E4A] mb-4">
            Votre recommandation personnalisee
          </h2>

          <div className="space-y-4">
            <div className="bg-[#fef9f0] border border-[#f0dcc4] rounded-xl p-5">
              <h3 className="font-sans text-lg font-bold text-[#D97B3D] mb-2">
                {recommendation.deviceType}
              </h3>
              <p className="text-sm text-[#4a5568]">
                {recommendation.deviceExplanation}
              </p>
            </div>

            {recommendation.classe1 && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-[#e8e4df] p-5">
                  <h4 className="font-sans text-base font-bold text-[#1B2E4A] mb-2">
                    100% Sante (Classe 1)
                  </h4>
                  <p className="text-sm text-[#4a5568]">{recommendation.classe1}</p>
                </div>
                <div className="rounded-xl border border-[#D97B3D] p-5">
                  <h4 className="font-sans text-base font-bold text-[#D97B3D] mb-2">
                    Classe 2 (technologies avancees)
                  </h4>
                  <p className="text-sm text-[#4a5568]">{recommendation.classe2}</p>
                </div>
              </div>
            )}
          </div>

          {/* CTA audioprothesiste */}
          <div className="mt-6 text-center">
            <a
              href="/trouver-audioprothesiste/"
              className="inline-flex items-center gap-2 rounded-lg bg-[#1B2E4A] px-8 py-3.5 text-lg font-semibold text-white transition-colors hover:bg-[#2a4268] focus:outline-none focus:ring-2 focus:ring-[#1B2E4A]/50"
              style={{ minHeight: '48px' }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              Trouver un audioprothesiste partenaire
            </a>
            <p className="text-xs text-[#4a5568] mt-2">
              Prise de rendez-vous gratuite avec un professionnel pres de chez vous.
            </p>
          </div>

          <div className="mt-6 bg-[#fef9f0] border border-[#f0dcc4] rounded-xl px-5 py-4 text-xs text-[#4a5568] font-sans">
            <strong className="text-[#1B2E4A]">Avertissement :</strong> Cette recommandation est generee automatiquement a partir de votre audiogramme. Seul un audioprothesiste diplome d'Etat peut determiner la solution la mieux adaptee apres un bilan auditif complet. Les fourchettes de prix sont indicatives et varient selon les modeles et votre complementaire sante.
          </div>
        </section>
      )}
    </div>
  );
};

export default AudiogramAnalyzer;
