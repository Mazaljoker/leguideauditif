#!/usr/bin/env python3
"""
Script de collecte de données audioprothésistes en France.

Sources:
  1. RPPS LibreAcces via OpenDataSoft (Répertoire Partagé des Professionnels de Santé)
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
RPPS_API_URL = "https://arssante.opendatasoft.com/api/explore/v2.1/catalog/datasets/ps_libreacces_personne_activite/records"
ANNUAIRE_AUDITION_BASE = "https://www.annuaire-audition.com"
GEOCODE_API_URL = "https://api-adresse.data.gouv.fr/search/"
OUTPUT_DIR = Path(__file__).parent.parent / "src" / "data"
OUTPUT_FILE = OUTPUT_DIR / "audioprothesistes.json"

# Mapping departement -> slug pour annuaire-audition.com
DEPARTMENTS = {
    "01": "ain", "02": "aisne", "03": "allier", "04": "alpes-de-haute-provence",
    "05": "hautes-alpes", "06": "alpes-maritimes", "07": "ardeche", "08": "ardennes",
    "09": "ariege", "10": "aube", "11": "aude", "12": "aveyron",
    "13": "bouches-du-rhone", "14": "calvados", "15": "cantal", "16": "charente",
    "17": "charente-maritime", "18": "cher", "19": "correze",
    "2A": "corse-du-sud", "2B": "haute-corse",
    "21": "cote-d-or", "22": "cotes-d-armor", "23": "creuse", "24": "dordogne",
    "25": "doubs", "26": "drome", "27": "eure", "28": "eure-et-loir",
    "29": "finistere", "30": "gard", "31": "haute-garonne", "32": "gers",
    "33": "gironde", "34": "herault", "35": "ille-et-vilaine", "36": "indre",
    "37": "indre-et-loire", "38": "isere", "39": "jura", "40": "landes",
    "41": "loir-et-cher", "42": "loire", "43": "haute-loire", "44": "loire-atlantique",
    "45": "loiret", "46": "lot", "47": "lot-et-garonne", "48": "lozere",
    "49": "maine-et-loire", "50": "manche", "51": "marne", "52": "haute-marne",
    "53": "mayenne", "54": "meurthe-et-moselle", "55": "meuse", "56": "morbihan",
    "57": "moselle", "58": "nievre", "59": "nord", "60": "oise",
    "61": "orne", "62": "pas-de-calais", "63": "puy-de-dome", "64": "pyrenees-atlantiques",
    "65": "hautes-pyrenees", "66": "pyrenees-orientales", "67": "bas-rhin", "68": "haut-rhin",
    "69": "rhone", "70": "haute-saone", "71": "saone-et-loire", "72": "sarthe",
    "73": "savoie", "74": "haute-savoie", "75": "paris", "76": "seine-maritime",
    "77": "seine-et-marne", "78": "yvelines", "79": "deux-sevres", "80": "somme",
    "81": "tarn", "82": "tarn-et-garonne", "83": "var", "84": "vaucluse",
    "85": "vendee", "86": "vienne", "87": "haute-vienne", "88": "vosges",
    "89": "yonne", "90": "territoire-de-belfort", "91": "essonne",
    "92": "hauts-de-seine", "93": "seine-saint-denis", "94": "val-de-marne",
    "95": "val-d-oise",
    "971": "guadeloupe", "972": "martinique", "973": "guyane",
    "974": "reunion", "976": "mayotte",
}

# User-Agent pour le scraping
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

# Délai entre requêtes (en secondes)
REQUEST_DELAY = 1.0


def normalize_address(address: str) -> str:
    """Normalise une adresse pour la déduplication."""
    if not address:
        return ""

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

    addr = re.sub(r"\s+", " ", addr)
    return addr.strip()


def extract_dept_from_cp(cp: str) -> str:
    """Extrait le département du code postal."""
    if not cp or len(cp) < 2:
        return ""
    if cp.startswith("97"):
        return cp[:3] if len(cp) >= 3 else cp[:2]
    # Corse
    if cp.startswith("20"):
        cp_num = int(cp[:5]) if len(cp) >= 5 else int(cp)
        if 20000 <= cp_num <= 20190:
            return "2A"
        return "2B"
    return cp[:2]


def geocode_address(address: str, city: str) -> Optional[Dict[str, float]]:
    """Géocode une adresse via api-adresse.data.gouv.fr."""
    try:
        query = f"{address}, {city}"
        params = {"q": query, "limit": 1}

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


def geocode_batch(records: List[Dict[str, Any]], batch_size: int = 2000) -> int:
    """
    Géocode par lot via POST https://api-adresse.data.gouv.fr/search/csv/.
    Retourne le nombre d'adresses géocodées.
    """
    import csv
    import io

    BATCH_URL = "https://api-adresse.data.gouv.fr/search/csv/"
    geocoded = 0

    to_geocode = [r for r in records if not r.get("lat") or not r.get("lng")]
    if not to_geocode:
        return 0

    logger.info(f"Géocodage batch de {len(to_geocode)} adresses...")

    for i in range(0, len(to_geocode), batch_size):
        chunk = to_geocode[i:i + batch_size]
        batch_num = i // batch_size + 1
        logger.info(f"  Batch {batch_num}: {len(chunk)} adresses...")

        # Crée le CSV en mémoire
        csv_buffer = io.StringIO()
        writer = csv.writer(csv_buffer)
        writer.writerow(["id", "adresse", "postcode"])
        for idx, record in enumerate(chunk):
            # Combine adresse + ville pour meilleur géocodage
            full_addr = f"{record.get('adresse', '')} {record.get('ville', '')}".strip()
            writer.writerow([
                idx,
                full_addr,
                record.get("cp", ""),
            ])

        csv_content = csv_buffer.getvalue().encode("utf-8")

        try:
            response = requests.post(
                BATCH_URL,
                files={"data": ("addresses.csv", csv_content, "text/csv")},
                data={
                    "columns": "adresse",
                    "postcode": "postcode",
                },
                timeout=120,
            )
            response.raise_for_status()

            # Parse le CSV résultat
            batch_geocoded = 0
            result_reader = csv.DictReader(io.StringIO(response.text))
            for row in result_reader:
                idx = int(row.get("id", -1))
                lat = row.get("latitude", "")
                lng = row.get("longitude", "")
                score = float(row.get("result_score", "0") or "0")

                if 0 <= idx < len(chunk) and lat and lng and score > 0.3:
                    chunk[idx]["lat"] = float(lat)
                    chunk[idx]["lng"] = float(lng)
                    # Enrichit la ville si manquante
                    result_city = row.get("result_city", "")
                    if result_city and not chunk[idx].get("ville"):
                        chunk[idx]["ville"] = result_city
                    geocoded += 1
                    batch_geocoded += 1

            logger.info(f"  Batch {batch_num}: {batch_geocoded}/{len(chunk)} géocodés")
            time.sleep(2)  # Délai entre batches

        except Exception as e:
            logger.error(f"Erreur géocodage batch {batch_num}: {e}")
            logger.info(f"  Retry batch {batch_num} en sous-lots de 500...")
            # Retry en plus petits morceaux
            for j in range(0, len(chunk), 500):
                sub = chunk[j:j + 500]
                try:
                    csv_buf2 = io.StringIO()
                    w2 = csv.writer(csv_buf2)
                    w2.writerow(["id", "adresse", "postcode"])
                    for si, sr in enumerate(sub):
                        full = f"{sr.get('adresse', '')} {sr.get('ville', '')}".strip()
                        w2.writerow([si, full, sr.get("cp", "")])

                    resp2 = requests.post(
                        BATCH_URL,
                        files={"data": ("addr.csv", csv_buf2.getvalue().encode("utf-8"), "text/csv")},
                        data={"columns": "adresse", "postcode": "postcode"},
                        timeout=60,
                    )
                    resp2.raise_for_status()

                    for row in csv.DictReader(io.StringIO(resp2.text)):
                        si = int(row.get("id", -1))
                        lat = row.get("latitude", "")
                        lng = row.get("longitude", "")
                        sc = float(row.get("result_score", "0") or "0")
                        if 0 <= si < len(sub) and lat and lng and sc > 0.3:
                            sub[si]["lat"] = float(lat)
                            sub[si]["lng"] = float(lng)
                            result_city = row.get("result_city", "")
                            if result_city and not sub[si].get("ville"):
                                sub[si]["ville"] = result_city
                            geocoded += 1

                    time.sleep(3)
                except Exception as e2:
                    logger.error(f"  Sous-lot échoué: {e2}")

    logger.info(f"Géocodage terminé: {geocoded}/{len(to_geocode)} adresses géocodées")
    return geocoded


def fetch_rpps_data(dry_run: bool = False) -> List[Dict[str, Any]]:
    """
    Récupère les audioprothésistes via le RPPS (Répertoire Partagé des
    Professionnels de Santé) sur OpenDataSoft.

    Regroupe par site (adresse unique) pour éviter les doublons
    quand plusieurs professionnels exercent au même endroit.
    """
    logger.info("Récupération des données RPPS (audioprothésistes)...")

    records = []
    offset = 0
    limit = 100

    try:
        while True:
            if dry_run:
                logger.info("[DRY RUN] Simule requête RPPS (offset=%d)", offset)
                break

            params = {
                "offset": offset,
                "limit": limit,
                "where": 'libelle_profession="Audio-Prothésiste" AND code_postal_coord_structure IS NOT NULL',
                "select": (
                    "raison_sociale_site,"
                    "enseigne_commerciale_site,"
                    "numero_voie_coord_structure,"
                    "libelle_type_de_voie_coord_structure,"
                    "libelle_voie_coord_structure,"
                    "code_postal_coord_structure,"
                    "libelle_commune_coord_structure,"
                    "telephone_coord_structure,"
                    "numero_finess_site,"
                    "numero_siret_site,"
                    "code_departement_structure"
                ),
            }

            logger.info(f"Requête RPPS offset={offset}...")
            response = requests.get(
                RPPS_API_URL,
                params=params,
                headers={"User-Agent": USER_AGENT},
                timeout=15,
            )
            response.raise_for_status()

            data = response.json()
            batch = data.get("results", [])

            if not batch:
                break

            for record in batch:
                # Construit l'adresse complète
                num = record.get("numero_voie_coord_structure", "") or ""
                type_voie = record.get("libelle_type_de_voie_coord_structure", "") or ""
                voie = record.get("libelle_voie_coord_structure", "") or ""
                adresse = f"{num} {type_voie} {voie}".strip()

                cp = record.get("code_postal_coord_structure", "") or ""
                ville = record.get("libelle_commune_coord_structure", "") or ""
                tel = record.get("telephone_coord_structure", "") or ""

                # Formate le téléphone
                if tel:
                    tel = re.sub(r"\D", "", tel)
                    if len(tel) == 10:
                        tel = " ".join([tel[i:i+2] for i in range(0, 10, 2)])

                entry = {
                    "nom": record.get("raison_sociale_site", "") or "",
                    "enseigne": record.get("enseigne_commerciale_site", "") or "",
                    "adresse": adresse,
                    "cp": cp,
                    "ville": ville,
                    "tel": tel,
                    "finess": record.get("numero_finess_site", "") or "",
                    "siret": record.get("numero_siret_site", "") or "",
                    "departement": record.get("code_departement_structure", "") or extract_dept_from_cp(cp),
                    "lat": None,
                    "lng": None,
                    "source": "rpps",
                }

                if entry["adresse"] and entry["cp"]:
                    records.append(entry)

            offset += limit
            time.sleep(0.3)

    except Exception as e:
        logger.error(f"Erreur lors de la récupération RPPS: {e}")

    logger.info(f"RPPS: {len(records)} records collectés")
    return records


def group_rpps_by_site(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Regroupe les enregistrements RPPS par site (même adresse).
    Plusieurs audioprothésistes exercent souvent au même centre.
    """
    sites: Dict[str, Dict[str, Any]] = {}

    for record in records:
        norm_addr = normalize_address(record["adresse"])
        ville = record["ville"].lower().strip()
        key = f"{norm_addr}|{ville}"

        if key not in sites:
            sites[key] = record.copy()
        else:
            # Enrichit avec les infos manquantes
            existing = sites[key]
            if not existing["enseigne"] and record["enseigne"]:
                existing["enseigne"] = record["enseigne"]
            if not existing["tel"] and record["tel"]:
                existing["tel"] = record["tel"]
            if not existing["finess"] and record["finess"]:
                existing["finess"] = record["finess"]

    result = list(sites.values())
    logger.info(f"RPPS: {len(records)} records -> {len(result)} sites uniques")
    return result


