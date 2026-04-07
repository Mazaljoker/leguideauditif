#!/usr/bin/env python3
"""
Script de collecte de données audioprothésistes en France.

Sources:
  1. FINESS via OpenDataSoft
  2. Scraping annuaire-audition.com (polite scraping avec délais)

Fusion & déduplication par adresse normalisée.
Géocodage via API adresse.data.gouv.fr pour les coordonnées manquantes.
"""

import argparse
import json
import logging
import re
import time
import unicodedata
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from tqdm import tqdm

# Configuration logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Constantes
FINESS_API_URL = "https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/finess-extraction-du-fichier-des-etablissements/records"
ANNUAIRE_AUDITION_BASE = "https://www.annuaire-audition.com"
GEOCODE_API_URL = "https://api-adresse.data.gouv.fr/search/"
OUTPUT_DIR = Path(__file__).parent.parent / "src" / "data"
OUTPUT_FILE = OUTPUT_DIR / "audioprothesistes.json"

# Codes activité pour audioprothésistes (FINESS)
CODES_ACTIVITE_AUDIO = ["603", "6302", "6301"]
TYPES_ETABLISSEMENT_AUDIO = [
    "Centre d'audioprothèse",
    "Audioprothésiste",
    "Laboratoire d'audioprothèse",
]

# User-Agent pour le scraping
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

# Délai entre requêtes (en secondes)
REQUEST_DELAY = 1.0


def normalize_address(address: str) -> str:
    """
    Normalise une adresse pour la déduplication.

    - Minuscules
    - Supprime accents
    - Supprime espaces multiples
    - Normalise abréviations (rue → r, avenue → av, etc.)
    """
    if not address:
        return ""

    # Minuscules
    addr = address.lower().strip()

    # Supprime accents
    addr = "".join(
        c for c in unicodedata.normalize("NFD", addr)
        if unicodedata.category(c) != "Mn"
    )

    # Normalise abréviations
    replacements = {
        r"\brue\b": "r",
        r"\bavenue\b": "av",
        r"\bbd\b": "bd",
        r"\bboulevard\b": "bd",
        r"\bplace\b": "pl",
        r"\bchemin\b": "chem",
        r"\bappartement\b": "apt",
        r"\bapt\b": "apt",
        r"\bnumero\b": "n",
        r"\bn°\b": "n",
    }

    for pattern, replacement in replacements.items():
        addr = re.sub(pattern, replacement, addr)

    # Supprime espaces multiples
    addr = re.sub(r"\s+", " ", addr)

    return addr.strip()


def extract_dept_from_cp(cp: str) -> str:
    """Extrait le département du code postal (2 premiers chiffres)."""
    if not cp or len(cp) < 2:
        return ""
    # Gère DOM-TOM (97 + 1 chiffre)
    if cp.startswith("97"):
        return cp[:3] if len(cp) >= 3 else cp[:2]
    return cp[:2]


def geocode_address(address: str, city: str) -> Optional[Dict[str, float]]:
    """
    Géocode une adresse via l'API adresse.data.gouv.fr.

    Retourne: {"lat": float, "lng": float} ou None
    """
    try:
        query = f"{address}, {city}"
        params = {
            "q": query,
            "limit": 1,
        }

        response = requests.get(GEOCODE_API_URL, params=params, timeout=5)
        response.raise_for_status()

        data = response.json()
        if data.get("features") and len(data["features"]) > 0:
            coords = data["features"][0].get("geometry", {}).get("coordinates", [])
            if len(coords) >= 2:
                return {"lng": coords[0], "lat": coords[1]}

        return None
    except Exception as e:
        logger.warning(f"Géocodage échoué pour '{address}, {city}': {e}")
        return None


