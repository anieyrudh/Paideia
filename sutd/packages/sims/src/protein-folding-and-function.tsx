import type { TSimulationSpec } from "@paideia/content-schema";
import {
  aminoAcidProperties,
  chargeClass,
  hydropathyProfile,
  kyteDoolittleHydropathy,
  aminoAcidLetter,
  type AminoAcidLetter,
  type HydropathyProfilePoint,
  type RegionLabel,
} from "@paideia/protein-structure";
import { err, ok, type ConceptPackageId, type KernelResult } from "@paideia/shared";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";

type PresetId =
  | "poly-leu"
  | "poly-lys"
  | "bacteriorhodopsin-fragment"
  | "cytosolic-mixed";

type FoldingState = {
  readonly presetId: PresetId;
  readonly windowSize: number;
  readonly hydrophobicThreshold: number;
};

type RegionCounts = {
  readonly hydrophobic: number;
  readonly neutral: number;
  readonly hydrophilic: number;
};

type FoldingEvidence = {
  readonly sequence: string;
  readonly profile: ReadonlyArray<HydropathyProfilePoint>;
  readonly regionCounts: RegionCounts;
  readonly longestHydrophobicRun: number;
  readonly dominantRegion: RegionLabel;
  readonly meanHydropathy: number;
};

export const proteinFoldingAndFunctionPackageId =
  "sutd/10-019-science-and-technology-for-healthcare/protein-folding-and-function" as ConceptPackageId;

const PRESET_SEQUENCES: Readonly<Record<PresetId, string>> = Object.freeze({
  "poly-leu": "LLLLLLLLLLLLLLLLLLLL",
  "poly-lys": "KKKKKKKKKKKKKKKKKKKK",
  "bacteriorhodopsin-fragment": "AVAGMFFGMAFLAVAMLFW",
  "cytosolic-mixed": "KDLLIVASKELLVATRDKLL",
});

export const proteinFoldingAndFunctionSpec: TSimulationSpec = {
  id: "protein-folding-and-function",
  title: "Hydropathy Folding Lab",
  interaction_type: "diagram-builder",
  kernel_deps: [
    "core/sim-runtime",
    "core/protein-structure",
    "core/prediction-gate",
    "core/ui-sim",
  ],
  predict: {
    prompt:
      "A short peptide is L L L L L L L L (eight leucines). The window-9 hydropathy classifier reports \"hydrophobic\" for every centre residue. Before reveal, which statement best describes the peptide's fold in aqueous solution?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "It collapses into a hydrophobic cluster; the fold also depends on chain length, environment, and chaperones.",
        "It folds uniquely into a beta sheet because the sequence is hydrophobic.",
        "It cannot fold because all residues are identical.",
        "The hydropathy profile predicts the exact 3D structure.",
      ],
      correct_index: 0,
    },
    rationale_required: true,
  },
  manipulate: {
    controls: [
      {
        id: "preset-selection",
        label: "Sequence preset",
        kind: "selector",
        kernel_binding: "state.presetId",
      },
      {
        id: "window-size",
        label: "Window size W",
        kind: "slider",
        kernel_binding: "state.windowSize",
        bounds: { min: 3, max: 11, step: 2 },
      },
      {
        id: "hydrophobic-threshold",
        label: "Hydrophobic threshold",
        kind: "slider",
        kernel_binding: "state.hydrophobicThreshold",
        bounds: { min: 0.5, max: 3, step: 0.1 },
      },
    ],
  },
  observe: {
    renderers: [
      {
        id: "hydropathy-profile-readout",
        module: "@paideia/sutd-sims/protein-folding-and-function",
        symbol: "ProteinFoldingAndFunction",
        props_binding:
          "Show residue badges coloured by charge / polarity, the windowed hydropathy plot with the active thresholds, and region counts plus the longest contiguous hydrophobic run.",
      },
    ],
  },
  explain: {
    prompt:
      "Explain why a hydropathy plateau is necessary but not sufficient evidence for a transmembrane helix.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Sequence alone determines fold",
      "Hydropathy alone predicts secondary structure",
    ],
  },
};

const defaults: FoldingState = {
  presetId: "poly-leu",
  windowSize: 9,
  hydrophobicThreshold: 1.6,
};

const isPresetId = (value: unknown): value is PresetId =>
  value === "poly-leu" ||
  value === "poly-lys" ||
  value === "bacteriorhodopsin-fragment" ||
  value === "cytosolic-mixed";

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const snapOdd = (value: number): number => {
  const rounded = Math.round(value);
  return rounded % 2 === 0 ? rounded + 1 : rounded;
};

