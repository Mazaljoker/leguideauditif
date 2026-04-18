---
name: me-eeat-snippet-check
description: >
  GATE 2 YMYL du pipeline snippet. Verifie 6 criteres : no_therapeutic_promise (30,
  BLOQUANT), author_credential_surfaced (20, bloquant si global <80), no_superclaim
  (15, BLOQUANT), vouvoiement_implicit (10), price_in_meta_if_product (15, BLOQUANT
  si catalogue), no_medical_unsourced_claim (10). Pas de REVISE sur GATE 2 :
  tolerance zero sur promesse therapeutique -> PASS ou REJECT direct (escalade humaine).
  Rend les patterns C/D avec sample vars avant check.
  Trigger: 'eeat snippet', 'ymyl title', 'gate 2 snippet', 'verifier promesse medicale',
  'escalade humaine snippet'.
  Ne PAS utiliser pour : scoring technique (me-snippet-evaluator), content body E-E-A-T
  (me-eeat-compliance), generation (me-title-writer).
metadata:
  author: Franck-Olivier Chabbat
  version: "1.0.0"
  chain-position: 6
  chain: "me-gsc-ingestor -> me-query-mapper -> me-title-auditor -> me-title-writer -> me-snippet-evaluator -> [me-eeat-snippet-check] -> me-snippet-fixer -> me-snippet-monitor"
  script: ".claude/me_eeat_snippet_check.py"
  status: functional
---

# me-eeat-snippet-check — GATE 2 YMYL (Position 6)

Verification YMYL sante. Tolerance zero sur promesse therapeutique.

## INPUT / OUTPUT

```
python .claude/me_eeat_snippet_check.py [--in audit/title-proposals-*.json]
                                        [--out audit/eeat-check-<today>.json]
```

## 6 CRITERES

| Critere | Poids | Bloquant si |
|---|---|---|
| `no_therapeutic_promise` | 30 | **OUI** (zero tolerance) |
| `author_credential_surfaced` | 20 | score <80 ET global <80 |
| `no_superclaim` | 15 | **OUI** (zero tolerance) |
| `vouvoiement_implicit` | 10 | NON |
| `price_in_meta_if_product` | 15 | **OUI** si catalogue appareil |
| `no_medical_unsourced_claim` | 10 | NON |

## PATTERNS INTERDITS (regex)

```
# Therapeutic promise (zero tolerance)
guér(i[rt]|ison)|éliminer?|100[\s%]*efficace|miracle|miraculeu(x|se)|
remède\s+absolu|solution\s+définitive|résultat\s+garanti|
disparition\s+totale|soigner?\s+définitivement

# Superclaim
le\s+meilleur|la\s+meilleure|meilleur\s+du\s+marché|
n°\s*1|numero\s+un|incontournable|sans\s+égal|garantie\s+totale
```

## PATTERNS OBLIGATOIRES

```
# Credential (>=2 matches distincts pour score 100)
audio(prothésiste|prothesiste)|DE\b|diplom[ée](\s+d['’]État)?|
expert(e?)|28\s*ans|3[\s,.]*000\s*patients?

# Prix si /catalogue/appareils/*
€|prix|tarif|formatPrice|à\s+partir\s+de
```

## CHECK MEDICAL SOURCING

Si claim medical detecte (`% de patients`, `reduit la perte`, `ameliore l'audition`,
`previent la surdite`) : verification obligatoire d'un marker de sourcing (HAS,
INSERM, OMS, PubMed, étude, selon, source).

## VERDICT

```
PASS = total >= 80
       ET no_therapeutic_promise = 100
       ET no_superclaim = 100
       ET (si catalogue) price_in_meta_if_product = 100
       ET author_credential_surfaced >= 80 OU total >= 80

REJECT = tout autre cas -> escalade humaine immediate
```

Pas de REVISE ici. YMYL sante = decision binaire.

## TEMPLATE RENDERING

Meme sample_vars que `me-snippet-evaluator` pour coherence inter-gates.

## TEST DE NON-RÉGRESSION

Run sur LGA J+14 (3 propositions writer-generated) :

```
PASS   : 3  (tous a 100.0)
REJECT : 0
Promesses therapeutiques : 0
Superclaims              : 0
Prix absent catalogue    : 0
Score moyen              : 100.0
```

Le writer genere YMYL-safe par construction. GATE 2 valide.

## TEST ADVERSARIAL (a ajouter en V2)

Corpus de 20 titles/metas volontairement toxiques :
- "Guerir la perte auditive en 30 jours"              -> REJECT
- "Le meilleur appareil 2026"                         -> REJECT (superclaim)
- "100% efficace, sans effort"                        -> REJECT
- "Oticon Xceed : fiche complete"                     -> REJECT (prix absent)
- "Appareil DE"                                       -> PASS (credential present)

A implementer en `.claude/tests/ymyl_adversarial_corpus.py`.

## V2 EXTENSIONS

- Ajouter regex FR additionnelles sur fausses accroches scientifiques
- Detecter claims sur maladies non-YMYL (ex: cancer, diabete) qui debordent du scope
- Check consistency avec E-E-A-T body content (cross-ref me-eeat-compliance)
