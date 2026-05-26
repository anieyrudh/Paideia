import type { TSimulationSpec } from "@paideia/content-schema";
import { doubleIntegralRect } from "@paideia/vector-calculus";
import { type ConceptPackageId, err, ok, type KernelResult, type Rect } from "@paideia/shared";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import { ControlGroup, Selector, Slider } from "@paideia/ui-sim";
import type { CSSProperties } from "react";

type DensityKind = "constant" | "ramp-x" | "tilted-plane";
type IntegralMode = "double" | "triple";

type IntegralState = {
  readonly mode: IntegralMode;
  readonly densityKind: DensityKind;
  readonly xMax: number;
  readonly yMax: number;
  readonly zMax: number;
  readonly gridCount: number;
};

type IntegralEvidence = {
  readonly state: IntegralState;
  readonly baseIntegral: number;
  readonly tripleIntegral: number;
  readonly cells: number;
  readonly densityAtCorner: number;
  readonly densityAtCentre: number;
  readonly interpretation: string;
};

export const doubleAndTripleIntegralsPackageId =
  "sutd/10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra/double-and-triple-integrals" as ConceptPackageId;

export const doubleAndTripleIntegralsSpec: TSimulationSpec = {
  id: "double-and-triple-integrals",
  title: "Double and Triple Integrals Lab",
  interaction_type: "diagram-builder",
  kernel_deps: [
    "core/sim-runtime",
    "core/vector-calculus",
    "core/prediction-gate",
    "core/ui-sim",
  ],
  manipulate: {
    controls: [
      { id: "integral-mode", label: "Integral mode", kind: "selector", kernel_binding: "state.mode" },
      { id: "density-kind", label: "Density field", kind: "selector", kernel_binding: "state.densityKind" },
      { id: "x-max", label: "x upper bound", kind: "slider", kernel_binding: "state.xMax", bounds: { min: 1, max: 5, step: 0.25 } },
      { id: "y-max", label: "y upper bound", kind: "slider", kernel_binding: "state.yMax", bounds: { min: 1, max: 5, step: 0.25 } },
      { id: "z-max", label: "z layer height", kind: "slider", kernel_binding: "state.zMax", bounds: { min: 1, max: 4, step: 0.25 } },
    ],
  },
  predict: {
    prompt:
      "When a rectangular region doubles in one bound, what happens to a constant-density double integral?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "It doubles, because twice as much base area is accumulated",
        "It stays fixed, because density does not change",
        "It squares, because there are two variables",
        "It becomes a line integral along the boundary",
      ],
      correct_index: 0,
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "double-triple-integrals-renderer",
        module: "@paideia/sutd-sims/double-and-triple-integrals",
        symbol: "DoubleAndTripleIntegrals",
        props_binding:
          "Show base region, sampled cells, layer stack, double/triple integral readouts, formula legend, substitutions, units, and interpretation.",
      },
    ],
  },
  explain: {
    prompt:
      "Explain how an integral accumulates density over area or volume, and why changing bounds changes the accumulated quantity.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Bounds are independent of the chosen order",
      "A double integral is only area, never accumulated density",
    ],
  },
};

const defaults: IntegralState = {
  mode: "double",
  densityKind: "constant",
  xMax: 3,
  yMax: 2,
  zMax: 2,
  gridCount: 16,
};

const modeOptions: readonly { readonly label: string; readonly value: IntegralMode }[] = [
  { label: "Double integral over a rectangle", value: "double" },
  { label: "Triple integral as stacked layers", value: "triple" },
];

const densityOptions: readonly { readonly label: string; readonly value: DensityKind }[] = [
  { label: "Constant density", value: "constant" },
  { label: "Ramp in x", value: "ramp-x" },
  { label: "Tilted plane", value: "tilted-plane" },
];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const currentState = (state: Partial<IntegralState>): IntegralState => ({
  mode: state.mode ?? defaults.mode,
  densityKind: state.densityKind ?? defaults.densityKind,
  xMax: clamp(state.xMax ?? defaults.xMax, 1, 5),
  yMax: clamp(state.yMax ?? defaults.yMax, 1, 5),
  zMax: clamp(state.zMax ?? defaults.zMax, 1, 4),
  gridCount: Math.round(clamp(state.gridCount ?? defaults.gridCount, 4, 48)),
});

