# core/aniegpt · agent contract

## What this module is
This module **is** the Anieyrudh Filter — the canonical system prompt that every generation, review, and authoring agent in the monorepo loads before producing or accepting content. It owns the prompt text and its version history. It does not own any runtime: agents in other modules read the file as a string and pass it to their model of choice.

## Public interface
- `aniegpt-system-prompt.md` — the canonical Filter prompt (read as a string by consumers).
- `version.json` → `{ prompt_version: string, sha256: string, frozen_at: ISO8601 }`.
- (Optional, when added) `loadFilter(): { prompt: string; version: string; sha256: string }` — verifies hash and returns the prompt.

Anything beyond these is implementation detail.

## Invariants the caller must preserve
- The prompt is **canonical**. Callers concatenate it verbatim at the head of their system prompt. No paraphrasing, no truncation, no "summary mode".
- Caller MUST log `prompt_version` and `sha256` into every generated artefact's `provenance` block (see `@paideia/content-schema` → `Provenance`).
- Caller MUST NOT layer a second persona on top that contradicts the Filter (e.g. "be encouraging even if the student is wrong").
- Edits to the prompt require an ADR (`docs/adr/NNNN-*.md`), advisor sign-off, and a `prompt_version` bump.

## What this module does NOT do
- Does **not** run inference. No model client, no API key, no tokeniser lives here.
- Does **not** replace human pedagogical judgment. The Filter sharpens questions; it does not certify content fit for a learner.
- Does **not** replace advisor sign-off for first-of-kind sims or course-map changes.
- Does **not** produce content — only constrains the agent that produces it.
- Does **not** know about specific modules (no `if module === plotting` carve-outs). Module-specific probes live in that module's AGENTS.md.

## When to consider this module
Use `core/aniegpt` whenever an agent generates, reviews, or revises any artefact destined for a learner — sim spec, concept-card prose, assessment item, advisor briefing. Every generation pass must load this prompt first.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current consumer (all generation pipelines, all review CI jobs).
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` commit prefix; bump `prompt_version` semver-major for any rule that could change a previously-accepted artefact's verdict.

## Anti-patterns (will be rejected in PR review)
- Adding "tone presets" (`friendly`, `strict`) — the Filter has one voice.
- Branch-specific clauses (`if SUTD then…`, `for A-Level…`) inside the prompt — pedagogical adaptation belongs in upstream system prompts, not the Filter.
- Removing the predict-before-reveal clause "to make demos smoother".
- Caching the prompt in a JS literal in another module — always read from the file so `sha256` matches.

## How the Anieyrudh Filter reads this module
The Filter reads its own contract: the load-bearing claim is that **the prompt the agent ran with is exactly the prompt on disk at the recorded `sha256`**. Provenance that doesn't verify against this module is treated as unsigned and rejected by review CI.
