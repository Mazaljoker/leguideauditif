# Script de Collecte Données Audioprothésistes

Collecte complète de données sur les audioprothésistes en France depuis deux sources officielles.

## Sources

### 1. FINESS (Fichier National d'Identification des Établissements de Santé)
- Via OpenDataSoft API
- Données officielles gouvernementales
- Filtre: code activité 603/6301/6302

### 2. Annuaire Audition
- Scraping polite de https://www.annuaire-audition.com/
- Couvre départements 01-95 + DOM-TOM (971, 972, 973, 974, 976)
- Délai 1s entre requêtes (respectueux)

## Installation

```bash
pip install -r requirements.txt
```

## Usage

### Mode production complet
```bash
python3 scripts/scrape-audition.py
```

Résultat: `src/data/audioprothesistes.json`

### Mode test (--dry-run)
```bash
python3 scripts/scrape-audition.py --dry-run
```

### Options avancées

```bash
# Seulement FINESS
python3 scripts/scrape-audition.py --finess-only

# Seulement Annuaire Audition
python3 scripts/scrape-audition.py --audition-only

# Sans géocodage (plus rapide)
python3 scripts/scrape-audition.py --no-geocode

# Sortie personnalisée
python3 scripts/scrape-audition.py --output /mon/chemin/data.json
```

## Schéma de sortie

```json
{
  "id": "audio-75001-001",
  "nom": "Centre Audition Paris",
  "enseigne": "Audika",
  "adresse": "12 rue de Rivoli",
  "cp": "75001",
  "ville": "Paris",
  "departement": "75",
  "lat": 48.8566,
  "lng": 2.3522,
  "tel": "01 42 33 44 55",
  "horaires": "Lun-Ven 9h-18h",
  "site_web": "https://www.audika.com",
  "finess": "750000001",
  "source": "finess+annuaire"
}
```

## Déduplication

La fusion utilise une stratégie robuste:
1. Normalise les adresses (minuscules, supprime accents, abbréviations)
2. Cherche doublons par (adresse_normalisée, ville)
3. Fusionne les champs manquants (tel, web, horaires)
4. Marque source comme "finess+annuaire"

## Géocodage

- API libre: https://api-adresse.data.gouv.fr/
- Délai 0.2s entre requêtes
- Graceful degradation: continue même si API indisponible

## Performance

Durée estimée (mode production complet): ~10-15 min
