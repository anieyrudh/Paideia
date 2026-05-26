import { useMemo } from "react";
import {
  coulombs,
  pointChargeElectricField,
  pointChargeModel,
  type Coulombs,
  type NewtonsPerCoulomb,
  type Volts,
} from "@paideia/electromagnetism";
import {
  norm2,
  normalize2,
  vector2,
  type Vector2,
} from "@paideia/linear-algebra";
import { VectorFieldPlot } from "@paideia/plotting";
import type { PredictionEvent } from "@paideia/prediction-gate";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import {
  approxEqual,
  metres,
  newtons,
  ok,
  type Brand,
  type ConceptPackageId,
  type Joules,
  type KernelResult,
  type Metres,
  type Newtons,
  type VectorField2D,
} from "@paideia/shared";
import { ControlGroup, Slider } from "@paideia/ui-sim";

export const electricFieldsPackageId = "sutd/10-017-technological-world-e-and-m/coulomb-s-law-and-discrete-charge-fields" as ConceptPackageId;
export const electricFieldsSimId = "coulomb-field-vector-lab";
export type ElectricFieldsPredictionEvent = PredictionEvent;

type MicroCoulombs = Brand<number, "MicroCoulombs">;
type NanoCoulombs = Brand<number, "NanoCoulombs">;
type Centimetres = Brand<number, "Centimetres">;
type DegreesValue = Brand<number, "DegreesValue">;

const MIN_FIELD_RADIUS_METRES = 0.025;

export interface ElectricFieldsState {
  readonly sourceChargeMicroC: MicroCoulombs;
  readonly testChargeNanoC: NanoCoulombs;
  readonly separationCm: Centimetres;
  readonly angleDegrees: DegreesValue;
}

export interface ElectricFieldsModel {
  readonly sourceChargeCoulombs: Coulombs;
  readonly testChargeCoulombs: Coulombs;
  readonly separationMetres: Metres;
  readonly positionVectorMetres: Vector2;
  readonly electricFieldVectorNPerC: Vector2;
  readonly electricFieldStrengthNPerC: NewtonsPerCoulomb;
  readonly forceVectorNewtons: Vector2;
  readonly forceMagnitudeNewtons: Newtons;
  readonly potentialVolts: Volts;
  readonly potentialEnergyJoules: Joules;
  readonly fieldDirectionSummary: string;
  readonly forceDirectionSummary: string;
}

export const electricFieldsSpec = {
  id: electricFieldsSimId,
  title: "Coulomb Field Vector Lab",
  interaction_type: "diagram-builder",
  kernel_deps: [
    "core/sim-runtime",
    "core/electromagnetism",
    "core/linear-algebra",
    "core/plotting",
    "core/prediction-gate",
    "core/shared",
    "core/ui-sim",
  ],
  predict: {
    prompt:
      "A negative test charge is placed to the right of a positive source charge. Before revealing the vectors, which way does the force on the test charge point?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "To the right, because the electric field points away from a positive source.",
        "To the left, because a negative test charge feels force opposite to the electric field.",
        "Upwards, because field lines curve around the source.",
        "There is no force because electric field and voltage are the same thing.",
      ],
      correct_index: 1,
    },
    rationale_required: true,
  },
  manipulate: {
    controls: [
      {
        id: "source-charge",
        label: "Source charge",
        kind: "slider",
        kernel_binding: "state.sourceChargeMicroC",
        bounds: { min: -1, max: 1, step: 0.1 },
      },
      {
        id: "test-charge",
        label: "Test charge",
        kind: "slider",
        kernel_binding: "state.testChargeNanoC",
        bounds: { min: -30, max: 30, step: 5 },
      },
      {
        id: "separation",
        label: "Separation",
        kind: "slider",
        kernel_binding: "state.separationCm",
        bounds: { min: 5, max: 25, step: 1 },
      },
      {
        id: "angle",
        label: "Position angle",
        kind: "slider",
        kernel_binding: "state.angleDegrees",
        bounds: { min: 0, max: 180, step: 5 },
      },
    ],
  },
  observe: {
    renderers: [
      {
        id: electricFieldsSimId,
        module: "@paideia/sutd-sims/coulomb-s-law-and-discrete-charge-fields",
        symbol: "ElectricFieldsSim",
        props_binding:
          "Show point-charge field direction, force on the test charge, formula substitution, units, legend, and potential-energy link.",
      },
    ],
  },
  explain: {
    prompt:
      "How does Coulomb's law separate field strength from force on a chosen test charge?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Positive and negative charges feel force in the same field direction.",
      "Voltage is the same thing as field strength.",
      "Field strength depends on the test charge.",
    ],
  },
} satisfies Parameters<typeof SimRuntime>[0]["spec"];

