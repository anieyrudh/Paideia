# Contribution Packages

Contribution packages are the lightweight way to add academic simulations and
lesson materials to Paideia.

They are designed for people using ordinary tools: ChatGPT, Claude, Gemini
Canvas, p5.js, vanilla HTML, exported React apps, hand-written lessons, or
teacher notes.

## Folder Shape

Use this shape:

```text
contributions/
  <subject>/
    <slug>/
      manifest.yaml
      lesson.md
      simulation.html
      preview.png
      sources.md
      teacher-notes.md
      license.md
```

If you do not know the subject bucket yet, put the package in
`contributions/_incoming/<slug>/`. The organizer can move it after you fill in
`manifest.yaml`:

```bash
pnpm contribution:organize -- --write
```

For advanced apps, replace `simulation.html` with a `simulation/` folder:

```text
contributions/
  <subject>/
    <slug>/
      manifest.yaml
      lesson.md
      simulation/
        package.json
        src/
        index.html
      preview.png
      sources.md
      teacher-notes.md
      license.md
```

## Required Files

| File | Required | Purpose |
| --- | --- | --- |
| `manifest.yaml` | yes | Metadata used by Paideia to index and publish the contribution. |
| `lesson.md` | yes | Student-facing explanation, activity, or guide. |
| `simulation.html` or `simulation/` | required for simulations | Browser-runnable interactive model. |
| `preview.png` | strongly recommended | Screenshot used in the gallery. |
| `sources.md` | yes | Citations for claims, formulas, datasets, diagrams, and adapted ideas. |
| `teacher-notes.md` | recommended | How to use the lesson, what to ask, what students may misunderstand. |
| `license.md` | yes | Code/content license and provenance notes. |

Lesson-only packs may omit `simulation.html`, but their manifest must say
`type: lesson`.

## Manifest

Use this shape:

```yaml
title: Projectile Motion Lab
slug: projectile-motion-lab
subject: physics
level: A-Level
topic: Kinematics
type: simulation-lesson
status: draft
summary: >
  Learners vary launch speed and angle, then compare the trajectory,
  range, and time of flight against the equations.
audience:
  - students
  - teachers
license:
  code: MIT
  content: CC-BY-4.0
simulation:
  kind: html
  entry: simulation.html
  interactive: true
  visual: required
quality:
  has_sources: true
  has_teacher_notes: true
  has_formula_legend: true
  has_accessibility_notes: false
```

## Quality Checklist

Before opening a pull request, check:

- The lesson has a clear audience.
- The concept is explained in student-friendly language.
- The simulation runs in a browser.
- The learner can manipulate at least one meaningful variable.
- The visual changes when controls change.
- The simulation is not text-only.
- Formula sections include formula, substitution, units, result, and legend when
  formulas matter.
- Sources are cited.
- No copyrighted textbook dumps are included.
- No GPL, AGPL, LGPL, proprietary, or unclear runtime code is included.
- `license.md` says what is original, adapted, generated, or cited.

## Automated Checks

Pull requests that touch `contributions/` run the contribution intake workflow:

```bash
pnpm contribution:organize -- --check
pnpm contribution:validate
```

The checks verify the package bucket, required files, manifest fields, citation
presence, license notes, and obvious simulation visual/interactivity signals.
They do not certify educational accuracy or source quality; maintainers still
review those.

For the full workflow, read
[Automated contribution intake](contribution-intake-workflow.md).

## Review Status

Every package starts as `draft`.

| Status | Meaning |
| --- | --- |
| `draft` | Valid shape; ready for review. |
| `reviewed` | Works, is sourced, and can be used by learners or teachers. |
| `featured` | Strong pedagogy, polished UI, good visuals, and teacher-ready notes. |

## What Not To Submit

- A copied textbook chapter.
- A simulation copied from a proprietary or incompatible source.
- A folder with no citations.
- A text-only page labelled as a simulation.
- A hard-to-run app with server requirements but no clear reason.
- Private student data, real grades, or identifiable learner data.

## Legacy Archive

The older curriculum-container system is archived in
`archive/legacy-curriculum-system/`. New public submissions should use the
simple package format on this page.
