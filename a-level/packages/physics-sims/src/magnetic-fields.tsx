import type { TSimulationSpec } from "@paideia/content-schema";
import { normalize2, vector2, type Vector2 } from "@paideia/linear-algebra";
import { uniformCircularMotion } from "@paideia/mechanics";
import type { PredictionEvent } from "@paideia/prediction-gate";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import {
  kilograms,
  metres,
  metresPerSecond,
  ok,
  type ConceptPackageId,
  type KernelResult,
} from "@paideia/shared";
import { ControlGroup, Slider } from "@paideia/ui-sim";

export const magneticFieldsPackageId = "magnetic-fields" as ConceptPackageId;
export const magneticFieldsSimId = "magnetic-force-direction-lab";
export type MagneticFieldsPredictionEvent = PredictionEvent;

type Amperes = number & { readonly __brand: "Amperes" };
type MilliTeslas = number & { readonly __brand: "MilliTeslas" };
type Centimetres = number & { readonly __brand: "Centimetres" };
type DegreesValue = number & { readonly __brand: "DegreesValue" };
type MicroCoulombs = number & { readonly __brand: "MicroCoulombs" };
type KilometresPerSecond = number & { readonly __brand: "KilometresPerSecond" };
type Milligrams = number & { readonly __brand: "Milligrams" };

export interface MagneticFieldsState {
  readonly currentAmperes: Amperes;
  readonly fieldMilliTesla: MilliTeslas;
  readonly activeLengthCm: Centimetres;
  readonly angleDegrees: DegreesValue;
  readonly particleChargeMicroC: MicroCoulombs;
  readonly particleSpeedKmPerSecond: KilometresPerSecond;
  readonly particleMassMilligrams: Milligrams;
}

export interface MagneticFieldsModel {
  readonly fieldTeslas: number;
  readonly currentAmperes: number;
  readonly activeLengthMetres: number;
  readonly angleDegrees: number;
  readonly sinAngle: number;
  readonly currentForceNewtons: number;
  readonly particleChargeCoulombs: number;
  readonly particleSpeedMetresPerSecond: number;
  readonly particleMassKilograms: number;
  readonly chargeForceNewtons: number;
  readonly perpendicularOrbitRadiusMetres: number | null;
  readonly centripetalForceCheckNewtons: number | null;
  readonly wireDirection: Vector2;
  readonly forceDirection: Vector2 | null;
  readonly chargeForceDirection: Vector2 | null;
  readonly directionSummary: string;
  readonly chargeDirectionSummary: string;
}

export const magneticFieldsSpec: TSimulationSpec = {
  id: magneticFieldsSimId,
  title: "Magnetic Force Direction Lab",
  interaction_type: "diagram-builder",
  kernel_deps: [
    "core/sim-runtime",
    "core/electromagnetism",
    "core/mechanics",
    "core/linear-algebra",
    "core/prediction-gate",
    "core/shared",
    "core/ui-sim",
  ],
  predict: {
    prompt:
      "A wire carries conventional current to the right while a magnetic field goes into the page. Before revealing the result, which way is the force on the wire?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "Up the page.",
        "Down the page.",
        "Along the current, to the right.",
        "There is no force because the field is perpendicular to the current.",
      ],
      correct_index: 0,
    },
    rationale_required: true,
  },
  manipulate: {
    controls: [
      {
        id: "field-strength",
        label: "Magnetic field strength",
        kind: "slider",
        kernel_binding: "state.fieldMilliTesla",
        bounds: { min: 5, max: 120, step: 5 },
      },
      {
        id: "current",
        label: "Current",
        kind: "slider",
        kernel_binding: "state.currentAmperes",
        bounds: { min: 0, max: 12, step: 0.5 },
      },
      {
        id: "active-length",
        label: "Active wire length",
        kind: "slider",
        kernel_binding: "state.activeLengthCm",
        bounds: { min: 2, max: 20, step: 1 },
      },
      {
        id: "angle",
        label: "Angle to field",
        kind: "slider",
        kernel_binding: "state.angleDegrees",
        bounds: { min: 0, max: 90, step: 5 },
      },
      {
        id: "particle-charge",
        label: "Particle charge",
        kind: "slider",
        kernel_binding: "state.particleChargeMicroC",
        bounds: { min: -8, max: 8, step: 1 },
      },
      {
        id: "particle-speed",
        label: "Particle speed",
        kind: "slider",
        kernel_binding: "state.particleSpeedKmPerSecond",
        bounds: { min: 0.2, max: 5, step: 0.2 },
      },
    ],
  },
  observe: {
    renderers: [
      {
        id: magneticFieldsSimId,
        module: "@paideia/a-level-physics-sims/magnetic-fields",
        symbol: "MagneticFieldsSim",
        props_binding:
          "Show Fleming left-hand rule direction, current-carrying wire force, moving-charge force, circular-path check, formula substitution, units, and legend.",
      },
    ],
  },
  explain: {
    prompt:
      "Why is the magnetic force perpendicular to both the current or velocity direction and the magnetic field direction?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Magnetic force acts along the field line.",
      "Stationary charges feel magnetic force.",
      "A negative charge curves the same way as a positive charge.",
    ],
  },
};

