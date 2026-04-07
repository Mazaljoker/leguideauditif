#!/usr/bin/env python3
"""
Calcul du score de lisibilite Flesch adapte au francais (formule Kandel-Moles).
Usage: echo "texte" | python readability-score.py
       python readability-score.py < fichier.txt

Cible LeGuideAuditif : 60-80 (comprehensible public 65+ ans, niveau bac)
"""

import sys
import re


def count_syllables_fr(word: str) -> int:
    """Compte les syllabes d'un mot francais (approximation)."""
    word = word.lower().strip()
    if not word:
        return 0

    # Voyelles francaises
    vowels = set("aeiouyàâäéèêëïîôùûüœæ")
    count = 0
    prev_vowel = False

    for char in word:
        is_vowel = char in vowels
        if is_vowel and not prev_vowel:
            count += 1
        prev_vowel = is_vowel

    # Le 'e' muet final ne compte pas (sauf mots courts)
    if len(word) > 3 and word.endswith('e') and not word.endswith(('le', 'me', 'ne', 'se', 're', 'te', 'de', 'ce', 'ge', 'pe', 'be', 'fe', 've', 'ke', 'ze')):
        count = max(1, count - 1)

    # Les terminaisons muettes
    for suffix in ('es', 'ent'):
        if word.endswith(suffix) and len(word) > 4:
            count = max(1, count - 1)
            break

    return max(1, count)


def split_sentences(text: str) -> list[str]:
    """Decoupe le texte en phrases."""
    sentences = re.split(r'[.!?]+', text)
    return [s.strip() for s in sentences if s.strip() and len(s.strip().split()) >= 2]


def split_words(text: str) -> list[str]:
    """Extrait les mots du texte."""
    words = re.findall(r"[a-zàâäéèêëïîôùûüœæç'-]+", text.lower())
    return [w for w in words if len(w) > 1]


def flesch_fr(text: str) -> dict:
    """Calcule le score Flesch adapte au francais (Kandel-Moles)."""
    sentences = split_sentences(text)
    words = split_words(text)

    if not sentences or not words:
        return {"error": "Texte trop court pour l'analyse"}

    total_syllables = sum(count_syllables_fr(w) for w in words)

    asl = len(words) / len(sentences)  # Average Sentence Length
    asw = total_syllables / len(words)  # Average Syllables per Word

    # Formule Kandel-Moles
    score = 207 - (1.015 * asl) - (73.6 * asw)
    score = max(0, min(100, score))

    # Interpretation
    if score >= 80:
        level = "TRES_FACILE"
        action = "Risque de paraitre infantilisant — ajouter quelques termes experts avec explication"
    elif score >= 60:
        level = "OPTIMAL"
        action = "Score dans la cible (60-80) — adapte aux seniors"
    elif score >= 40:
        level = "DIFFICILE"
        action = "Simplifier : couper les phrases longues, remplacer les mots complexes"
    else:
        level = "TRES_DIFFICILE"
        action = "Reecriture necessaire — texte trop technique pour le public cible"

    return {
        "flesch_fr": round(score, 1),
        "level": level,
        "action": action,
        "stats": {
            "sentences": len(sentences),
            "words": len(words),
            "syllables": total_syllables,
            "avg_sentence_length": round(asl, 1),
            "avg_syllables_per_word": round(asw, 2)
        }
    }


if __name__ == "__main__":
    import json
    text = sys.stdin.read()
    if not text.strip():
        print(json.dumps({"error": "Aucun texte fourni"}))
        sys.exit(1)
    result = flesch_fr(text)
    print(json.dumps(result, ensure_ascii=False, indent=2))