def scrape_annuaire_audition(dry_run: bool = False) -> List[Dict[str, Any]]:
    """
    Scrape annuaire-audition.com département par département.
    URL pattern: /centres-audioprothese-{dept}-{dept_name_slug}.html
    """
    logger.info("Scraping annuaire-audition.com...")

    records = []
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})

    for dept, slug in tqdm(DEPARTMENTS.items(), desc="Departments", disable=dry_run):
        if dry_run:
            logger.info(f"[DRY RUN] Simule scrape département {dept}")
            continue

        try:
            url = f"{ANNUAIRE_AUDITION_BASE}/centres-audioprothese-{dept}-{slug}.html"

            response = session.get(url, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, "html.parser")

            # Cherche les liens vers les centres individuels
            center_links = []
            for link in soup.find_all("a", href=True):
                href = link["href"]
                if "/centres-audioprothese/" in href and href.endswith(".html"):
                    full_url = urljoin(ANNUAIRE_AUDITION_BASE, href)
                    if full_url not in center_links:
                        center_links.append(full_url)

            logger.info(f"Dept {dept}: {len(center_links)} centres trouvés")

            # Scrape chaque centre
            for center_url in center_links:
                try:
                    time.sleep(REQUEST_DELAY * 0.5)
                    resp = session.get(center_url, timeout=10)
                    resp.raise_for_status()

                    center_soup = BeautifulSoup(resp.content, "html.parser")

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

                    # Nom du centre (h1 ou h2)
                    title = center_soup.find("h1") or center_soup.find("h2")
                    if title:
                        entry["nom"] = title.get_text(strip=True)

                    # Téléphone (liens tel:)
                    tel_link = center_soup.find("a", href=re.compile(r"^tel:"))
                    if tel_link:
                        tel_raw = tel_link["href"].replace("tel:", "").strip()
                        tel_digits = re.sub(r"\D", "", tel_raw)
                        if len(tel_digits) == 10:
                            entry["tel"] = " ".join([tel_digits[i:i+2] for i in range(0, 10, 2)])
                        elif tel_digits:
                            entry["tel"] = tel_digits

                    # Adresse - cherche près des icônes pin
                    # Le texte complet contient souvent "adresse, CP Ville"
                    page_text = center_soup.get_text(" ", strip=True)

                    # Cherche un pattern CP + Ville dans le texte
                    cp_match = re.search(r"(\d{5})\s+([A-ZÉÈÊÀÂÔÙÛÜÏÎÇ][A-ZÉÈÊÀÂÔÙÛÜÏÎÇa-zéèêàâôùûüïîç\s\-]+)", page_text)
                    if cp_match:
                        entry["cp"] = cp_match.group(1)
                        entry["ville"] = cp_match.group(2).strip()

                    # Site web
                    for a_tag in center_soup.find_all("a", href=True):
                        href = a_tag["href"]
                        if href.startswith("http") and "annuaire-audition" not in href:
                            parsed = urlparse(href)
                            if parsed.scheme in ("http", "https") and "." in parsed.netloc:
                                entry["site_web"] = href
                                break

                    # Valide
                    if entry["nom"] and entry["cp"]:
                        entry["departement"] = extract_dept_from_cp(entry["cp"])
                        records.append(entry)

                except requests.exceptions.RequestException as e:
                    logger.debug(f"Erreur scrape centre {center_url}: {e}")
                except Exception as e:
                    logger.debug(f"Erreur parsing centre {center_url}: {e}")

        except requests.exceptions.RequestException as e:
            logger.warning(f"Erreur scrape département {dept}: {e}")
        except Exception as e:
            logger.warning(f"Erreur parsing département {dept}: {e}")

        time.sleep(REQUEST_DELAY)

    logger.info(f"Annuaire Audition: {len(records)} records collectés")
    return records


