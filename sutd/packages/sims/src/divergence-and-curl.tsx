import type { TSimulationSpec } from "@paideia/content-schema";
import { type ConceptPackageId, ok, type KernelResult } from "@paideia/shared";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import { ControlGroup, Selector, Slider } from "@paideia/ui-sim";
import {
  curl2D,
  divergence2D,
  sampleVectorField2D,
  type Point2,
  type Vector2,
} from "@paideia/vector-calculus";

type FieldKind = "source" | "sink" | "vortex" | "shear";

type DivergenceCurlState = {
  readonly fieldKind: FieldKind;
  readonly sampleX: number;
  readonly sampleY: number;
  readonly strength: number;
};

type DivergenceCurlEvidence = {
  readonly point: Point2;
  readonly divergence: number;
  readonly curl: number;
  readonly vectors: readonly { readonly point: Point2; readonly vector: Vector2 }[];
  readonly fieldLabel: string;
  readonly verdict: string;
};

export const divergenceAndCurlPackageId =
  "sutd/10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra/divergence-and-curl" as ConceptPackageId;

export const divergenceAndCurlSpec: TSimulationSpec = {
  id: "divergence-and-curl",
  title: "Divergence and Curl",
  interaction_type: "diagram-builder",
  kernel_deps: [
    "core/sim-runtime",
    "core/vector-calculus",
    "core/prediction-gate",
    "core/ui-sim",
  ],
  manipulate: {
    controls: [
      { id: "field-kind", label: "Vector field", kind: "selector", kernel_binding: "state.fieldKind" },
      { id: "sample-x", label: "Sample x", kind: "slider", kernel_binding: "state.sampleX", bounds: { min: -1.5, max: 1.5, step: 0.25 } },
      { id: "sample-y", label: "Sample y", kind: "slider", kernel_binding: "state.sampleY", bounds: { min: -1.5, max: 1.5, step: 0.25 } },
      { id: "strength", label: "Field strength", kind: "slider", kernel_binding: "state.strength", bounds: { min: 0.5, max: 2, step: 0.25 } },
    ],
  },
  predict: {
    prompt:
      "For the field F = <-y, x>, which local diagnostic is nonzero at the origin?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "Curl is nonzero while divergence is zero",
        "Divergence is nonzero while curl is zero",
        "Both divergence and curl are zero",
        "Both divergence and curl are negative",
      ],
      correct_index: 0,
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "divergence-curl-readout",
        module: "@paideia/sutd-sims/divergence-and-curl",
        symbol: "DivergenceAndCurl",
        props_binding:
          "Show a sampled vector field, selected point, divergence, curl, and local-source/spin interpretation.",
      },
    ],
  },
  explain: {
    prompt:
      "Explain why divergence measures local source strength while curl measures local rotation.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Large arrows automatically mean large divergence",
      "Curl means the whole field must move in circles",
    ],
  },
};