def fetch_finess_data(dry_run: bool = False) -> List[Dict[str, Any]]:
    """
    Récupère les données FINESS via OpenDataSoft.

    Filtre par code activité ou type d'établissement.
    """
    logger.info("Récupération des données FINESS...")

    records = []
    offset = 0
    limit = 100

    try:
        while True:
            if dry_run:
                logger.info("[DRY RUN] Simule requête FINESS (offset=%d)", offset)
                break

            params = {
                "offset": offset,
                "limit": limit,
                "where": f"(code_activite_principale IN ({','.join(repr(c) for c in CODES_ACTIVITE_AUDIO)}))",
            }

            logger.info(f"Requête FINESS offset={offset}...")
            response = requests.get(
                FINESS_API_URL,
                params=params,
                headers={"User-Agent": USER_AGENT},
                timeout=10,
            )
            response.raise_for_status()

            data = response.json()
            batch = data.get("results", [])

            if not batch:
                break

            for record in batch:
                # Champs FINESS pertinents
                entry = {
                    "nom": record.get("raison_sociale", ""),
                    "adresse": record.get("numero_voie_etab", "") + " " + record.get("libelle_voie_etab", ""),
                    "cp": record.get("code_postal_etab", ""),
                    "ville": record.get("libelle_commune_etab", ""),
                    "tel": record.get("telephone_etab", ""),
                    "finess": record.get("numero_finess_etab", ""),
                    "lat": None,
                    "lng": None,
                    "source": "finess",
                }

                # Parse lat/lng si disponible
                try:
                    geo = record.get("geo_localisation", "").strip()
                    if geo:
                        lat_str, lng_str = geo.split(",")
                        entry["lat"] = float(lat_str)
                        entry["lng"] = float(lng_str)
                except (ValueError, AttributeError):
                    pass

                # Valide l'entrée
                if entry["nom"] and entry["adresse"].strip():
                    records.append(entry)

            offset += limit
            time.sleep(0.5)  # Délai entre requêtes

    except Exception as e:
        logger.error(f"Erreur lors de la récupération FINESS: {e}")

    logger.info(f"FINESS: {len(records)} records collectés")
    return records


def scrape_annuaire_audition(dry_run: bool = False) -> List[Dict[str, Any]]:
    """
    Scrape annuaire-audition.com département par département.

    Departments: 01-95 + DOM-TOM (971, 972, 973, 974, 976)
    """
    logger.info("Scraping annuaire-audition.com...")

    records = []

    # Departments à scraper
    departments = [
        f"{i:02d}" for i in range(1, 96)  # 01-95
    ] + ["971", "972", "973", "974", "976"]  # DOM-TOM

    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})

    for dept in tqdm(departments, desc="Departments", disable=dry_run):
        if dry_run:
            logger.info(f"[DRY RUN] Simule scrape département {dept}")
            continue

        try:
            url = f"{ANNUAIRE_AUDITION_BASE}/audioprothesiste-{dept}/"

            response = session.get(url, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, "html.parser")

            # Cherche les éléments centre audition (structure dépend du site)
            # Généralement: divs/articles avec classe "center", "establishment", "item", etc.
            items = soup.find_all(["article", "div"], class_=re.compile(r"(center|establishment|item|listing)", re.I))

            for item in items:
                try:
                    entry = {
                        "nom": "",
                        "enseigne": "",
                        "adresse": "",
                        "cp": "",
                        "ville": "",
                        "tel": "",
                        "horaires": "",
                        "site_web": "",
                        "lat": None,
                        "lng": None,
                        "source": "annuaire-audition",
                    }

                    # Cherche nom/enseigne (généralement h2/h3 ou span.name)
                    name_elem = item.find(["h2", "h3"]) or item.find("span", class_=re.compile(r"name", re.I))
                    if name_elem:
                        entry["nom"] = name_elem.get_text(strip=True)

                    # Cherche adresse
                    addr_elem = item.find("span", class_=re.compile(r"address", re.I)) or item.find(["p", "div"], class_=re.compile(r"address|lieu", re.I))
                    if addr_elem:
                        full_addr = addr_elem.get_text(strip=True)
                        # Parse adresse (généralement "rue, CP Ville")
                        parts = full_addr.split("\n")
                        if len(parts) >= 3:
                            entry["adresse"] = parts[0].strip()
                            cp_city = parts[-1].strip()
                            cp_match = re.search(r"(\d{5}|97\d{3})", cp_city)
                            if cp_match:
                                entry["cp"] = cp_match.group(1)
                                entry["ville"] = cp_city.replace(cp_match.group(1), "").strip()
                        elif len(parts) >= 2:
                            entry["adresse"] = parts[0].strip()
                            cp_city = parts[-1].strip()
                            cp_match = re.search(r"(\d{5}|97\d{3})", cp_city)
                            if cp_match:
                                entry["cp"] = cp_match.group(1)
                                entry["ville"] = cp_city.replace(cp_match.group(1), "").strip()

                    # Cherche téléphone
                    tel_elem = item.find(["a", "span"], class_=re.compile(r"phone|tel", re.I))
                    if tel_elem:
                        tel_text = tel_elem.get_text(strip=True)
                        entry["tel"] = re.sub(r"\D", "", tel_text)  # Garde seulement chiffres

                    # Cherche horaires
                    hours_elem = item.find(["span", "div"], class_=re.compile(r"hours|horaires", re.I))
                    if hours_elem:
                        entry["horaires"] = hours_elem.get_text(strip=True)

                    # Cherche site web
                    web_elem = item.find("a", class_=re.compile(r"website|web|site", re.I))
                    if web_elem and web_elem.get("href"):
                        entry["site_web"] = web_elem["href"]

                    # Valide l'entrée
                    if entry["nom"] and entry["adresse"]:
                        records.append(entry)

                except Exception as e:
                    logger.debug(f"Erreur parsing item: {e}")
                    continue

        except requests.exceptions.RequestException as e:
            logger.warning(f"Erreur scrape département {dept}: {e}")
        except Exception as e:
            logger.warning(f"Erreur parsing département {dept}: {e}")

        # Délai polite scraping
        time.sleep(REQUEST_DELAY)

    logger.info(f"Annuaire Audition: {len(records)} records collectés")
    return records


