import type { TSimulationSpec } from "@paideia/content-schema";
import {
  cellPopulationSize,
  clonalGrowthAfterGenerations,
  fitnessAdvantage,
  mutationCount,
  relativeFitness,
} from "@paideia/oncogenetics";
import {
  dose,
  doseAtResponse,
  effectiveIC50,
  hillCoefficient,
  hillDoseResponse,
  ic50,
  resistanceFactor,
  responseFraction,
} from "@paideia/treatment-response";
import { err, ok, type ConceptPackageId, type KernelResult } from "@paideia/shared";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";

type CancerState = {
  readonly drivers: number;
  readonly perDriverAdvantage: number;
  readonly generations: number;
  readonly ic50: number;
  readonly hillCoefficient: number;
  readonly resistanceFactor: number;
};

type CancerEvidence = {
  readonly clonalFitness: number;
  readonly clonalSizeAfterG: number;
  readonly baselineSize: number;
  readonly clonalRatio: number;
  readonly effectiveIc50: number;
  readonly doseFor90Susceptible: number;
  readonly doseFor90Resistant: number;
  readonly responseAt2xIC50: number;
  readonly growthCurve: ReadonlyArray<{ readonly generation: number; readonly size: number }>;
  readonly doseCurveSusceptible: ReadonlyArray<{ readonly dose: number; readonly response: number }>;
  readonly doseCurveResistant: ReadonlyArray<{ readonly dose: number; readonly response: number }>;
};

export const cancerSimPackageId =
  "sutd/10-019-science-and-technology-for-healthcare/cancer-genetics-and-therapy" as ConceptPackageId;

export const cancerSpec: TSimulationSpec = {
  id: "cancer-genetics-and-therapy",
  title: "Clonal Growth and Dose-Response Lab",
  interaction_type: "diagram-builder",
  kernel_deps: [
    "core/content-schema",
    "core/shared",
    "core/sim-runtime",
    "core/oncogenetics",
    "core/treatment-response",
    "core/prediction-gate",
  ],
  predict: {
    prompt:
      "A clone has 3 driver mutations with per-driver fitness advantage s = 0.1. After 20 cell generations starting from size 10, what is the clone size relative to a passenger-only clone (drivers = 0) starting from the same size?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "About 304x baseline, so about 3045 cells from a starting size of 10.",
        "About 60; ratio is 3 * 20 because effects add.",
        "About 200; ratio is 20 because only generations matter.",
        "Exactly 1; drivers do not change cell number.",
      ],
      correct_index: 0,
    },
    rationale_required: true,
  },
  manipulate: {
    controls: [
      { id: "drivers", label: "Driver mutations", kind: "slider", kernel_binding: "state.drivers", bounds: { min: 0, max: 8, step: 1 } },
      { id: "per-driver-advantage", label: "Per-driver fitness advantage s", kind: "slider", kernel_binding: "state.perDriverAdvantage", bounds: { min: 0, max: 0.5, step: 0.01 } },
      { id: "generations", label: "Generations", kind: "slider", kernel_binding: "state.generations", bounds: { min: 1, max: 40, step: 1 } },
      { id: "ic50", label: "Therapy IC50", kind: "slider", kernel_binding: "state.ic50", bounds: { min: 1, max: 100, step: 1 } },
      { id: "hill-coefficient", label: "Hill coefficient", kind: "slider", kernel_binding: "state.hillCoefficient", bounds: { min: 1, max: 4, step: 1 } },
      { id: "resistance-factor", label: "Resistance factor", kind: "slider", kernel_binding: "state.resistanceFactor", bounds: { min: 1, max: 10, step: 0.1 } },
    ],
  },
  observe: {
    renderers: [
      {
        id: "cancer-readout",
        module: "@paideia/sutd-sims/cancer-genetics-and-therapy",
        symbol: "CancerGeneticsAndTherapy",
        props_binding:
          "Show the clonal-growth curve over generations, the Hill dose-response curve and the resistance-shifted variant, and the dose required for 90 percent response.",
      },
    ],
  },
  explain: {
    prompt:
      "Explain why a 4x resistance factor pushes the required dose by exactly 4x for a given Hill curve, and how that interacts with the therapeutic index.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "More drivers always means lower survival immediately",
      "Higher dose always works",
    ],
  },
};

