#!/usr/bin/env bash
# check-harness-coherence.sh — Valide la coherence interne du harness
# Hook: Stop

set -euo pipefail

BASEDIR=".claude"
ERRORS=0

if [ ! -t 0 ] 2>/dev/null; then
  cat > /dev/null 2>&1 || true
  changed=$(git diff --name-only HEAD~1 HEAD 2>/dev/null | grep "^\.claude/" || true)
  if [ -z "$changed" ]; then
    exit 0
  fi
fi

echo "=== Harness Coherence Check ==="

# Verifier refs Agent dans les commands
echo "--- Agent references ---"
for cmd in "$BASEDIR"/commands/*.md; do
  [ -f "$cmd" ] || continue
  agents=$(grep '\*\*Agent:\*\*' "$cmd" 2>/dev/null | sed 's/.*\*\*Agent:\*\*\s*//' | awk '{print $1}' || true)
  for agent in $agents; do
    agent_file="$BASEDIR/agents/${agent}.md"
    if [ ! -f "$agent_file" ]; then
      echo "BROKEN: $(basename "$cmd") -> Agent '$agent' not found"
      ERRORS=$((ERRORS + 1))
    fi
  done
done
[ "$ERRORS" -eq 0 ] && echo "OK"

# Verifier les refs Skill
echo "--- Skill references ---"
SKILL_ERRORS=0
for cmd in "$BASEDIR"/commands/*.md; do
  [ -f "$cmd" ] || continue
  skills=$(grep '\*\*Skill:\*\*' "$cmd" 2>/dev/null | sed 's/.*\*\*Skill:\*\*\s*//' | awk '{print $1}' | grep -E '^(me-|nposts-)' || true)
  for skill in $skills; do
    skill_clean=$(echo "$skill" | sed 's/[,.)]*$//')
    skill_dir="$BASEDIR/skills/${skill_clean}/SKILL.md"
    if [ ! -f "$skill_dir" ]; then
      echo "BROKEN: $(basename "$cmd") -> Skill '$skill_clean' not found"
      SKILL_ERRORS=$((SKILL_ERRORS + 1))
    fi
  done
done
ERRORS=$((ERRORS + SKILL_ERRORS))
[ "$SKILL_ERRORS" -eq 0 ] && echo "OK"

echo ""
echo "=== Resultat: $ERRORS violation(s) ==="