const defaultState: MagneticFieldsState = {
  activeLengthCm: 8 as Centimetres,
  angleDegrees: 90 as DegreesValue,
  currentAmperes: 6 as Amperes,
  fieldMilliTesla: 40 as MilliTeslas,
  particleChargeMicroC: 2 as MicroCoulombs,
  particleMassMilligrams: 50 as Milligrams,
  particleSpeedKmPerSecond: 1 as KilometresPerSecond,
};

const presets: readonly {
  readonly label: string;
  readonly state: MagneticFieldsState;
}[] = [
  { label: "motor effect", state: defaultState },
  {
    label: "no angle",
    state: {
      ...defaultState,
      angleDegrees: 0 as DegreesValue,
    },
  },
  {
    label: "negative charge",
    state: {
      ...defaultState,
      particleChargeMicroC: -3 as MicroCoulombs,
    },
  },
  {
    label: "stronger field",
    state: {
      ...defaultState,
      fieldMilliTesla: 80 as MilliTeslas,
      currentAmperes: 8 as Amperes,
    },
  },
];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const currentState = (state: Partial<MagneticFieldsState>): MagneticFieldsState => ({
  activeLengthCm: clamp(state.activeLengthCm ?? defaultState.activeLengthCm, 2, 20) as Centimetres,
  angleDegrees: clamp(state.angleDegrees ?? defaultState.angleDegrees, 0, 90) as DegreesValue,
  currentAmperes: clamp(state.currentAmperes ?? defaultState.currentAmperes, 0, 12) as Amperes,
  fieldMilliTesla: clamp(state.fieldMilliTesla ?? defaultState.fieldMilliTesla, 5, 120) as MilliTeslas,
  particleChargeMicroC: clamp(
    state.particleChargeMicroC ?? defaultState.particleChargeMicroC,
    -8,
    8,
  ) as MicroCoulombs,
  particleMassMilligrams: clamp(
    state.particleMassMilligrams ?? defaultState.particleMassMilligrams,
    5,
    200,
  ) as Milligrams,
  particleSpeedKmPerSecond: clamp(
    state.particleSpeedKmPerSecond ?? defaultState.particleSpeedKmPerSecond,
    0.2,
    5,
  ) as KilometresPerSecond,
});

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

const roundTo = (value: number, places: number): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const formatFixed = (value: number, places = 2): string => roundTo(value, places).toFixed(places);

const formatScientific = (value: number, unit: string): string => {
  if (value === 0) return `0 ${unit}`;
  const [mantissa, exponent] = value.toExponential(2).split("e");
  return `${mantissa} x 10^${Number(exponent)} ${unit}`;
};

const forceDirectionForWire = (angleDegrees: number): KernelResult<Vector2 | null> => {
  if (angleDegrees === 0) return ok(null);
  const angle = toRadians(angleDegrees);
  const raw = vector2(-Math.sin(angle), Math.cos(angle));
  if (!raw.ok) return raw;
  const unit = normalize2(raw.value);
  return unit.ok ? ok(unit.value) : unit;
};

