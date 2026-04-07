---
globs: ["src/content/**/*.md", "src/content/**/*.mdx"]
---
# Regles YMYL contenu sante auditif

- Toute affirmation medicale DOIT etre sourcee (HAS, INSERM, OMS, PubMed)
- Pas de promesse therapeutique : interdits "guerir", "eliminer", "100% efficace", "miracle"
- Disclaimer sante obligatoire : utiliser le composant HealthDisclaimer.astro
- Encadre auteur obligatoire : utiliser le composant AuthorBox.astro
- Sources < 3 ans. Si source plus ancienne, mentionner "a date de publication"
- Vouvoiement systematique (audience seniors 65+)
- Flesch FR cible 60-80 (comprehensible niveau bac)
- Ne JAMAIS modifier le sens d'un claim medical source — forme uniquement
- Chaine GAN obligatoire avant publication : humanizer → content-evaluator (>=70) → eeat-compliance (>=80) → fixer
