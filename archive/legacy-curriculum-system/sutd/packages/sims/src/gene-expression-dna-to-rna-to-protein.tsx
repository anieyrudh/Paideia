import type { TSimulationSpec } from "@paideia/content-schema";
import {
  applyRegulator,
  expressionDerivatives,
  hillCoefficient,
  molarConcentration,
  rateConstant,
  stepGeneExpression,
  transcriptionRate,
  type ExpressionParams,
  type ExpressionState as KineticExpressionState,
  type MolarConcentration,
  type RateConstant,
  type RegulationFactor,
} from "@paideia/gene-regulatory-network";
import {
  dna,
  transcribe,
  translate,
  type DnaSequence,
  type ProteinSequence,
  type RnaSequence,
} from "@paideia/sequence";
import { err, ok, type ConceptPackageId, type KernelResult } from "@paideia/shared";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";

type DnaPresetId = "methionine-start" | "mutation-elf-to-ely";

type ExpressionState = {
  readonly dnaPresetId: DnaPresetId;
  readonly inducerConcentration: number;
  readonly hillCoefficient: number;
  readonly hillThreshold: number;
};

type ExpressionInput = {
  readonly dnaPresetId: unknown;
  readonly inducerConcentration: unknown;
  readonly hillCoefficient: unknown;
  readonly hillThreshold: unknown;
};

type ExpressionEvidence = {
  readonly dnaSequence: DnaSequence;
  readonly rnaSequence: RnaSequence;
  readonly proteinSequence: ProteinSequence;
  readonly regulationFraction: RegulationFactor;
  readonly transcriptionRatePerSecond: RateConstant;
  readonly steadyStateMrna: MolarConcentration;
  readonly steadyStateProtein: MolarConcentration;
};

export const geneExpressionPackageId =
  "sutd/10-019-science-and-technology-for-healthcare/gene-expression-dna-to-rna-to-protein" as ConceptPackageId;

const PRESET_DNA: Readonly<Record<DnaPresetId, string>> = Object.freeze({
  "methionine-start": "ATGGAACTGTTCTAA",
  "mutation-elf-to-ely": "ATGGAACTGTTCTAT",
});

// Kinetic parameters for the canonical inducible-promoter example.
const ALPHA_0 = 0.01; // per second, basal transcription
const ALPHA_MAX = 1; // per second, maximum transcription
const K_TR = 2; // per second per mRNA, translation rate
const K_M = 0.1; // per second, mRNA decay
const K_P = 0.05; // per second, protein decay

const expressionParams = (): KernelResult<ExpressionParams> => {
  const basalTranscriptionRate = rateConstant(ALPHA_0);
  if (!basalTranscriptionRate.ok) return basalTranscriptionRate;
  const maxTranscriptionRate = rateConstant(ALPHA_MAX);
  if (!maxTranscriptionRate.ok) return maxTranscriptionRate;
  const translationRatePerMrna = rateConstant(K_TR);
  if (!translationRatePerMrna.ok) return translationRatePerMrna;
  const mRnaDegradationRate = rateConstant(K_M);
  if (!mRnaDegradationRate.ok) return mRnaDegradationRate;
  const proteinDegradationRate = rateConstant(K_P);
  if (!proteinDegradationRate.ok) return proteinDegradationRate;
  return ok({
    basalTranscriptionRate: basalTranscriptionRate.value,
    maxTranscriptionRate: maxTranscriptionRate.value,
    translationRatePerMrna: translationRatePerMrna.value,
    mRnaDegradationRate: mRnaDegradationRate.value,
    proteinDegradationRate: proteinDegradationRate.value,
  });
};