def deduplicate_and_merge(finess_records: List[Dict], audition_records: List[Dict]) -> List[Dict[str, Any]]:
    """
    Déduplique et fusionne les données FINESS et annuaire-audition.

    Stratégie:
    - Normalise les adresses
    - Cherche doublons par (adresse_normalisée, ville)
    - Fusionne les champs manquants
    """
    logger.info("Déduplication et fusion...")

    # Index par adresse normalisée + ville
    index: Dict[tuple, Dict[str, Any]] = {}

    # Ajoute FINESS
    for record in finess_records:
        norm_addr = normalize_address(record["adresse"])
        ville = record["ville"].lower().strip() if record["ville"] else ""
        key = (norm_addr, ville)

        # Génère un ID unique
        record["id"] = f"audio-{record['cp']}-{len([k for k in index.keys() if k[1] == ville])+1:03d}"
        record["departement"] = extract_dept_from_cp(record["cp"])

        index[key] = record

    # Fusionne annuaire-audition
    merged_count = 0
    for record in audition_records:
        norm_addr = normalize_address(record["adresse"])
        ville = record["ville"].lower().strip() if record["ville"] else ""
        key = (norm_addr, ville)

        if key in index:
            # Doublon trouvé: fusionne les champs
            existing = index[key]
            existing["enseigne"] = record.get("enseigne") or existing.get("enseigne", "")
            existing["horaires"] = record.get("horaires") or existing.get("horaires", "")
            existing["site_web"] = record.get("site_web") or existing.get("site_web", "")
            existing["source"] = "finess+annuaire"
            merged_count += 1
        else:
            # Nouveau record
            record["id"] = f"audio-{record['cp']}-{len([k for k in index.keys() if k[1] == ville])+1:03d}"
            record["departement"] = extract_dept_from_cp(record["cp"])
            record["source"] = "annuaire-audition"
            index[key] = record

    logger.info(f"Fusions trouvées: {merged_count}")

    # Géocode les records sans lat/lng
    records_list = list(index.values())
    to_geocode = [r for r in records_list if not r.get("lat") or not r.get("lng")]

    if to_geocode:
        logger.info(f"Géocodage de {len(to_geocode)} records...")
        for record in tqdm(to_geocode, desc="Géocodage"):
            coords = geocode_address(record["adresse"], record["ville"])
            if coords:
                record["lat"] = coords["lat"]
                record["lng"] = coords["lng"]
            time.sleep(0.2)  # Délai respectueux API géocodage

    logger.info(f"Total records après fusion: {len(records_list)}")
    return records_list


