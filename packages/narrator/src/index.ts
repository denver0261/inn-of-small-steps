import { NarrationRequest, type Narration } from "./schema.ts";
import { templateNarration } from "./templates.ts";
import { validateNarration } from "./validate.ts";

export * from "./facts.ts";
export * from "./schema.ts";
export * from "./templates.ts";
export * from "./validate.ts";

/** Anything that turns a request into Claude's raw output; the real one is `callClaude`. */
export type Narrate = (req: NarrationRequest) => Promise<unknown>;

/**
 * Narrates a night. Claude's output is used only if it validates; any failure (no key,
 * a timeout, a refusal, a bad shape, an invented number) falls back to the templates,
 * so a level-up is never lost to the API.
 */
export async function narrate(request: NarrationRequest, call: Narrate | undefined): Promise<Narration> {
  const req = NarrationRequest.parse(request);
  if (!call) return { output: templateNarration(req), source: "template", error: "no Claude client" };
  try {
    return { output: validateNarration(req, await call(req)), source: "claude" };
  } catch (e) {
    return { output: templateNarration(req), source: "template", error: e instanceof Error ? e.message : String(e) };
  }
}
