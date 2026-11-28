import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { readFileSync } from "node:fs";
import { NarrationOutput, type NarrationRequest } from "./schema.ts";

export const PROMPT_VERSION = "system-v1";
const SYSTEM_PROMPT = readFileSync(new URL(`../../../prompts/${PROMPT_VERSION}.md`, import.meta.url), "utf8");

/** The default narration model; override with NARRATOR_MODEL. */
export const DEFAULT_MODEL = "claude-opus-5-5";

export interface ClaudeOptions {
  client: Anthropic;
  model?: string;
}

/**
 * One Claude call for the whole household's night. Returns Claude's raw parsed JSON; the
 * caller validates it (`validateNarration`) before anything is stored. On a refusal the
 * API retries on a fallback model itself (`fallbacks: "default"`); a refusal there too
 * throws, and the caller uses the templates.
 */
export async function callClaude(req: NarrationRequest, { client, model = DEFAULT_MODEL }: ClaudeOptions): Promise<unknown> {
  const response = await client.beta.messages.parse(
    {
      model,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(NarrationOutput) },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Tonight's facts:\n\n${JSON.stringify(req, null, 2)}` }],
    },
    { timeout: 120_000, maxRetries: 2 },
  );
  if (response.stop_reason === "refusal") throw new Error(`refused (${response.stop_details?.category ?? "no category"})`);
  if (response.stop_reason === "max_tokens") throw new Error("ran out of tokens");
  if (!response.parsed_output) throw new Error("no parsed output");
  return response.parsed_output;
}
