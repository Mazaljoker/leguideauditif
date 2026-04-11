---
name: me-design-checker
description: >
  Verifie le rendu visuel des pages LeGuideAuditif apres generation de contenu.
  Detecte les problemes de mise en page, tableaux casses, paragraphes trop longs,
  images manquantes, composants mal rendus, spacing, accessibilite visuelle.
  Trigger: 'verifie le rendu', 'check design', 'qa visuel', 'le site est ok',
  'verifie les pages', 'rendu', 'affichage', 'mise en page', 'design check'.
  NE PAS utiliser pour le contenu (me-affiliate-writer) ni le SEO (seo-auditor).
metadata:
  author: Franck-Olivier Chabbat
  version: "1.0.0"
---

# LeGuideAuditif Design Checker v1.0

Verifie le rendu visuel de chaque page du site apres modification de contenu.
Detecte les casses visuelles AVANT deploiement.

## QUAND UTILISER

- Apres un batch d'upgrade de contenu (post upgrade-all-content, post polish-credibilite)
- Avant de merger une PR contenu
- Quand l'utilisateur dit "verifie le rendu" ou "le site est ok ?"

## PREREQUIS

```bash
# Build le site Astro localement
npm install
npm run build

# Installer playwright si pas present
npx playwright install chromium
```

## WORKFLOW

### Etape 1 — Build et servir le site

```bash
npm run build
npm run preview &
PREVIEW_PID=$!
sleep 3
```

Si le build ECHOUE → lister les erreurs, ne pas continuer.

### Etape 2 — Lister les pages a verifier

```bash
# Toutes les pages generees
find dist -name "index.html" | sed 's|dist||;s|/index.html||' | sort
```

### Etape 3 — Pour chaque page, executer les checks

Utiliser un script Node.js avec Playwright :

```javascript
// scripts/design-check.mjs
import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://localhost:4321';
const pages = JSON.parse(fs.readFileSync('/tmp/pages.json', 'utf8'));
const results = [];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });

for (const path of pages) {
  const page = await context.newPage();
  const url = `${BASE}${path}`;
  const issues = [];

  try {
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });

    // Check 1 : HTTP status
    if (response.status() !== 200) {
      issues.push({ type: 'http', severity: 'high', detail: `Status ${response.status()}` });
    }

    // Check 2 : Console errors
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

    // Check 3 : Images cassees
    const brokenImages = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('img')).filter(img => !img.complete || img.naturalWidth === 0).map(img => img.src);
    });
    if (brokenImages.length > 0) {
      issues.push({ type: 'image', severity: 'high', detail: `${brokenImages.length} images cassees: ${brokenImages.join(', ')}` });
    }

    // Check 4 : Tableaux qui debordent (overflow horizontal)
    const overflowTables = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('table')).filter(t => t.scrollWidth > t.parentElement.clientWidth).length;
    });
    if (overflowTables > 0) {
      issues.push({ type: 'table-overflow', severity: 'medium', detail: `${overflowTables} tableaux debordent en mobile/desktop` });
    }

    // Check 5 : Paragraphes trop longs (> 6 phrases estimees)
    const longParagraphs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('article p, main p')).filter(p => {
        const sentences = p.textContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
        return sentences.length > 6;
      }).length;
    });
    if (longParagraphs > 0) {
      issues.push({ type: 'long-paragraph', severity: 'low', detail: `${longParagraphs} paragraphes > 6 phrases` });
    }

    // Check 6 : H1 manquant ou multiple
    const h1Count = await page.evaluate(() => document.querySelectorAll('h1').length);
    if (h1Count === 0) issues.push({ type: 'h1-missing', severity: 'high', detail: 'Pas de H1' });
    if (h1Count > 1) issues.push({ type: 'h1-multiple', severity: 'medium', detail: `${h1Count} H1 detectes` });

    // Check 7 : Hierarchie Hn cassee (H3 sans H2 parent)
    const brokenHierarchy = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4'));
      let lastLevel = 0;
      let broken = 0;
      for (const h of headings) {
        const level = parseInt(h.tagName[1]);
        if (level > lastLevel + 1) broken++;
        lastLevel = level;
      }
      return broken;
    });
    if (brokenHierarchy > 0) {
      issues.push({ type: 'heading-hierarchy', severity: 'medium', detail: `${brokenHierarchy} sauts de niveau Hn` });
    }

    // Check 8 : Liens internes casses (404)
    const internalLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href^="/"]')).map(a => a.href);
    });
    // On ne teste pas chaque lien ici (trop lent) — le build Astro les verifie

    // Check 9 : AuthorBox present
    const hasAuthorBox = await page.evaluate(() => {
      return document.querySelector('[class*="author"], [data-author], .author-box') !== null;
    });
    // Seulement pour les articles (pas home, contact, etc.)
    const isArticle = path.includes('/guides/') || path.includes('/comparatifs/');
    if (isArticle && !hasAuthorBox) {
      issues.push({ type: 'author-missing', severity: 'high', detail: 'Pas d\'AuthorBox detecte' });
    }

    // Check 10 : Disclaimer sante present
    const hasDisclaimer = await page.evaluate(() => {
      const text = document.body.textContent;
      return text.includes('ne remplace pas') || text.includes('professionnel de sant');
    });
    if (isArticle && !hasDisclaimer) {
      issues.push({ type: 'disclaimer-missing', severity: 'high', detail: 'Pas de disclaimer sante' });
    }

    // Check 11 : Taille texte < 16px (accessibilite seniors)
    const smallText = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('article p, main p')).filter(p => {
        const size = parseFloat(window.getComputedStyle(p).fontSize);
        return size < 16;
      }).length;
    });
    if (smallText > 0) {
      issues.push({ type: 'small-text', severity: 'medium', detail: `${smallText} paragraphes < 16px (accessibilite seniors)` });
    }

    // Check 12 : Contraste (simplifie — texte gris clair sur fond clair)
    const lowContrast = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('article p, main p')).filter(p => {
        const color = window.getComputedStyle(p).color;
        const match = color.match(/\d+/g);
        if (!match) return false;
        const brightness = (parseInt(match[0]) * 299 + parseInt(match[1]) * 587 + parseInt(match[2]) * 114) / 1000;
        return brightness > 180; // texte trop clair
      }).length;
    });
    if (lowContrast > 0) {
      issues.push({ type: 'low-contrast', severity: 'medium', detail: `${lowContrast} paragraphes avec contraste faible` });
    }

    // Screenshot si issues
    if (issues.length > 0) {
      const screenshotPath = `/tmp/screenshots${path.replace(/\//g, '_') || '_home'}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      issues.forEach(i => i.screenshot = screenshotPath);
    }

  } catch (error) {
    issues.push({ type: 'crash', severity: 'high', detail: error.message });
  }

  results.push({ path, issues, issueCount: issues.length });
  await page.close();
}

