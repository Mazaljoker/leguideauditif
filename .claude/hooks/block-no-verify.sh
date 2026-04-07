#!/usr/bin/env bash
# Block --no-verify to protect pre-commit hooks
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
if echo "$COMMAND" | grep -q -- '--no-verify'; then
  echo "BLOCKED: --no-verify interdit. Les hooks pre-commit protegent la qualite du code." >&2
  exit 2
fi
