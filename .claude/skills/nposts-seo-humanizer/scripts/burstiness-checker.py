#!/usr/bin/env python3
"""
Mesure la burstiness (variation de longueur des phrases) d'un texte.
Usage: echo "texte" | python burstiness-checker.py
       python burstiness-checker.py < fichier.txt

L'IA produit des phrases de longueur uniforme (burstiness ~0.3-0.4).
Un humain varie naturellement (burstiness > 0.7).
Cible LeGuideAuditif : >= 0.7
"""

import sys
import re
import json
import statistics


def split_sentences(text: str) -> list[str]:
    """Decoupe le texte en phrases."""
    # Gerer les abbreviations courantes
    text = re.sub(r'\b(Dr|M|Mme|etc|ex|cf|vs)\.\s', r'\1§ ', text)
    sentences = re.split(r'[.!?]+', text)
    return [s.strip().replace('§', '.') for s in sentences if s.strip() and len(s.strip().split()) >= 2]


def calculate_burstiness(text: str) -> dict:
    """Calcule la burstiness du texte."""
    sentences = split_sentences(text)

    if len(sentences) < 3:
        return {"error": "Minimum 3 phrases necessaires pour calculer la burstiness"}

    lengths = [len(s.split()) for s in sentences]
    mean_len = statistics.mean(lengths)
    std_len = statistics.stdev(lengths)

    # Burstiness = ecart-type / moyenne (coefficient de variation)
    burstiness = std_len / mean_len if mean_len > 0 else 0
    burstiness = min(1.0, burstiness)  # Cap at 1.0

    # Detecter les zones problematiques (3+ phrases consecutives de longueur similaire)
    uniform_zones = []
    for i in range(len(lengths) - 2):
        window = lengths[i:i+3]
        window_range = max(window) - min(window)
        if window_range <= 3:  # Difference de 3 mots ou moins = trop uniforme
            uniform_zones.append({
                "start_sentence": i + 1,
                "end_sentence": i + 3,
                "lengths": window,
                "fix": "Inserer une phrase courte (3-6 mots) ou allonger une des phrases"
            })

    # Categoriser les phrases
    short = sum(1 for l in lengths if l <= 8)
    medium = sum(1 for l in lengths if 9 <= l <= 18)
    long = sum(1 for l in lengths if l >= 19)

    # Interpretation
    if burstiness >= 0.7:
        verdict = "OPTIMAL"
        action = "Bonne variation — le texte semble humain"
    elif burstiness >= 0.5:
        verdict = "ACCEPTABLE"
        action = "Varier davantage — inserer des phrases courtes entre les longues"
    else:
        verdict = "IA_DETECTE"
        action = "Trop uniforme — reecrire avec le pattern : longue | courte | moyenne | tres courte | longue"

    return {
        "burstiness": round(burstiness, 3),
        "verdict": verdict,
        "action": action,
        "stats": {
            "total_sentences": len(sentences),
            "short_sentences": short,
            "medium_sentences": medium,
            "long_sentences": long,
            "avg_length": round(mean_len, 1),
            "std_dev": round(std_len, 1),
            "min_length": min(lengths),
            "max_length": max(lengths)
        },
        "uniform_zones": uniform_zones[:5]  # Max 5 zones reportees
    }


if __name__ == "__main__":
    text = sys.stdin.read()
    if not text.strip():
        print(json.dumps({"error": "Aucun texte fourni"}))
        sys.exit(1)
    result = calculate_burstiness(text)
    print(json.dumps(result, ensure_ascii=False, indent=2))