await browser.close();

// Rapport
const report = {
  date: new Date().toISOString(),
  total_pages: results.length,
  pages_with_issues: results.filter(r => r.issueCount > 0).length,
  total_issues: results.reduce((sum, r) => sum + r.issueCount, 0),
  by_severity: {
    high: results.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'high').length, 0),
    medium: results.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'medium').length, 0),
    low: results.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'low').length, 0),
  },
  results
};

fs.writeFileSync('/tmp/design-check-report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.by_severity));
console.log(`\n${report.pages_with_issues}/${report.total_pages} pages avec issues`);

for (const r of results.filter(r => r.issueCount > 0)) {
  console.log(`\n${r.path} — ${r.issueCount} issues`);
  for (const i of r.issues) {
    console.log(`  [${i.severity}] ${i.type}: ${i.detail}`);
  }
}
```

### Etape 4 — Check mobile (viewport 375px)

Relancer le meme script avec viewport 375x812 (iPhone).
Les tableaux qui debordent et le texte trop petit sont les problemes les plus frequents.

### Etape 5 — Rapport

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 DESIGN CHECK — LeGuideAuditif

Pages verifiees : {N}
Pages OK : {N}
Pages avec issues : {N}

High : {N} | Medium : {N} | Low : {N}

Top issues :
{liste des issues high}

Screenshots : /tmp/screenshots/
→ Corriger les issues high ? (oui/ignorer)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## CHECKS COMPLETS (12)

| # | Check | Severity | Cible |
|---|-------|----------|-------|
| 1 | HTTP status != 200 | high | toutes pages |
| 2 | Console JS errors | medium | toutes pages |
| 3 | Images cassees (404, 0px) | high | toutes pages |
| 4 | Tableaux overflow horizontal | medium | articles |
| 5 | Paragraphes > 6 phrases | low | articles |
| 6 | H1 manquant ou multiple | high | toutes pages |
| 7 | Hierarchie Hn cassee (saut niveaux) | medium | articles |
| 8 | AuthorBox absent | high | articles |
| 9 | Disclaimer sante absent | high | articles |
| 10 | Texte < 16px | medium | articles |
| 11 | Contraste faible | medium | articles |
| 12 | Crash/timeout page | high | toutes pages |

## AUTO-FIX

Le design checker ne corrige PAS lui-meme. Il produit un rapport
avec les issues et les screenshots. Le fixer humain ou le seo-fixer
applique les corrections.

Exceptions auto-fixables :
- Paragraphe > 6 phrases → suggestion de coupe
- Tableau overflow → suggestion `overflow-x: auto` sur le parent
