import type { TSimulationSpec } from "@paideia/content-schema";
import {
  edgeWeight,
  nodeId,
  propagate,
  signalLevel,
  type CascadeGraph,
  type NodeId,
  type SignalLevel,
} from "@paideia/signal-pathway";
import { err, ok, type ConceptPackageId, type KernelResult } from "@paideia/shared";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";

type CascadeState = {
  readonly ligandLevel: number;
  readonly phosphataseLevel: number;
  readonly receptorThreshold: number;
  readonly sensitivity: number;
};

type CascadeEvidence = {
  readonly ligand: number;
  readonly receptor: number;
  readonly kinase: number;
  readonly transcriptionFactor: number;
  readonly phosphatase: number;
  readonly verdict: "on" | "off" | "threshold-band";
  readonly responseCurve: ReadonlyArray<{ readonly ligand: number; readonly tf: number }>;
};

export const cellSignallingPackageId =
  "sutd/10-019-science-and-technology-for-healthcare/cell-signalling-pathways" as ConceptPackageId;

export const cellSignallingSpec: TSimulationSpec = {
  id: "cell-signalling-pathways",
  title: "Cascade Propagation Lab",
  interaction_type: "diagram-builder",
  kernel_deps: [
    "core/sim-runtime",
    "core/signal-pathway",
    "core/dynamical-systems",
    "core/prediction-gate",
    "core/ui-sim",
  ],
  predict: {
    prompt:
      "A simple cascade goes ligand -> receptor -> kinase -> transcription factor with every edge an activator at unit weight. As the ligand signal rises smoothly from 0 to 1, what is the shape of the transcription-factor response?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "A sigmoidal saturating curve, steepest near the receptor's threshold and flat above it.",
        "A perfectly linear curve from 0 to 1.",
        "An exponential blow-up to infinity.",
        "A step function exactly at ligand = 0.5 regardless of threshold.",
      ],
      correct_index: 0,
    },
    rationale_required: true,
  },
  manipulate: {
    controls: [
      { id: "ligand-level", label: "Ligand input", kind: "slider", kernel_binding: "state.ligandLevel", bounds: { min: 0, max: 1, step: 0.05 } },
      { id: "phosphatase-level", label: "Phosphatase inhibitor", kind: "slider", kernel_binding: "state.phosphataseLevel", bounds: { min: 0, max: 1, step: 0.05 } },
      { id: "receptor-threshold", label: "Receptor threshold", kind: "slider", kernel_binding: "state.receptorThreshold", bounds: { min: 0, max: 1, step: 0.05 } },
      { id: "sensitivity", label: "Per-node sensitivity", kind: "slider", kernel_binding: "state.sensitivity", bounds: { min: 1, max: 16, step: 1 } },
    ],
  },
  observe: {
    renderers: [
      {
        id: "cascade-readout",
        module: "@paideia/sutd-sims/cell-signalling-pathways",
        symbol: "CellSignallingPathways",
        props_binding:
          "Show the cascade graph with per-node activation levels, edge colouring (activator vs inhibitor), and the transcription-factor response curve as ligand is swept.",
      },
    ],
  },
  explain: {
    prompt:
      "Explain why raising the phosphatase signal can switch off the transcription factor even when the ligand is at full strength.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Cascade responses are linear",
      "Inhibitors only reduce by addition",
    ],
  },
};