const defaultState: ElectricFieldsState = {
  angleDegrees: 0 as DegreesValue,
  separationCm: 15 as Centimetres,
  sourceChargeMicroC: 0.5 as MicroCoulombs,
  testChargeNanoC: -20 as NanoCoulombs,
};

const presets: readonly {
  readonly label: string;
  readonly state: ElectricFieldsState;
}[] = [
  { label: "attraction", state: defaultState },
  {
    label: "repulsion",
    state: {
      angleDegrees: 0 as DegreesValue,
      separationCm: 15 as Centimetres,
      sourceChargeMicroC: 0.5 as MicroCoulombs,
      testChargeNanoC: 20 as NanoCoulombs,
    },
  },
  {
    label: "negative source",
    state: {
      angleDegrees: 45 as DegreesValue,
      separationCm: 12 as Centimetres,
      sourceChargeMicroC: -0.6 as MicroCoulombs,
      testChargeNanoC: 15 as NanoCoulombs,
    },
  },
  {
    label: "far point",
    state: {
      angleDegrees: 120 as DegreesValue,
      separationCm: 24 as Centimetres,
      sourceChargeMicroC: 0.8 as MicroCoulombs,
      testChargeNanoC: -10 as NanoCoulombs,
    },
  },
];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const currentState = (state: Partial<ElectricFieldsState>): ElectricFieldsState => ({
  angleDegrees: clamp(state.angleDegrees ?? defaultState.angleDegrees, 0, 180) as DegreesValue,
  separationCm: clamp(state.separationCm ?? defaultState.separationCm, 5, 25) as Centimetres,
  sourceChargeMicroC: clamp(state.sourceChargeMicroC ?? defaultState.sourceChargeMicroC, -1, 1) as MicroCoulombs,
  testChargeNanoC: clamp(state.testChargeNanoC ?? defaultState.testChargeNanoC, -30, 30) as NanoCoulombs,
});

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
const roundTo = (value: number, places: number): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const formatFixed = (value: number, places = 2): string => roundTo(value, places).toFixed(places);
const formatChargeMicro = (value: number): string => `${formatFixed(value, 1)} microC`;
const formatChargeNano = (value: number): string => `${formatFixed(value, 0)} nC`;
const formatDistance = (value: number): string => `${formatFixed(value, 0)} cm`;

const formatScientific = (value: number, unit: string): string => {
  if (approxEqual(value, 0)) return `0 ${unit}`;
  const [mantissa, exponent] = value.toExponential(2).split("e");
  return `${mantissa} x 10^${Number(exponent)} ${unit}`;
};

const signedSummary = (value: number): "positive" | "negative" | "zero" => {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "zero";
};

const unitOrNull = (vector: Vector2): Vector2 | null => {
  const length = norm2(vector);
  if (!length.ok || length.value <= 0) return null;
  const unit = normalize2(vector);
  return unit.ok ? unit.value : null;
};

const positionFromState = (state: ElectricFieldsState): KernelResult<Vector2> => {
  const angle = toRadians(state.angleDegrees);
  return vector2(
    (state.separationCm / 100) * Math.cos(angle),
    (state.separationCm / 100) * Math.sin(angle),
  );
};

export const electricFieldVectorAt = (
  sourceChargeCoulombs: Coulombs,
  pointMetres: Vector2,
): KernelResult<Vector2> =>
  pointChargeElectricField({
    minRadiusMetres: MIN_FIELD_RADIUS_METRES,
    pointMetres,
    sourceChargeCoulombs,
  });

export const electricFieldsModel = (
  state: ElectricFieldsState,
): KernelResult<ElectricFieldsModel> => {
  const sourceChargeCoulombs = coulombs(state.sourceChargeMicroC * 1e-6);
  const testChargeCoulombs = coulombs(state.testChargeNanoC * 1e-9);
  const position = positionFromState(state);
  if (!position.ok) return position;
  const model = pointChargeModel({
    minRadiusMetres: MIN_FIELD_RADIUS_METRES,
    pointMetres: position.value,
    sourceChargeCoulombs,
    testChargeCoulombs,
  });
  if (!model.ok) return model;

  return ok({
    electricFieldStrengthNPerC: model.value.electricFieldStrengthNewtonsPerCoulomb,
    electricFieldVectorNPerC: model.value.electricFieldVectorNewtonsPerCoulomb,
    fieldDirectionSummary:
      sourceChargeCoulombs > 0
        ? "The electric field points away from the positive source."
        : sourceChargeCoulombs < 0
          ? "The electric field points towards the negative source."
          : "A zero source charge creates no electric field.",
    forceDirectionSummary:
      testChargeCoulombs > 0
        ? "The positive test charge feels force in the field direction."
        : testChargeCoulombs < 0
          ? "The negative test charge feels force opposite to the field direction."
          : "A zero test charge feels no electric force.",
    forceMagnitudeNewtons: newtons(model.value.forceMagnitudeNewtons),
    forceVectorNewtons: model.value.forceVectorNewtons,
    positionVectorMetres: position.value,
    potentialEnergyJoules: model.value.potentialEnergyJoules,
    potentialVolts: model.value.potentialVolts,
    separationMetres: metres(model.value.separationMetres),
    sourceChargeCoulombs,
    testChargeCoulombs,
  });
};

