#!/bin/bash
# block-any-type.sh — Detecte l'utilisation de any dans TypeScript
# Hook: PostToolUse | Matcher: Edit|Write|MultiEdit

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // .tool_input.path // empty')

if [ -z "$file_path" ] || [ ! -f "$file_path" ]; then
  exit 0
fi

if ! echo "$file_path" | grep -qE '\.(ts|tsx)$'; then
  exit 0
fi

if echo "$file_path" | grep -qE '(node_modules|dist|\.generated|\.d\.ts)'; then
  exit 0
fi

matches=$(grep -nE '(:\s*any\b|<any>|<any,|,\s*any>|as\s+any\b|\bany\[\])' "$file_path" 2>/dev/null \
  | grep -vE '^\s*//' \
  | grep -vE '^\s*\*' \
  || true)

if [ -n "$matches" ]; then
  count=$(echo "$matches" | wc -l)
  echo "ERREUR : $count occurrence(s) de any dans $file_path — typer avec interfaces."
  echo "$matches"
fi