export const magneticFieldsModel = (
  state: MagneticFieldsState,
): KernelResult<MagneticFieldsModel> => {
  const fieldTeslas = state.fieldMilliTesla / 1000;
  const activeLengthMetres = state.activeLengthCm / 100;
  const angle = toRadians(state.angleDegrees);
  const sinAngle = Math.sin(angle);
  const currentForceNewtons =
    fieldTeslas * state.currentAmperes * activeLengthMetres * sinAngle;
  const particleChargeCoulombs = state.particleChargeMicroC * 1e-6;
  const particleSpeedMetresPerSecond = state.particleSpeedKmPerSecond * 1000;
  const particleMassKilograms = state.particleMassMilligrams * 1e-6;
  const chargeForceNewtons =
    Math.abs(particleChargeCoulombs) * particleSpeedMetresPerSecond * fieldTeslas * sinAngle;
  const wireDirection = vector2(Math.cos(angle), Math.sin(angle));
  if (!wireDirection.ok) return wireDirection;
  const forceDirection = forceDirectionForWire(state.angleDegrees);
  if (!forceDirection.ok) return forceDirection;
  const chargeForceDirection =
    forceDirection.value === null || particleChargeCoulombs === 0
      ? null
      : ([
          Math.sign(particleChargeCoulombs) * forceDirection.value[0],
          Math.sign(particleChargeCoulombs) * forceDirection.value[1],
        ] as const);
  const canCurve = particleChargeCoulombs !== 0 && fieldTeslas > 0;
  const perpendicularOrbitRadiusMetres = canCurve
    ? (particleMassKilograms * particleSpeedMetresPerSecond) /
      (Math.abs(particleChargeCoulombs) * fieldTeslas)
    : null;
  const circularCheck =
    perpendicularOrbitRadiusMetres === null
      ? null
      : uniformCircularMotion({
          massKilograms: kilograms(particleMassKilograms),
          radiusMetres: metres(perpendicularOrbitRadiusMetres),
          speedMetresPerSecond: metresPerSecond(particleSpeedMetresPerSecond),
        });
  if (circularCheck !== null && !circularCheck.ok) return circularCheck;

  return ok({
    activeLengthMetres,
    angleDegrees: state.angleDegrees,
    centripetalForceCheckNewtons:
      circularCheck === null ? null : circularCheck.value.centripetalForceNewtons,
    chargeDirectionSummary:
      particleChargeCoulombs === 0
        ? "A neutral particle has no magnetic force."
        : particleChargeCoulombs > 0
          ? "A positive moving charge curves in the same direction as the wire-force rule."
          : "A negative moving charge curves opposite to the wire-force rule.",
    chargeForceDirection,
    chargeForceNewtons,
    currentAmperes: state.currentAmperes,
    currentForceNewtons,
    directionSummary:
      state.angleDegrees === 0
        ? "Current parallel to the magnetic field gives zero magnetic force."
        : "With field into the page, Fleming's left-hand rule puts the wire force perpendicular to the current.",
    fieldTeslas,
    forceDirection: forceDirection.value,
    particleChargeCoulombs,
    particleMassKilograms,
    particleSpeedMetresPerSecond,
    perpendicularOrbitRadiusMetres,
    sinAngle,
    wireDirection: wireDirection.value,
  });
};

const setScenario = (
  set: (key: keyof MagneticFieldsState, value: MagneticFieldsState[keyof MagneticFieldsState]) => void,
  state: MagneticFieldsState,
) => {
  set("activeLengthCm", state.activeLengthCm);
  set("angleDegrees", state.angleDegrees);
  set("currentAmperes", state.currentAmperes);
  set("fieldMilliTesla", state.fieldMilliTesla);
  set("particleChargeMicroC", state.particleChargeMicroC);
  set("particleMassMilligrams", state.particleMassMilligrams);
  set("particleSpeedKmPerSecond", state.particleSpeedKmPerSecond);
};

