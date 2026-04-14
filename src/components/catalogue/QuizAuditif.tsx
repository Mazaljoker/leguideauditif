/**
 * Quiz "Trouvez votre aide auditive" — 5 étapes, 3 recommandations
 * Algorithme de matching côté client sur les produits actifs
 */
import { useState, useMemo, type FC } from 'react';

interface Product {
  slug: string;
  marque: string;
  marqueLabel: string;
  modele: string;
  niveau?: string;
  formeType: string;
  classe?: string;
  rac0?: boolean;
  annee: number;
  prix?: { eur?: { unitaire?: number; min?: number; max?: number } };
  specs?: { canaux?: number };
  connectivite?: { bluetooth?: string; auracast?: boolean };
  fonctionnalites?: { rechargeable?: boolean; acouphenes?: boolean };
  image?: string;
  legacy?: boolean;
  noteExpert?: number;
}

interface Props {
  products: Product[];
}

type Step = 'perte' | 'budget' | 'vie' | 'priorite' | 'esthetique' | 'resultat';

const STEPS: { key: Step; question: string; options: { value: string; label: string; sub: string }[] }[] = [
  {
    key: 'perte',
    question: "Comment décririez-vous votre perte auditive ?",
    options: [
      { value: 'legere', label: 'Légère', sub: "Je rate quelques mots dans les conversations" },
      { value: 'moyenne', label: 'Moyenne', sub: "J'ai du mal à suivre en groupe ou au restaurant" },
      { value: 'severe', label: 'Sévère', sub: "Je n'entends presque plus sans appareil" },
      { value: 'nsp', label: 'Je ne sais pas', sub: "Je n'ai pas encore fait de bilan auditif" },
    ],
  },
  {
    key: 'budget',
    question: "Quel budget avez-vous en tête ?",
    options: [
      { value: 'rac0', label: 'Classe 1 — 0€', sub: "Intégralement pris en charge par la Sécu + mutuelle" },
      { value: 'moins1000', label: 'Moins de 1 000€', sub: "Un bon rapport qualité-prix" },
      { value: '1000-1500', label: '1 000€ – 1 500€', sub: "Le milieu de gamme avec de bonnes technologies" },
      { value: 'plus1500', label: 'Plus de 1 500€', sub: "Le meilleur de la technologie actuelle" },
    ],
  },
  {
    key: 'vie',
    question: "Où avez-vous le plus de mal à entendre ?",
    options: [
      { value: 'calme', label: 'Conversations calmes', sub: "Chez vous, en tête-à-tête" },
      { value: 'bruyant', label: 'Restaurants, réunions', sub: "Lieux bruyants avec plusieurs personnes" },
      { value: 'exterieur', label: 'Extérieur, sport', sub: "Activités en plein air, sport" },
      { value: 'partout', label: 'Partout', sub: "Dans toutes les situations" },
    ],
  },
  {
    key: 'priorite',
    question: "Qu'est-ce qui compte le plus pour vous ?",
    options: [
      { value: 'discretion', label: 'Discrétion', sub: "Un appareil le plus invisible possible" },
      { value: 'confort', label: 'Confort', sub: "Un appareil qu'on oublie qu'on porte" },
      { value: 'son', label: 'Qualité du son', sub: "Le meilleur traitement audio" },
      { value: 'connecte', label: 'Connectivité', sub: "Téléphone, TV, musique en Bluetooth" },
    ],
  },
  {
    key: 'esthetique',
    question: "Quel type d'appareil préférez-vous ?",
    options: [
      { value: 'contour', label: 'Contour discret', sub: "Derrière l'oreille — le plus courant" },
      { value: 'intra', label: 'Intra-auriculaire', sub: "Dans l'oreille — plus visible mais facile" },
      { value: 'invisible', label: 'Invisible', sub: "Dans le conduit — quasi invisible" },
      { value: 'indifferent', label: 'Pas de préférence', sub: "Vous me conseillerez" },
    ],
  },
];

function scoreProduct(p: Product, answers: Record<string, string>): number {
  let score = (p.noteExpert ?? 5) * 10;
  const price = p.prix?.eur?.unitaire ?? p.prix?.eur?.min;
  const canaux = p.specs?.canaux ?? 8;

  // Budget
  switch (answers.budget) {
    case 'rac0': if (p.classe === '1' || p.rac0) score += 30; else score -= 20; break;
    case 'moins1000': if (price && price < 1000) score += 20; else if (price && price >= 1500) score -= 15; break;
    case '1000-1500': if (price && price >= 1000 && price <= 1500) score += 20; break;
    case 'plus1500': if (price && price > 1500) score += 15; if (canaux >= 20) score += 10; break;
  }

  // Style de vie
  switch (answers.vie) {
    case 'bruyant': case 'partout': if (canaux >= 16) score += 15; if (canaux >= 24) score += 10; break;
    case 'exterieur': if (p.fonctionnalites?.rechargeable) score += 10; break;
  }

  // Priorité
  switch (answers.priorite) {
    case 'discretion': if (['IIC', 'CIC', 'Slim RIC'].includes(p.formeType)) score += 20; break;
    case 'confort': if (p.fonctionnalites?.rechargeable) score += 15; break;
    case 'son': if (canaux >= 20) score += 15; score += (p.noteExpert ?? 5) * 2; break;
    case 'connecte': if (p.connectivite?.bluetooth) score += 15; if (p.connectivite?.auracast) score += 10; break;
  }

  // Esthétique
  switch (answers.esthetique) {
    case 'contour': if (['RIC', 'BTE', 'Slim RIC'].includes(p.formeType)) score += 15; break;
    case 'intra': if (['ITE', 'ITC'].includes(p.formeType)) score += 20; break;
    case 'invisible': if (['IIC', 'CIC'].includes(p.formeType)) score += 25; break;
  }

  // Bonus récence
  if (p.annee >= 2025) score += 5;
  if (p.annee >= 2026) score += 5;

  return score;
}

