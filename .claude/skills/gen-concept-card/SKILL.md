---
name: gen-concept-card
description: Draft a concept-card.md (and seed sources.md) from a concept id and SEAB/SUTD syllabus reference using the Concept Source Pack deep-research prompt. All citations require URL + year; unverified claims are flagged. Use when the user says "generate concept card", "draft card for <concept>", or "/gen-concept-card".
disable-model-invocation: false
---

# gen-concept-card

Drafts `concept-card.md` plus a starter `sources.md` for a container. Runs the Concept Source Pack deep-research prompt against the syllabus reference, then renders the template.

## When to invoke

- "draft a concept card for <concept-id>"
- "generate concept card from syllabus <ref>"
- "/gen-concept-card <concept-id> <syllabus_ref>"

## Inputs

| Field | Example | Required |
|---|---|---|
| concept_id | `simple-harmonic-motion` | yes |
| syllabus_ref | `9749 / 17` | yes |
| branch | `a-level` or `sutd` | yes |
| subject | `physics` | yes |
| level | `H2` etc. | optional |

The target container must already exist (run `/new-container` first if not).

## Procedure

1. **Locate template.** Read `core/docs-templates/concept-card.template.md` and `core/docs-templates/sources.template.md`. These define the structure; do not invent new sections.

2. **Run the Concept Source Pack deep-research prompt.** The canonical prompt lives at:
   ```
   /Users/anieyrudh/Desktop/Biological APIs/Biological APIs/Paideia/a-level/phase-1-curriculum-content-pack.md
   ```
   Read it if accessible. If unreadable in this environment, fall back to this contract:

   > "For the concept `<concept_id>` aligned to SEAB syllabus `<syllabus_ref>` (`<branch> · <subject> · <level>`), produce:
   > 1. A one-paragraph plain-language teaching summary (no jargon).
   > 2. The PMOE-T outline: what the student predicts, manipulates, observes, explains, transfers.
   > 3. The pedagogical-choice rationale: why this predict format, why this transfer, what misconceptions surface.
   > 4. A citation list with: exact citation, URL, publication year, license, SEAB-alignment annotation.
   > Every substantive claim in (1)–(3) must map to a citation in (4)."

3. **Citation discipline.**
   - Every claim about syllabus content must cite the official SEAB page (URL + retrieval year).
   - Every misconception name must cite a Physics Education Research (PER) paper or a named textbook chapter, with URL/DOI and year.
   - Every formula or canonical statement must cite a textbook chapter or canonical reference, with year.
   - If a claim cannot be sourced confidently in this session, write the claim followed by `[NEEDS-VERIFICATION]` and add a stub source entry with `needs_verification: true`. Do NOT fabricate URLs or years.

4. **Render the concept-card.md.** Fill the template:
   ```
   ---
   subject: <subject>
   concept: <concept_id>
   branch: <branch>
   level: <level | omit>
   syllabus_ref: "<syllabus_ref verbatim>"
   prerequisites: []          # populate from research; may be empty if uncertain
   aid_types: [concept-card]
   status: draft
   ---

   # <Title>

   ## What this teaches
   <one paragraph, plain language>

   ## What the student does
   - Predict: ...
   - Manipulate: ...
   - Observe: ...
   - Explain: ...
   - Transfer: ...

   ## Pedagogical choices and why
   - Why this predict format? ...
   - Why this transfer problem? ...
   - What misconceptions does this surface? ...

   ## Notes for the teacher
   ...
   ```

5. **Seed sources.md.** Append every source from the research, grouped per the template (Primary references / SEAB anchors / Misconception evidence / Reuse and attribution). Do not duplicate entries already present.

6. **Validate the frontmatter.** Run:
   ```
   pnpm container:validate <container-path>
   ```
   The validator parses `concept-card.md` frontmatter against `ConceptCardFrontmatter`. Fix Zod issues before declaring done.

7. **Print a summary** listing:
   - Files written.
   - Count of citations (verified vs `[NEEDS-VERIFICATION]`).
   - Suggested next step: `/review-container` once sources are filled, or hand to `curriculum-auditor` for a spot-check.

## Refuse to do

- Do not fabricate URLs, DOIs, or publication years. Mark `[NEEDS-VERIFICATION]` instead.
- Do not paraphrase syllabus quotations — they must be verbatim.
- Do not write content into `decision-matrix.md` or `misconceptions.md` from this skill; those are author decisions.
- Do not change the template structure; fill placeholders only.