const density = (kind: DensityKind, x: number, y: number): number => {
  switch (kind) {
    case "constant":
      return 2;
    case "ramp-x":
      return 1 + x;
    case "tilted-plane":
      return 1 + 0.5 * x + 0.25 * y;
  }
};

export const integralEvidence = (
  partial: Partial<IntegralState>,
): KernelResult<IntegralEvidence> => {
  const state = currentState(partial);
  const rect: Rect = { x: { min: 0, max: state.xMax }, y: { min: 0, max: state.yMax } };
  const integral = doubleIntegralRect(
    (x, y) => density(state.densityKind, x, y),
    rect,
    { nx: state.gridCount, ny: state.gridCount, rule: "midpoint" },
  );
  if (!integral.ok) return integral;
  const tripleIntegral = integral.value.value * state.zMax;
  if (!Number.isFinite(tripleIntegral)) {
    return err("numerical-instability", "triple integral estimate is non-finite");
  }
  const densityAtCentre = density(state.densityKind, state.xMax / 2, state.yMax / 2);
  const interpretation =
    state.mode === "double"
      ? "The double integral accumulates density over the base rectangle."
      : "The triple integral stacks that accumulated base density through the z height.";
  return ok({
    state,
    baseIntegral: integral.value.value,
    tripleIntegral,
    cells: integral.value.cells,
    densityAtCorner: density(state.densityKind, state.xMax, state.yMax),
    densityAtCentre,
    interpretation,
  });
};

const fmt = (value: number): string => {
  const rounded = Number(value.toFixed(2));
  return Object.is(rounded, -0) ? "0" : rounded.toString();
};

const panelStyle = {
  border: "1px solid #d6dde8",
  borderRadius: "8px",
  padding: "1rem",
  background: "#fff",
} satisfies CSSProperties;

const surfaceStyle = {
  display: "grid",
  gap: "1rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
} satisfies CSSProperties;

const metricGridStyle = {
  display: "grid",
  gap: "0.75rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
} satisfies CSSProperties;

const Metric = ({ label, value }: { readonly label: string; readonly value: string }) => (
  <div style={{ ...panelStyle, padding: "0.75rem" }}>
    <div style={{ color: "#526173", fontSize: "0.85rem" }}>{label}</div>
    <strong>{value}</strong>
  </div>
);

const IntegralVisual = ({ evidence }: { readonly evidence: IntegralEvidence }) => {
  const { state } = evidence;
  const width = 220;
  const height = 150;
  const layers = state.mode === "triple" ? [0, 1, 2] : [0];
  return (
    <svg aria-label="Integral accumulation visual model" role="img" viewBox="0 0 360 260">
      <rect fill="#f8fafc" height="260" width="360" />
      {layers.map((layer) => (
        <g key={layer} transform={`translate(${60 + layer * 18} ${55 - layer * 14})`}>
          <rect fill="#ecfeff" height={height} stroke="#0891b2" strokeWidth="3" width={width} />
          {Array.from({ length: 4 }, (_, ix) =>
            Array.from({ length: 4 }, (_, iy) => (
              <rect
                fill={`rgba(124,58,237,${0.12 + 0.05 * (ix + iy)})`}
                height={height / 4}
                key={`${ix}:${iy}`}
                stroke="#d6dde8"
                width={width / 4}
                x={(ix * width) / 4}
                y={(iy * height) / 4}
              />
            )),
          )}
        </g>
      ))}
      <text fill="#111827" fontSize="15" x="60" y="232">
        {`base: 0 <= x <= ${fmt(state.xMax)}, 0 <= y <= ${fmt(state.yMax)}`}
      </text>
    </svg>
  );
};

