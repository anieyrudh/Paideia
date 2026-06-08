import type { TSimulationSpec } from "@paideia/content-schema";
import {
  decayRate,
  effectiveReproductionNumber,
  herdImmunityThreshold,
  immunityLevel,
  reproductionNumber,
  waneImmunity,
} from "@paideia/immunology";
import { err, ok, type ConceptPackageId, type KernelResult } from "@paideia/shared";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";

type ImmunityState = {
  readonly r0: number;
  readonly coverage: number;
  readonly waningRate: number;
  readonly daysSinceVaccination: number;
};

type ImmunityEvidence = {
  readonly r0: number;
  readonly threshold: number;
  readonly initialCoverage: number;
  readonly effectiveCoverage: number;
  readonly effectiveReproductionNumber: number;
  readonly verdict: "contained" | "growing";
  readonly waningCurve: ReadonlyArray<{ readonly days: number; readonly coverage: number }>;
};

export const immunitySimPackageId =
  "sutd/10-019-science-and-technology-for-healthcare/immune-system-and-vaccines" as ConceptPackageId;

export const immunitySpec: TSimulationSpec = {
  id: "immune-system-and-vaccines",
  title: "Herd Immunity Lab",
  interaction_type: "diagram-builder",
  kernel_deps: [
    "core/content-schema",
    "core/shared",
    "core/sim-runtime",
    "core/immunology",
    "core/prediction-gate",
  ],
  predict: {
    prompt:
      "A pathogen has basic reproduction number R0 = 4. Vaccinating 60 percent of the population gives them perfect immunity. Before reveal, what is the effective reproduction number Re and does the outbreak grow or shrink?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "Re = 1.6, outbreak still grows because Re > 1 and the herd-immunity threshold is 75 percent.",
        "Re = 4, vaccination does nothing for the rest of the population.",
        "Re = 0, outbreak halts immediately because some fraction is vaccinated.",
        "Re = 0.4, outbreak shrinks because vaccination always halves R0.",
      ],
      correct_index: 0,
    },
    rationale_required: true,
  },
  manipulate: {
    controls: [
      { id: "r-zero", label: "Basic reproduction number R0", kind: "slider", kernel_binding: "state.r0", bounds: { min: 1.1, max: 18, step: 0.1 } },
      { id: "vaccination-coverage", label: "Vaccination coverage", kind: "slider", kernel_binding: "state.coverage", bounds: { min: 0, max: 1, step: 0.01 } },
      { id: "waning-rate", label: "Waning rate (per day)", kind: "slider", kernel_binding: "state.waningRate", bounds: { min: 0, max: 0.05, step: 0.001 } },
      { id: "days-since-vaccination", label: "Days since vaccination", kind: "slider", kernel_binding: "state.daysSinceVaccination", bounds: { min: 0, max: 400, step: 5 } },
    ],
  },
  observe: {
    renderers: [
      {
        id: "immunity-readout",
        module: "@paideia/sutd-sims/immune-system-and-vaccines",
        symbol: "ImmuneSystemAndVaccines",
        props_binding:
          "Show the herd-immunity threshold, effective coverage after waning, the effective reproduction number Re, and a waning curve over time.",
      },
    ],
  },
  explain: {
    prompt:
      "Explain why crossing the herd-immunity threshold makes the outbreak shrink, and why waning reverses that without revaccination.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Any vaccination coverage stops an outbreak",
      "Herd immunity protects unvaccinated forever",
    ],
  },
};

