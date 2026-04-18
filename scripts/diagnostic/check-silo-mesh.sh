#!/usr/bin/env bash
# Diagnostic indexation — valide que les fiches centres indexées sont bien
# linkées depuis les pages silo (dept et ville).
#
# Échantillon testé : 3 centres géographiquement distincts, dont 1 découvert
# pré-sitemap (audiologie-du-leman) pour valider la voie alternative.
#
# Usage : bash scripts/diagnostic/check-silo-mesh.sh

set -euo pipefail

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

pages=(
  "https://leguideauditif.fr/audioprothesiste/departement/ariege/|ariege|alfa-optique-09000-foix"
  "https://leguideauditif.fr/audioprothesiste/foix/|foix|alfa-optique-09000-foix"
  "https://leguideauditif.fr/audioprothesiste/departement/ain/|ain|audiologie-du-leman-01220"
  "https://leguideauditif.fr/audioprothesiste/marseille/|marseille|a-l-s-a-13006-marseille"
)

printf "%-15s %-45s %-8s %s\n" "PAGE" "CENTRE ATTENDU" "TROUVÉ" "LIENS /centre/*"
printf "%s\n" "---------------------------------------------------------------------------------------------"

for entry in "${pages[@]}"; do
  IFS='|' read -r url slug centre <<< "$entry"
  html="$TMPDIR/$slug.html"
  curl -sSf -o "$html" "$url"
  found=$(grep -c "$centre" "$html" || true)
  n_centres=$(grep -oE "/centre/[a-z0-9-]+/" "$html" | sort -u | wc -l)
  status=$([ "$found" -gt 0 ] && echo "OUI ($found)" || echo "NON")
  printf "%-15s %-45s %-8s %s\n" "$slug" "$centre" "$status" "$n_centres"
done
