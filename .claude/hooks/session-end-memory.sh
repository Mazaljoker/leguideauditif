#!/bin/bash
# Hook: Stop — Sauvegarde memoire de session
# Append un resume dans .claude/memory/session-log.md

MEMORY_DIR=".claude/memory"
SESSION_LOG="$MEMORY_DIR/session-log.md"

if [ ! -d "$MEMORY_DIR" ]; then
  exit 0
fi

MODIFIED_FILES=$(git diff --name-only HEAD 2>/dev/null | head -10)
STAGED_FILES=$(git diff --cached --name-only 2>/dev/null | head -10)
ALL_CHANGED="$MODIFIED_FILES $STAGED_FILES"

if [ -z "$(echo "$ALL_CHANGED" | tr -d '[:space:]')" ]; then
  exit 0
fi

FILE_COUNT=$(echo "$ALL_CHANGED" | tr ' ' '\n' | sort -u | grep -v '^$' | wc -l | tr -d '[:space:]')
TIMESTAMP=$(date '+%Y-%m-%d %H:%M')

echo "$ALL_CHANGED" | tr ' ' '\n' | sort -u | grep -v '^$' | while read -r f; do
  case "$f" in
    src/content/*) echo "content" ;;
    src/components/*) echo "components" ;;
    src/pages/*) echo "pages" ;;
    src/layouts/*) echo "layouts" ;;
    .claude/*) echo "harness" ;;
    *) echo "other" ;;
  esac
done | sort -u | tr '\n' ', ' > /tmp/lga-session-types 2>/dev/null

TYPES=$(cat /tmp/lga-session-types 2>/dev/null | sed 's/,$//')
rm -f /tmp/lga-session-types

echo "" >> "$SESSION_LOG"
echo "[$TIMESTAMP] **Fichiers modifies** : $FILE_COUNT | **Zones** : ${TYPES:-unknown} | **Resume** : session terminee" >> "$SESSION_LOG"

exit 0
