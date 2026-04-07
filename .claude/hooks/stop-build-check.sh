#!/usr/bin/env bash
# Run build check before stopping — safety net
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
if [ -f "package.json" ] && grep -q '"build"' package.json 2>/dev/null; then
  npm run build 2>&1 | tail -5
  if [ ${PIPESTATUS[0]} -ne 0 ]; then
    echo "WARNING: npm run build a echoue. Verifiez les erreurs avant de terminer." >&2
  fi
fi
