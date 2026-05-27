import { LineChart } from "@paideia/charting";
import type { TSimulationSpec } from "@paideia/content-schema";
import { integrateFlow, type VectorField } from "@paideia/dynamical-systems";
import { err, type ConceptPackageId, type KernelResult, ok } from "@paideia/shared";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import { ControlGroup, Slider } from "@paideia/ui-sim";

type BiodiversityState = {
  readonly habitatPercent: number;
  readonly conversionPercentPerYear: number;
  readonly restorationPercentPerYear: number;
  readonly sensitivity: number;
};

type BiodiversityEvidence = {
  readonly trajectory: readonly { readonly year: number; readonly habitatPercent: number; readonly biodiversityIndex: number }[];
  readonly finalHabitatPercent: number;
  readonly finalBiodiversityIndex: number;
  readonly biodiversityLossPercent: number;
  readonly tippingRisk: "low" | "moderate" | "high";
};

export const biodiversityLossAndLandUsePackageId =
  "sutd/10-016-science-for-a-sustainable-world/biodiversity-loss-and-land-use" as ConceptPackageId;

export const biodiversityLossAndLandUseSpec: TSimulationSpec = {
  id: "biodiversity-loss-and-land-use",
  title: "Habitat Loss Feedback Lab",
  interaction_type: "systems-flow-diagram",
  kernel_deps: ["core/sim-runtime", "core/prediction-gate", "core/dynamical-systems", "core/charting", "core/ui-sim"],
  manipulate: {
    controls: [
      {
        id: "habitat-percent",
        label: "Starting intact habitat",
        kind: "slider",
        kernel_binding: "state.habitatPercent",
        bounds: { min: 20, max: 100, step: 5 },
      },
      {
        id: "conversion-percent-per-year",
        label: "Land-use conversion",
        kind: "slider",
        kernel_binding: "state.conversionPercentPerYear",
        bounds: { min: 0, max: 6, step: 0.25 },
      },
      {
        id: "restoration-percent-per-year",
        label: "Restoration",
        kind: "slider",
        kernel_binding: "state.restorationPercentPerYear",
        bounds: { min: 0, max: 4, step: 0.25 },
      },
      {
        id: "sensitivity",
        label: "Species sensitivity",
        kind: "slider",
        kernel_binding: "state.sensitivity",
        bounds: { min: 0.6, max: 2.2, step: 0.1 },
      },
    ],
  },
  predict: {
    prompt:
      "A land-use plan converts a small extra fraction of habitat every year. What is the main biodiversity risk?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "Small annual land-use changes can compound into large habitat and species losses",
        "Small land-use changes can only cause small biodiversity changes",
        "Restoration is unnecessary if some habitat remains",
        "Species sensitivity does not change land-use impact",
      ],
      correct_index: 0,
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "biodiversity-readout",
        module: "@paideia/sutd-sims/biodiversity-loss-and-land-use",
        symbol: "BiodiversityLossAndLandUse",
        props_binding:
          "Show coupled habitat and biodiversity trajectories, species-area formula evidence, and tipping-risk readout.",
      },
    ],
  },
  explain: {
    prompt:
      "Explain why repeated small land-use changes can produce nonlinear biodiversity loss through habitat area and species sensitivity.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Small land-use changes have only small effects",
      "Restoration rate can be judged without comparing it to conversion rate",
    ],
  },
};