const defaults: CascadeState = {
  ligandLevel: 1,
  phosphataseLevel: 0,
  receptorThreshold: 0.1,
  sensitivity: 8,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const snapInt = (value: number): number => Math.round(value);

const currentState = (state: Partial<CascadeState>): CascadeState => ({
  ligandLevel: clamp(state.ligandLevel ?? defaults.ligandLevel, 0, 1),
  phosphataseLevel: clamp(state.phosphataseLevel ?? defaults.phosphataseLevel, 0, 1),
  receptorThreshold: clamp(state.receptorThreshold ?? defaults.receptorThreshold, 0, 1),
  sensitivity: snapInt(clamp(state.sensitivity ?? defaults.sensitivity, 1, 16)),
});

const unitInterval = (value: number) => signalLevel(clamp(value, 0, 1));

const buildGraph = (
  receptorThreshold: number,
  sensitivity: number,
): KernelResult<CascadeGraph> => {
  const ligandId = nodeId("ligand");
  const receptorId = nodeId("receptor");
  const kinaseId = nodeId("kinase");
  const tfId = nodeId("tf");
  const phosphataseId = nodeId("phosphatase");
  if (!ligandId.ok) return ligandId;
  if (!receptorId.ok) return receptorId;
  if (!kinaseId.ok) return kinaseId;
  if (!tfId.ok) return tfId;
  if (!phosphataseId.ok) return phosphataseId;

  const zeroLevel = unitInterval(0);
  const receptorThresholdLevel = unitInterval(receptorThreshold);
  const halfLevel = unitInterval(0.5);
  if (!zeroLevel.ok) return zeroLevel;
  if (!receptorThresholdLevel.ok) return receptorThresholdLevel;
  if (!halfLevel.ok) return halfLevel;

  const unitWeight = edgeWeight(1);
  if (!unitWeight.ok) return unitWeight;

  return ok({
    nodes: [
      { id: ligandId.value, basal: zeroLevel.value, threshold: zeroLevel.value, sensitivity },
      { id: receptorId.value, basal: zeroLevel.value, threshold: receptorThresholdLevel.value, sensitivity },
      { id: kinaseId.value, basal: zeroLevel.value, threshold: halfLevel.value, sensitivity },
      { id: tfId.value, basal: zeroLevel.value, threshold: halfLevel.value, sensitivity },
      { id: phosphataseId.value, basal: zeroLevel.value, threshold: zeroLevel.value, sensitivity },
    ],
    edges: [
      { from: ligandId.value, to: receptorId.value, effect: "activate", weight: unitWeight.value },
      { from: receptorId.value, to: kinaseId.value, effect: "activate", weight: unitWeight.value },
      { from: phosphataseId.value, to: kinaseId.value, effect: "inhibit", weight: unitWeight.value },
      { from: kinaseId.value, to: tfId.value, effect: "activate", weight: unitWeight.value },
    ],
  });
};

const propagateOnce = (
  state: CascadeState,
): KernelResult<{ readonly outputs: ReadonlyMap<NodeId, SignalLevel> }> => {
  const graph = buildGraph(state.receptorThreshold, state.sensitivity);
  if (!graph.ok) return graph;
  const ligand = unitInterval(state.ligandLevel);
  if (!ligand.ok) return ligand;
  const phosphatase = unitInterval(state.phosphataseLevel);
  if (!phosphatase.ok) return phosphatase;
  const ligandId = nodeId("ligand");
  const phosphataseId = nodeId("phosphatase");
  if (!ligandId.ok) return ligandId;
  if (!phosphataseId.ok) return phosphataseId;
  const inputs = new Map<NodeId, SignalLevel>([
    [ligandId.value, ligand.value],
    [phosphataseId.value, phosphatase.value],
  ]);
  const result = propagate(graph.value, inputs);
  if (!result.ok) return result;
  return ok({ outputs: result.value.outputs });
};

const classifyVerdict = (tf: number): "on" | "off" | "threshold-band" => {
  if (tf >= 0.9) return "on";
  if (tf <= 0.1) return "off";
  return "threshold-band";
};

export const cascadeEvidence = (
  raw: CascadeState,
): KernelResult<CascadeEvidence> => {
  if (
    !Number.isFinite(raw.ligandLevel) ||
    !Number.isFinite(raw.phosphataseLevel) ||
    !Number.isFinite(raw.receptorThreshold) ||
    !Number.isFinite(raw.sensitivity)
  ) {
    return err("precondition-violated", "CascadeState must contain finite controls.");
  }
  const result = propagateOnce(raw);
  if (!result.ok) return result;
  const outputs = result.value.outputs;
  const get = (id: string) => {
    const branded = nodeId(id);
    if (!branded.ok) return 0;
    const v = outputs.get(branded.value);
    return v === undefined ? 0 : (v as unknown as number);
  };
  const tf = get("tf");
  // Build a response curve: sweep ligand from 0 to 1, fix the other controls.
  const samples = 16;
  const responseCurve: { ligand: number; tf: number }[] = [];
  for (let i = 0; i <= samples; i += 1) {
    const sweep = i / samples;
    const swept = propagateOnce({ ...raw, ligandLevel: sweep });
    if (!swept.ok) {
      responseCurve.push({ ligand: sweep, tf: 0 });
      continue;
    }
    const sweptTfId = nodeId("tf");
    if (!sweptTfId.ok) {
      responseCurve.push({ ligand: sweep, tf: 0 });
      continue;
    }
    const sweptTf = swept.value.outputs.get(sweptTfId.value);
    responseCurve.push({ ligand: sweep, tf: sweptTf === undefined ? 0 : (sweptTf as unknown as number) });
  }
  return ok({
    ligand: get("ligand"),
    receptor: get("receptor"),
    kinase: get("kinase"),
    transcriptionFactor: tf,
    phosphatase: get("phosphatase"),
    verdict: classifyVerdict(tf),
    responseCurve,
  });
};

const Slider = ({
  label,
  max,
  min,
  onChange,
  step,
  suffix,
  value,
}: {
  readonly label: string;
  readonly max: number;
  readonly min: number;
  readonly onChange: (value: number) => void;
  readonly step: number;
  readonly suffix: string;
  readonly value: number;
}) => (
  <label className="sutd-control">
    <span>
      {label}: <strong>{step < 1 ? value.toFixed(2) : value} {suffix}</strong>
    </span>
    <input
      aria-label={label}
      max={max}
      min={min}
      onChange={(event) => onChange(Number(event.currentTarget.value))}
      step={step}
      type="range"
      value={value}
    />
  </label>
);

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<CascadeState>();
  const current = currentState(state);
  return (
    <section aria-label="Cascade controls" className="sutd-sim-panel">
      <div className="sutd-sim-controls">
        <p className="meta-line">Manipulate</p>
        <h2>Set the cascade</h2>
        <Slider label="Ligand input" max={1} min={0} onChange={(v) => set("ligandLevel", v)} step={0.05} suffix="" value={current.ligandLevel} />
        <Slider label="Phosphatase inhibitor" max={1} min={0} onChange={(v) => set("phosphataseLevel", v)} step={0.05} suffix="" value={current.phosphataseLevel} />
        <Slider label="Receptor threshold" max={1} min={0} onChange={(v) => set("receptorThreshold", v)} step={0.05} suffix="" value={current.receptorThreshold} />
        <Slider label="Per-node sensitivity" max={16} min={1} onChange={(v) => set("sensitivity", v)} step={1} suffix="" value={current.sensitivity} />
        <button type="button" onClick={() => stage.advance()}>Reveal cascade output</button>
      </div>
      <section className="sutd-formula-card" aria-label="Before reveal cue">
        <p className="meta-line">Before reveal</p>
        <h3>Saturating responses keep the chain bounded</h3>
        <p>Predict first. Then sweep the ligand to see the sigmoidal transcription-factor response and raise the phosphatase to see the switch-off.</p>
      </section>
    </section>
  );
};

