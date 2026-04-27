---
globs: ["src/lib/rpps-*.ts", "src/pages/api/admin/sync-rpps.ts", "src/pages/api/admin/propagate-rpps.ts", "src/pages/admin/rpps-*.astro", "supabase/migrations/*rpps*"]
---
# Pipeline RPPS — règles techniques

Pipeline déployé fin avril 2026 (signal Thomas Perron Manéo Bayonne + Aurélie Azam Carcassonne). 3 maillons obligatoires.

## Architecture

```
API FHIR Annuaire Santé → rpps_audioprothesistes (sync, mig 034)
                              ↓
                    rpps_propagation_runs (mig 035)
                              ↓
                       centres_auditifs (fiches publiques)
```

## API FHIR Annuaire Santé — specifics critiques

- **URL base** : `https://gateway.api.esante.gouv.fr/fhir/v2`
- **Header auth** : `ESANTE-API-KEY: <key>` (pas `apikey` ni `Authorization`)
- **Env var canonique** : `ESANTE_API_KEY` (clé Gravitee `portal.api.esante.gouv.fr`)
- **Query Practitioner** : `qualification-code=26&active=true&_lastUpdated=ge{ISO}&_count=200`
  - `qualification-code` (PAS `qualification`) — sinon 0 résultats silencieux
  - `_lastUpdated=ge{ISO}` pour mode incrémental (sinon timeout sur 7000+ rows)
- Spec officielle : `.claude/skills/lga-rpps-detector/SKILL.md` — TOUJOURS consulter avant de toucher au client FHIR

## IDNPS vs RPPS — toujours normaliser à 11 chiffres

L'API retourne IDNPS 12 chiffres (préfixe `8`). La table DB stocke RPPS 11 chiffres.

```ts
function normalizeRpps(value: string): string | null {
  const cleaned = value.trim();
  if (/^\d{11}$/.test(cleaned)) return cleaned;
  if (/^8\d{11}$/.test(cleaned)) return cleaned.substring(1);
  return null;
}
```

Sans cette normalisation : 7000+ matches DB ratés, fausses insertions massives.

## Supabase upsert : stripEmpty obligatoire

`.upsert(row, { onConflict: 'X' })` **écrase les colonnes existantes avec null**. Sur sync RPPS, le FHIR Practitioner ne porte pas l'adresse d'exercice (sur PractitionerRole) → écrasement code_postal/commune si pas filtré.

Pattern obligatoire avant tout upsert :

```ts
const TRACKING_KEYS = new Set(['rpps', 'updated_at', 'last_seen_at', 'etat_rpps']);
function stripEmpty(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (TRACKING_KEYS.has(k)) { out[k] = v; continue; }
    if (v === null || v === undefined) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    out[k] = v;
  }
  return out;
}
```

Filtrer **null + undefined + empty strings**. Le filtre `v !== null` seul laisse passer les `""` (observé : delta -18 emails inexpliqué).

## Anti N+1 queries — batch matching obligatoire

Vercel function timeout = 300s. `for (r of items) { await supabase.from(...).eq(...) }` sur 7000+ rows = ~14000 queries × 50-100ms = 12-25 min = **timeout garanti**.

Toujours batch loader d'abord :

```ts
async function batchLoadByKey(supabase, keyList, table, key = 'rpps') {
  const map = new Map();
  if (keyList.length === 0) return map;
  const CHUNK = 500; // limite URL Supabase REST ~32 KB
  for (let i = 0; i < keyList.length; i += CHUNK) {
    const chunk = keyList.slice(i, i + CHUNK);
    const { data } = await supabase.from(table).select('*').in(key, chunk);
    for (const row of data ?? []) map.set(row[key], row);
  }
  return map;
}
```

Ratio observé : 14000 queries → 15 queries (~3000×).

## Astro `<script define:vars>` = JS pur uniquement

`define:vars` force `is:inline` automatiquement → Astro ne strip PAS les annotations TypeScript. Un `interface`, `as Type`, `<Generic>` dans un `<script define:vars={...}>` plante au parse navigateur, **AUCUN event listener n'est attaché**.

Si besoin de typing client + vars serveur : `<script>` simple + lecture depuis `<meta>` ou `data-*` attributs sérialisés en JSON.

## Décisions Franck-Olivier (intangibles)

### Vue publique `v_centres_auditifs_public` (mig 033)

```sql
WHERE etat_administratif IS DISTINCT FROM 'C' OR claim_status = 'approved'
```

- **Toutes les lectures publiques** doivent passer par cette vue (pas la table directe)
- **Lectures admin/CRM/audiopro** continuent sur la table
- **Exception claim_status='approved'** : 2 fiches en état C revendiquées (Sonor Antony, Idéal Audition Aubervilliers) restent visibles
- Page `/centre/[slug]` lit la table complète pour détecter état C/F et retourner HTTP 410 Gone

### Propagation RPPS → centres : skip claimed/premium

Pour fiches `claim_status='approved'` ou `plan IN ('claimed', 'premium')` avec change RPPS :
- **JAMAIS de update auto** (le pro contrôle sa fiche payée)
- Flag dans `flagged_for_review` JSONB pour review humaine
- Email récap à `franckolivier@leguideauditif.fr`

### Cron propagation = dry-run only

Cron Vercel `/api/admin/propagate-rpps?source=cron` (1er + 15 du mois 04:30 UTC) tourne **uniquement en dry-run** (sans `apply=true`). Apply manuel uniquement via bouton admin `/admin/rpps-propagate`. À reconsidérer après 2-3 cycles validés.

## Numéros de PRs ayant construit le pipeline (avril 2026)

#102 (filtre etat=C) → #104 (sync squelette) → #106 (alignement skill) → #108 (script admin JS pur) → #109 (IDNPS normalize + stripEmpty) → #111 (email/tel surface) → #112 (sprint A propagation) → #114 (batch matching) → #115 (cron dry-run par défaut).

## Crons Vercel actifs (vercel.json)

| Path | Schedule UTC | Mode |
|---|---|---|
| `/api/admin/sync-rpps?source=cron` | `0 4 1 * *` + `0 4 15 * *` | apply auto (sync FHIR safe) |
| `/api/admin/propagate-rpps?source=cron` | `30 4 1 * *` + `30 4 15 * *` | DRY-RUN only |

## V2 / sprints suivants à scoper

- Géocodage BAN automatique (api-adresse.data.gouv.fr) pour les fiches créées par propagation
- Match fuzzy nom + CP (priorité 3) avec review manuelle
- Désactivation/redirect 301 pour les déménagements lointains
- Chainage direct sync → propagate (au lieu de 2 crons séparés)
- Skill `lga-rpps-enricher` (Apollo + web search) pour enrichir les 90% sans email FHIR
- Appel `PractitionerRole?practitioner=...` pour récupérer adresse d'exercice (au lieu de Practitioner direct)