const currentState = (state: Partial<FoldingState>): FoldingState => ({
  presetId: isPresetId(state.presetId) ? state.presetId : defaults.presetId,
  windowSize: snapOdd(clamp(state.windowSize ?? defaults.windowSize, 3, 11)),
  hydrophobicThreshold: clamp(
    state.hydrophobicThreshold ?? defaults.hydrophobicThreshold,
    0.5,
    3,
  ),
});

const computeRegionCounts = (
  points: ReadonlyArray<HydropathyProfilePoint>,
): RegionCounts => {
  let hydrophobic = 0;
  let neutral = 0;
  let hydrophilic = 0;
  for (const point of points) {
    if (point.region === "hydrophobic") hydrophobic += 1;
    else if (point.region === "neutral") neutral += 1;
    else hydrophilic += 1;
  }
  return { hydrophobic, neutral, hydrophilic };
};

const computeLongestHydrophobicRun = (
  points: ReadonlyArray<HydropathyProfilePoint>,
): number => {
  let best = 0;
  let current = 0;
  for (const point of points) {
    if (point.region === "hydrophobic") {
      current += 1;
      if (current > best) best = current;
    } else {
      current = 0;
    }
  }
  return best;
};

const pickDominantRegion = (counts: RegionCounts): RegionLabel => {
  if (
    counts.hydrophobic >= counts.neutral &&
    counts.hydrophobic >= counts.hydrophilic
  ) {
    return counts.hydrophobic === 0 ? "neutral" : "hydrophobic";
  }
  if (counts.hydrophilic >= counts.neutral) {
    return "hydrophilic";
  }
  return "neutral";
};

export const foldingEvidence = (
  raw: FoldingState,
): KernelResult<FoldingEvidence> => {
  if (
    typeof raw.windowSize !== "number" ||
    !Number.isFinite(raw.windowSize) ||
    typeof raw.hydrophobicThreshold !== "number" ||
    !Number.isFinite(raw.hydrophobicThreshold)
  ) {
    return err(
      "precondition-violated",
      "FoldingState must contain finite numeric controls.",
    );
  }
  if (!isPresetId(raw.presetId)) {
    return err(
      "precondition-violated",
      `Unknown sequence preset "${String(raw.presetId)}".`,
    );
  }
  const sequence = PRESET_SEQUENCES[raw.presetId];
  // hydrophobicThreshold is branded internally as a number; pass through.
  const thresholdValue = raw.hydrophobicThreshold;
  const profile = hydropathyProfile(sequence, raw.windowSize, {
    hydrophobicThreshold: thresholdValue as unknown as Parameters<
      typeof hydropathyProfile
    >[2] extends infer Options
      ? Options extends { hydrophobicThreshold?: infer H }
        ? H
        : never
      : never,
  });
  if (!profile.ok) return profile;

  const points = profile.value.points;
  const counts = computeRegionCounts(points);
  const longest = computeLongestHydrophobicRun(points);
  const dominant = pickDominantRegion(counts);
  let meanSum = 0;
  for (const point of points) {
    meanSum += Number(point.meanHydropathy);
  }
  const mean = points.length === 0 ? 0 : meanSum / points.length;
  return ok({
    sequence,
    profile: points,
    regionCounts: counts,
    longestHydrophobicRun: longest,
    dominantRegion: dominant,
    meanHydropathy: mean,
  });
};

const residueColour = (letter: AminoAcidLetter): string => {
  const charge = chargeClass(letter);
  if (charge === "positive" || charge === "negative") return "#dc2626";
  const hydropathy = Number(kyteDoolittleHydropathy(letter));
  if (hydropathy >= 1.5) return "#2563eb";
  if (hydropathy >= 0) return "#f59e0b";
  return "#059669";
};