const defaults: BiodiversityState = {
  habitatPercent: 80,
  conversionPercentPerYear: 2,
  restorationPercentPerYear: 0.5,
  sensitivity: 1.4,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const currentState = (state: Partial<BiodiversityState>): BiodiversityState => ({
  habitatPercent: clamp(state.habitatPercent ?? defaults.habitatPercent, 20, 100),
  conversionPercentPerYear: clamp(
    state.conversionPercentPerYear ?? defaults.conversionPercentPerYear,
    0,
    6,
  ),
  restorationPercentPerYear: clamp(
    state.restorationPercentPerYear ?? defaults.restorationPercentPerYear,
    0,
    4,
  ),
  sensitivity: clamp(state.sensitivity ?? defaults.sensitivity, 0.6, 2.2),
});

const fmt = (value: number, digits = 2): string => {
  const rounded = Number(value.toFixed(digits));
  return Object.is(rounded, -0) ? "0" : rounded.toString();
};

const finiteRange = (
  value: number,
  label: string,
  min: number,
  max: number,
): KernelResult<number> => {
  if (!Number.isFinite(value) || value < min || value > max) {
    return err(
      "out-of-domain",
      `${label} must be finite and in [${min}, ${max}], got ${value}`,
    );
  }
  return ok(value);
};

export const biodiversityEvidence = (
  state: BiodiversityState,
): KernelResult<BiodiversityEvidence> => {
  const habitatPercent = finiteRange(state.habitatPercent, "habitatPercent", 20, 100);
  if (!habitatPercent.ok) return habitatPercent;
  const conversionPercentPerYear = finiteRange(
    state.conversionPercentPerYear,
    "conversionPercentPerYear",
    0,
    6,
  );
  if (!conversionPercentPerYear.ok) return conversionPercentPerYear;
  const restorationPercentPerYear = finiteRange(
    state.restorationPercentPerYear,
    "restorationPercentPerYear",
    0,
    4,
  );
  if (!restorationPercentPerYear.ok) return restorationPercentPerYear;
  const sensitivity = finiteRange(state.sensitivity, "sensitivity", 0.6, 2.2);
  if (!sensitivity.ok) return sensitivity;

  const netConversion = conversionPercentPerYear.value - restorationPercentPerYear.value;
  const field: VectorField = ([habitat]) => {
    const h = habitat ?? habitatPercent.value;
    const pressure = netConversion * (h / 100);
    const recovery = restorationPercentPerYear.value * (1 - h / 100);
    return [-pressure + recovery];
  };
  const trajectory = integrateFlow(field, [habitatPercent.value], {
    dt: 1,
    steps: 20,
    method: "rk4",
    maxNorm: 200,
  });
  if (!trajectory.ok) return trajectory;

  const points = trajectory.value.map((point) => {
    const habitat = clamp(point.state[0] ?? habitatPercent.value, 0, 100);
    const biodiversityIndex = 100 * (habitat / habitatPercent.value) ** sensitivity.value;
    return {
      year: point.t,
      habitatPercent: habitat,
      biodiversityIndex: clamp(biodiversityIndex, 0, 120),
    };
  });
  const final = points[points.length - 1] ?? points[0];
  const finalBiodiversityIndex = final?.biodiversityIndex ?? 100;
  const finalHabitatPercent = final?.habitatPercent ?? habitatPercent.value;
  const biodiversityLossPercent = Math.max(0, 100 - finalBiodiversityIndex);

  return ok({
    trajectory: points,
    finalHabitatPercent,
    finalBiodiversityIndex,
    biodiversityLossPercent,
    tippingRisk:
      finalBiodiversityIndex < 55 || finalHabitatPercent < 45
        ? "high"
        : finalBiodiversityIndex < 75
          ? "moderate"
          : "low",
  });
};

const chartData = (evidence: BiodiversityEvidence) =>
  evidence.trajectory.flatMap((point) => [
    { x: point.year, y: point.habitatPercent, series: "Habitat %" },
    { x: point.year, y: point.biodiversityIndex, series: "Biodiversity index" },
  ]);

const LandUseDiagram = ({ evidence }: { readonly evidence: BiodiversityEvidence }) => {
  const riskColour = evidence.tippingRisk === "high" ? "#b45309" : evidence.tippingRisk === "moderate" ? "#8a6d1d" : "#1b7f5f";
  return (
    <svg viewBox="0 0 620 220" role="img" aria-label="Land-use feedback diagram">
      <rect x="26" y="34" width="568" height="150" rx="14" fill="#f8fafc" stroke="#d8dee9" />
      <rect x="68" y="78" width="130" height="70" rx="10" fill="#e7f5e8" stroke="#2f7d4f" />
      <rect x="246" y="78" width="130" height="70" rx="10" fill="#fff7ed" stroke="#b45309" />
      <rect x="424" y="78" width="130" height="70" rx="10" fill="#eef6ff" stroke={riskColour} />
      <text x="133" y="118" textAnchor="middle" fontSize="15">Habitat</text>
      <text x="311" y="118" textAnchor="middle" fontSize="15">Land use</text>
      <text x="489" y="118" textAnchor="middle" fontSize="15">Species index</text>
      <path d="M198 113h42M376 113h42" stroke="#476582" strokeWidth="5" />
      <text x="56" y="176" fontSize="14" fill="#2f3a48">
        Risk after 20 years: {evidence.tippingRisk}; biodiversity loss {fmt(evidence.biodiversityLossPercent)}%
      </text>
    </svg>
  );
};

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<BiodiversityState>();
  const current = currentState(state);
  return (
    <section aria-label="Biodiversity controls" role="region" className="paideia-sim paideia-sim--biodiversity">
      <h2>Habitat Loss Feedback Lab</h2>
      <p>Change land conversion, restoration, and species sensitivity before revealing the coupled trajectory.</p>
      <ControlGroup legend="Land-use controls">
        <Slider label="Starting intact habitat" min={20} max={100} step={5} value={current.habitatPercent} unit="%" onChange={(value) => set("habitatPercent", value)} />
        <Slider label="Land-use conversion" min={0} max={6} step={0.25} value={current.conversionPercentPerYear} unit="%/year" onChange={(value) => set("conversionPercentPerYear", value)} />
        <Slider label="Restoration" min={0} max={4} step={0.25} value={current.restorationPercentPerYear} unit="%/year" onChange={(value) => set("restorationPercentPerYear", value)} />
        <Slider label="Species sensitivity" min={0.6} max={2.2} step={0.1} value={current.sensitivity} onChange={(value) => set("sensitivity", value)} />
      </ControlGroup>
      <button type="button" onClick={() => stage.advance()}>Reveal biodiversity evidence</button>
    </section>
  );
};