const CascadeDiagram = ({
  evidence,
}: {
  readonly evidence: CascadeEvidence;
}) => {
  const fill = (level: number) => {
    const intensity = Math.round(level * 255);
    return `rgb(${37}, ${99}, ${intensity})`;
  };
  return (
    <svg
      aria-label="Cascade graph"
      className="sutd-diagram"
      role="img"
      style={{ display: "block", maxWidth: "100%", height: "auto" }}
      viewBox="0 0 360 220"
    >
      <rect width="360" height="220" fill="#f8fafc" />
      <g stroke="#2563eb" strokeWidth={3} fill="none">
        <line x1="56" x2="116" y1="140" y2="140" />
        <line x1="156" x2="216" y1="140" y2="140" />
        <line x1="256" x2="316" y1="140" y2="140" />
      </g>
      <line x1="236" x2="236" y1="84" y2="116" stroke="#dc2626" strokeWidth={3} strokeDasharray="6 6" />
      <g fontFamily="Arial, sans-serif" fontSize="11" fontWeight={700} textAnchor="middle">
        <circle cx="36" cy="140" r="20" fill={fill(evidence.ligand)} />
        <text x="36" y="144" fill="#fff">Lig</text>
        <text x="36" y="180" fill="#0f172a">{evidence.ligand.toFixed(2)}</text>
        <circle cx="136" cy="140" r="20" fill={fill(evidence.receptor)} />
        <text x="136" y="144" fill="#fff">Rec</text>
        <text x="136" y="180" fill="#0f172a">{evidence.receptor.toFixed(2)}</text>
        <circle cx="236" cy="140" r="20" fill={fill(evidence.kinase)} />
        <text x="236" y="144" fill="#fff">Kin</text>
        <text x="236" y="180" fill="#0f172a">{evidence.kinase.toFixed(2)}</text>
        <circle cx="336" cy="140" r="20" fill={fill(evidence.transcriptionFactor)} />
        <text x="336" y="144" fill="#fff">TF</text>
        <text x="336" y="180" fill="#0f172a">{evidence.transcriptionFactor.toFixed(2)}</text>
        <circle cx="236" cy="64" r="16" fill={fill(evidence.phosphatase)} />
        <text x="236" y="68" fill="#fff">Pho</text>
        <text x="236" y="36" fill="#0f172a">{evidence.phosphatase.toFixed(2)}</text>
      </g>
    </svg>
  );
};

