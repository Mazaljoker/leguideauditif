# Démarrage Rapide - Script Collecte Audioprothésistes

## Installation (une seule fois)

```bash
cd scripts
pip install -r requirements.txt
```

## Utilisation basique

```bash
# Test rapide (simulation, ~5 sec)
python3 scrape-audition.py --dry-run

# Production complète (~10-15 min)
python3 scrape-audition.py

# Résultat : src/data/audioprothesistes.json
```

## Options utiles

```bash
# Seulement FINESS (plus rapide)
python3 scrape-audition.py --finess-only

# Seulement Annuaire Audition
python3 scrape-audition.py --audition-only

# Sans géocodage (2x plus rapide)
python3 scrape-audition.py --no-geocode
```
