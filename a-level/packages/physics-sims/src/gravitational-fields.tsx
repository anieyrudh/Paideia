import { useMemo } from "react";
import type { TSimulationSpec } from "@paideia/content-schema";
import {
  circularOrbitSpeed,
  gravitationalAccelerationFromForce,
  gravitationalFieldStrengthRatio,
  gravitationalFieldVector2D,
  gravitationalFieldStrength,
  gravitationalForce,
  gravitationalPotential,
  gravitationalPotentialEnergy,
  universalGravitationalConstant,
} from "@paideia/mechanics";
import { FunctionPlot, VectorFieldPlot } from "@paideia/plotting";
import type { PredictionEvent } from "@paideia/prediction-gate";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import {
  kilograms,
  metres,
  ok,
  type ConceptPackageId,
  type Joules,
  type KernelResult,
  type Kilograms,
  type Metres,
  type MetresPerSecond,
  type Newtons,
} from "@paideia/shared";
import { ControlGroup, Slider } from "@paideia/ui-sim";

export const gravitationalFieldsPackageId = "gravitational-fields" as ConceptPackageId;
export const gravitationalFieldsSimId = "inverse-square-field-lab";
export type GravitationalFieldsPredictionEvent = PredictionEvent;

const earthMassKilograms = 5.972e24;
const earthRadiusMetres = 6.371e6;

export interface GravitationalFieldsState {
  readonly sourceMassEarthMasses: number;
  readonly radiusEarthRadii: number;
  readonly testMassKilograms: Kilograms;
  readonly comparisonRadiusEarthRadii: number;
}

export interface GravitationalFieldsModel {
  readonly sourceMassKilograms: Kilograms;
  readonly radiusMetres: Metres;
  readonly comparisonRadiusMetres: Metres;
  readonly testMassKilograms: Kilograms;
  readonly fieldStrengthNewtonsPerKilogram: number;
  readonly forceNewtons: Newtons;
  readonly accelerationMetresPerSecondSquared: number;
  readonly potentialJoulesPerKilogram: number;
  readonly potentialEnergyJoules: Joules;
  readonly orbitSpeedMetresPerSecond: MetresPerSecond;
  readonly comparisonFieldStrengthNewtonsPerKilogram: number;
  readonly inverseSquareRatio: number;
  readonly fieldExpressionScale: number;
  readonly interpretation: string;
}

export const gravitationalFieldsSpec: TSimulationSpec = {
  id: gravitationalFieldsSimId,
  title: "Inverse-Square Field Lab",
  interaction_type: "function-plot-with-draggable",
  kernel_deps: [
    "core/sim-runtime",
    "core/content-schema",
    "core/mechanics",
    "core/plotting",
    "core/prediction-gate",
    "core/shared",
    "core/ui-sim",
  ],
  predict: {
    prompt:
      "A probe moves from 1 Earth radius to 2 Earth radii from Earth's centre. Before comparing with the lab, what happens to the gravitational field strength?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "It halves.",
        "It becomes one quarter as large.",
        "It stays constant.",
        "It becomes negative because gravity points inward.",
      ],
      correct_index: 1,
    },
    rationale_required: true,
  },
  manipulate: {
    controls: [
      {
        id: "source-mass",
        label: "Source mass",
        kind: "slider",
        kernel_binding: "state.sourceMassEarthMasses",
        bounds: { min: 0.5, max: 8, step: 0.5 },
      },
      {
        id: "radius",
        label: "Field point radius",
        kind: "slider",
        kernel_binding: "state.radiusEarthRadii",
        bounds: { min: 1, max: 8, step: 0.25 },
      },
      {
        id: "test-mass",
        label: "Probe mass",
        kind: "slider",
        kernel_binding: "state.testMassKilograms",
        bounds: { min: 100, max: 5000, step: 100 },
      },
      {
        id: "comparison-radius",
        label: "Comparison radius",
        kind: "slider",
        kernel_binding: "state.comparisonRadiusEarthRadii",
        bounds: { min: 1, max: 8, step: 0.25 },
      },
    ],
  },
  observe: {
    renderers: [
      {
        id: "inverse-square-field-lab",
        module: "@paideia/a-level-physics-sims/gravitational-fields",
        symbol: "GravitationalFieldsSim",
        props_binding:
          "Show inward field direction, inverse-square comparison, gravitational potential sign, formula substitution, and orbit-speed readout.",
      },
    ],
  },
  explain: {
    prompt:
      "Which quantity changed most strongly when the radius changed, and how do you know from the formula and visual field?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Field strength is constant near every mass.",
      "Potential energy must be positive.",
      "A heavier probe changes the field strength at a point.",
    ],
  },
};