const ResponsePlot = ({
  evidence,
}: {
  readonly evidence: CascadeEvidence;
}) => {
  const width = 240;
  const height = 140;
  const padding = 28;
  const xScale = (x: number) => padding + x * (width - 2 * padding);
  const yScale = (y: number) => padding + (1 - y) * (height - 2 * padding);
  const polyline = evidence.responseCurve
    .map((point) => `${xScale(point.ligand)},${yScale(point.tf)}`)
    .join(" ");
  return (
    <svg
      aria-label="TF response curve"
      className="sutd-diagram"
      role="img"
      style={{ display: "block", maxWidth: "100%", height: "auto" }}
      viewBox={`0 0 ${width} ${height}`}
    >
      <rect width={width} height={height} fill="#ffffff" stroke="#cbd5e1" />
      <line x1={padding} x2={width - padding} y1={yScale(0)} y2={yScale(0)} stroke="#94a3b8" />
      <line x1={padding} x2={padding} y1={yScale(0)} y2={yScale(1)} stroke="#94a3b8" />
      <polyline fill="none" points={polyline} stroke="#2563eb" strokeWidth={3} />
      <circle cx={xScale(evidence.ligand)} cy={yScale(evidence.transcriptionFactor)} fill="#dc2626" r={5} />
      <text x={padding + 4} y={padding + 12} fill="#475569" fontFamily="Arial, sans-serif" fontSize="11">TF response vs ligand</text>
    </svg>
  );
};

const verdictLabel = (kind: CascadeEvidence["verdict"]): string => {
  switch (kind) {
    case "on":
      return "Transcription factor on";
    case "off":
      return "Transcription factor off";
    case "threshold-band":
      return "Threshold band (steep transition)";
  }
};

