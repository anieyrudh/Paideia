# Simulation Presentation Standard

This is the learner-facing UI standard for Paideia simulations. It applies to
new product-quality containers and to existing containers when they are touched
for product work.

## Formula Panels

Every calculation shown to a learner must include:

1. a LaTeX formula block;
2. a nearby legend for every symbol;
3. substituted values with units;
4. the final result with units;
5. one sentence explaining why that formula applies.

Use a code-styled formula block so the expression is readable, copyable, and
consistent across Markdown, React UI, and static docs. Rendering the formula
with KaTeX/MathJax or another renderer is allowed later, but the source LaTeX
block remains mandatory.

```latex
\color{#2563eb}{W}
= \color{#7c3aed}{F}
  \color{#059669}{s}
  \cos(\color{#d97706}{\theta})
```

Legend immediately beside or below the formula:

| Color | Symbol | Meaning | Unit |
| --- | --- | --- | --- |
| Blue | `W` | work done by the force | joule, J |
| Purple | `F` | force magnitude | newton, N |
| Green | `s` | displacement along the path | metre, m |
| Amber | `theta` | angle between force and displacement | degree or radian |

Substitution:

```latex
W = (12.0\ \mathrm{N})(3.50\ \mathrm{m})\cos(30^\circ)
  = 36.4\ \mathrm{J}
```

Reason:

The cosine term keeps only the part of the force acting along the displacement.

## Color And Accessibility

Color helps learners connect formula terms to controls, vectors, traces, and
legend rows. It must not be the only cue.

- Use the same color for a variable in the formula, legend, control label,
  graph trace, vector, and readout.
- Pair color with text labels, symbols, units, and shape or line style.
- Keep contrast high enough on light and dark surfaces.
- If a formula uses a color, the legend must name the color and the symbol.
- Do not use only red/green to signal correctness.

## Code-Facing Text

Student UI must not expose implementation details:

- no package names such as `@paideia/...`;
- no file paths;
- no kernel names unless the learner is in a developer-facing view;
- no YAML keys, manifest fields, or issue-template labels;
- no raw queue IDs.

Use plain labels such as "resultant force", "velocity", "stability boundary",
or "threshold" instead.

## Renderer Choice

Choose the renderer for the learning interaction, not because a tool is
available.

| Simulation type | Preferred path | Use when |
| --- | --- | --- |
| Formula lab, sliders, charts, tables | React + `core/sim-runtime` + `core/ui-sim` | Most current Paideia concept labs. |
| Undecided game-like runtime | Web game foundations | The sim needs engine choice, input model, save/debug boundaries, or asset organization before implementation. |
| Game-like 2D scene | Phaser 2D | The learner manipulates sprites, rooms, grids, tile maps, collisions, or camera motion. |
| 2D sprite asset work | Sprite pipeline | The sim needs stable character/object animation strips, anchor normalization, or preview sheets. |
| Game HUD or overlay | Game UI frontend | The sim has a canvas/WebGL playfield and needs DOM HUD, menus, overlays, or mobile playfield protection. |
| React-hosted 3D scene | React Three Fiber | The surrounding app is React and the central object is genuinely 3D. |
| 3D asset shipping | GLB/glTF asset pipeline | The work involves model cleanup, pivots, texture budgets, collision proxies, or LODs. |
| Component-system app surface | shadcn/ui | The app already has `components.json`, or a dedicated design-system PR initializes it. |

Phaser is not mandatory for every 2D educational sim. Many simulations are
better as React-controlled explainable models because text, formula panels,
sliders, and accessibility remain first-class.

## Skill Routing For Agents

Agents should use these skills when available:

- `frontend-skill` for public pages, shells, and learner-facing app polish.
- `new-container`, `new-sim-in-container`, and `review-container` for Paideia
  container work.
- `game-studio:web-game-foundations` before implementation when a sim is
  game-like and the engine, input model, state boundary, or asset strategy is
  not settled.
- `game-studio:phaser-2d-game` for game-like 2D canvas scenes.
- `game-studio:sprite-pipeline` for 2D sprite generation, strip normalization,
  anchors, scale consistency, and preview sheets.
- `game-studio:game-ui-frontend` for HUDs, menus, overlays, and responsive
  playfield-protecting UI.
- `game-studio:game-playtest` for any visual simulation QA, especially canvas,
  chart, animation, or WebGL-heavy surfaces.
- `game-studio:react-three-fiber-game` for React-hosted 3D simulations.
- `game-studio:web-3d-asset-pipeline` for GLB/glTF asset preparation and
  runtime asset validation.
- `build-web-apps:shadcn` only when a shadcn project exists or the task is
  explicitly to initialize one.

If a requested skill is not the right fit, say so in the PR body and explain the
chosen alternative.

## Playtest Requirements

Every product-quality simulation PR must include browser evidence:

- first actionable screen loads;
- prediction checkpoint records learner reflection without blocking the live model;
- main controls update visible state;
- formula panel appears after reveal or during calculation;
- formula, legend, graph/control colors, and readouts stay aligned;
- no critical accessibility violations in the revealed state;
- desktop and one mobile viewport have no incoherent overlap or horizontal
  overflow.

For canvas, WebGL, or animation-heavy work, screenshots are required. DOM-only
assertions are not enough because they can miss visual regressions.