const FormulaPanel = ({ evidence }: { readonly evidence: IntegralEvidence }) => (
  <section aria-label="Formula panel" role="region" style={panelStyle}>
    <h3>Formula panel</h3>
    <p>
      <strong>Double integral:</strong>{" "}
      <code>{String.raw`\iint_R \rho(x,y)\,dA`}</code>
    </p>
    <p>
      <strong>Triple integral:</strong>{" "}
      <code>{String.raw`\iiint_B \rho(x,y)\,dV=\int_0^h\iint_R\rho(x,y)\,dA\,dz`}</code>
    </p>
    <p>
      <strong>Legend:</strong> blue rectangle is the base region, purple cells are midpoint
      samples, and stacked outlines represent z layers.
    </p>
    <p>
      <strong>Substitution:</strong> x bound = {fmt(evidence.state.xMax)} m, y bound ={" "}
      {fmt(evidence.state.yMax)} m, z height = {fmt(evidence.state.zMax)} m, centre density =
      {fmt(evidence.densityAtCentre)} units per square metre.
    </p>
    <p>
      <strong>Result:</strong> base accumulation = {fmt(evidence.baseIntegral)} units; stacked
      volume accumulation = {fmt(evidence.tripleIntegral)} units.
    </p>
    <p>
      <strong>Interpretation:</strong> {evidence.interpretation}
    </p>
  </section>
);

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<IntegralState>();
  const current = currentState(state);
  return (
    <section aria-label="Integral controls" role="region" style={surfaceStyle}>
      <div style={panelStyle}>
        <h2>Set the region before reveal</h2>
        <p>Choose an accumulation mode, density field, and rectangular bounds.</p>
        <ControlGroup legend="Region and density">
          <Selector label="Integral mode" onChange={(value) => set("mode", value)} options={modeOptions} value={current.mode} />
          <Selector label="Density field" onChange={(value) => set("densityKind", value)} options={densityOptions} value={current.densityKind} />
          <Slider label="x upper bound" max={5} min={1} onChange={(value) => set("xMax", value)} step={0.25} unit="m" value={current.xMax} />
          <Slider label="y upper bound" max={5} min={1} onChange={(value) => set("yMax", value)} step={0.25} unit="m" value={current.yMax} />
          <Slider label="z layer height" max={4} min={1} onChange={(value) => set("zMax", value)} step={0.25} unit="m" value={current.zMax} />
        </ControlGroup>
        <button type="button" onClick={() => stage.advance()}>
          Reveal accumulation
        </button>
      </div>
      <div style={panelStyle}>
        <h3>Prediction focus</h3>
        <p>For constant density, changing the bounds changes accumulated quantity in proportion to area or volume.</p>
      </div>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const evidence = integralEvidence(useSimState<Partial<IntegralState>>());
  if (!evidence.ok) return <p role="alert">The selected region cannot be integrated.</p>;
  const value = evidence.value;
  return (
    <section aria-label="Observation unlocked" role="region" style={{ display: "grid", gap: "1rem" }}>
      <h2>Accumulation evidence</h2>
      <div style={metricGridStyle}>
        <Metric label="Base integral" value={`${fmt(value.baseIntegral)} units`} />
        <Metric label="Triple integral" value={`${fmt(value.tripleIntegral)} units`} />
        <Metric label="Sampled cells" value={String(value.cells)} />
        <Metric label="Corner density" value={fmt(value.densityAtCorner)} />
      </div>
      <section aria-label="Integral visual model" style={panelStyle}>
        <h3>Region and layer model</h3>
        <IntegralVisual evidence={value} />
      </section>
      <FormulaPanel evidence={value} />
      <button type="button" onClick={() => stage.advance()}>
        Explain and transfer
      </button>
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();
  return (
    <section aria-label="Transfer prompt" role="region" style={{ display: "grid", gap: "1rem" }}>
      <h2>Explain before transfer</h2>
      <p>Explain how the bounds and density field determine whether each slice contributes more or less to the total.</p>
      <p>Transfer challenge: compute mass from a non-uniform density over a rectangular component.</p>
      <button type="button" onClick={() => stage.reset()}>
        Try another region
      </button>
    </section>
  );
};

const StageSurface = () => {
  const stage = useStage();
  if (stage.current === "manipulate") return <ManipulateStage />;
  if (stage.current === "observe") return <ObserveStage />;
  if (stage.current === "explain") return <ExplainStage />;
  return (
    <section aria-label="Prediction setup" role="region" style={surfaceStyle}>
      <div style={panelStyle}>
        <h2>Predict accumulated quantity</h2>
        <p>Before seeing numbers, decide how changing one bound should change constant-density accumulation.</p>
        <button type="button" onClick={() => stage.advance()}>
          Set region
        </button>
      </div>
    </section>
  );
};

export default function DoubleAndTripleIntegrals() {
  return (
    <SimRuntime spec={doubleAndTripleIntegralsSpec} packageId={doubleAndTripleIntegralsPackageId}>
      <StageSurface />
    </SimRuntime>
  );
}