export const geneExpressionSpec: TSimulationSpec = {
  id: "gene-expression-dna-to-rna-to-protein",
  title: "Central Dogma Lab",
  interaction_type: "diagram-builder",
  kernel_deps: [
    "core/content-schema",
    "core/shared",
    "core/sim-runtime",
    "core/gene-regulatory-network",
    "core/sequence",
    "core/prediction-gate",
  ],
  predict: {
    prompt:
      "A gene's promoter is activated by an inducer. As inducer concentration rises from zero to far above the half-max, what happens to the steady-state mRNA and protein levels at fixed translation and degradation rates?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "Both rise toward a saturating plateau set by the maximum transcription rate and the per-molecule decay constants.",
        "Both rise linearly without limit.",
        "mRNA rises but protein stays at baseline.",
        "Protein rises immediately while mRNA stays at baseline.",
      ],
      correct_index: 0,
    },
    rationale_required: true,
  },
  manipulate: {
    controls: [
      {
        id: "dna-preset",
        label: "DNA preset",
        kind: "selector",
        kernel_binding: "state.dnaPresetId",
      },
      {
        id: "inducer-concentration",
        label: "Inducer concentration (uM)",
        kind: "slider",
        kernel_binding: "state.inducerConcentration",
        bounds: { min: 0, max: 10, step: 0.1 },
      },
      {
        id: "hill-coefficient",
        label: "Hill coefficient n",
        kind: "slider",
        kernel_binding: "state.hillCoefficient",
        bounds: { min: 1, max: 4, step: 1 },
      },
      {
        id: "hill-threshold",
        label: "Half-max threshold K (uM)",
        kind: "slider",
        kernel_binding: "state.hillThreshold",
        bounds: { min: 0.1, max: 5, step: 0.1 },
      },
    ],
  },
  observe: {
    renderers: [
      {
        id: "gene-expression-readout",
        module: "@paideia/sutd-sims/gene-expression-dna-to-rna-to-protein",
        symbol: "GeneExpressionDnaToRnaToProtein",
        props_binding:
          "Show the DNA, mRNA, and protein chains as colour-coded badge rows; the Hill activation curve with the active operating point; and the mRNA and protein steady-state readouts.",
      },
    ],
  },
  explain: {
    prompt:
      "If the inducer is already well above the half-max threshold, what would you expect to happen when the inducer is doubled again?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Inducer increases protein without delay",
      "Hill responses are linear",
    ],
  },
};

const defaults: ExpressionState = {
  dnaPresetId: "methionine-start",
  inducerConcentration: 1,
  hillCoefficient: 2,
  hillThreshold: 1,
};

const isPresetId = (value: unknown): value is DnaPresetId =>
  value === "methionine-start" || value === "mutation-elf-to-ely";

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const snapInt = (value: number): number => Math.round(value);

const currentState = (state: Partial<ExpressionState>): ExpressionState => ({
  dnaPresetId: isPresetId(state.dnaPresetId) ? state.dnaPresetId : defaults.dnaPresetId,
  inducerConcentration: clamp(state.inducerConcentration ?? defaults.inducerConcentration, 0, 10),
  hillCoefficient: snapInt(clamp(state.hillCoefficient ?? defaults.hillCoefficient, 1, 4)),
  hillThreshold: clamp(state.hillThreshold ?? defaults.hillThreshold, 0.1, 5),
});

const regulatorFor = (
  inducerConcentration: number,
  thresholdValue: number,
  hillValue: number,
): KernelResult<RegulationFactor> => {
  const inducer = molarConcentration(inducerConcentration);
  if (!inducer.ok) return inducer;
  const threshold = molarConcentration(thresholdValue);
  if (!threshold.ok) return threshold;
  const nCoef = hillCoefficient(hillValue);
  if (!nCoef.ok) return nCoef;
  return applyRegulator({
    kind: "activator",
    inducer: inducer.value,
    threshold: threshold.value,
    hillCoefficient: nCoef.value,
  });
};

const settleExpression = (
  params: ExpressionParams,
  regulation: RegulationFactor,
): KernelResult<KineticExpressionState> => {
  const zero = molarConcentration(0);
  if (!zero.ok) return zero;
  let state: KineticExpressionState = {
    mRna: zero.value,
    protein: zero.value,
  };
  for (let step = 0; step < 4000; step += 1) {
    const next = stepGeneExpression(state, params, regulation, 0.05);
    if (!next.ok) return next;
    state = next.value;
  }
  const derivatives = expressionDerivatives(state, params, regulation);
  if (!derivatives.ok) return derivatives;
  return ok(state);
};