const ResidueChain = ({ sequence }: { readonly sequence: string }) => {
  const radius = 10;
  const stride = 24;
  return (
    <svg
      aria-label="Residue chain coloured by hydropathy"
      className="sutd-diagram"
      role="img"
      style={{ display: "block", maxWidth: "100%", height: "auto" }}
      viewBox={`0 0 ${sequence.length * stride + 20} 50`}
    >
      {sequence.split("").map((char, index) => {
        const branded = aminoAcidLetter(char);
        if (!branded.ok) return null;
        const x = 16 + index * stride;
        const colour = residueColour(branded.value);
        return (
          <g key={`${char}-${index}`}>
            <circle cx={x} cy={28} fill={colour} r={radius} />
            <text
              fill="#fff"
              fontFamily="Arial, sans-serif"
              fontSize="11"
              fontWeight="700"
              textAnchor="middle"
              x={x}
              y={32}
            >
              {char}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const HydropathyPlot = ({
  evidence,
  hydrophobicThreshold,
  hydrophilicThreshold,
}: {
  readonly evidence: FoldingEvidence;
  readonly hydrophobicThreshold: number;
  readonly hydrophilicThreshold: number;
}) => {
  const width = 360;
  const height = 160;
  const padding = 28;
  if (evidence.profile.length === 0) return null;
  const yMin = -5;
  const yMax = 5;
  const xStep =
    evidence.profile.length === 1
      ? 0
      : (width - 2 * padding) / (evidence.profile.length - 1);
  const yScale = (value: number) => {
    const clamped = Math.min(yMax, Math.max(yMin, value));
    return (
      padding +
      ((yMax - clamped) / (yMax - yMin)) * (height - 2 * padding)
    );
  };
  const points = evidence.profile
    .map((p, i) => `${padding + i * xStep},${yScale(Number(p.meanHydropathy))}`)
    .join(" ");
  const upperY = yScale(hydrophobicThreshold);
  const lowerY = yScale(hydrophilicThreshold);
  const zeroY = yScale(0);
  return (
    <svg
      aria-label="Windowed hydropathy plot"
      className="sutd-diagram"
      role="img"
      style={{ display: "block", maxWidth: "100%", height: "auto" }}
      viewBox={`0 0 ${width} ${height}`}
    >
      <rect width={width} height={height} fill="#ffffff" stroke="#cbd5e1" />
      <line x1={padding} x2={width - padding} y1={zeroY} y2={zeroY} stroke="#94a3b8" strokeDasharray="4 4" />
      <line x1={padding} x2={width - padding} y1={upperY} y2={upperY} stroke="#dc2626" strokeDasharray="2 4" />
      <line x1={padding} x2={width - padding} y1={lowerY} y2={lowerY} stroke="#059669" strokeDasharray="2 4" />
      <text x={width - padding - 70} y={upperY - 4} fill="#dc2626" fontFamily="Arial, sans-serif" fontSize="10">+{hydrophobicThreshold.toFixed(1)} hydrophobic</text>
      <text x={width - padding - 70} y={lowerY + 12} fill="#059669" fontFamily="Arial, sans-serif" fontSize="10">{hydrophilicThreshold.toFixed(1)} hydrophilic</text>
      <polyline fill="none" points={points} stroke="#2563eb" strokeWidth="3" />
    </svg>
  );
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
  readonly onChange: (value: PresetId) => void;
  readonly options: ReadonlyArray<{ readonly id: PresetId; readonly label: string }>;
  readonly value: PresetId;
}) => (
  <label className="sutd-control">
    <span>{label}</span>
    <select
      aria-label={label}
      onChange={(event) => onChange(event.currentTarget.value as PresetId)}
      value={value}
    >
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<FoldingState>();
  const current = currentState(state);
  return (
    <section aria-label="Hydropathy controls" className="sutd-sim-panel">
      <div className="sutd-sim-controls">
        <p className="meta-line">Manipulate</p>
        <h2>Set the sequence and window</h2>
        <Select
          label="Sequence preset"
          onChange={(value) => set("presetId", value)}
          options={[
            { id: "poly-leu", label: "Poly-leucine (hydrophobic)" },
            { id: "poly-lys", label: "Poly-lysine (hydrophilic)" },
            { id: "bacteriorhodopsin-fragment", label: "Membrane helix fragment" },
            { id: "cytosolic-mixed", label: "Cytosolic mixed-charge" },
          ]}
          value={current.presetId}
        />
        <Slider
          label="Window size W"
          max={11}
          min={3}
          onChange={(value) => set("windowSize", value)}
          step={2}
          suffix="residues"
          value={current.windowSize}
        />
        <Slider
          label="Hydrophobic threshold"
          max={3}
          min={0.5}
          onChange={(value) => set("hydrophobicThreshold", value)}
          step={0.1}
          suffix=""
          value={current.hydrophobicThreshold}
        />
        <button type="button" onClick={() => stage.advance()}>
          Reveal hydropathy profile
        </button>
      </div>
      <section aria-label="Before reveal cue" className="sutd-formula-card">
        <p className="meta-line">Before reveal</p>
        <h3>Hydropathy shapes the energy landscape</h3>
        <p>Predict first. Then change the sequence preset to watch how the same window and threshold flip the dominant-region label.</p>
      </section>
    </section>
  );
};

const dominantRegionLabel = (kind: RegionLabel): string => {
  switch (kind) {
    case "hydrophobic":
      return "hydrophobic-dominant — likely buried core or transmembrane segment";
    case "hydrophilic":
      return "hydrophilic-dominant — likely surface-exposed";
    case "neutral":
      return "neutral-dominant — mixed character, fold is environment-sensitive";
  }
};

const ObserveStage = () => {
  const state = currentState(useSimState<Partial<FoldingState>>());
  const evidence = foldingEvidence(state);
  if (!evidence.ok) {
    return (
      <section className="sutd-formula-card" role="region" aria-label="Observation unlocked">
        <p role="alert">{evidence.error.message}</p>
      </section>
    );
  }
  const value = evidence.value;
  const hydrophilicThreshold = -0.5;
  // Use first residue properties as a worked sample row for substitution.
  const firstResidue = aminoAcidLetter(value.sequence.charAt(0));
  const firstProperties = firstResidue.ok ? aminoAcidProperties(firstResidue.value) : null;
  return (
    <section aria-label="Observation unlocked" className="sutd-sim-panel" role="region">
      <div className="sutd-result-card">
        <p className="meta-line">Observe</p>
        <h2>Hydropathy profile</h2>
        <ResidueChain sequence={value.sequence} />
        <HydropathyPlot evidence={value} hydrophobicThreshold={state.hydrophobicThreshold} hydrophilicThreshold={hydrophilicThreshold} />
        <dl aria-label="Hydropathy readout" className="sutd-result-grid">
          <div><dt>Window size</dt><dd>W = {state.windowSize}</dd></div>
          <div><dt>Mean window hydropathy</dt><dd>{value.meanHydropathy.toFixed(2)}</dd></div>
          <div><dt>Hydrophobic windows</dt><dd>{value.regionCounts.hydrophobic}</dd></div>
          <div><dt>Neutral windows</dt><dd>{value.regionCounts.neutral}</dd></div>
          <div><dt>Hydrophilic windows</dt><dd>{value.regionCounts.hydrophilic}</dd></div>
          <div><dt>Longest hydrophobic run</dt><dd>{value.longestHydrophobicRun} centre residues</dd></div>
          <div><dt>Dominant region</dt><dd>{dominantRegionLabel(value.dominantRegion)}</dd></div>
        </dl>
      </div>
      <section aria-label="Formula used" className="sutd-formula-card">
        <p className="meta-line">Formula used</p>
        <h3>Windowed Kyte-Doolittle hydropathy</h3>
        <pre aria-label="LaTeX formula source" className="formula-code">
          <code>{String.raw`\color{#2563eb}{\bar{H}_w(i)}
= \frac{1}{W} \sum_{j=i-(W-1)/2}^{i+(W-1)/2}
  \color{#d97706}{H_{\text{KD}}(s_j)}`}</code>
        </pre>
        <dl aria-label="Formula legend" className="formula-legend">
          <div><dt><span className="legend-swatch legend-swatch--blue" /> H_w(i)</dt><dd>windowed mean hydropathy at centre residue i</dd></div>
          <div><dt><span className="legend-swatch legend-swatch--orange" /> H_KD</dt><dd>per-residue Kyte-Doolittle hydropathy (table value)</dd></div>
          <div><dt>W</dt><dd>{state.windowSize}-residue window</dd></div>
          <div><dt>threshold</dt><dd>hydrophobic at {state.hydrophobicThreshold.toFixed(2)}, hydrophilic at -0.5</dd></div>
        </dl>
        {firstProperties && (
          <p>
            Substitution at the first centre residue: {firstProperties.threeLetter} ({firstProperties.name}) has H_KD = {Number(firstProperties.hydropathy).toFixed(2)}; the window mean averages it with its neighbours to give the plotted value.
          </p>
        )}
        <p className="formula-note">
          Hydropathy windowing tells you where hydrophobic residues cluster. It does not pick alpha vs beta secondary structure, and it does not account for chaperones, ionic strength, or membrane interactions.
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
      <h2>Transmembrane helix detection</h2>
      <p>
        Use a window-9 hydropathy profile and the +1.6 hydrophobic threshold to evaluate a 20-residue sequence. Justify why a hydrophobic plateau is necessary but not sufficient evidence for a transmembrane helix.
      </p>
      <button type="button" onClick={() => stage.reset()}>Try another sequence</button>
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
      <p className="meta-line">Predict first</p>
      <h1>Hydropathy Folding Lab</h1>
      <p>
        Predict how a poly-leucine peptide behaves in water before scanning the hydropathy profile.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Set up hydropathy lab
      </button>
    </section>
  );
};

const ProteinFoldingAndFunctionSim = () => (
  <SimRuntime packageId={proteinFoldingAndFunctionPackageId} spec={proteinFoldingAndFunctionSpec}>
    <StageSurface />
  </SimRuntime>
);

export default ProteinFoldingAndFunctionSim;
export { ProteinFoldingAndFunctionSim as ProteinFoldingAndFunction };