const ObserveStage = () => {
  const state = currentState(useSimState<Partial<BiodiversityState>>());
  const evidence = biodiversityEvidence(state);
  if (!evidence.ok) {
    return <p role="alert">This land-use scenario cannot be evaluated.</p>;
  }
  return (
    <section aria-label="Observation unlocked" role="region" className="observation-panel">
      <h3>Biodiversity evidence</h3>
      <LandUseDiagram evidence={evidence.value} />
      <LineChart ariaLabel="Habitat and biodiversity trajectory" data={chartData(evidence.value)} x={{ label: "Year" }} y={{ label: "Percent or index", domain: { min: 0, max: 110 } }} />
      <dl className="readout-grid">
        <div><dt>Final habitat</dt><dd>{fmt(evidence.value.finalHabitatPercent)}%</dd></div>
        <div><dt>Biodiversity index</dt><dd>{fmt(evidence.value.finalBiodiversityIndex)}</dd></div>
        <div><dt>Biodiversity loss</dt><dd>{fmt(evidence.value.biodiversityLossPercent)}%</dd></div>
        <div><dt>Tipping risk</dt><dd>{evidence.value.tippingRisk}</dd></div>
      </dl>
      <section aria-label="Formula panel" className="formula-panel">
        <h3>Formula panel</h3>
        <p aria-label="LaTeX formula source">{"B = 100\\left(\\frac{H_t}{H_0}\\right)^z;\\quad \\frac{dH}{dt}= -cH + r(100-H)"}</p>
        <p aria-label="Formula legend">H is intact habitat, z is species sensitivity, c is conversion pressure, and r is restoration pressure.</p>
        <p aria-label="Formula substitution">
          B = 100 x ({fmt(evidence.value.finalHabitatPercent)} / {fmt(state.habitatPercent)})^{fmt(state.sensitivity)} = {fmt(evidence.value.finalBiodiversityIndex)}.
        </p>
        <p>
          Interpretation: {evidence.value.tippingRisk === "high"
            ? "repeated land-use change compounds into a high-risk biodiversity loss scenario."
            : "restoration and lower conversion keep this scenario away from the high-risk band."}
        </p>
      </section>
    </section>
  );
};

const StageSurface = () => {
  const stage = useStage();
  if (stage.current === "manipulate") return <ManipulateStage />;
  if (stage.current === "observe") return <ObserveStage />;
  if (stage.current === "explain") {
    return (
      <section aria-label="Transfer prompt" role="region" className="paideia-sim paideia-sim--biodiversity">
        <h2>Explain the land-use decision</h2>
        <p>Use the trajectory to decide whether a proposed restoration rate actually offsets conversion pressure.</p>
        <button type="button" onClick={() => stage.reset()}>Try another scenario</button>
      </section>
    );
  }
  return (
    <section aria-label="Prediction setup" role="region" className="paideia-sim paideia-sim--biodiversity">
      <h2>Predict the biodiversity response</h2>
      <p>Commit a prediction before inspecting the habitat and biodiversity trajectory.</p>
      <button type="button" onClick={() => stage.advance()}>Set up land-use scenario</button>
    </section>
  );
};

const BiodiversityLossAndLandUse = () => (
  <SimRuntime packageId={biodiversityLossAndLandUsePackageId} spec={biodiversityLossAndLandUseSpec}>
    <StageSurface />
  </SimRuntime>
);

export default BiodiversityLossAndLandUse;