export const geneExpressionEvidence = (
  raw: ExpressionInput,
): KernelResult<ExpressionEvidence> => {
  if (!isPresetId(raw.dnaPresetId)) {
    return err("precondition-violated", `Unknown DNA preset "${String(raw.dnaPresetId)}".`);
  }
  if (
    typeof raw.inducerConcentration !== "number" ||
    typeof raw.hillCoefficient !== "number" ||
    typeof raw.hillThreshold !== "number" ||
    !Number.isFinite(raw.inducerConcentration) ||
    !Number.isFinite(raw.hillCoefficient) ||
    !Number.isFinite(raw.hillThreshold)
  ) {
    return err("precondition-violated", "ExpressionState must contain finite numeric controls.");
  }

  const dnaSeq = dna(PRESET_DNA[raw.dnaPresetId]);
  if (!dnaSeq.ok) return dnaSeq;
  const rnaSeq = transcribe(dnaSeq.value);
  if (!rnaSeq.ok) return rnaSeq;
  const proteinSeq = translate(rnaSeq.value);
  if (!proteinSeq.ok) return proteinSeq;

  const regulation = regulatorFor(
    raw.inducerConcentration,
    raw.hillThreshold,
    raw.hillCoefficient,
  );
  if (!regulation.ok) return regulation;

  const params = expressionParams();
  if (!params.ok) return params;
  const transcription = transcriptionRate(params.value, regulation.value);
  if (!transcription.ok) return transcription;
  const steady = settleExpression(params.value, regulation.value);
  if (!steady.ok) return steady;

  return ok({
    dnaSequence: dnaSeq.value,
    rnaSequence: rnaSeq.value,
    proteinSequence: proteinSeq.value,
    regulationFraction: regulation.value,
    transcriptionRatePerSecond: transcription.value,
    steadyStateMrna: steady.value.mRna,
    steadyStateProtein: steady.value.protein,
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

const Select = ({
  label,
  onChange,
  options,
  value,
}: {
  readonly label: string;
  readonly onChange: (value: DnaPresetId) => void;
  readonly options: ReadonlyArray<{ readonly id: DnaPresetId; readonly label: string }>;
  readonly value: DnaPresetId;
}) => (
  <label className="sutd-control">
    <span>{label}</span>
    <select
      aria-label={label}
      onChange={(event) => onChange(event.currentTarget.value as DnaPresetId)}
      value={value}
    >
      {options.map((opt) => (
        <option key={opt.id} value={opt.id}>{opt.label}</option>
      ))}
    </select>
  </label>
);

const ManipulateStage = () => {
  const { state, set } = useManipulate<ExpressionState>();
  const current = currentState(state);
  return (
    <section aria-label="Gene expression controls" className="sutd-sim-panel">
      <div className="sutd-sim-controls">
        <p className="meta-line">Manipulate</p>
        <h2>Set the gene and the regulator</h2>
        <Select
          label="DNA preset"
          onChange={(value) => set("dnaPresetId", value)}
          options={[
            { id: "methionine-start", label: "Methionine start (M E L F *)" },
            { id: "mutation-elf-to-ely", label: "Point mutation (M E L F -> M E L F Y)" },
          ]}
          value={current.dnaPresetId}
        />
        <Slider label="Inducer concentration" max={10} min={0} onChange={(v) => set("inducerConcentration", v)} step={0.1} suffix="uM" value={current.inducerConcentration} />
        <Slider label="Hill coefficient n" max={4} min={1} onChange={(v) => set("hillCoefficient", v)} step={1} suffix="" value={current.hillCoefficient} />
        <Slider label="Half-max threshold K" max={5} min={0.1} onChange={(v) => set("hillThreshold", v)} step={0.1} suffix="uM" value={current.hillThreshold} />
      </div>
      <section className="sutd-formula-card" aria-label="Model cue">
        <p className="meta-line">Observation</p>
        <h3>One DNA segment, three layers</h3>
        <p>Prediction checkpoint. Then watch how a point mutation changes the protein sequence and how the inducer concentration changes the steady states.</p>
      </section>
    </section>
  );
};

const CodonRow = ({
  label,
  codons,
  fill,
}: {
  readonly label: string;
  readonly codons: ReadonlyArray<string>;
  readonly fill: string;
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "6px 0" }}>
    <span style={{ minWidth: "56px", fontFamily: "Arial, sans-serif", fontSize: "12px", fontWeight: 600 }}>{label}</span>
    {codons.map((codon, index) => (
      <span
        key={`${label}-${index}-${codon}`}
        style={{
          backgroundColor: fill,
          color: "#fff",
          padding: "4px 6px",
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          fontWeight: 700,
        }}
      >
        {codon}
      </span>
    ))}
  </div>
);

const ResidueRow = ({ residues }: { readonly residues: ReadonlyArray<string> }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "6px 0" }}>
    <span style={{ minWidth: "56px", fontFamily: "Arial, sans-serif", fontSize: "12px", fontWeight: 600 }}>protein</span>
    {residues.map((residue, index) => (
      <span
        key={`residue-${index}-${residue}`}
        style={{
          width: "22px",
          height: "22px",
          borderRadius: "50%",
          backgroundColor: residue === "*" ? "#475569" : "#f59e0b",
          color: "#fff",
          fontFamily: "Arial, sans-serif",
          fontSize: "13px",
          fontWeight: 700,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {residue}
      </span>
    ))}
  </div>
);

const HillCurve = ({
  inducer,
  hillCoefficientValue,
  threshold,
  fraction,
}: {
  readonly inducer: number;
  readonly hillCoefficientValue: number;
  readonly threshold: number;
  readonly fraction: number;
}) => {
  const samples = 24;
  const xMax = 10;
  const points: number[][] = [];
  for (let i = 0; i <= samples; i += 1) {
    const x = (i / samples) * xMax;
    const r = regulatorFor(x, threshold, hillCoefficientValue);
    points.push([x, r.ok ? r.value : 0]);
  }
  const width = 220;
  const height = 120;
  const padding = 24;
  const xScale = (x: number) => padding + (x / xMax) * (width - 2 * padding);
  const yScale = (y: number) => padding + (1 - y) * (height - 2 * padding);
  const polyline = points
    .map(([x, y]) => `${xScale(x ?? 0)},${yScale(y ?? 0)}`)
    .join(" ");
  return (
    <svg
      aria-label="Hill activation curve"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block", maxWidth: "100%", height: "auto" }}
    >
      <rect width={width} height={height} fill="#ffffff" stroke="#cbd5e1" />
      <line x1={padding} x2={width - padding} y1={yScale(0)} y2={yScale(0)} stroke="#94a3b8" />
      <line x1={padding} x2={padding} y1={yScale(0)} y2={yScale(1)} stroke="#94a3b8" />
      <polyline fill="none" points={polyline} stroke="#2563eb" strokeWidth="3" />
      <circle cx={xScale(inducer)} cy={yScale(fraction)} fill="#dc2626" r="5" />
      <text x={width / 2} y={height - 4} fill="#475569" fontFamily="Arial, sans-serif" fontSize="10" textAnchor="middle">inducer [I] (uM)</text>
      <text fill="#475569" fontFamily="Arial, sans-serif" fontSize="10" textAnchor="middle" transform={`translate(9 ${height / 2}) rotate(-90)`}>regulator factor R</text>
      <text x={padding + 8} y={padding + 12} fill="#475569" fontFamily="Arial, sans-serif" fontSize="11">R = {fraction.toFixed(2)}</text>
    </svg>
  );
};

const splitIntoCodons = (sequence: string): ReadonlyArray<string> => {
  const out: string[] = [];
  for (let index = 0; index + 3 <= sequence.length; index += 3) {
    out.push(sequence.slice(index, index + 3));
  }
  return out;
};

const ObserveStage = () => {
  const stage = useStage();
  const state = currentState(useSimState<Partial<ExpressionState>>());
  const evidence = geneExpressionEvidence(state);
  if (!evidence.ok) {
    return (
      <section className="sutd-formula-card" role="region" aria-label="Observation">
        <p role="alert">{evidence.error.message}</p>
      </section>
    );
  }
  const value = evidence.value;
  const dnaCodons = splitIntoCodons(value.dnaSequence);
  const rnaCodons = splitIntoCodons(value.rnaSequence);
  const residues = value.proteinSequence.split("");
  return (
    <section aria-label="Observation" className="sutd-sim-panel" role="region">
      <div className="sutd-result-card">
        <p className="meta-line">Observation</p>
        <h2>Central dogma output</h2>
        <CodonRow label="DNA" codons={dnaCodons} fill="#1e3a8a" />
        <CodonRow label="mRNA" codons={rnaCodons} fill="#2563eb" />
        <ResidueRow residues={residues} />
        <HillCurve
          inducer={state.inducerConcentration}
          hillCoefficientValue={state.hillCoefficient}
          threshold={state.hillThreshold}
          fraction={value.regulationFraction}
        />
        <dl aria-label="Gene expression readout" className="sutd-result-grid">
          <div><dt>Regulator factor R</dt><dd>{value.regulationFraction.toFixed(2)}</dd></div>
          <div><dt>Transcription rate</dt><dd>{value.transcriptionRatePerSecond.toFixed(3)} per s</dd></div>
          <div><dt>Steady-state mRNA</dt><dd>{value.steadyStateMrna.toFixed(2)} uM</dd></div>
          <div><dt>Steady-state protein</dt><dd>{value.steadyStateProtein.toFixed(1)} uM</dd></div>
        </dl>
      </div>
      <section aria-label="Formula used" className="sutd-formula-card">
        <p className="meta-line">Formula used</p>
        <h3>Hill activation and steady-state expression</h3>
        <pre aria-label="LaTeX formula source" className="formula-code">
          <code>{String.raw`\color{#2563eb}{R}
= \frac{[I]^n}{K^n + [I]^n}

\color{#d97706}{\alpha} = \alpha_0 + (\alpha_{\max} - \alpha_0)\,R

\frac{dM}{dt} = \alpha - k_M M
\qquad
\frac{dP}{dt} = k_{\text{tr}} M - k_P P`}</code>
        </pre>
        <p className="meta-line">Legend</p>
        <dl aria-label="Formula legend" className="formula-legend">
          <div><dt><span className="legend-swatch legend-swatch--blue" /> R</dt><dd>regulator factor in [0, 1]</dd></div>
          <div><dt><span className="legend-swatch legend-swatch--orange" /> alpha</dt><dd>transcription rate (per second)</dd></div>
          <div><dt>k_M, k_P</dt><dd>mRNA / protein decay rates (per second)</dd></div>
          <div><dt>k_tr</dt><dd>translation rate per mRNA (per second)</dd></div>
        </dl>
        <p>
          Substitution: [I] = {state.inducerConcentration.toFixed(2)} uM, K = {state.hillThreshold.toFixed(2)} uM, n = {state.hillCoefficient}, alpha_0 = {ALPHA_0}, alpha_max = {ALPHA_MAX}, k_tr = {K_TR}, k_M = {K_M}, k_P = {K_P}. R = {value.regulationFraction.toFixed(2)}; alpha = {value.transcriptionRatePerSecond.toFixed(3)} per s; M* = {value.steadyStateMrna.toFixed(2)} uM; P* = {value.steadyStateProtein.toFixed(1)} uM.
        </p>
        <p>
          Units: inducer, mRNA, and protein are in uM; rates are per second. Result: R = {value.regulationFraction.toFixed(2)}, M* = {value.steadyStateMrna.toFixed(2)} uM, P* = {value.steadyStateProtein.toFixed(1)} uM.
        </p>
        <p className="formula-note">
          The Hill response is sigmoidal: below K the curve is almost linear, near K it is steepest, and above ~3K it saturates. The protein steady state inherits that shape.
        </p>
        <button
          type="button"
          onClick={() => {
            stage.advance();
            stage.advance();
          }}
        >
          Explain the plateau
        </button>
      </section>
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();
  return (
    <section aria-label="Transfer prompt" className="sutd-formula-card">
      <p className="meta-line">Explain</p>
      <h2>Why does the curve flatten?</h2>
      <p>
        If the inducer is already well above the half-max threshold, what would you expect to happen when the inducer is doubled again?
      </p>
      <p>
        Use the graph to connect three ideas: regulator occupancy approaches R = 1, transcription cannot exceed alpha_max, and protein level settles where production balances decay.
      </p>
      <h3>Transfer challenge</h3>
      <p>
        A fluorescence reporter in a diagnostic biosensor uses different rate constants and a different threshold. Decide whether a dose increase changes the reporter strongly or only nudges a saturated plateau.
      </p>
      <button type="button" onClick={() => stage.reset()}>Try another regulator</button>
    </section>
  );
};

const StageSurface = () => {
  const stage = useStage();
  if (stage.current === "explain") return <ExplainStage />;
  return (
    <>
      <ManipulateStage />
      <ObserveStage />
    </>
  );
};

const GeneExpressionDnaToRnaToProteinSim = () => (
  <SimRuntime packageId={geneExpressionPackageId} spec={geneExpressionSpec}>
    <StageSurface />
  </SimRuntime>
);

export default GeneExpressionDnaToRnaToProteinSim;
export { GeneExpressionDnaToRnaToProteinSim as GeneExpressionDnaToRnaToProtein };