const ObserveStage = () => {
  const state = currentState(useSimState<Partial<CascadeState>>());
  const evidence = cascadeEvidence(state);
  if (!evidence.ok) {
    return (
      <section className="sutd-formula-card" role="region" aria-label="Observation unlocked">
        <p role="alert">{evidence.error.message}</p>
      </section>
    );
  }
  const value = evidence.value;
  return (
    <section aria-label="Observation unlocked" className="sutd-sim-panel" role="region">
      <div className="sutd-result-card">
        <p className="meta-line">Observe</p>
        <h2>Cascade output</h2>
        <CascadeDiagram evidence={value} />
        <ResponsePlot evidence={value} />
        <dl aria-label="Cascade readout" className="sutd-result-grid">
          <div><dt>ligand</dt><dd>{value.ligand.toFixed(2)}</dd></div>
          <div><dt>receptor</dt><dd>{value.receptor.toFixed(2)}</dd></div>
          <div><dt>kinase</dt><dd>{value.kinase.toFixed(2)}</dd></div>
          <div><dt>transcription factor</dt><dd>{value.transcriptionFactor.toFixed(2)}</dd></div>
          <div><dt>phosphatase (inhibitor)</dt><dd>{value.phosphatase.toFixed(2)}</dd></div>
          <div><dt>Verdict</dt><dd>{verdictLabel(value.verdict)}</dd></div>
        </dl>
      </div>
      <section aria-label="Formula used" className="sutd-formula-card">
        <p className="meta-line">Formula used</p>
        <h3>Saturating cascade response</h3>
        <pre aria-label="LaTeX formula source" className="formula-code">
          <code>{String.raw`\color{#2563eb}{\text{input}_i}
= \sum_{j \to i\,\text{activate}} w_{ji} x_j
- \sum_{j \to i\,\text{inhibit}} w_{ji} x_j

\color{#d97706}{y_i = \sigma(k_i (\text{input}_i - \theta_i))}`}</code>
        </pre>
        <dl aria-label="Formula legend" className="formula-legend">
          <div><dt><span className="legend-swatch legend-swatch--blue" /> input</dt><dd>activator minus inhibitor weighted sum from upstream nodes</dd></div>
          <div><dt><span className="legend-swatch legend-swatch--orange" /> y = sigma</dt><dd>logistic response with per-node threshold and sensitivity</dd></div>
          <div><dt>k</dt><dd>per-node sensitivity = {state.sensitivity}</dd></div>
          <div><dt>theta</dt><dd>per-node threshold (receptor at {state.receptorThreshold.toFixed(2)}, kinase + TF at 0.50)</dd></div>
        </dl>
        <p>
          Substitution: ligand = {state.ligandLevel.toFixed(2)}, phosphatase = {state.phosphataseLevel.toFixed(2)} give receptor = {value.receptor.toFixed(2)}, kinase = {value.kinase.toFixed(2)} (effective input = receptor - phosphatase = {(value.receptor - value.phosphatase).toFixed(2)}), tf = {value.transcriptionFactor.toFixed(2)}.
        </p>
        <p className="formula-note">
          The TF response curve to ligand is sigmoidal; the operating point is marked with the red dot. Raising the phosphatase shifts the kinase's effective input down and can flip the TF off.
        </p>
      </section>
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();
  return (
    <section aria-label="Transfer prompt" className="sutd-formula-card">
      <p className="meta-line">Transfer</p>
      <h2>Inhibitor knockdown</h2>
      <p>
        With the ligand at full strength, sweep the phosphatase from 0 to 1 and explain why the cascade switches the transcription factor off rather than dimming it proportionally.
      </p>
      <button type="button" onClick={() => stage.reset()}>Try another cascade</button>
    </section>
  );
};

const StageSurface = () => {
  const stage = useStage();
  if (stage.current === "manipulate") return <ManipulateStage />;
  if (stage.current === "observe") return <ObserveStage />;
  if (stage.current === "explain") return <ExplainStage />;
  return (
    <section className="sutd-formula-card" aria-label="Prediction setup">
      <p className="meta-line">Predict first</p>
      <h1>Cascade Propagation Lab</h1>
      <p>Predict the shape of the transcription-factor response as the ligand sweeps from 0 to 1 before launching the cascade.</p>
      <button type="button" onClick={() => stage.advance()}>Set up signalling cascade</button>
    </section>
  );
};

const CellSignallingPathwaysSim = () => (
  <SimRuntime packageId={cellSignallingPackageId} spec={cellSignallingSpec}>
    <StageSurface />
  </SimRuntime>
);

export default CellSignallingPathwaysSim;
export { CellSignallingPathwaysSim as CellSignallingPathways };
