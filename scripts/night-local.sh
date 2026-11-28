#!/bin/sh
# Runs the nightly System once against the local Supabase stack (service role from `supabase status`).
set -eu
eval "$(pnpm -s exec supabase status -o env 2>/dev/null | awk -F= '
  $1 == "API_URL" { print "export SUPABASE_URL=" $2 }
  $1 == "SERVICE_ROLE_KEY" { sub(/^SERVICE_ROLE_KEY=/, ""); print "export SUPABASE_SERVICE_ROLE_KEY=" $0 }
')"
[ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ] || { echo "Supabase isn't running: pnpm exec supabase start" >&2; exit 1; }
exec pnpm -s night
