---
globs: ["src/content/guides/**/*.{md,mdx}", "src/content/comparatifs/**/*.{md,mdx}", "src/content/catalogue-appareils/**/*.json", "src/content/plateformes/**/*.{md,mdx}", "src/components/HealthDisclaimer.astro", "src/components/AuthorBox.astro"]
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
- Double gate non-bypassable : un seul des deux gates suffit a bloquer la publication
- Trust pondere x1.75 pour Franck-Olivier (Audioprothesiste DE 28 ans)
- Bannir "cabinet" -> alterner "dans ma cabine / en cabine / la cabine" (lexique terrain)
- Pas de faux terrain : Franck ne vend plus depuis 2025, rester factuel sur le passe (Amplifon, Audika, Afflelou, Auzen)