def deduplicate_and_merge(
    rpps_records: List[Dict],
    audition_records: List[Dict],
    skip_geocode: bool = False,
) -> List[Dict[str, Any]]:
    """
    Déduplique et fusionne les données RPPS et annuaire-audition.
    """
    logger.info("Déduplication et fusion...")

    index: Dict[str, Dict[str, Any]] = {}

    # Ajoute RPPS
    for record in rpps_records:
        norm_addr = normalize_address(record["adresse"])
        ville = record["ville"].lower().strip() if record["ville"] else ""
        key = f"{norm_addr}|{ville}"

        dept = record.get("departement", extract_dept_from_cp(record["cp"]))
        ville_count = sum(1 for k in index if k.endswith(f"|{ville}"))
        record["id"] = f"audio-{record['cp']}-{ville_count+1:03d}"
        record["departement"] = dept

        index[key] = record

    # Fusionne annuaire-audition
    merged_count = 0
    for record in audition_records:
        norm_addr = normalize_address(record.get("adresse", ""))
        ville = record["ville"].lower().strip() if record["ville"] else ""
        key = f"{norm_addr}|{ville}"

        if key in index:
            existing = index[key]
            if not existing.get("horaires") and record.get("horaires"):
                existing["horaires"] = record["horaires"]
            if not existing.get("site_web") and record.get("site_web"):
                existing["site_web"] = record["site_web"]
            if not existing.get("tel") and record.get("tel"):
                existing["tel"] = record["tel"]
            existing["source"] = "rpps+annuaire"
            merged_count += 1
        else:
            dept = record.get("departement", extract_dept_from_cp(record.get("cp", "")))
            ville_count = sum(1 for k in index if k.endswith(f"|{ville}"))
            record["id"] = f"audio-{record.get('cp', '00000')}-{ville_count+1:03d}"
            record["departement"] = dept
            record["source"] = "annuaire-audition"
            index[key] = record

    logger.info(f"Fusions trouvées: {merged_count}")

    records_list = list(index.values())

    # Géocodage batch
    if not skip_geocode:
        geocode_batch(records_list)

    logger.info(f"Total records après fusion: {len(records_list)}")
    return records_list


