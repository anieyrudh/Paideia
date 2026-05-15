# core/three-scene · agent contract

## What this module is
The 3D scene layer. It owns React-Three-Fiber wrappers around Three.js and `@react-three/drei` helpers for the recurring scene shapes the monorepo needs: a basic camera + lights + controls rig, 3D surfaces, parametric curves, vector fields, and molecules. Because Three.js is heavy, the entire module is **lazy-loaded** at the consumer's import site — it must never appear in the catalogue's initial bundle.

## Public interface
Exports from `@paideia/three-scene` (all React components unless noted):

- `<ThreeScene camera?={CameraSpec} controls?={'orbit' | 'trackball' | 'none'} background?={string}>{children}</ThreeScene>` — sets up renderer, lights, controls.
- `<Surface3D z={Function3D} region={Rect} samples?={number} colourMap?={(z: number) => string} />`
- `<ParametricCurve3DView curve={ParametricCurve3D} t={Interval} samples?={number} />`
- `<VectorField3DView field={VectorField3D} region={Box3} density?={number} />`
- `<Molecule3D atoms={readonly Atom[]} bonds={readonly Bond[]} style?={'ball-and-stick' | 'space-filling' | 'stick'} />`
- `<Axes3D box={Box3} labels?={[string, string, string]} />`
- `Atom`, `Bond` types; `CameraSpec` type.
- Helpers: `colourMapViridis`, `colourMapPlasma` (functions from number to CSS colour).

All exports are also available via `@paideia/three-scene/lazy` which re-exports under `React.lazy` for explicit code-split boundaries.

## Invariants the caller must preserve
- Consumers MUST import via the package's documented lazy entry, or inside a dynamically-loaded sim chunk. **Never** import `@paideia/three-scene` at the top level of the catalogue or any page that doesn't need 3D.
- Props are read-only. Mutating a `Surface3D`'s `z` between renders forces a re-mesh.
- Cleanup is automatic on unmount — never hold onto a `THREE.Object3D` reference outside the React tree.
- Functions passed in (`z`, `curve`, `field`) are pure `Function3D` / `VectorField3D` etc.; undefined-at-point points are dropped from the mesh, not faked.

## What this module does NOT do
- Does **not** do 2D plotting — `core/plotting`.
- Does **not** do statistical charts — `core/charting`.
- Does **not** do graph layout in 3D — `core/graph-layout.forceDirected3D` produces coordinates; this module renders them.
- Does **not** do physics simulation. Rigid-body, soft-body, particle dynamics need a dedicated module.
- Does **not** support arbitrary user-supplied Three.js code paths — extend the wrappers if a new affordance is needed.
- Does **not** export GLTF or screenshots. Future export concern.
- Does **not** auto-tune resolution for device performance — caller picks `samples`.

## When to consider this module
Use `core/three-scene` when the simulation's central object is genuinely three-dimensional — a surface `z = f(x,y)`, a molecule, a 3D vector field, a 3D parametric curve. If a 2D view conveys the same idea, prefer `core/plotting` so the catalogue stays lean.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current consumer (3D math sims, molecular sims, biology structure sims).
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` commit prefix for any prop change, default change, or rendering-correctness change.

## Anti-patterns (will be rejected in PR review)
- Top-level (non-lazy) import in the catalogue or any non-3D page.
- Reaching into the underlying `useThree()` from a consumer; expose affordances here.
- Smoothing over `NaN` or out-of-domain values in a `Surface3D` by clamping silently.
- Persisting camera state across mounts without an explicit prop.
- Drei helpers leaking through as required peer-dependencies of consumers.
- Branch-specific defaults (`if SUTD then HDR background`) — pass props.

## How the Anieyrudh Filter reads this module
The Filter probes that **the 3D rendering does not lie about geometry**: scales are isotropic when the math demands it (a sphere is not an ellipsoid because the viewport is wider than tall), domain gaps are visible holes, and the axes' orientation matches the convention declared in the sim spec. A pretty 3D scene that misleads about shape fails review.