const vectorEnd = (
  startX: number,
  startY: number,
  direction: Vector2 | null,
  length: number,
): readonly [number, number] =>
  direction === null
    ? [startX, startY]
    : [startX + direction[0] * length, startY - direction[1] * length];

export const MagneticFieldDiagram = ({
  model,
  reveal,
  state,
}: {
  readonly model?: MagneticFieldsModel;
  readonly reveal: boolean;
  readonly state: MagneticFieldsState;
}) => {
  const angle = toRadians(state.angleDegrees);
  const wireStartX = 86;
  const wireStartY = 172;
  const wireLength = 150;
  const wireEndX = wireStartX + Math.cos(angle) * wireLength;
  const wireEndY = wireStartY - Math.sin(angle) * wireLength;
  const forceDirection = model?.forceDirection ?? null;
  const chargeDirection = model?.chargeForceDirection ?? null;
  const [wireForceX, wireForceY] = vectorEnd(wireEndX, wireEndY, forceDirection, 62);
  const chargeX = 285;
  const chargeY = 174;
  const [chargeForceX, chargeForceY] = vectorEnd(chargeX, chargeY, chargeDirection, 56);
  const dynamicDescription =
    model === undefined
      ? `Magnetic field ${formatFixed(state.fieldMilliTesla, 0)} millitesla, current ${formatFixed(state.currentAmperes, 1)} ampere, length ${formatFixed(state.activeLengthCm, 0)} centimetres.`
      : `${model.directionSummary} Wire force ${formatScientific(model.currentForceNewtons, "N")}. ${model.chargeDirectionSummary}`;

  return (
    <div className="energy-stage" aria-label="Magnetic field visual">
      <svg aria-label="Magnetic force diagram" role="img" viewBox="0 0 390 270">
        <title>Magnetic field, wire current, and force direction diagram</title>
        <desc>{dynamicDescription}</desc>
        <defs>
          <marker id="magnetic-wire-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
            <path d="M0,0 L8,4 L0,8 Z" fill="#1f5f8b" />
          </marker>
          <marker id="magnetic-force-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
            <path d="M0,0 L8,4 L0,8 Z" fill="#c2410c" />
          </marker>
        </defs>
        <rect fill="#f8fbff" height="270" rx="18" width="390" />
        {Array.from({ length: 24 }, (_, index) => {
          const column = index % 6;
          const row = Math.floor(index / 6);
          return (
            <g key={index} aria-hidden="true">
              <circle cx={58 + column * 54} cy={38 + row * 42} fill="#dbeafe" r="12" />
              <text fill="#1e3a8a" fontSize="18" fontWeight="800" textAnchor="middle" x={58 + column * 54} y={44 + row * 42}>
                x
              </text>
            </g>
          );
        })}
        <line markerEnd="url(#magnetic-wire-arrow)" stroke="#1f5f8b" strokeLinecap="round" strokeWidth="8" x1={wireStartX} x2={wireEndX} y1={wireStartY} y2={wireEndY} />
        <text fill="#1f5f8b" fontSize="13" fontWeight="800" x={wireEndX + 8} y={wireEndY - 8}>
          current I
        </text>
        {reveal && model !== undefined && forceDirection !== null ? (
          <>
            <line markerEnd="url(#magnetic-force-arrow)" stroke="#c2410c" strokeLinecap="round" strokeWidth="7" x1={wireEndX} x2={wireForceX} y1={wireEndY} y2={wireForceY} />
            <text fill="#c2410c" fontSize="13" fontWeight="800" x={wireForceX + 7} y={wireForceY}>
              wire F
            </text>
          </>
        ) : null}
        <circle cx={chargeX} cy={chargeY} fill={state.particleChargeMicroC >= 0 ? "#dc2626" : "#2563eb"} r="18" />
        <text fill="#ffffff" fontSize="15" fontWeight="800" textAnchor="middle" x={chargeX} y={chargeY + 5}>
          {state.particleChargeMicroC >= 0 ? "+" : "-"}
        </text>
        <line markerEnd="url(#magnetic-wire-arrow)" stroke="#1f5f8b" strokeLinecap="round" strokeWidth="5" x1={chargeX - 42} x2={chargeX - 6} y1={chargeY} y2={chargeY} />
        <text fill="#1f5f8b" fontSize="12" fontWeight="800" x={chargeX - 44} y={chargeY + 26}>
          velocity
        </text>
        {reveal && model !== undefined && chargeDirection !== null ? (
          <>
            <line markerEnd="url(#magnetic-force-arrow)" stroke="#c2410c" strokeLinecap="round" strokeWidth="5" x1={chargeX} x2={chargeForceX} y1={chargeY} y2={chargeForceY} />
            <text fill="#c2410c" fontSize="12" fontWeight="800" x={chargeForceX + 6} y={chargeForceY}>
              charge F
            </text>
          </>
        ) : null}
        <text fill="#10201a" fontSize="13" fontWeight="800" x="28" y="252">
          x symbols: uniform magnetic field into the page
        </text>
      </svg>
    </div>
  );
};

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<MagneticFieldsState>();
  const current = currentState(state);

  return (
    <section aria-label="Magnetic field controls" className="vector-lab vector-lab--product">
      <div className="vector-controls vector-controls--product">
        <p className="lab-kicker">Tune the field</p>
        <ControlGroup legend="Magnetic field, wire, and charge controls">
          <Slider label="Magnetic field strength" max={120} min={5} onChange={(value) => set("fieldMilliTesla", value as MilliTeslas)} step={5} unit="mT" value={current.fieldMilliTesla} />
          <Slider label="Current" max={12} min={0} onChange={(value) => set("currentAmperes", value as Amperes)} step={0.5} unit="A" value={current.currentAmperes} />
          <Slider label="Active wire length" max={20} min={2} onChange={(value) => set("activeLengthCm", value as Centimetres)} step={1} unit="cm" value={current.activeLengthCm} />
          <Slider label="Angle to field" max={90} min={0} onChange={(value) => set("angleDegrees", value as DegreesValue)} step={5} unit="deg" value={current.angleDegrees} />
          <Slider label="Particle charge" max={8} min={-8} onChange={(value) => set("particleChargeMicroC", value as MicroCoulombs)} step={1} unit="microC" value={current.particleChargeMicroC} />
          <Slider label="Particle speed" max={5} min={0.2} onChange={(value) => set("particleSpeedKmPerSecond", value as KilometresPerSecond)} step={0.2} unit="km s^-1" value={current.particleSpeedKmPerSecond} />
        </ControlGroup>
        <div className="preset-strip" aria-label="Magnetic field presets">
          {presets.map((preset) => (
            <button key={preset.label} onClick={() => setScenario(set, preset.state)} type="button">
              {preset.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => stage.advance()}>
          Reveal magnetic force
        </button>
      </div>
      <section className="formula-panel formula-panel--product" aria-label="Before reveal cue">
        <p className="lab-kicker">Before reveal</p>
        <h3>Force is sideways to the field</h3>
        <p>
          Set the current, active wire length, magnetic flux density, and entry angle. The reveal
          keeps force direction hidden until the prediction is committed.
        </p>
        <MagneticFieldDiagram reveal={false} state={current} />
      </section>
    </section>
  );
};

const Legend = () => (
  <dl aria-label="Formula legend" className="formula-legend">
    <div>
      <dt><span aria-hidden="true" className="legend-swatch legend-swatch--blue" /> B</dt>
      <dd>magnetic flux density, in tesla; x marks mean the field points into the page.</dd>
    </div>
    <div>
      <dt><span aria-hidden="true" className="legend-swatch legend-swatch--green" /> I or v</dt>
      <dd>conventional current in a wire, or velocity of a moving charge.</dd>
    </div>
    <div>
      <dt><span aria-hidden="true" className="legend-swatch legend-swatch--orange" /> F</dt>
      <dd>magnetic force, perpendicular to the current or velocity and the field.</dd>
    </div>
  </dl>
);

const ObserveStage = () => {
  const stage = useStage();
  const state = currentState(useSimState<Partial<MagneticFieldsState>>());
  const model = magneticFieldsModel(state);

  if (!model.ok) {
    return <p role="alert">The current magnetic-field settings are outside the supported range.</p>;
  }

  return (
    <section aria-label="Observation unlocked" className="vector-lab vector-lab--product">
      <div className="vector-stage vector-stage--product">
        <MagneticFieldDiagram model={model.value} reveal state={state} />
        <dl aria-label="Magnetic field readout" className="result-readout result-readout--cards">
          <div><dt>Wire force</dt><dd>{formatScientific(model.value.currentForceNewtons, "N")}</dd></div>
          <div><dt>Moving-charge force</dt><dd>{formatScientific(model.value.chargeForceNewtons, "N")}</dd></div>
          <div><dt>Perpendicular path radius</dt><dd>{model.value.perpendicularOrbitRadiusMetres === null ? "not curved" : formatScientific(model.value.perpendicularOrbitRadiusMetres, "m")}</dd></div>
          <div><dt>Centripetal force check</dt><dd>{model.value.centripetalForceCheckNewtons === null ? "not available" : formatScientific(model.value.centripetalForceCheckNewtons, "N")}</dd></div>
        </dl>
      </div>
      <section className="formula-panel formula-panel--product" aria-label="Formula used">
        <p className="lab-kicker">Formula used</p>
        <h3>Magnitude first, direction by left hand</h3>
        <pre className="formula-code" aria-label="Magnetic force formula">
          <code>
            <span className="formula-var formula-var--orange">F</span> ={" "}
            <span className="formula-var formula-var--blue">B</span>
            <span className="formula-var formula-var--green">I</span>
            <span className="formula-var">L</span> sin theta{"\n"}
            <span className="formula-var formula-var--orange">F</span> = |q|v
            <span className="formula-var formula-var--blue">B</span> sin theta{"\n"}
            r = mv / |q|B for perpendicular circular motion
          </code>
        </pre>
        <Legend />
        <p>
          Wire substitution: F = ({formatFixed(model.value.fieldTeslas, 3)} T)(
          {formatFixed(model.value.currentAmperes, 1)} A)(
          {formatFixed(model.value.activeLengthMetres, 2)} m) sin {formatFixed(model.value.angleDegrees, 0)} deg
          = {formatScientific(model.value.currentForceNewtons, "N")}.
        </p>
        <p>
          Charge substitution: F = |{formatScientific(model.value.particleChargeCoulombs, "C")}|(
          {formatScientific(model.value.particleSpeedMetresPerSecond, "m s^-1")})(
          {formatFixed(model.value.fieldTeslas, 3)} T) sin {formatFixed(model.value.angleDegrees, 0)} deg
          = {formatScientific(model.value.chargeForceNewtons, "N")}.
        </p>
        <p>
          Circular-path check for a perpendicular entry: r = mv / |q|B. The mechanics kernel gives
          F_c = mv^2/r ={" "}
          {model.value.centripetalForceCheckNewtons === null
            ? "not available because q or B is zero"
            : formatScientific(model.value.centripetalForceCheckNewtons, "N")}.
        </p>
        <p className="formula-note">
          Interpretation: {model.value.directionSummary} {model.value.chargeDirectionSummary}
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
      <h3>Why not along the field?</h3>
      <p>
        Use Fleming's left-hand rule: first finger is field, second finger is conventional current
        or positive charge velocity, thumb is force. For a negative charge, reverse the force.
      </p>
      <p className="formula-note">
        Transfer check: a stationary charge has charge but no velocity, so F = |q|vB sin theta gives
        zero magnetic force.
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
      <h3>Which way does the force point?</h3>
      <p>
        Commit a direction prediction before the magnetic force vector, formula substitution, and
        circular-path check appear.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Set magnetic field
      </button>
    </section>
  );
};

export const MagneticFieldsSim = () => (
  <SimRuntime packageId={magneticFieldsPackageId} spec={magneticFieldsSpec}>
    <StageSurface />
  </SimRuntime>
);

export default MagneticFieldsSim;
