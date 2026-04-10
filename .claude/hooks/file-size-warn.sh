#!/bin/bash
# file-size-warn.sh — Warn when a file exceeds 200 lines
# Hook: PostToolUse | Matcher: Edit|Write|MultiEdit

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // .tool_input.path // empty')

if [ -z "$file_path" ] || [ ! -f "$file_path" ]; then
  exit 0
fi

if ! echo "$file_path" | grep -qE '\.(ts|tsx|js|jsx|astro|mdx)$'; then
  exit 0
fi

if echo "$file_path" | grep -qE '(node_modules|dist|\.generated)'; then
  exit 0
fi

line_count=$(wc -l < "$file_path")
MAX_LINES=200

if [ "$line_count" -gt "$MAX_LINES" ]; then
  echo "ATTENTION : $file_path fait $line_count lignes (max $MAX_LINES). Decouper en sous-composants."
fi
