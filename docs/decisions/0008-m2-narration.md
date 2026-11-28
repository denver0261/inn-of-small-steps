# 0008: M2 narration (Claude as the System)

Date: 2026-11-27
Status: accepted

## Context

The design splits each night in two: the rules engine decides what happened, and Claude decides how it reads. One call per household per night writes the level messages, Skill names, evolution names and a short morning scene. The output has to be checked, and a failed call must never cost a level-up.

## Decisions

**A `packages/narrator` package.** It holds:

- the request and output schemas (zod)
- `playerNight`, which turns a night's engine events into plain facts
- the templates
- the validator
- `narrate`, which tries Claude and falls back

The Claude call lives at a separate entry point, `@inn/narrator/claude`, so tests and the app never load the SDK.

**The prompt is code.** `prompts/system-v1.md` is the System prompt, versioned by file name. `prompts/fixtures/` holds requests (a level-up night, a Level 10 capstone night, a quiet comeback night) and one hand-written Claude answer. CI checks that every fixture's template narration validates, and that the sample answer passes. Tests never call the live API.

**Validation rejects any number the engine didn't produce.** Every number in Claude's output has to appear in that player's facts: levels, tiers, the numbers in a Skill's summary, days away. Level messages must be `[bracketed]`. Skill and class names are bracketed, at most 38 characters, with no digits. The scene runs at most 4 paragraphs and 1,600 characters. When the shape is right but something is missing (a Skill name, or fewer level messages than events), the template fills that gap instead of throwing the whole night away.

**Fallback.** No key, a timeout, a refusal, a bad shape or an invented number all mean template text: messages like `[Rider Level 4!]` and `[Skill – Long Road obtained!]`, the catalog's fallback names, and a hand-written scene (`packages/content/src/scenes.ts`). Each fallback scene is picked deterministically by house and date.

**The call.** It uses `client.beta.messages.parse` with a zod output format, on `claude-opus-5-5` by default (`NARRATOR_MODEL` overrides it) at effort `medium`. Server-side refusal fallbacks are on (`fallbacks: "default"`), the timeout is 2 minutes, and there are 2 retries. The design suggests a smaller model on routine nights to save cost. That's left as a setting rather than a default until real nights show what the cost is.

## Not verified yet

There is no Claude API key on the development machine, so the live call has only been type-checked against the SDK and never run. The first run with a key (`ANTHROPIC_API_KEY`) should be read by a person before the playtest. Until then every night uses the templates, and the game plays fine on them.

## Consequences

- The nightly job (next PR) builds one `NarrationRequest` per household and stores the result with its `source` (`claude` or `template`), so template nights are easy to spot.
- Changing the prompt means a new file (`system-v2.md`) and new fixtures, not an edit in place.