def save_results(records: List[Dict[str, Any]], output_file: Path = OUTPUT_FILE) -> None:
    """Sauvegarde les résultats en JSON."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Tri par département puis ville
    records_sorted = sorted(
        records,
        key=lambda r: (r.get("departement", ""), r.get("ville", ""), r.get("nom", ""))
    )

    # Assure tous les champs requis par AudioMap.tsx
    cleaned = []
    for r in records_sorted:
        entry = {
            "id": r.get("id", ""),
            "nom": r.get("nom", ""),
            "enseigne": r.get("enseigne", ""),
            "adresse": r.get("adresse", ""),
            "cp": r.get("cp", ""),
            "ville": r.get("ville", ""),
            "departement": r.get("departement", ""),
            "lat": r.get("lat"),
            "lng": r.get("lng"),
            "tel": r.get("tel", ""),
            "horaires": r.get("horaires") or None,
            "site_web": r.get("site_web") or None,
            "finess": r.get("finess") or None,
            "source": r.get("source", ""),
        }
        # Exclut les records sans coordonnées GPS (inutiles pour la carte)
        if entry["lat"] and entry["lng"]:
            cleaned.append(entry)

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(cleaned, f, ensure_ascii=False, indent=2)

    logger.info(f"Résultats sauvegardés: {output_file} ({len(cleaned)} centres)")


def print_summary(records: List[Dict[str, Any]]) -> None:
    """Affiche un résumé des statistiques."""
    print("\n" + "="*60)
    print("RÉSUMÉ COLLECTE DONNÉES AUDIOPROTHÉSISTES")
    print("="*60)

    print(f"\nTotal centres: {len(records)}")

    by_source = defaultdict(int)
    for record in records:
        by_source[record.get("source", "unknown")] += 1

    print("\nPar source:")
    for source, count in sorted(by_source.items()):
        print(f"  {source}: {count}")

    by_dept = defaultdict(int)
    for record in records:
        dept = record.get("departement", "unknown")
        by_dept[dept] += 1

    print(f"\nCouverture: {len(by_dept)} départements")

    # Top 5 départements
    top5 = sorted(by_dept.items(), key=lambda x: x[1], reverse=True)[:5]
    print("Top 5 départements:")
    for dept, count in top5:
        name = DEPARTMENTS.get(dept, "?")
        print(f"  {dept} ({name}): {count}")

    with_coords = sum(1 for r in records if r.get("lat") and r.get("lng"))
    pct = 100 * with_coords // len(records) if records else 0
    print(f"\nAvec coordonnées GPS: {with_coords}/{len(records)} ({pct}%)")

    with_phone = sum(1 for r in records if r.get("tel"))
    pct = 100 * with_phone // len(records) if records else 0
    print(f"Avec téléphone: {with_phone}/{len(records)} ({pct}%)")

    with_web = sum(1 for r in records if r.get("site_web"))
    pct = 100 * with_web // len(records) if records else 0
    print(f"Avec site web: {with_web}/{len(records)} ({pct}%)")

    print("\n" + "="*60)


def main():
    """Entrée principale du script."""
    parser = argparse.ArgumentParser(
        description="Collecte de données audioprothésistes en France"
    )
    parser.add_argument("--dry-run", action="store_true", help="Simule sans télécharger")
    parser.add_argument("--rpps-only", action="store_true", help="Collecte seulement RPPS")
    parser.add_argument("--audition-only", action="store_true", help="Scrape seulement annuaire-audition")
    parser.add_argument("--no-geocode", action="store_true", help="Saute le géocodage")
    parser.add_argument("--output", type=Path, default=OUTPUT_FILE, help=f"Fichier de sortie (défaut: {OUTPUT_FILE})")

    args = parser.parse_args()

    logger.info("Démarrage collecte audioprothésistes")
    logger.info(f"Mode: {'DRY RUN' if args.dry_run else 'PRODUCTION'}")

    rpps_records = []
    audition_records = []

    # RPPS
    if not args.audition_only:
        raw_rpps = fetch_rpps_data(dry_run=args.dry_run)
        rpps_records = group_rpps_by_site(raw_rpps)

    # Annuaire Audition
    if not args.rpps_only:
        audition_records = scrape_annuaire_audition(dry_run=args.dry_run)

    # Fusion et déduplication
    all_records = rpps_records + audition_records
    if all_records:
        merged = deduplicate_and_merge(
            rpps_records,
            audition_records,
            skip_geocode=args.no_geocode or args.dry_run,
        )

        if not args.dry_run:
            save_results(merged, args.output)

        print_summary(merged)
    else:
        logger.warning("Aucune donnée collectée")


if __name__ == "__main__":
    main()