const defaults: CancerState = {
  drivers: 3,
  perDriverAdvantage: 0.1,
  generations: 20,
  ic50: 10,
  hillCoefficient: 2,
  resistanceFactor: 1,
};

const STARTING_CELLS = 10;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const snapInt = (value: number): number => Math.round(value);

const currentState = (state: Partial<CancerState>): CancerState => ({
  drivers: snapInt(clamp(state.drivers ?? defaults.drivers, 0, 8)),
  perDriverAdvantage: clamp(state.perDriverAdvantage ?? defaults.perDriverAdvantage, 0, 0.5),
  generations: snapInt(clamp(state.generations ?? defaults.generations, 1, 40)),
  ic50: snapInt(clamp(state.ic50 ?? defaults.ic50, 1, 100)),
  hillCoefficient: snapInt(clamp(state.hillCoefficient ?? defaults.hillCoefficient, 1, 4)),
  resistanceFactor: clamp(state.resistanceFactor ?? defaults.resistanceFactor, 1, 10),
});

export const cancerEvidence = (raw: CancerState): KernelResult<CancerEvidence> => {
  for (const key of [
    "drivers",
    "perDriverAdvantage",
    "generations",
    "ic50",
    "hillCoefficient",
    "resistanceFactor",
  ] as ReadonlyArray<keyof CancerState>) {
    if (!Number.isFinite(raw[key] as number)) {
      return err("precondition-violated", `CancerState.${String(key)} must be finite.`);
    }
  }

  const k = mutationCount(raw.drivers);
  if (!k.ok) return k;
  const s = fitnessAdvantage(raw.perDriverAdvantage);
  if (!s.ok) return s;
  const cellSize = cellPopulationSize(STARTING_CELLS);
  if (!cellSize.ok) return cellSize;
  const noDrivers = mutationCount(0);
  if (!noDrivers.ok) return noDrivers;

  const fitness = relativeFitness(k.value, s.value);
  if (!fitness.ok) return fitness;

  const clonal = clonalGrowthAfterGenerations({
    clone: { drivers: k.value, passengers: noDrivers.value, size: cellSize.value },
    perDriverAdvantage: s.value,
    generations: raw.generations,
  });
  if (!clonal.ok) return clonal;
  const baseline = clonalGrowthAfterGenerations({
    clone: { drivers: noDrivers.value, passengers: noDrivers.value, size: cellSize.value },
    perDriverAdvantage: s.value,
    generations: raw.generations,
  });
  if (!baseline.ok) return baseline;
  const clonalSize = clonal.value;
  const baselineSize = baseline.value;
  const ratio = baselineSize === 0 ? 0 : clonalSize / baselineSize;

  const baseIc50 = ic50(raw.ic50);
  if (!baseIc50.ok) return baseIc50;
  const hill = hillCoefficient(raw.hillCoefficient);
  if (!hill.ok) return hill;
  const resistance = resistanceFactor(raw.resistanceFactor);
  if (!resistance.ok) return resistance;
  const effectiveIc50Result = effectiveIC50({
    baseIC50: baseIc50.value,
    resistanceFactor: resistance.value,
  });
  if (!effectiveIc50Result.ok) return effectiveIc50Result;
  const effIc50 = effectiveIc50Result.value;

  const responseAt2xIC50Input = dose(2 * raw.ic50);
  if (!responseAt2xIC50Input.ok) return responseAt2xIC50Input;
  const responseAt2xIC50Result = hillDoseResponse({
    dose: responseAt2xIC50Input.value,
    ic50: baseIc50.value,
    hillCoefficient: hill.value,
  });
  if (!responseAt2xIC50Result.ok) return responseAt2xIC50Result;

  const target90 = responseFraction(0.9);
  if (!target90.ok) return target90;
  const dose90Sus = doseAtResponse({
    ic50: baseIc50.value,
    hillCoefficient: hill.value,
    targetResponse: target90.value,
  });
  if (!dose90Sus.ok) return dose90Sus;
  const dose90Res = doseAtResponse({
    ic50: effectiveIc50Result.value,
    hillCoefficient: hill.value,
    targetResponse: target90.value,
  });
  if (!dose90Res.ok) return dose90Res;

  // Growth curve.
  const growthCurve: { generation: number; size: number }[] = [];
  for (let g = 0; g <= raw.generations; g += 1) {
    const stepResult = clonalGrowthAfterGenerations({
      clone: { drivers: k.value, passengers: noDrivers.value, size: cellSize.value },
      perDriverAdvantage: s.value,
      generations: g,
    });
    if (!stepResult.ok) continue;
    growthCurve.push({ generation: g, size: stepResult.value });
  }
  // Dose-response curves.
  const samples = 20;
  const maxDose = Math.max(20, raw.ic50 * raw.resistanceFactor * 4);
  const susCurve: { dose: number; response: number }[] = [];
  const resCurve: { dose: number; response: number }[] = [];
  for (let i = 0; i <= samples; i += 1) {
    const d = (i / samples) * maxDose;
    const dBrand = dose(d);
    if (!dBrand.ok) continue;
    const sus = hillDoseResponse({ dose: dBrand.value, ic50: baseIc50.value, hillCoefficient: hill.value });
    if (sus.ok) susCurve.push({ dose: d, response: sus.value });
    const res = hillDoseResponse({ dose: dBrand.value, ic50: effectiveIc50Result.value, hillCoefficient: hill.value });
    if (res.ok) resCurve.push({ dose: d, response: res.value });
  }

  return ok({
    clonalFitness: fitness.value,
    clonalSizeAfterG: clonalSize,
    baselineSize,
    clonalRatio: ratio,
    effectiveIc50: effIc50,
    doseFor90Susceptible: dose90Sus.value,
    doseFor90Resistant: dose90Res.value,
    responseAt2xIC50: responseAt2xIC50Result.value,
    growthCurve,
    doseCurveSusceptible: susCurve,
    doseCurveResistant: resCurve,
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
  const { state, set } = useManipulate<CancerState>();
  const current = currentState(state);
  return (
    <section aria-label="Cancer lab controls" className="sutd-sim-panel">
      <div className="sutd-sim-controls">
        <p className="meta-line">Manipulate</p>
        <h2>Set the clone and the therapy</h2>
        <Slider label="Driver mutations" max={8} min={0} onChange={(v) => set("drivers", v)} step={1} suffix="" value={current.drivers} />
        <Slider label="Per-driver fitness advantage s" max={0.5} min={0} onChange={(v) => set("perDriverAdvantage", v)} step={0.01} suffix="" value={current.perDriverAdvantage} />
        <Slider label="Generations" max={40} min={1} onChange={(v) => set("generations", v)} step={1} suffix="" value={current.generations} />
        <Slider label="Therapy IC50" max={100} min={1} onChange={(v) => set("ic50", v)} step={1} suffix="" value={current.ic50} />
        <Slider label="Hill coefficient" max={4} min={1} onChange={(v) => set("hillCoefficient", v)} step={1} suffix="" value={current.hillCoefficient} />
        <Slider label="Resistance factor" max={10} min={1} onChange={(v) => set("resistanceFactor", v)} step={0.1} suffix="" value={current.resistanceFactor} />
        <button type="button" onClick={() => stage.advance()}>Reveal clonal and dose-response evidence</button>
      </div>
      <section className="sutd-formula-card" aria-label="Before reveal cue">
        <p className="meta-line">Before reveal</p>
        <h3>Educational only</h3>
        <p>This lab teaches the (1+s)^k growth law and the Hill dose-response. It does not diagnose, predict, or recommend treatment.</p>
      </section>
    </section>
  );
};

const GrowthCurvePlot = ({ evidence }: { readonly evidence: CancerEvidence }) => {
  const width = 320;
  const height = 160;
  const padding = 30;
  if (evidence.growthCurve.length === 0) return null;
  const maxSize = evidence.growthCurve[evidence.growthCurve.length - 1]?.size ?? STARTING_CELLS;
  const maxGen = evidence.growthCurve[evidence.growthCurve.length - 1]?.generation ?? 1;
  const xScale = (g: number) => padding + (g / (maxGen || 1)) * (width - 2 * padding);
  const yScale = (size: number) =>
    padding + (1 - Math.log10(1 + size) / Math.log10(1 + Math.max(1, maxSize))) * (height - 2 * padding);
  const polyline = evidence.growthCurve
    .map((point) => `${xScale(point.generation)},${yScale(point.size)}`)
    .join(" ");
  return (
    <svg
      aria-label="Clonal growth over generations"
      className="sutd-diagram"
      role="img"
      style={{ display: "block", maxWidth: "100%", height: "auto" }}
      viewBox={`0 0 ${width} ${height}`}
    >
      <rect width={width} height={height} fill="#ffffff" stroke="#cbd5e1" />
      <line x1={padding} x2={width - padding} y1={yScale(0)} y2={yScale(0)} stroke="#94a3b8" />
      <line x1={padding} x2={padding} y1={yScale(0)} y2={yScale(maxSize)} stroke="#94a3b8" />
      <polyline fill="none" points={polyline} stroke="#dc2626" strokeWidth="3" />
      <text x={padding + 4} y={padding + 12} fill="#0f172a" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="700">Clonal size (log scale)</text>
    </svg>
  );
};

const DoseResponsePlot = ({ evidence }: { readonly evidence: CancerEvidence }) => {
  const width = 320;
  const height = 160;
  const padding = 30;
  if (evidence.doseCurveSusceptible.length === 0) return null;
  const maxDose = evidence.doseCurveResistant[evidence.doseCurveResistant.length - 1]?.dose ??
    evidence.doseCurveSusceptible[evidence.doseCurveSusceptible.length - 1]?.dose ?? 1;
  const xScale = (d: number) => padding + (d / (maxDose || 1)) * (width - 2 * padding);
  const yScale = (r: number) => padding + (1 - r) * (height - 2 * padding);
  const sus = evidence.doseCurveSusceptible.map((p) => `${xScale(p.dose)},${yScale(p.response)}`).join(" ");
  const res = evidence.doseCurveResistant.map((p) => `${xScale(p.dose)},${yScale(p.response)}`).join(" ");
  return (
    <svg
      aria-label="Hill dose-response curves"
      className="sutd-diagram"
      role="img"
      style={{ display: "block", maxWidth: "100%", height: "auto" }}
      viewBox={`0 0 ${width} ${height}`}
    >
      <rect width={width} height={height} fill="#ffffff" stroke="#cbd5e1" />
      <line x1={padding} x2={width - padding} y1={yScale(0)} y2={yScale(0)} stroke="#94a3b8" />
      <line x1={padding} x2={padding} y1={yScale(0)} y2={yScale(1)} stroke="#94a3b8" />
      <polyline fill="none" points={sus} stroke="#2563eb" strokeWidth="3" />
      <polyline fill="none" points={res} stroke="#7c3aed" strokeWidth="3" strokeDasharray="6 4" />
      <text x={padding + 4} y={padding + 12} fill="#2563eb" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="700">Susceptible (solid)</text>
      <text x={padding + 4} y={padding + 28} fill="#7c3aed" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="700">Resistant (dashed)</text>
    </svg>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const state = currentState(useSimState<Partial<CancerState>>());
  const evidence = cancerEvidence(state);
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
        <h2>Clonal growth and dose-response</h2>
        <GrowthCurvePlot evidence={value} />
        <DoseResponsePlot evidence={value} />
        <dl aria-label="Cancer lab readout" className="sutd-result-grid">
          <div><dt>Relative fitness F</dt><dd>(1 + s)^k = {value.clonalFitness.toFixed(3)}</dd></div>
          <div><dt>Clonal size after {state.generations} g</dt><dd>{value.clonalSizeAfterG.toFixed(1)}</dd></div>
          <div><dt>Baseline (zero drivers)</dt><dd>{value.baselineSize.toFixed(1)}</dd></div>
          <div><dt>Clonal / baseline ratio</dt><dd>x{value.clonalRatio.toFixed(1)}</dd></div>
          <div><dt>Effective IC50</dt><dd>{value.effectiveIc50.toFixed(1)} (base {state.ic50} x resistance {state.resistanceFactor.toFixed(2)})</dd></div>
          <div><dt>Response at dose = 2 x base IC50</dt><dd>{(value.responseAt2xIC50 * 100).toFixed(1)}%</dd></div>
          <div><dt>Dose for 90% response (susceptible)</dt><dd>{value.doseFor90Susceptible.toFixed(1)}</dd></div>
          <div><dt>Dose for 90% response (resistant)</dt><dd>{value.doseFor90Resistant.toFixed(1)}</dd></div>
        </dl>
      </div>
      <section aria-label="Formula used" className="sutd-formula-card">
        <p className="meta-line">Formula used</p>
        <h3>Clonal fitness and Hill dose-response</h3>
        <pre aria-label="LaTeX formula source" className="formula-code">
          <code>{String.raw`\color{#dc2626}{F = (1+s)^k},\quad
\color{#dc2626}{N(g) = N\,F^g}

\color{#2563eb}{R(d) = \frac{d^n}{IC50^n + d^n}}

\color{#7c3aed}{IC50_{\text{eff}} = f\,IC50_{\text{base}}}`}</code>
        </pre>
        <dl aria-label="Formula legend" className="formula-legend">
          <div><dt><span className="legend-swatch legend-swatch--red" /> F</dt><dd>relative fitness; multiplies clone size per generation</dd></div>
          <div><dt><span className="legend-swatch legend-swatch--blue" /> R</dt><dd>response fraction from Hill curve</dd></div>
          <div><dt><span className="legend-swatch legend-swatch--purple" /> IC50_eff</dt><dd>effective IC50 after resistance scaling</dd></div>
          <div><dt>n</dt><dd>Hill coefficient = {state.hillCoefficient}</dd></div>
        </dl>
        <p>
          Substitution: drivers = {state.drivers}, s = {state.perDriverAdvantage.toFixed(2)}, generations = {state.generations}. F = {value.clonalFitness.toFixed(3)}; clonal size {value.clonalSizeAfterG.toFixed(1)} vs baseline {value.baselineSize.toFixed(1)}. IC50_eff = {value.effectiveIc50.toFixed(1)}. Dose for 90% response shifts from {value.doseFor90Susceptible.toFixed(1)} to {value.doseFor90Resistant.toFixed(1)} with resistance factor {state.resistanceFactor.toFixed(2)}.
        </p>
        <p className="formula-note">
          Educational only. The dose required for a target response scales linearly with the resistance factor; once that exceeds the toxic dose, the therapeutic window collapses.
        </p>
        <button type="button" onClick={() => stage.advance()}>Explain resistance shift</button>
      </section>
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();
  return (
    <section aria-label="Transfer prompt" className="sutd-formula-card">
      <p className="meta-line">Transfer</p>
      <h2>Resistance shifts the IC50</h2>
      <p>
        Walk through how a 4x resistance factor lifts the effective IC50 by exactly 4x and what that does to the dose required for 90 percent response. Discuss the qualitative role of combination therapy in widening the effective therapeutic window. Educational only.
      </p>
      <button type="button" onClick={() => stage.reset()}>Try another configuration</button>
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
      <h1>Clonal Growth and Dose-Response Lab</h1>
      <p>Predict the relative size of a 3-driver clone after 20 generations compared with a passenger-only clone.</p>
      <button type="button" onClick={() => stage.advance()}>Set up cancer lab</button>
    </section>
  );
};

const CancerGeneticsAndTherapySim = () => (
  <SimRuntime packageId={cancerSimPackageId} spec={cancerSpec}>
    <StageSurface />
  </SimRuntime>
);

export default CancerGeneticsAndTherapySim;
export { CancerGeneticsAndTherapySim as CancerGeneticsAndTherapy };
