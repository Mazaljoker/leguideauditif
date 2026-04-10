#!/bin/bash
# block-env-edit.sh — Bloque l'écriture dans .env et fichiers sensibles
# Hook: PreToolUse | Matcher: Edit|Write|MultiEdit

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // .tool_input.path // empty')

if [ -z "$file_path" ]; then
  echo '{"decision":"allow"}'
  exit 0
fi

if echo "$file_path" | grep -qiE '(^|/)\.env($|\..*)'; then
  echo '{"decision":"block","reason":"Ecriture dans '"$file_path"' BLOQUEE. Fichiers .env contiennent des secrets. Modifier manuellement."}'
  exit 0
fi

if echo "$file_path" | grep -qiE '(^|/)(\.env\.vault|\.secret|credentials|serviceAccountKey|\.pem|\.key|\.cert)'; then
  echo '{"decision":"block","reason":"Ecriture dans '"$file_path"' BLOQUEE. Fichier sensible detecte."}'
  exit 0
fi

if echo "$file_path" | grep -qE '\.(ts|tsx|js|json|astro)$'; then
  content=$(echo "$input" | jq -r '.tool_input.content // .tool_input.new_str // empty' 2>/dev/null)
  if [ -n "$content" ]; then
    if echo "$content" | grep -qiE '(sk-proj-|eyJ[A-Za-z0-9]{20,}|service_role|SUPABASE_SERVICE_ROLE|APP_SECRET|-----BEGIN)'; then
      echo '{"decision":"block","reason":"Secret potentiel detecte dans le contenu. Ne jamais hardcoder de tokens/cles."}'
      exit 0
    fi
  fi
fi

echo '{"decision":"allow"}'