const defaults: ImmunityState = {
  r0: 4,
  coverage: 0.6,
  waningRate: 0.005,
  daysSinceVaccination: 0,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const currentState = (state: Partial<ImmunityState>): ImmunityState => ({
  r0: clamp(state.r0 ?? defaults.r0, 1.1, 18),
  coverage: clamp(state.coverage ?? defaults.coverage, 0, 1),
  waningRate: clamp(state.waningRate ?? defaults.waningRate, 0, 0.05),
  daysSinceVaccination: clamp(state.daysSinceVaccination ?? defaults.daysSinceVaccination, 0, 400),
});

export const immunityEvidence = (raw: ImmunityState): KernelResult<ImmunityEvidence> => {
  if (
    !Number.isFinite(raw.r0) ||
    !Number.isFinite(raw.coverage) ||
    !Number.isFinite(raw.waningRate) ||
    !Number.isFinite(raw.daysSinceVaccination)
  ) {
    return err("precondition-violated", "ImmunityState must contain finite numeric controls.");
  }
  const r0 = reproductionNumber(raw.r0);
  if (!r0.ok) return r0;
  const safeCoverage = Math.max(1e-6, raw.coverage);
  const initial = immunityLevel(safeCoverage);
  if (!initial.ok) return initial;
  const lambda = decayRate(raw.waningRate);
  if (!lambda.ok) return lambda;
  const waned = waneImmunity({
    immunity: initial.value,
    decayRate: lambda.value,
    days: raw.daysSinceVaccination,
  });
  if (!waned.ok) return waned;
  const effectiveCoverage = waned.value;
  const effectiveLevel = immunityLevel(effectiveCoverage);
  if (!effectiveLevel.ok) return effectiveLevel;
  const re = effectiveReproductionNumber({
    baseR0: r0.value,
    immunityFraction: effectiveLevel.value,
  });
  if (!re.ok) return re;
  let threshold = 0;
  if (raw.r0 > 1) {
    const thresholdResult = herdImmunityThreshold(r0.value);
    if (thresholdResult.ok) {
      threshold = thresholdResult.value;
    }
  }
  // Build the waning curve out to 400 days.
  const curveSamples = 20;
  const curve: { days: number; coverage: number }[] = [];
  for (let i = 0; i <= curveSamples; i += 1) {
    const days = (i / curveSamples) * 400;
    const sample = waneImmunity({
      immunity: initial.value,
      decayRate: lambda.value,
      days,
    });
    if (!sample.ok) continue;
    curve.push({ days, coverage: sample.value });
  }
  return ok({
    r0: raw.r0,
    threshold,
    initialCoverage: raw.coverage,
    effectiveCoverage,
    effectiveReproductionNumber: re.value,
    verdict: re.value < 1 ? "contained" : "growing",
    waningCurve: curve,
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
      {label}: <strong>{step < 1 ? value.toFixed(3) : value} {suffix}</strong>
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
  const { state, set } = useManipulate<ImmunityState>();
  const current = currentState(state);
  return (
    <section aria-label="Herd immunity controls" className="sutd-sim-panel">
      <div className="sutd-sim-controls">
        <p className="meta-line">Manipulate</p>
        <h2>Set the pathogen and coverage</h2>
        <Slider label="Basic reproduction number R0" max={18} min={1.1} onChange={(v) => set("r0", v)} step={0.1} suffix="" value={current.r0} />
        <Slider label="Vaccination coverage" max={1} min={0} onChange={(v) => set("coverage", v)} step={0.01} suffix="" value={current.coverage} />
        <Slider label="Waning rate" max={0.05} min={0} onChange={(v) => set("waningRate", v)} step={0.001} suffix="per day" value={current.waningRate} />
        <Slider label="Days since vaccination" max={400} min={0} onChange={(v) => set("daysSinceVaccination", v)} step={5} suffix="days" value={current.daysSinceVaccination} />
        <button type="button" onClick={() => stage.advance()}>Reveal effective reproduction number</button>
      </div>
      <section className="sutd-formula-card" aria-label="Before reveal cue">
        <p className="meta-line">Before reveal</p>
        <h3>Re = R0 (1 - p) is the verdict</h3>
        <p>Prediction checkpoint. Then watch the threshold line move with R0 and the waning curve drag the effective coverage down.</p>
      </section>
    </section>
  );
};

const CoverageBar = ({ evidence }: { readonly evidence: ImmunityEvidence }) => {
  const width = 360;
  const height = 60;
  const thresholdX = 20 + evidence.threshold * (width - 40);
  const coverageX = 20 + Math.max(0, Math.min(1, evidence.effectiveCoverage)) * (width - 40);
  return (
    <svg
      aria-label="Coverage vs threshold bar"
      className="sutd-diagram"
      role="img"
      style={{ display: "block", maxWidth: "100%", height: "auto" }}
      viewBox={`0 0 ${width} ${height}`}
    >
      <rect width={width} height={height} fill="#f8fafc" />
      <rect x="20" y="20" width={width - 40} height="20" fill="#e2e8f0" />
      <rect x="20" y="20" width={Math.max(0, coverageX - 20)} height="20" fill={evidence.verdict === "contained" ? "#2563eb" : "#dc2626"} />
      <line x1={thresholdX} x2={thresholdX} y1="12" y2="48" stroke="#0f172a" strokeWidth="2" strokeDasharray="4 4" />
      <text x="20" y="14" fill="#0f172a" fontFamily="Arial, sans-serif" fontSize="11">effective coverage {(evidence.effectiveCoverage * 100).toFixed(1)}%</text>
      <text x={thresholdX + 4} y="14" fill="#0f172a" fontFamily="Arial, sans-serif" fontSize="11">p* = {(evidence.threshold * 100).toFixed(1)}%</text>
    </svg>
  );
};

const WaningCurve = ({ evidence, threshold }: { readonly evidence: ImmunityEvidence; readonly threshold: number }) => {
  const width = 360;
  const height = 140;
  const padding = 30;
  const xScale = (days: number) => padding + (days / 400) * (width - 2 * padding);
  const yScale = (coverage: number) => padding + (1 - coverage) * (height - 2 * padding);
  const polyline = evidence.waningCurve
    .map((point) => `${xScale(point.days)},${yScale(point.coverage)}`)
    .join(" ");
  return (
    <svg
      aria-label="Waning curve"
      className="sutd-diagram"
      role="img"
      style={{ display: "block", maxWidth: "100%", height: "auto" }}
      viewBox={`0 0 ${width} ${height}`}
    >
      <rect width={width} height={height} fill="#ffffff" stroke="#cbd5e1" />
      <line x1={padding} x2={width - padding} y1={yScale(0)} y2={yScale(0)} stroke="#94a3b8" />
      <line x1={padding} x2={padding} y1={yScale(0)} y2={yScale(1)} stroke="#94a3b8" />
      <line x1={padding} x2={width - padding} y1={yScale(threshold)} y2={yScale(threshold)} stroke="#dc2626" strokeDasharray="4 4" />
      <text x={padding + 4} y={yScale(threshold) - 4} fill="#dc2626" fontFamily="Arial, sans-serif" fontSize="10">p* = {(threshold * 100).toFixed(1)}%</text>
      <polyline fill="none" points={polyline} stroke="#2563eb" strokeWidth="3" />
    </svg>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const state = currentState(useSimState<Partial<ImmunityState>>());
  const evidence = immunityEvidence(state);
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
        <h2>Re and the herd-immunity threshold</h2>
        <CoverageBar evidence={value} />
        <WaningCurve evidence={value} threshold={value.threshold} />
        <dl aria-label="Herd immunity readout" className="sutd-result-grid">
          <div><dt>R0</dt><dd>{value.r0.toFixed(2)}</dd></div>
          <div><dt>p* (threshold)</dt><dd>{(value.threshold * 100).toFixed(1)}%</dd></div>
          <div><dt>Initial coverage</dt><dd>{(value.initialCoverage * 100).toFixed(1)}%</dd></div>
          <div><dt>Effective coverage</dt><dd>{(value.effectiveCoverage * 100).toFixed(1)}% after {state.daysSinceVaccination} days</dd></div>
          <div><dt>Effective Re</dt><dd>{value.effectiveReproductionNumber.toFixed(2)}</dd></div>
          <div><dt>Verdict</dt><dd>{value.verdict === "contained" ? "Outbreak contained (Re < 1)" : "Outbreak growing (Re > 1)"}</dd></div>
        </dl>
      </div>
      <section aria-label="Formula used" className="sutd-formula-card">
        <p className="meta-line">Formula used</p>
        <h3>Effective reproduction number and herd-immunity threshold</h3>
        <pre aria-label="LaTeX formula source" className="formula-code">
          <code>{String.raw`\color{#2563eb}{R_e = R_0\,(1 - p)}

\color{#d97706}{p^* = 1 - 1/R_0}

\color{#7c3aed}{p(t) = p_0\,e^{-\lambda t}}`}</code>
        </pre>
        <dl aria-label="Formula legend" className="formula-legend">
          <div><dt><span className="legend-swatch legend-swatch--blue" /> Re</dt><dd>effective reproduction number (dimensionless)</dd></div>
          <div><dt><span className="legend-swatch legend-swatch--orange" /> p*</dt><dd>herd-immunity threshold (fraction)</dd></div>
          <div><dt><span className="legend-swatch legend-swatch--purple" /> p(t)</dt><dd>effective coverage after waning at rate lambda</dd></div>
        </dl>
        <p>
          Substitution: R0 = {value.r0.toFixed(2)}, p0 = {(value.initialCoverage * 100).toFixed(1)}%, lambda = {state.waningRate.toFixed(3)} per day, t = {state.daysSinceVaccination} days. p(t) = {(value.effectiveCoverage * 100).toFixed(1)}%; p* = {(value.threshold * 100).toFixed(1)}%; Re = {value.effectiveReproductionNumber.toFixed(2)}.
        </p>
        <p className="formula-note">
          Re below 1 means the outbreak shrinks. Re above 1 means it grows, even with substantial vaccination, until coverage crosses the threshold.
        </p>
        <button type="button" onClick={() => stage.advance()}>Explain booster timing</button>
      </section>
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();
  return (
    <section aria-label="Transfer prompt" className="sutd-formula-card">
      <p className="meta-line">Transfer</p>
      <h2>Waning immunity and booster cadence</h2>
      <p>
        With R0 = 5 and 90 percent vaccination at day 0, walk through how Re evolves over 200 days under a 0.005 per day waning rate and propose a booster cadence to stay above the threshold.
      </p>
      <button type="button" onClick={() => stage.reset()}>Try another scenario</button>
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
      <p className="meta-line">Prediction checkpoint</p>
      <h1>Herd Immunity Lab</h1>
      <p>Predict whether vaccinating 60 percent stops an R0 = 4 outbreak before adjusting the coverage and waning.</p>
      <button type="button" onClick={() => stage.advance()}>Set up herd immunity</button>
    </section>
  );
};

const ImmuneSystemAndVaccinesSim = () => (
  <SimRuntime packageId={immunitySimPackageId} spec={immunitySpec}>
    <StageSurface />
  </SimRuntime>
);

export default ImmuneSystemAndVaccinesSim;
export { ImmuneSystemAndVaccinesSim as ImmuneSystemAndVaccines };
