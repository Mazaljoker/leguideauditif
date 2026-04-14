/**
 * Génère les JSON de la collection plateformes à partir des données produit existantes
 */
import fs from 'fs';
import path from 'path';

const catDir = 'src/content/catalogue-appareils';
const outDir = 'src/content/plateformes';
const files = fs.readdirSync(catDir).filter(f => f.endsWith('.json'));

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Metadata manuelles pour chaque plateforme
const meta = {
  'oticon|Sirius': {
    slug: 'oticon-sirius', gen: 4, pred: 'oticon-polaris-r',
    innovCle: "Puce 4D Sensor avec DNN 2.0 embarqué — la première puce auditive qui détecte les intentions de l'utilisateur en temps réel",
    desc: "La puce Sirius d'Oticon est la plus avancée du groupe Demant. Elle embarque un réseau neuronal profond (DNN 2.0) entraîné sur 12 millions de scènes sonores réelles, et des capteurs 4D qui adaptent le traitement audio selon les mouvements de la tête et du corps. C'est la première puce à pouvoir détecter si vous écoutez activement une conversation ou si vous vous déplacez dans la rue.",
  },
  'oticon|Polaris R': {
    slug: 'oticon-polaris-r', gen: 3, pred: 'oticon-polaris', succ: 'oticon-sirius',
    innovCle: "DNN embarqué première génération — traitement des scènes sonores par réseau neuronal",
    desc: "La puce Polaris R est la deuxième génération de la plateforme Polaris d'Oticon. Elle introduit le premier DNN (Deep Neural Network) embarqué directement dans la puce, permettant un traitement en temps réel des environnements sonores complexes sans dépendre du smartphone.",
  },
  'oticon|Polaris': {
    slug: 'oticon-polaris', gen: 2, pred: 'oticon-velox-s', succ: 'oticon-polaris-r',
    innovCle: "OpenSound Navigator — traitement panoramique 360° des sons",
    desc: "La puce Polaris est le cœur de la gamme Oticon More. Elle améliore l'OpenSound Navigator introduit sur la plateforme précédente, avec un traitement sonore à 360° qui hiérarchise les sources sonores sans fermer le champ auditif.",
  },
  'oticon|Velox S': {
    slug: 'oticon-velox-s', gen: 1, succ: 'oticon-polaris',
    innovCle: "OpenSound OS — premier système de traitement sonore ouvert à 360°",
    desc: "La puce Velox S est la base de la gamme Oticon Xceed, conçue pour les pertes auditives sévères à profondes. Elle utilise le système OpenSound OS qui traite l'environnement sonore à 360° au lieu de se concentrer uniquement sur la direction frontale.",
  },
  'phonak|DEEPSONIC': {
    slug: 'phonak-deepsonic', gen: 4, pred: 'phonak-era',
    innovCle: "Première puce auditive avec IA en apprentissage continu et Bluetooth LE Audio natif",
    desc: "DEEPSONIC est la puce la plus avancée de Phonak (groupe Sonova). Elle est au cœur de la gamme Audéo Infinio. Son architecture embarque une IA capable d'apprentissage continu qui s'affine en permanence à partir des préférences de l'utilisateur. Elle supporte nativement le Bluetooth LE Audio et l'Auracast.",
  },
  'phonak|ERA': {
    slug: 'phonak-era', gen: 3, pred: 'phonak-prism', succ: 'phonak-deepsonic',
    innovCle: "Puce ultra-miniaturisée pour intra-auriculaires rechargeables",
    desc: "La puce ERA de Phonak est optimisée pour les appareils intra-auriculaires. Elle équipe les Virto Infinio, les plus petits appareils rechargeables du marché. Elle partage les technologies IA de la plateforme DEEPSONIC mais dans un facteur de forme miniature.",
  },
  'phonak|PRISM': {
    slug: 'phonak-prism', gen: 2, succ: 'phonak-era',
    innovCle: "SmartSpeech Technology — traitement intelligent de la parole dans le bruit",
    desc: "La puce PRISM équipe toute la gamme Lumity de Phonak. Sa technologie SmartSpeech analyse l'environnement sonore et optimise automatiquement les réglages pour améliorer la compréhension de la parole, notamment en milieu bruyant.",
  },
  'phonak|Analogique programmable numériquement': {
    slug: 'phonak-analogique', gen: 0,
    innovCle: "Technologie analogique programmable — le seul appareil invisible 100% dans l'oreille",
    desc: "Le Phonak Lyric utilise une technologie unique : analogique mais programmable numériquement. C'est le seul appareil auditif qui se porte 24h/24 pendant plusieurs mois sans jamais être retiré. Il est inséré profondément dans le conduit auditif par l'audioprothésiste.",
  },
  'signia|IX Platform': {
    slug: 'signia-ix', gen: 2, pred: 'signia-ax',
    innovCle: "Integrated Xperience — double processeur avec séparation parole/environnement",
    desc: "La plateforme IX (Integrated Xperience) de Signia est la plus complète du groupe WS Audiology. Elle utilise un double processeur qui sépare le traitement de la parole et celui de l'environnement sonore, pour une clarté optimale dans toutes les situations. C'est la plateforme la plus polyvalente avec 13 modèles différents.",
  },
  'signia|AX Platform': {
    slug: 'signia-ax', gen: 1, succ: 'signia-ix',
    innovCle: "Augmented Xperience — premier double processeur Signia",
    desc: "La plateforme AX (Augmented Xperience) a introduit le concept de double processeur chez Signia. La parole et le bruit ambiant sont traités par des processeurs distincts, permettant de valoriser la voix sans couper l'environnement.",
  },
  'resound|GN 2.0': {
    slug: 'resound-gn2', gen: 3, pred: 'resound-360', succ: 'resound-360-dnn',
    innovCle: "Bluetooth LE Audio et Auracast — streaming audio universel",
    desc: "La puce GN 2.0 de ReSound est la première du groupe GN à supporter nativement le Bluetooth LE Audio et l'Auracast. Elle équipe la gamme Nexia et permet le streaming audio depuis des lieux publics (aéroports, cinémas, conférences) directement dans les appareils auditifs.",
  },
  'resound|Dual-chip 360 + DNN': {
    slug: 'resound-360-dnn', gen: 4, pred: 'resound-gn2',
    innovCle: "Double puce 360° avec réseau neuronal — le haut de gamme ReSound",
    desc: "La configuration Dual-chip 360 + DNN est le sommet technologique de ReSound. Elle combine deux puces 360° avec un réseau neuronal profond pour un traitement ultra-précis des environnements complexes. Elle équipe uniquement le Vivia 9, le flagship ReSound.",
  },
  'resound|360 Chip': {
    slug: 'resound-360', gen: 2, succ: 'resound-gn2',
    innovCle: "Traitement sonore à 360° avec M&RIE (microphone dans l'oreille)",
    desc: "La puce 360 Chip de ReSound a introduit le traitement panoramique du son. Combinée au M&RIE (Microphone & Receiver In Ear), elle utilise la forme naturelle de votre oreille pour localiser les sons, comme le ferait une oreille saine.",
  },
  'resound|360 Chip + ML AI': {
    slug: 'resound-360-ml', gen: 3,
    innovCle: "Puce 360° enrichie par apprentissage machine pour les pertes sévères",
    desc: "Version de la puce 360 enrichie par intelligence artificielle, spécialement optimisée pour les pertes auditives sévères à profondes. Elle équipe l'Enzo IA 9, l'appareil surpuissant de ReSound.",
  },
  'starkey|G3 Neuro': {
    slug: 'starkey-g3-neuro', gen: 3, pred: 'starkey-g2-neuro',
    innovCle: "Processeur neuronal 3e génération — détection de chutes et capteurs santé intégrés",
    desc: "Le G3 Neuro est le processeur le plus avancé de Starkey. Il équipe la gamme Omega AI et intègre des capteurs de santé (détection de chutes, suivi d'activité physique, compteur de pas). C'est le seul processeur auditif capable d'alerter un proche en cas de chute.",
  },
  'starkey|G2 Neuro': {
    slug: 'starkey-g2-neuro', gen: 2, pred: 'starkey-neuro-processor', succ: 'starkey-g3-neuro',
    innovCle: "Edge AI — traitement IA embarqué en bordure de réseau",
    desc: "Le G2 Neuro équipe la gamme Edge AI de Starkey. Il introduit le traitement IA « edge computing » directement dans l'appareil, sans nécessiter de connexion au cloud. L'adaptation sonore se fait en temps réel, localement.",
  },
  'starkey|Neuro Processor': {
    slug: 'starkey-neuro-processor', gen: 1, succ: 'starkey-g2-neuro',
    innovCle: "Premier processeur auditif avec réseau neuronal embarqué (Starkey)",
    desc: "Le Neuro Processor est la première puce de Starkey à intégrer un réseau neuronal. Il équipe la gamme Genesis AI et a été entraîné sur des millions d'environnements sonores pour optimiser le traitement de la parole.",
  },
  'starkey|Neuro Sound Technology': {
    slug: 'starkey-neuro-sound', gen: 1,
    innovCle: "Technologie sonore neurale pour appareils sur mesure",
    desc: "Neuro Sound Technology est la plateforme de Starkey dédiée aux appareils sur mesure (Signature Series). Elle optimise le traitement sonore pour les formats intra-auriculaires personnalisés.",
  },
  'widex|W1': {
    slug: 'widex-w1', gen: 2, pred: 'widex-puresound',
    innovCle: "Puce W1 — zéro retard de traitement (0,5 ms), le son le plus naturel du marché",
    desc: "La puce W1 de Widex est au cœur de la gamme Allure. Sa particularité : un temps de traitement de seulement 0,5 milliseconde, le plus rapide de l'industrie. Ce « zéro retard » produit un son perçu comme parfaitement naturel, sans l'effet « robot » que certains patients reprochent aux autres marques.",
  },
  'unitron|Integra OS': {
    slug: 'unitron-integra-os', gen: 2,
    innovCle: "Système d'exploitation Integra — adaptation automatique en temps réel",
    desc: "Integra OS est le système d'exploitation de la plateforme Vivante d'Unitron (groupe Sonova). Il gère l'adaptation automatique aux environnements sonores et le passage fluide entre les programmes. Sa particularité : l'utilisateur peut ajuster le niveau de traitement directement depuis l'application.",
  },
  'bernafon|DECS': {
    slug: 'bernafon-decs', gen: 1,
    innovCle: "DECS — système de compression dynamique adaptatif",
    desc: "DECS (Dynamic Environmental Compensation System) est la technologie propriétaire de Bernafon. Elle analyse en continu l'environnement et ajuste la compression dynamique en temps réel, pour un rendu sonore plus naturel que les systèmes de compression classiques.",
  },
  'rexton|IX Platform': {
    slug: 'rexton-ix', gen: 2,
    innovCle: "Multi-Voice Focus — focalisation sur plusieurs interlocuteurs simultanément",
    desc: "La plateforme IX de Rexton (groupe WS Audiology, même groupe que Signia) introduit le Multi-Voice Focus : au lieu de se concentrer sur un seul locuteur, l'appareil peut suivre et clarifier plusieurs voix en même temps. Idéal pour les conversations de groupe.",
  },
  'hansaton|PRISM': {
    slug: 'hansaton-prism', gen: 1,
    innovCle: "Plateforme PRISM partagée avec Phonak — technologie Sonova accessible",
    desc: "Hansaton utilise la plateforme PRISM du groupe Sonova (la même technologie que Phonak Lumity) dans un positionnement plus accessible. Le Sound Stratos offre les technologies SmartSpeech à un prix d'entrée.",
  },
  'philips|SoundMap (Demant)': {
    slug: 'philips-soundmap', gen: 1,
    innovCle: "SoundMap — cartographie sonore développée par Demant pour Philips",
    desc: "SoundMap est la technologie développée par le groupe Demant (maison mère d'Oticon) pour la marque Philips HearLink. Elle offre un traitement sonore fiable à un prix contenu, principalement distribué dans les réseaux Costco et les grandes enseignes.",
  },
};

