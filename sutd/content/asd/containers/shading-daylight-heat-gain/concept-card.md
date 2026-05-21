---
subject: asd
concept: shading-daylight-heat-gain
branch: sutd
level: "Undergraduate core"
syllabus_ref: "SUTD ASD / Environmental systems / Building performance"
prerequisites:
  - load-path-and-daylight-tradeoff
  - ratio-reasoning
  - trigonometry
aid_types:
  - concept-card
  - simulation
  - misconception-audit
  - transfer-problem
status: reviewed
---

# Shading, Daylight, and Heat Gain

## First-Principles Explanation

A facade opening admits useful daylight and direct solar heat at the same time.
The design move is not simply to maximise glass or maximise shade. The useful
question is: how much of the sunlit glass should the shade cover for this sun
angle, orientation, and glazing area?

For a horizontal overhang above a window, the vertical reach of its shadow can
be estimated from right-triangle geometry:

```latex
\mathrm{shadow\ reach} = d\tan(\alpha)
```

where `d` is overhang depth and `alpha` is the solar altitude angle. Dividing
that reach by the window height gives a shaded fraction. A larger shaded
fraction usually reduces direct solar heat gain, but it can also reduce useful
daylight if it blocks too much of the opening.

This container uses teaching proxies rather than code-compliance metrics:

- daylight score increases with glazing ratio, but falls when too much glass is shaded;
- heat gain increases with glass area, sun exposure, and solar heat-gain coefficient;
- shading reduces direct heat gain more strongly than it reduces diffuse daylight.

## Canonical Example

A south-facing studio has 60 percent glazing, a 0.8 m overhang, a 2.4 m window
height, and a 45 degree solar altitude.

```latex
\mathrm{shaded\ fraction}
= \frac{0.8\tan(45^\circ)}{2.4}
= 0.33
```

About one third of the window is shaded. The facade keeps a useful opening, but
direct solar heat gain is lower than it would be with a shallow shade.

## Common Misconceptions

- **More glass always improves daylight quality.** Extra glass can add glare and
  heat gain, especially on high-exposure orientations.
- **Shading only reduces light and never heat.** Shading changes both the light
  path and the direct solar heat entering through glass.
- **A single metric decides the facade.** Environmental design is a tradeoff:
  daylight, glare, heat gain, view, and structure all need to be read together.
