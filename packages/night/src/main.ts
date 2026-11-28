import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { systemClock } from "@inn/engine";
import { callClaude, PROMPT_VERSION } from "@inn/narrator/claude";
import type { Database } from "@inn/schema";
import { runNight } from "./job.ts";
import { supabaseNightDb } from "./supabase.ts";

/**
 * Runs the nightly System once. Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY; with
 * ANTHROPIC_API_KEY set, mornings are written by Claude (NARRATOR_MODEL to override the
 * model), otherwise by the templates. Prints a summary with ids and dates only.
 */
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (pnpm night:local does it for the local stack).");
  process.exit(1);
}

const db = supabaseNightDb(createClient<Database>(url, key, { auth: { persistSession: false } }));
const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic() : undefined;
const model = process.env.NARRATOR_MODEL;
const report = await runNight({
  db,
  now: systemClock.now(),
  promptVersion: PROMPT_VERSION,
  ...(anthropic ? { call: (req) => callClaude(req, { client: anthropic, ...(model ? { model } : {}) }) } : {}),
});

console.log(JSON.stringify(report, null, 2));
if (report.errors.length > 0) process.exit(1);