def save_results(records: List[Dict[str, Any]]) -> None:
    """Sauvegarde les résultats en JSON."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Tri par département puis ville
    records_sorted = sorted(
        records,
        key=lambda r: (r.get("departement", ""), r.get("ville", ""), r.get("nom", ""))
    )

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(records_sorted, f, ensure_ascii=False, indent=2)

    logger.info(f"Résultats sauvegardés: {OUTPUT_FILE}")


def print_summary(records: List[Dict[str, Any]]) -> None:
    """Affiche un résumé des statistiques."""
    print("\n" + "="*60)
    print("RÉSUMÉ COLLECTE DONNÉES AUDIOPROTHÉSISTES")
    print("="*60)

    print(f"\nTotal records: {len(records)}")

    # Par source
    by_source = defaultdict(int)
    for record in records:
        by_source[record.get("source", "unknown")] += 1

    print("\nPar source:")
    for source, count in sorted(by_source.items()):
        print(f"  {source}: {count}")

    # Par département
    by_dept = defaultdict(int)
    for record in records:
        dept = record.get("departement", "unknown")
        by_dept[dept] += 1

    print(f"\nCouverture: {len(by_dept)} départements")

    # Stats géocodage
    with_coords = sum(1 for r in records if r.get("lat") and r.get("lng"))
    print(f"Avec coordonnées GPS: {with_coords}/{len(records)} ({100*with_coords//len(records)}%)")

    # Avec téléphone
    with_phone = sum(1 for r in records if r.get("tel"))
    print(f"Avec téléphone: {with_phone}/{len(records)} ({100*with_phone//len(records)}%)")

    # Avec site web
    with_web = sum(1 for r in records if r.get("site_web"))
    print(f"Avec site web: {with_web}/{len(records)} ({100*with_web//len(records)}%)")

    print("\n" + "="*60)


def main():
    """Entrée principale du script."""
    parser = argparse.ArgumentParser(
        description="Collecte de données audioprothésistes en France"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simule les appels API/scraping sans télécharger"
    )
    parser.add_argument(
        "--finess-only",
        action="store_true",
        help="Collecte seulement les données FINESS"
    )
    parser.add_argument(
        "--audition-only",
        action="store_true",
        help="Scrape seulement annuaire-audition.com"
    )
    parser.add_argument(
        "--no-geocode",
        action="store_true",
        help="Saute le géocodage des adresses manquantes"
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=OUTPUT_FILE,
        help=f"Fichier de sortie (défaut: {OUTPUT_FILE})"
    )

    args = parser.parse_args()

    logger.info("Démarrage collecte audioprothésistes")
    logger.info(f"Mode: {'DRY RUN' if args.dry_run else 'PRODUCTION'}")

    all_records = []

    # FINESS
    if not args.audition_only:
        finess_records = fetch_finess_data(dry_run=args.dry_run)
        all_records.extend(finess_records)

    # Annuaire Audition
    if not args.finess_only:
        audition_records = scrape_annuaire_audition(dry_run=args.dry_run)
        all_records.extend(audition_records)

    # Fusion et déduplication
    if all_records:
        merged = deduplicate_and_merge(
            [r for r in all_records if r.get("source") == "finess"],
            [r for r in all_records if r.get("source") == "annuaire-audition"]
        )

        # Sauvegarde
        if not args.dry_run:
            save_results(merged)

        # Résumé
        print_summary(merged)
    else:
        logger.warning("Aucune donnée collectée")


if __name__ == "__main__":
    main()