const setScenario = (
  set: (key: keyof ElectricFieldsState, value: ElectricFieldsState[keyof ElectricFieldsState]) => void,
  state: ElectricFieldsState,
) => {
  set("angleDegrees", state.angleDegrees);
  set("separationCm", state.separationCm);
  set("sourceChargeMicroC", state.sourceChargeMicroC);
  set("testChargeNanoC", state.testChargeNanoC);
};

const fieldForPlot = (state: ElectricFieldsState): VectorField2D => {
  const sourceChargeCoulombs = coulombs(state.sourceChargeMicroC * 1e-6);
  return (x, y) => {
    const point = vector2(x, y);
    if (!point.ok) return [0, 0] as const;
    const field = electricFieldVectorAt(sourceChargeCoulombs, point.value);
    return field.ok ? field.value : [0, 0] as const;
  };
};

export const ElectricFieldDiagram = ({
  state,
  model,
  reveal,
}: {
  readonly state: ElectricFieldsState;
  readonly model?: ElectricFieldsModel;
  readonly reveal: boolean;
}) => {
  const field = useMemo(() => fieldForPlot(state), [state]);
  const angle = toRadians(state.angleDegrees);
  const testX = 190 + 118 * Math.cos(angle);
  const testY = 160 - 118 * Math.sin(angle);
  const sourceTone = signedSummary(state.sourceChargeMicroC);
  const testTone = signedSummary(state.testChargeNanoC);
  const fieldDirection = model === undefined ? null : unitOrNull(model.electricFieldVectorNPerC);
  const forceDirection = model === undefined ? null : unitOrNull(model.forceVectorNewtons);
  const fieldEndX = fieldDirection === null ? testX : testX + fieldDirection[0] * 58;
  const fieldEndY = fieldDirection === null ? testY - 9 : testY - 9 - fieldDirection[1] * 58;
  const forceEndX = forceDirection === null ? testX : testX + forceDirection[0] * 58;
  const forceEndY = forceDirection === null ? testY + 9 : testY + 9 - forceDirection[1] * 58;
  const dynamicDescription =
    model === undefined
      ? `Source charge ${formatChargeMicro(state.sourceChargeMicroC)}, test charge ${formatChargeNano(state.testChargeNanoC)}, separation ${formatDistance(state.separationCm)}.`
      : `${model.fieldDirectionSummary} ${model.forceDirectionSummary} Field strength ${formatScientific(model.electricFieldStrengthNPerC, "N/C")}.`;

  return (
    <div className="energy-stage" aria-label="Electric field visual">
      <svg aria-label="Point charge field diagram" role="img" viewBox="0 0 380 260">
        <title>Point charge field and force diagram</title>
        <desc>{dynamicDescription}</desc>
        <rect fill="#f8fbff" height="260" rx="18" width="380" />
        <circle cx="190" cy="160" fill={sourceTone === "negative" ? "#2563eb" : sourceTone === "positive" ? "#dc2626" : "#64748b"} r="28" />
        <text fill="#ffffff" fontSize="18" fontWeight="800" textAnchor="middle" x="190" y="166">
          {state.sourceChargeMicroC >= 0 ? "+" : "-"}
        </text>
        <line stroke="#64748b" strokeDasharray="4 5" strokeWidth="2" x1="190" x2={testX} y1="160" y2={testY} />
        <circle cx={testX} cy={testY} fill={testTone === "negative" ? "#2563eb" : testTone === "positive" ? "#dc2626" : "#64748b"} r="18" />
        <text fill="#ffffff" fontSize="14" fontWeight="800" textAnchor="middle" x={testX} y={testY + 5}>
          {state.testChargeNanoC >= 0 ? "+" : "-"}
        </text>
        <text fill="#10201a" fontSize="13" fontWeight="800" textAnchor="middle" x="190" y="210">
          source {formatChargeMicro(state.sourceChargeMicroC)}
        </text>
        <text fill="#10201a" fontSize="13" fontWeight="800" textAnchor="middle" x={testX} y={testY - 28}>
          test {formatChargeNano(state.testChargeNanoC)}
        </text>
        <text fill="#10201a" fontSize="13" fontWeight="800" textAnchor="middle" x={(190 + testX) / 2} y={(160 + testY) / 2 - 8}>
          {formatDistance(state.separationCm)}
        </text>
        {reveal && model !== undefined ? (
          <>
            {fieldDirection === null ? null : (
              <line markerEnd="url(#field-arrow)" stroke="#059669" strokeLinecap="round" strokeWidth="5" x1={testX} x2={fieldEndX} y1={testY - 9} y2={fieldEndY} />
            )}
            {forceDirection === null ? null : (
              <line markerEnd="url(#force-arrow)" stroke="#d97706" strokeLinecap="round" strokeWidth="5" x1={testX} x2={forceEndX} y1={testY + 9} y2={forceEndY} />
            )}
            <defs>
              <marker id="field-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
                <path d="M0,0 L8,4 L0,8 Z" fill="#059669" />
              </marker>
              <marker id="force-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
                <path d="M0,0 L8,4 L0,8 Z" fill="#d97706" />
              </marker>
            </defs>
            <text fill="#065f46" fontSize="12" fontWeight="800" x={fieldEndX + 4} y={fieldEndY - 4}>
              E
            </text>
            <text fill="#92400e" fontSize="12" fontWeight="800" x={forceEndX + 4} y={forceEndY + 4}>
              F
            </text>
          </>
        ) : null}
      </svg>
      {reveal ? (
        <figure aria-label="Field direction plot" className="plot-panel">
          <VectorFieldPlot
            density={7}
            field={field}
            normalize
            region={{ x: { min: -0.18, max: 0.18 }, y: { min: -0.18, max: 0.18 } }}
          />
          <figcaption className="formula-note">
            Normalised arrows show direction around the source charge; the readout gives the
            actual field strength at the test charge.
          </figcaption>
        </figure>
      ) : null}
    </div>
  );
};

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<ElectricFieldsState>();
  const current = useMemo(() => currentState(state), [state]);

  return (
    <section aria-label="Electric field controls" className="vector-lab vector-lab--product">
      <div className="vector-controls vector-controls--product">
        <p className="lab-kicker">Tune the field</p>
        <ControlGroup legend="Charge and position controls">
          <Slider label="Source charge" max={1} min={-1} onChange={(value) => set("sourceChargeMicroC", value as MicroCoulombs)} step={0.1} unit="microC" value={current.sourceChargeMicroC} />
          <Slider label="Test charge" max={30} min={-30} onChange={(value) => set("testChargeNanoC", value as NanoCoulombs)} step={5} unit="nC" value={current.testChargeNanoC} />
          <Slider label="Separation" max={25} min={5} onChange={(value) => set("separationCm", value as Centimetres)} step={1} unit="cm" value={current.separationCm} />
          <Slider label="Position angle" max={180} min={0} onChange={(value) => set("angleDegrees", value as DegreesValue)} step={5} unit="deg" value={current.angleDegrees} />
        </ControlGroup>
        <div className="preset-strip" aria-label="Electric field presets">
          {presets.map((preset) => (
            <button key={preset.label} onClick={() => setScenario(set, preset.state)} type="button">
              {preset.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => stage.advance()}>
          Reveal field result
        </button>
      </div>
      <section className="formula-panel formula-panel--product" aria-label="Before reveal cue">
        <p className="lab-kicker">Before reveal</p>
        <h3>Separate field from force</h3>
        <p>
          Choose the source charge, test charge, and separation. The field direction is set by the
          source; the force direction also depends on the sign of the test charge.
        </p>
        <ElectricFieldDiagram reveal={false} state={current} />
      </section>
    </section>
  );
};

const Legend = () => (
  <dl aria-label="Formula legend" className="formula-legend">
    <div>
      <dt><span aria-hidden="true" className="legend-swatch legend-swatch--red" /> Q</dt>
      <dd>source charge setting the electric field, in C; red or blue charge discs show sign.</dd>
    </div>
    <div>
      <dt><span aria-hidden="true" className="legend-swatch legend-swatch--green" /> E</dt>
      <dd>electric field strength at the test position, in N/C.</dd>
    </div>
    <div>
      <dt><span aria-hidden="true" className="legend-swatch legend-swatch--orange" /> F</dt>
      <dd>force on the chosen test charge, in N.</dd>
    </div>
    <div>
      <dt><span aria-hidden="true" className="legend-swatch legend-swatch--blue" /> q and Delta V</dt>
      <dd>test charge and potential difference for the energy calculation, in C and V.</dd>
    </div>
  </dl>
);

const ObserveStage = () => {
  const stage = useStage();
  const state = currentState(useSimState<Partial<ElectricFieldsState>>());
  const model = electricFieldsModel(state);

  if (!model.ok) {
    return <p role="alert">The current field settings are outside the supported range.</p>;
  }

  return (
    <section aria-label="Observation unlocked" className="vector-lab vector-lab--product">
      <div className="vector-stage vector-stage--product">
        <ElectricFieldDiagram model={model.value} reveal state={state} />
        <dl aria-label="Electric field readout" className="result-readout result-readout--cards">
          <div><dt>Electric field strength</dt><dd>{formatScientific(model.value.electricFieldStrengthNPerC, "N/C")}</dd></div>
          <div><dt>Force on test charge</dt><dd>{formatScientific(model.value.forceMagnitudeNewtons, "N")}</dd></div>
          <div><dt>Electric potential</dt><dd>{formatScientific(model.value.potentialVolts, "V")}</dd></div>
          <div><dt>Potential energy</dt><dd>{formatScientific(model.value.potentialEnergyJoules, "J")}</dd></div>
        </dl>
      </div>
      <section className="formula-panel formula-panel--product" aria-label="Formula used">
        <p className="lab-kicker">Formula used</p>
        <h3>Field first, then force</h3>
        <pre className="formula-code" aria-label="Electric field formula">
          <code>
            <span className="formula-var formula-var--green">E</span> = k
            <span className="formula-var formula-var--red">Q</span> / r^2{"\n"}
            <span className="formula-var formula-var--orange">F</span> ={" "}
            <span className="formula-var formula-var--blue">q</span>
            <span className="formula-var formula-var--green">E</span>{"\n"}
            <span className="formula-var formula-var--blue">V</span> = k
            <span className="formula-var formula-var--red">Q</span> / r, Delta U ={" "}
            <span className="formula-var formula-var--blue">q Delta V</span>
          </code>
        </pre>
        <Legend />
        <p>
          Substitution: E = (8.99 x 10^9)({formatScientific(Math.abs(model.value.sourceChargeCoulombs), "C")}) /
          ({formatFixed(model.value.separationMetres, 2)} m)^2 ={" "}
          {formatScientific(model.value.electricFieldStrengthNPerC, "N/C")}.
        </p>
        <p>
          Then F = ({formatScientific(model.value.testChargeCoulombs, "C")})(
          {formatScientific(model.value.electricFieldStrengthNPerC, "N/C")}) ={" "}
          {formatScientific(model.value.forceMagnitudeNewtons, "N")} by magnitude.
        </p>
        <p>
          Potential link using zero potential at infinity: Delta V ={" "}
          {formatScientific(model.value.potentialVolts, "V")}, so Delta U = q Delta V ={" "}
          {formatScientific(model.value.potentialEnergyJoules, "J")}.
        </p>
        <p className="formula-note">
          {model.value.fieldDirectionSummary} {model.value.forceDirectionSummary}
        </p>
        <button type="button" onClick={() => stage.advance()}>
          Explain force direction
        </button>
      </section>
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();

  return (
    <section aria-label="Explain and transfer prompt" className="formula-panel formula-panel--product">
      <p className="lab-kicker">Explain</p>
      <h3>How can the same field give opposite forces?</h3>
      <p>
        In your own words: how can the electric field direction be fixed by the source charge while
        the force direction still depends on the sign of the test charge?
      </p>
      <p className="formula-note">
        Transfer check: keep the source and separation fixed, then swap the sign of the test
        charge. The field at the point is unchanged, but the force vector reverses because F = qE.
      </p>
      <button type="button" onClick={() => stage.reset()}>
        Try another setup
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
    <section aria-label="Prediction setup" className="formula-panel formula-panel--product">
      <p className="lab-kicker">Predict first</p>
      <h3>Which vector follows the field?</h3>
      <p>
        Commit a prediction before the electric field strength, force vector, potential, and energy
        readouts appear.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Set charge position
      </button>
    </section>
  );
};

export const ElectricFieldsSim = () => (
  <SimRuntime packageId={electricFieldsPackageId} spec={electricFieldsSpec}>
    <StageSurface />
  </SimRuntime>
);

export default ElectricFieldsSim;