const defaultState: GravitationalFieldsState = {
  sourceMassEarthMasses: 1,
  radiusEarthRadii: 1,
  testMassKilograms: kilograms(1000),
  comparisonRadiusEarthRadii: 2,
};

const presets: readonly {
  readonly label: string;
  readonly state: GravitationalFieldsState;
}[] = [
  { label: "Earth surface", state: defaultState },
  {
    label: "double distance",
    state: { ...defaultState, radiusEarthRadii: 2, comparisonRadiusEarthRadii: 1 },
  },
  {
    label: "massive planet",
    state: {
      sourceMassEarthMasses: 4,
      radiusEarthRadii: 2,
      testMassKilograms: kilograms(1000),
      comparisonRadiusEarthRadii: 4,
    },
  },
  {
    label: "heavy probe",
    state: { ...defaultState, testMassKilograms: kilograms(4000), comparisonRadiusEarthRadii: 2 },
  },
];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const currentState = (state: Partial<GravitationalFieldsState>): GravitationalFieldsState => ({
  sourceMassEarthMasses: clamp(state.sourceMassEarthMasses ?? defaultState.sourceMassEarthMasses, 0.5, 8),
  radiusEarthRadii: clamp(state.radiusEarthRadii ?? defaultState.radiusEarthRadii, 1, 8),
  testMassKilograms: kilograms(clamp(state.testMassKilograms ?? defaultState.testMassKilograms, 100, 5000)),
  comparisonRadiusEarthRadii: clamp(
    state.comparisonRadiusEarthRadii ?? defaultState.comparisonRadiusEarthRadii,
    1,
    8,
  ),
});

const roundTo = (value: number, places: number): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const formatNumber = (value: number, places = 2): string => roundTo(value, places).toFixed(places);
const formatScientific = (value: number, places = 3): string => value.toExponential(places);

const radiusMetresFromEarthRadii = (earthRadii: number): Metres =>
  metres(earthRadii * earthRadiusMetres);

const sourceMassKilogramsFromEarthMasses = (earthMasses: number): Kilograms =>
  kilograms(earthMasses * earthMassKilograms);

export const gravitationalFieldsModel = (
  state: GravitationalFieldsState,
): KernelResult<GravitationalFieldsModel> => {
  const sourceMassKilograms = sourceMassKilogramsFromEarthMasses(state.sourceMassEarthMasses);
  const radiusMetres = radiusMetresFromEarthRadii(state.radiusEarthRadii);
  const comparisonRadiusMetres = radiusMetresFromEarthRadii(state.comparisonRadiusEarthRadii);

  const field = gravitationalFieldStrength({ sourceMassKilograms, radiusMetres });
  if (!field.ok) return field;
  const force = gravitationalForce({
    sourceMassKilograms,
    testMassKilograms: state.testMassKilograms,
    radiusMetres,
  });
  if (!force.ok) return force;
  const potential = gravitationalPotential({ sourceMassKilograms, radiusMetres });
  if (!potential.ok) return potential;
  const potentialEnergy = gravitationalPotentialEnergy({
    sourceMassKilograms,
    testMassKilograms: state.testMassKilograms,
    radiusMetres,
  });
  if (!potentialEnergy.ok) return potentialEnergy;
  const orbitSpeed = circularOrbitSpeed({ sourceMassKilograms, radiusMetres });
  if (!orbitSpeed.ok) return orbitSpeed;
  const comparisonField = gravitationalFieldStrength({
    sourceMassKilograms,
    radiusMetres: comparisonRadiusMetres,
  });
  if (!comparisonField.ok) return comparisonField;
  const inverseSquareRatio = gravitationalFieldStrengthRatio({
    sourceMassKilograms,
    radiusMetres,
    comparisonRadiusMetres,
  });
  if (!inverseSquareRatio.ok) return inverseSquareRatio;
  const inverseSquareScale = gravitationalFieldStrengthRatio({
    sourceMassKilograms,
    radiusMetres: radiusMetresFromEarthRadii(1),
    comparisonRadiusMetres: radiusMetres,
  });
  if (!inverseSquareScale.ok) return inverseSquareScale;
  const acceleration = gravitationalAccelerationFromForce({
    sourceMassKilograms,
    testMassKilograms: state.testMassKilograms,
    radiusMetres,
  });
  if (!acceleration.ok) return acceleration;

  const interpretation =
    state.testMassKilograms > 2500
      ? "The probe is heavier, so the force is larger, but the field strength at the point is unchanged."
      : "Field strength belongs to the source mass and radius; the probe mass only changes the force it feels.";

  return ok({
    sourceMassKilograms,
    radiusMetres,
    comparisonRadiusMetres,
    testMassKilograms: state.testMassKilograms,
    fieldStrengthNewtonsPerKilogram: field.value,
    forceNewtons: force.value,
    accelerationMetresPerSecondSquared: acceleration.value,
    potentialJoulesPerKilogram: potential.value,
    potentialEnergyJoules: potentialEnergy.value,
    orbitSpeedMetresPerSecond: orbitSpeed.value,
    comparisonFieldStrengthNewtonsPerKilogram: comparisonField.value,
    inverseSquareRatio: inverseSquareRatio.value,
    fieldExpressionScale: inverseSquareScale.value,
    interpretation,
  });
};

