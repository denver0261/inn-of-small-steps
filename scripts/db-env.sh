#!/bin/sh
# Writes apps/mobile/.env.local for the local Supabase stack (public URL and publishable key only).
set -eu
out=apps/mobile/.env.local
pnpm -s exec supabase status -o env 2>/dev/null | awk -F= '
  $1 == "API_URL" { gsub(/"/, "", $2); print "EXPO_PUBLIC_SUPABASE_URL=" $2 }
  $1 == "PUBLISHABLE_KEY" { sub(/^PUBLISHABLE_KEY=/, ""); gsub(/"/, ""); print "EXPO_PUBLIC_SUPABASE_KEY=" $0 }
' > "$out"
grep -q EXPO_PUBLIC_SUPABASE_KEY "$out" || { echo "Supabase isn't running: pnpm exec supabase start" >&2; exit 1; }
echo "wrote $out"