const defaults: DivergenceCurlState = {
  fieldKind: "vortex",
  sampleX: 0,
  sampleY: 0,
  strength: 1,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const fmt = (value: number): string => {
  const rounded = Number(value.toFixed(2));
  return Object.is(rounded, -0) ? "0" : rounded.toString();
};

const currentState = (state: Partial<DivergenceCurlState>): DivergenceCurlState => ({
  fieldKind:
    state.fieldKind === "source" ||
    state.fieldKind === "sink" ||
    state.fieldKind === "shear"
      ? state.fieldKind
      : "vortex",
  sampleX: clamp(state.sampleX ?? defaults.sampleX, -1.5, 1.5),
  sampleY: clamp(state.sampleY ?? defaults.sampleY, -1.5, 1.5),
  strength: clamp(state.strength ?? defaults.strength, 0.5, 2),
});

const vectorField = (state: DivergenceCurlState) => {
  const k = state.strength;
  switch (state.fieldKind) {
    case "source":
      return (x: number, y: number): Vector2 => [k * x, k * y];
    case "sink":
      return (x: number, y: number): Vector2 => [-k * x, -k * y];
    case "shear":
      return (_x: number, y: number): Vector2 => [k * y, 0];
    case "vortex":
      return (x: number, y: number): Vector2 => [-k * y, k * x];
  }
};

const fieldLabel = (kind: FieldKind): string => {
  switch (kind) {
    case "source":
      return "Source field F = <kx, ky>";
    case "sink":
      return "Sink field F = <-kx, -ky>";
    case "shear":
      return "Shear field F = <ky, 0>";
    case "vortex":
      return "Vortex field F = <-ky, kx>";
  }
};

const verdict = (divergence: number, curl: number): string => {
  const hasDiv = Math.abs(divergence) > 0.05;
  const hasCurl = Math.abs(curl) > 0.05;
  if (hasDiv && hasCurl) return "local source strength and local spin are both visible";
  if (hasDiv) return divergence > 0 ? "local source: flow expands outward" : "local sink: flow contracts inward";
  if (hasCurl) return curl > 0 ? "counter-clockwise local spin dominates" : "clockwise local spin dominates";
  return "locally incompressible and irrotational at this sample";
};

export const divergenceCurlEvidence = (
  state: DivergenceCurlState,
): KernelResult<DivergenceCurlEvidence> => {
  const point: Point2 = [state.sampleX, state.sampleY];
  const field = vectorField(state);
  const div = divergence2D(field, point);
  if (!div.ok) return div;
  const curl = curl2D(field, point);
  if (!curl.ok) return curl;
  const samples = sampleVectorField2D(field, { x: { min: -2, max: 2 }, y: { min: -2, max: 2 } }, { nx: 5, ny: 5 });
  if (!samples.ok) return samples;
  return ok({
    point,
    divergence: div.value.value,
    curl: curl.value.zComponent,
    vectors: samples.value.map((sample) => ({ point: sample.point, vector: sample.vector })),
    fieldLabel: fieldLabel(state.fieldKind),
    verdict: verdict(div.value.value, curl.value.zComponent),
  });
};

const project = ([x, y]: Point2): { readonly x: number; readonly y: number } => ({
  x: 50 + ((x + 2) / 4) * 260,
  y: 290 - ((y + 2) / 4) * 260,
});

const FieldDiagram = ({ evidence }: { readonly evidence: DivergenceCurlEvidence }) => {
  const selected = project(evidence.point);
  return (
    <svg viewBox="0 0 360 340" role="img" aria-label="Divergence and curl field diagram">
      <rect x="30" y="20" width="300" height="300" fill="#f8fafc" stroke="#94a3b8" />
      <line x1="50" y1="160" x2="310" y2="160" stroke="#cbd5e1" />
      <line x1="180" y1="30" x2="180" y2="290" stroke="#cbd5e1" />
      {evidence.vectors.map((sample) => {
        const p = project(sample.point);
        const scale = 12 / Math.max(1, Math.hypot(sample.vector[0], sample.vector[1]));
        const dx = sample.vector[0] * scale;
        const dy = -sample.vector[1] * scale;
        return (
          <g key={`${sample.point[0]}-${sample.point[1]}`}>
            <line x1={p.x} y1={p.y} x2={p.x + dx} y2={p.y + dy} stroke="#475569" strokeWidth="1.5" />
            <circle cx={p.x + dx} cy={p.y + dy} r="2" fill="#475569" />
          </g>
        );
      })}
      <circle cx={selected.x} cy={selected.y} r="8" fill="#dc2626" />
      <text x="52" y="326" fontSize="12" fill="#334155">
        sample point ({fmt(evidence.point[0])},{fmt(evidence.point[1])})
      </text>
    </svg>
  );
};

const Observation = ({ evidence }: { readonly evidence: DivergenceCurlEvidence }) => (
  <section role="region" aria-label="Observation unlocked" className="sutd-sim-panel">
    <div className="sutd-result-card">
      <h2>Divergence and curl evidence</h2>
      <FieldDiagram evidence={evidence} />
      <dl className="sutd-result-grid" aria-label="Diagnostic readout">
        <div>
          <dt>Field</dt>
          <dd>{evidence.fieldLabel}</dd>
        </div>
        <div>
          <dt>Divergence</dt>
          <dd>{fmt(evidence.divergence)} per unit area</dd>
        </div>
        <div>
          <dt>Curl</dt>
          <dd>{fmt(evidence.curl)} radians per unit area</dd>
        </div>
        <div>
          <dt>Verdict</dt>
          <dd>{evidence.verdict}</dd>
        </div>
      </dl>
    </div>
    <section className="sutd-formula-card" aria-label="Formula panel">
      <h3>Formula</h3>
      <pre aria-label="LaTeX formula source">
        <code>{String.raw`\nabla\cdot\mathbf{F}=\frac{\partial P}{\partial x}+\frac{\partial Q}{\partial y}
\qquad
(\nabla\times\mathbf{F})_z=\frac{\partial Q}{\partial x}-\frac{\partial P}{\partial y}`}</code>
      </pre>
      <dl aria-label="Formula legend">
        <dt>P</dt>
        <dd>x-component of the vector field</dd>
        <dt>Q</dt>
        <dd>y-component of the vector field</dd>
      </dl>
      <p>Substitution: {evidence.fieldLabel}; sample point ({fmt(evidence.point[0])}, {fmt(evidence.point[1])}).</p>
      <p>Units: divergence per unit area; curl as signed spin density.</p>
      <p>Interpretation: {evidence.verdict}.</p>
    </section>
  </section>
);

const ManipulateStage = () => {
  const stage = useStage();
  const { state: rawState, set } = useManipulate<DivergenceCurlState>();
  const state = currentState(rawState);
  const evidence = divergenceCurlEvidence(state);
  return (
    <section aria-label="Local diagnostic controls" className="sutd-sim-panel">
      <ControlGroup legend="Manipulate local diagnostics">
        <Selector
          label="Vector field"
          value={state.fieldKind}
          onChange={(fieldKind) => set("fieldKind", fieldKind)}
          options={[
            { value: "vortex", label: "Vortex field" },
            { value: "source", label: "Source field" },
            { value: "sink", label: "Sink field" },
            { value: "shear", label: "Shear field" },
          ] satisfies readonly { readonly value: FieldKind; readonly label: string }[]}
        />
        <Slider label="Sample x" min={-1.5} max={1.5} step={0.25} value={state.sampleX} onChange={(sampleX) => set("sampleX", sampleX)} />
        <Slider label="Sample y" min={-1.5} max={1.5} step={0.25} value={state.sampleY} onChange={(sampleY) => set("sampleY", sampleY)} />
        <Slider label="Field strength" min={0.5} max={2} step={0.25} value={state.strength} onChange={(strength) => set("strength", strength)} />
      </ControlGroup>
      {evidence.ok ? <FieldDiagram evidence={evidence.value} /> : <p role="alert">{evidence.error.message}</p>}
      <button type="button" onClick={() => stage.advance()}>
        Reveal divergence and curl evidence
      </button>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const state = currentState(useSimState<Partial<DivergenceCurlState>>());
  const evidence = divergenceCurlEvidence(state);
  if (!evidence.ok) return <p role="alert">{evidence.error.message}</p>;
  return (
    <>
      <Observation evidence={evidence.value} />
      <button type="button" onClick={() => stage.advance()}>
        Explain local diagnostics
      </button>
    </>
  );
};

const ExplainStage = () => {
  const stage = useStage();
  return (
    <section aria-label="Transfer prompt" className="sutd-formula-card">
      <h2>Transfer to flow modelling</h2>
      <p>Use divergence to detect local source strength and curl to detect local rotation before choosing a conservation or circulation model.</p>
      <button type="button" onClick={() => stage.reset()}>
        Try another field
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
    <section aria-label="Prediction setup" className="sutd-formula-card">
      <h1>Divergence and Curl</h1>
      <p>Predict whether a local vector field behaves like a source, sink, or spinner before revealing the diagnostics.</p>
      <button type="button" onClick={() => stage.advance()}>
        Set up local diagnostic check
      </button>
    </section>
  );
};

export const DivergenceAndCurl = () => (
  <SimRuntime packageId={divergenceAndCurlPackageId} spec={divergenceAndCurlSpec}>
    <StageSurface />
  </SimRuntime>
);

export default DivergenceAndCurl;