export const GravitationalFieldDiagram = ({
  state,
  model,
}: {
  readonly state: GravitationalFieldsState;
  readonly model: GravitationalFieldsModel;
}) => {
  const orbitRadius = 34 + state.radiusEarthRadii * 18;
  const probeX = 180 + orbitRadius;
  const arrowLength = Math.min(88, 28 + model.fieldStrengthNewtonsPerKilogram * 4);
  const field = (x: number, y: number): readonly [number, number] => {
    const sample = gravitationalFieldVector2D({
      sourceMassKilograms: model.sourceMassKilograms,
      xMetres: metres(x * earthRadiusMetres),
      yMetres: metres(y * earthRadiusMetres),
    });
    return sample.ok ? [sample.value.x / 10, sample.value.y / 10] : [0, 0];
  };
  const potentialCurve = (r: number): number => {
    const potential = gravitationalPotential({
      sourceMassKilograms: model.sourceMassKilograms,
      radiusMetres: radiusMetresFromEarthRadii(r),
    });
    return potential.ok ? potential.value / 10_000_000 : Number.NaN;
  };

  return (
    <div aria-label="Gravitational field visual" className="energy-stage">
      <svg aria-label="Field direction and orbit radius diagram" role="img" viewBox="0 0 400 240">
        <defs>
          <marker id="gravity-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
            <path d="M0,0 L8,4 L0,8 Z" fill="#1f5f8b" />
          </marker>
        </defs>
        <rect fill="#f8fbff" height="240" rx="18" width="400" />
        <circle cx="180" cy="120" fill="#f0b429" r={18 + state.sourceMassEarthMasses * 2} />
        <circle cx="180" cy="120" fill="none" r={orbitRadius} stroke="#94a3b8" strokeDasharray="6 6" />
        <circle cx={probeX} cy="120" fill="#1f5f8b" r="10" />
        <line
          markerEnd="url(#gravity-arrow)"
          stroke="#1f5f8b"
          strokeLinecap="round"
          strokeWidth="5"
          x1={probeX}
          x2={probeX - arrowLength}
          y1="120"
          y2="120"
        />
        <text fill="#10201a" fontSize="12" fontWeight="800" x="28" y="34">
          source mass = {formatNumber(state.sourceMassEarthMasses, 1)} Earth masses
        </text>
        <text fill="#10201a" fontSize="12" fontWeight="800" x="28" y="214">
          field point radius = {formatNumber(state.radiusEarthRadii, 2)} Earth radii
        </text>
      </svg>
      <div aria-label="Field vector sample">
        <VectorFieldPlot
          density={8}
          field={field}
          normalize
          region={{ x: { min: -4, max: 4 }, y: { min: -4, max: 4 } }}
        />
      </div>
      <div aria-label="Potential curve">
        <FunctionPlot
          domain={{ min: 1, max: 8 }}
          f={potentialCurve}
          range={{ min: -8, max: 0 }}
          samples={120}
        />
      </div>
    </div>
  );
};

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<GravitationalFieldsState>();
  const current = currentState(state);
  const model = useMemo(() => gravitationalFieldsModel(current), [current]);

  return (
    <section aria-label="Gravitational field controls" className="vector-lab vector-lab--product">
      <div className="vector-controls vector-controls--product" aria-label="Field controls">
        <p className="lab-kicker">Tune the field</p>
        <ControlGroup legend="Gravitational field controls">
          <Slider
            label="Source mass"
            max={8}
            min={0.5}
            onChange={(value) => set("sourceMassEarthMasses", value)}
            step={0.5}
            unit="Earth masses"
            value={current.sourceMassEarthMasses}
          />
          <Slider
            label="Field point radius"
            max={8}
            min={1}
            onChange={(value) => set("radiusEarthRadii", value)}
            step={0.25}
            unit="Earth radii"
            value={current.radiusEarthRadii}
          />
          <Slider
            label="Probe mass"
            max={5000}
            min={100}
            onChange={(value) => set("testMassKilograms", kilograms(value))}
            step={100}
            unit="kg"
            value={current.testMassKilograms}
          />
          <Slider
            label="Comparison radius"
            max={8}
            min={1}
            onChange={(value) => set("comparisonRadiusEarthRadii", value)}
            step={0.25}
            unit="Earth radii"
            value={current.comparisonRadiusEarthRadii}
          />
        </ControlGroup>
        <div className="preset-strip" aria-label="Scenario presets">
          {presets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                set("sourceMassEarthMasses", preset.state.sourceMassEarthMasses);
                set("radiusEarthRadii", preset.state.radiusEarthRadii);
                set("testMassKilograms", preset.state.testMassKilograms);
                set("comparisonRadiusEarthRadii", preset.state.comparisonRadiusEarthRadii);
              }}
              type="button"
            >
              {preset.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => stage.advance()}>
          Reveal field strength
        </button>
      </div>
      <section className="formula-panel formula-panel--product" aria-label="Before reveal cue">
        <p className="lab-kicker">Before reveal</p>
        <h3>Distance changes the field fastest</h3>
        <p>
          Move the probe and compare two radii. The field arrow points inward, but the strength is
          controlled by the square of the distance from the centre.
        </p>
        {model.ok ? (
          <p>
            Your current radius gives an inverse-square scale of{" "}
            {formatNumber(model.value.fieldExpressionScale, 3)} before the full readout is shown.
          </p>
        ) : (
          <p role="alert">The current field settings need finite positive values.</p>
        )}
      </section>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const state = currentState(useSimState<Partial<GravitationalFieldsState>>());
  const model = gravitationalFieldsModel(state);

  if (!model.ok) {
    return <p role="alert">The current gravitational field settings are outside the supported range.</p>;
  }

  return (
    <section aria-label="Observation unlocked" className="vector-lab vector-lab--product">
      <div className="vector-stage vector-stage--product">
        <GravitationalFieldDiagram model={model.value} state={state} />
        <dl aria-label="Gravitational field readout" className="result-readout result-readout--cards">
          <div>
            <dt>Field strength</dt>
            <dd>{formatNumber(model.value.fieldStrengthNewtonsPerKilogram, 3)} N kg^-1</dd>
          </div>
          <div>
            <dt>Force on probe</dt>
            <dd>{formatScientific(model.value.forceNewtons)} N</dd>
          </div>
          <div>
            <dt>Potential</dt>
            <dd>{formatScientific(model.value.potentialJoulesPerKilogram)} J kg^-1</dd>
          </div>
          <div>
            <dt>Orbit speed</dt>
            <dd>{formatNumber(model.value.orbitSpeedMetresPerSecond, 1)} m s^-1</dd>
          </div>
        </dl>
      </div>
      <section className="formula-panel formula-panel--product" aria-label="Formula used">
        <p className="lab-kicker">Formula used</p>
        <h3>Inverse square, inward field</h3>
        <pre className="formula-code" aria-label="Gravitational field formula">
          <code>
            <span className="formula-var formula-var--blue">g</span>
            {" = "}
            <span className="formula-var formula-var--orange">GM</span>
            {" / "}
            <span className="formula-var formula-var--green">r^2</span>
            {"\n"}
            <span className="formula-var formula-var--purple">phi</span>
            {" = -"}
            <span className="formula-var formula-var--orange">GM</span>
            {" / "}
            <span className="formula-var formula-var--green">r</span>
            {"\n"}
            <span className="formula-var formula-var--blue">F</span>
            {" = "}
            <span className="formula-var formula-var--blue">m g</span>
            {"; "}
            <span className="formula-var formula-var--purple">E_p</span>
            {" = "}
            <span className="formula-var formula-var--blue">m</span>
            <span className="formula-var formula-var--purple"> phi</span>
            {"\n"}
            <span className="formula-var formula-var--purple">v</span>
            {" = sqrt("}
            <span className="formula-var formula-var--orange">GM</span>
            {" / "}
            <span className="formula-var formula-var--green">r</span>
            {")"}
          </code>
        </pre>
        <dl className="formula-legend" aria-label="Formula legend">
          <div>
            <dt><span aria-hidden="true" className="legend-swatch legend-swatch--blue" /> g, F, m</dt>
            <dd>field strength, force on the probe, and probe mass</dd>
          </div>
          <div>
            <dt><span aria-hidden="true" className="legend-swatch legend-swatch--orange" /> G, M</dt>
            <dd>universal gravitational constant and source mass</dd>
          </div>
          <div>
            <dt><span aria-hidden="true" className="legend-swatch legend-swatch--green" /> r</dt>
            <dd>distance from the centre of the source mass</dd>
          </div>
          <div>
            <dt><span aria-hidden="true" className="legend-swatch legend-swatch--purple" /> phi, E_p, v</dt>
            <dd>potential per kilogram, potential energy, and circular-orbit speed</dd>
          </div>
        </dl>
        <p>
          g = ({formatScientific(universalGravitationalConstant)} N m^2 kg^-2)(
          {formatScientific(model.value.sourceMassKilograms)} kg) / (
          {formatScientific(model.value.radiusMetres)} m)^2 ={" "}
          {formatNumber(model.value.fieldStrengthNewtonsPerKilogram, 3)} N kg^-1.
        </p>
        <p>
          At {formatNumber(state.comparisonRadiusEarthRadii, 2)} Earth radii, g ={" "}
          {formatNumber(model.value.comparisonFieldStrengthNewtonsPerKilogram, 3)} N kg^-1, which is{" "}
          {formatNumber(model.value.inverseSquareRatio, 3)} times the current field.
        </p>
        <p>
          phi = -GM/r = {formatScientific(model.value.potentialJoulesPerKilogram)} J kg^-1, so E_p = m phi ={" "}
          {formatScientific(model.value.potentialEnergyJoules)} J for this probe.
        </p>
        <p>
          v = sqrt(GM/r) = sqrt(({formatScientific(universalGravitationalConstant)})(
          {formatScientific(model.value.sourceMassKilograms)}) / {formatScientific(model.value.radiusMetres)}) ={" "}
          {formatNumber(model.value.orbitSpeedMetresPerSecond, 1)} m s^-1.
        </p>
        <p className="formula-note">{model.value.interpretation}</p>
        <button type="button" onClick={() => stage.advance()}>
          Explain the comparison
        </button>
      </section>
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();

  return (
    <section aria-label="Transfer prompt" className="formula-panel formula-panel--product">
      <p className="lab-kicker">Transfer</p>
      <h3>Electric-field analogy</h3>
      <p>
        Imagine replacing the planet with a positive point charge. Which parts of the argument still
        use an inverse square, and which sign or direction conventions must change?
      </p>
      <p className="formula-note">
        Keep the structure: source property creates a field; a test object feels force because of
        that field.
      </p>
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
    <section aria-label="Prediction setup" className="formula-panel formula-panel--product">
      <p className="lab-kicker">Prediction checkpoint</p>
      <h3>How quickly does gravity weaken?</h3>
      <p>
        Commit a prediction before the field vectors, potential curve, and numerical readouts are
        revealed.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Set up field lab
      </button>
    </section>
  );
};

export const GravitationalFieldsSim = () => (
  <SimRuntime spec={gravitationalFieldsSpec} packageId={gravitationalFieldsPackageId}>
    <StageSurface />
  </SimRuntime>
);

export default GravitationalFieldsSim;