// Build products by puce key
const byPuce = {};
for (const f of files) {
  const d = JSON.parse(fs.readFileSync(path.join(catDir, f), 'utf8'));
  if (!d.puce || d.legacy) continue;
  const key = d.marque + '|' + d.puce;
  if (!byPuce[key]) byPuce[key] = [];
  byPuce[key].push(d);
}

let created = 0;
for (const [key, m] of Object.entries(meta)) {
  const products = byPuce[key] || [];
  const years = products.map(p => p.annee);
  const maxCanaux = Math.max(0, ...products.map(p => p.specs?.canaux || 0));
  const hasBT = products.some(p => p.connectivite?.bluetooth);
  const hasAuracast = products.some(p => p.connectivite?.auracast);
  const hasDNN = m.desc.toLowerCase().includes('dnn') || m.desc.toLowerCase().includes('neuronal') || m.desc.toLowerCase().includes('neural');
  const hasCapteurs = m.desc.toLowerCase().includes('capteur') || m.desc.toLowerCase().includes('chute');

  const marque = products[0]?.marque || key.split('|')[0];
  const marqueLabel = products[0]?.marqueLabel || marque.charAt(0).toUpperCase() + marque.slice(1);
  const groupe = products[0]?.groupe || '';

  const platform = {
    slug: m.slug,
    nom: key.split('|')[1],
    marque,
    marqueLabel,
    groupe,
    annee: years.length > 0 ? Math.max(...years) : 2020,
    generation: m.gen,
    ...(m.pred && { predecesseur: m.pred }),
    ...(m.succ && { successeur: m.succ }),
    innovationCle: m.innovCle,
    description: m.desc,
    specs: {
      ...(maxCanaux > 0 && { canaux: maxCanaux }),
      ...(hasBT && { connectivite: hasAuracast ? 'Bluetooth LE Audio + Auracast' : 'Bluetooth Classic' }),
      dnn: hasDNN,
      auracast: hasAuracast,
      capteursSante: hasCapteurs,
    },
    produits: products.map(p => p.slug),
  };

  fs.writeFileSync(path.join(outDir, m.slug + '.json'), JSON.stringify(platform, null, 2) + '\n', 'utf8');
  created++;
}
console.log('Created', created, 'platform JSON files');
