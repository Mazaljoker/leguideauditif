#!/usr/bin/env bash
# Suggest compaction every 15 edits
COUNTER_FILE="/tmp/claude-edit-counter-leguideauditif"
COUNT=$(cat "$COUNTER_FILE" 2>/dev/null || echo 0)
COUNT=$((COUNT + 1))
echo "$COUNT" > "$COUNTER_FILE"
if [ $((COUNT % 15)) -eq 0 ]; then
  echo "INFO: $COUNT edits effectues. Pensez a compacter le contexte si la session est longue." >&2
fi