const QuizAuditif: FC<Props> = ({ products }) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const active = products.filter(p => !p.legacy);
  const currentStep = stepIdx < STEPS.length ? STEPS[stepIdx] : null;
  const isResult = stepIdx >= STEPS.length;

  const results = useMemo(() => {
    if (!isResult) return [];
    return active
      .map(p => ({ product: p, score: scoreProduct(p, answers) }))
      .sort((a, b) => b.score - a.score);
  }, [isResult, answers, active]);

  // Top 3: best overall, best budget, best premium
  const top = useMemo(() => {
    if (results.length === 0) return [];
    const best = results[0];
    const budgetPick = results.find(r => r.product.slug !== best.product.slug && ((r.product.prix?.eur?.unitaire ?? Infinity) < (best.product.prix?.eur?.unitaire ?? 0)));
    const premiumPick = results.find(r => r.product.slug !== best.product.slug && r.product.slug !== budgetPick?.product.slug && (r.product.noteExpert ?? 0) >= 8.5);
    return [
      { ...best, label: 'Notre recommandation', color: 'border-[#D97B3D]' },
      ...(budgetPick ? [{ ...budgetPick, label: 'Alternative budget', color: 'border-emerald-500' }] : []),
      ...(premiumPick ? [{ ...premiumPick, label: 'Alternative premium', color: 'border-[#1B2E4A]' }] : []),
    ];
  }, [results]);

  const handleSelect = (value: string) => {
    if (!currentStep) return;
    setAnswers(prev => ({ ...prev, [currentStep.key]: value }));
    setStepIdx(prev => prev + 1);

    // GA4 tracking
    if (stepIdx === STEPS.length - 1 && typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', 'quiz_completed', {
        event_category: 'engagement',
        event_label: 'quiz_auditif',
      });
    }
  };

  const restart = () => { setStepIdx(0); setAnswers({}); };

  if (isResult) {
    return (
      <div>
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6 mb-6 text-center">
          <p className="font-sans text-lg font-bold text-emerald-700 mb-1">Vos résultats sont prêts</p>
          <p className="font-sans text-sm text-emerald-600">Basés sur vos réponses, voici nos 3 recommandations</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {top.map(({ product, label, color, score }) => (
            <div key={product.slug} className={`bg-white rounded-2xl border-2 ${color} p-5 flex flex-col`}>
              <span className="text-xs font-bold uppercase tracking-wider text-[#D97B3D] mb-2">{label}</span>
              {product.image && (
                <div className="h-32 flex items-center justify-center mb-3">
                  <img src={product.image} alt={`${product.marqueLabel} ${product.modele}`} className="h-full object-contain" loading="lazy" />
                </div>
              )}
              <h3 className="font-sans text-base font-bold text-[#1B2E4A] mb-1">
                {product.marqueLabel} {product.modele}{product.niveau ? ` ${product.niveau}` : ''}
              </h3>
              {product.noteExpert && (
                <span className="inline-block w-fit px-2 py-0.5 rounded-full text-xs font-bold bg-[#1B2E4A] text-white mb-2">{product.noteExpert}/10</span>
              )}
              <p className="text-sm text-gray-500 mb-3 flex-1">
                {product.formeType} {product.fonctionnalites?.rechargeable ? '· Rechargeable' : ''} {product.connectivite?.bluetooth ? '· Bluetooth' : ''}
              </p>
              <div className="flex gap-2 mt-auto">
                <a href={`/catalogue/appareils/${product.slug}/`} className="flex-1 text-center px-3 py-2 rounded-lg border border-[#1B2E4A] text-[#1B2E4A] text-sm font-semibold no-underline hover:bg-[#1B2E4A] hover:text-white transition-colors">
                  Voir la fiche
                </a>
                <a href={`/devis/?appareil=${product.slug}`} className="flex-1 text-center px-3 py-2 rounded-lg bg-[#D97B3D] text-white text-sm font-semibold no-underline hover:bg-[#c46a2e] transition-colors">
                  Devis
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button type="button" onClick={restart} className="text-sm text-gray-500 hover:underline cursor-pointer">
            Recommencer le quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Progress */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((_, i) => (
          <div key={i} className={`flex-1 h-1.5 rounded-full ${i <= stepIdx ? 'bg-[#D97B3D]' : 'bg-gray-200'}`} />
        ))}
      </div>

      <p className="text-xs text-gray-500 mb-2 font-sans">Question {stepIdx + 1} sur {STEPS.length}</p>
      <h2 className="font-sans text-xl sm:text-2xl font-bold text-[#1B2E4A] mb-6">
        {currentStep?.question}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {currentStep?.options.map(opt => (
          <button key={opt.value} type="button" onClick={() => handleSelect(opt.value)}
            className="text-left bg-white border-2 border-gray-200 hover:border-[#D97B3D] rounded-xl p-5 transition-colors cursor-pointer group">
            <div className="font-sans text-base font-bold text-[#1B2E4A] group-hover:text-[#D97B3D] transition-colors mb-1">
              {opt.label}
            </div>
            <div className="font-sans text-sm text-gray-500">{opt.sub}</div>
          </button>
        ))}
      </div>

      {stepIdx > 0 && (
        <button type="button" onClick={() => setStepIdx(prev => prev - 1)}
          className="mt-4 text-sm text-gray-500 hover:underline cursor-pointer">
          &larr; Revenir
        </button>
      )}
    </div>
  );
};

export default QuizAuditif;
