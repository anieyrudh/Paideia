# AI Simulation Prompts

These prompts are for people using ChatGPT, Claude, Gemini, Codex, Claude Code,
or similar tools to create Paideia contributions.

## Prompt: Standalone HTML Simulation

Use this when you want a simple package that can run in a browser without a
build system.

```text
Create a standalone academic simulation and lesson package for Paideia.

Topic:
[insert topic]

Audience:
[insert level, for example A-Level Physics or first-year engineering]

Learning goal:
[one sentence]

Requirements:
1. Build a self-contained simulation that runs as static HTML/CSS/JavaScript.
2. Do not use server-side code.
3. Do not use GPL, AGPL, LGPL, proprietary, copied textbook, or copied simulation code.
4. Use MIT-compatible code only.
5. Include clear citations in sources.md.
6. The simulation must be visibly interactive: sliders, toggles, draggable objects, graph updates, animation, diagram updates, or equivalent.
7. The learner should see a real visual model, not only text.
8. Include formulas where relevant.
9. For each formula, include formula, variable legend, substitution example, units, and result.
10. Use student-friendly language. Avoid raw code terms.
11. Include a short teacher note explaining how to use the simulation.
12. Include a preview image instruction if you cannot generate the image directly.

Output this folder structure:

manifest.yaml
lesson.md
simulation.html
sources.md
teacher-notes.md
license.md

The simulation should be polished, accessible, responsive, and suitable for
publishing in an open educational library.
```

## Prompt: External Embed Package

Use this when the simulation already exists elsewhere and the license allows
embedding or linking.

```text
Create a Paideia external embed contribution package.

Topic:
[insert topic]

External simulation URL:
[insert URL]

Audience:
[insert level]

Requirements:
1. Do not copy the external simulation code.
2. Verify and explain the external license or terms.
3. Create a lesson that helps the learner use the external simulation.
4. Cite all sources.
5. Include teacher notes.
6. Mark simulation.kind as external-embed in manifest.yaml.
7. Include any risks: unavailable embed, unclear license, missing source, or accessibility limitation.

Output:
manifest.yaml
lesson.md
sources.md
teacher-notes.md
license.md
```

## Prompt: Codex Or Claude Code Contribution

Use this when an agent has repo access and can create files directly.

```text
Build one Paideia contribution package.

Repo: anieyrudh/Paideia
Base branch: main

Read first:
- README.md
- CONTRIBUTING.md
- docs/public/contribution-packages.md
- docs/quality/visual-simulation-standard.md

Create exactly one contribution under:
contributions/<subject>/<slug>/

Do not touch unrelated files.

The contribution must include:
- manifest.yaml
- lesson.md
- simulation.html or simulation/
- sources.md
- teacher-notes.md
- license.md
- preview.png if possible

Rules:
- Simulation must be visual and interactive.
- No text-only simulations.
- No GPL, AGPL, LGPL, proprietary, copied textbook, or copied simulation code.
- Cite sources.
- Use student-facing language.
- Include formula, substitution, units, result, and legend where applicable.
- Keep the app static unless there is a strong reason not to.

Run whatever validation exists locally. If the repository does not yet have a
contribution-package validator, do a manual file-shape check and report that the
validator is missing.

Open one PR with:
- topic
- audience
- files added
- sources
- license
- screenshot or preview note
- checks run
- any known limitations
```

## Prompt: Evaluator Review

Use this to review a submitted package.

```text
Review this Paideia contribution package for publication quality.

Check:
1. Does the simulation run?
2. Is it visibly interactive?
3. Do controls visibly change the model?
4. Is the lesson student-friendly?
5. Are formulas explained with formula, substitution, units, result, and legend?
6. Are sources credible and cited?
7. Is there any copied textbook, proprietary, GPL, AGPL, LGPL, or unclear code?
8. Does the package include manifest.yaml, lesson.md, sources.md, and license.md?
9. Is teacher-notes.md useful?
10. Does it feel like a useful academic simulation or like low-effort generated content?

Classify findings:
- P0: broken, unsafe, copied, incompatible license, no visual model for a simulation, misleading educational claim.
- P1: weak pedagogy, confusing controls, missing formula evidence, poor source quality, accessibility issue.
- P2: polish, layout, copy, better labels, stronger examples.

Return:
- pass/warning/fail
- P0/P1/P2 findings
- suggested status: draft, reviewed, or featured
- specific file paths and fixes
```
