import { useMemo } from "react";
import { LineChart } from "@paideia/charting";
import type { TSimulationSpec } from "@paideia/content-schema";
import { elasticCollision1D, momentum1D } from "@paideia/mechanics";
import type { PredictionEvent } from "@paideia/prediction-gate";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import {
  kilograms,
  metresPerSecond,
  ok,
  type ConceptPackageId,
  type KernelResult,
  type Kilograms,
  type MetresPerSecond,
} from "@paideia/shared";
import { ControlGroup, Slider } from "@paideia/ui-sim";

export const momentumPackageId = "momentum" as ConceptPackageId;
export const momentumSimId = "momentum-collision-lab";
export type MomentumPredictionEvent = PredictionEvent;

export interface MomentumState {
  readonly massAKilograms: Kilograms;
  readonly massBKilograms: Kilograms;
  readonly velocityAMetresPerSecond: MetresPerSecond;
  readonly velocityBMetresPerSecond: MetresPerSecond;
}

export interface MomentumTracePoint {
  readonly moment: "before" | "after";
  readonly cart: "Cart A" | "Cart B" | "total";
  readonly momentumKilogramMetresPerSecond: number;
}

export interface MomentumModel {
  readonly initialMomentumA: number;
  readonly initialMomentumB: number;
  readonly finalMomentumA: number;
  readonly finalMomentumB: number;
  readonly totalInitialMomentum: number;
  readonly totalFinalMomentum: number;
  readonly finalVelocityA: number;
  readonly finalVelocityB: number;
  readonly impulseOnA: number;
  readonly impulseOnB: number;
  readonly kineticEnergyBeforeJoules: number;
  readonly kineticEnergyAfterJoules: number;
  readonly trace: readonly MomentumTracePoint[];
}

export const momentumSpec: TSimulationSpec = {
  id: momentumSimId,
  title: "Collision and Impulse Lab",
  interaction_type: "diagram-builder",
  kernel_deps: [
    "core/sim-runtime",
    "core/content-schema",
    "core/mechanics",
    "core/charting",
    "core/prediction-gate",
    "core/shared",
    "core/ui-sim",
  ],
  predict: {
    prompt:
      "Cart A has mass 0.50 kg and moves at +2.0 m s^-1. Cart B has mass 1.0 kg and moves at -0.5 m s^-1. Before comparing with the elastic collision, what happens to total momentum of the two-cart system?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "Total momentum changes because both speeds change.",
        "Total momentum stays constant if external horizontal force is negligible.",
        "Momentum is conserved only when the cart masses are equal.",
        "Momentum is not conserved because the carts exert forces on each other.",
      ],
      correct_index: 1,
    },
    rationale_required: true,
  },
  manipulate: {
    controls: [
      {
        id: "mass-a",
        label: "Mass of cart A",
        kind: "slider",
        kernel_binding: "state.massAKilograms",
        bounds: { min: 0.2, max: 3, step: 0.1 },
      },
      {
        id: "mass-b",
        label: "Mass of cart B",
        kind: "slider",
        kernel_binding: "state.massBKilograms",
        bounds: { min: 0.2, max: 3, step: 0.1 },
      },
      {
        id: "velocity-a",
        label: "Initial velocity of cart A",
        kind: "slider",
        kernel_binding: "state.velocityAMetresPerSecond",
        bounds: { min: -5, max: 5, step: 0.1 },
      },
      {
        id: "velocity-b",
        label: "Initial velocity of cart B",
        kind: "slider",
        kernel_binding: "state.velocityBMetresPerSecond",
        bounds: { min: -5, max: 5, step: 0.1 },
      },
    ],
  },
  observe: {
    renderers: [
      {
        id: momentumSimId,
        module: "@paideia/a-level-physics-sims/momentum",
        symbol: "MomentumSim",
        props_binding:
          "Show before-and-after momentum, final velocities, impulse on each cart, formula substitution, units, and interpretation.",
      },
    ],
  },
  explain: {
    prompt:
      "Why can each cart's momentum change while the total momentum of the isolated two-cart system stays constant?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Momentum and force are the same quantity.",
      "Momentum conservation needs equal masses.",
      "Conservation means each object keeps its own momentum.",
    ],
  },
};

const defaultState: MomentumState = {
  massAKilograms: kilograms(0.5),
  massBKilograms: kilograms(1),
  velocityAMetresPerSecond: metresPerSecond(2),
  velocityBMetresPerSecond: metresPerSecond(-0.5),
};

const presets: readonly {
  readonly label: string;
  readonly state: MomentumState;
}[] = [
  { label: "unequal carts", state: defaultState },
  {
    label: "equal carts",
    state: {
      massAKilograms: kilograms(1),
      massBKilograms: kilograms(1),
      velocityAMetresPerSecond: metresPerSecond(2),
      velocityBMetresPerSecond: metresPerSecond(-1),
    },
  },
  {
    label: "moving target",
    state: {
      massAKilograms: kilograms(0.8),
      massBKilograms: kilograms(1.4),
      velocityAMetresPerSecond: metresPerSecond(3),
      velocityBMetresPerSecond: metresPerSecond(0.4),
    },
  },
  {
    label: "massive cart B",
    state: {
      massAKilograms: kilograms(0.4),
      massBKilograms: kilograms(2.5),
      velocityAMetresPerSecond: metresPerSecond(3.5),
      velocityBMetresPerSecond: metresPerSecond(-0.2),
    },
  },
];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const currentState = (state: Partial<MomentumState>): MomentumState => ({
  massAKilograms: kilograms(clamp(state.massAKilograms ?? defaultState.massAKilograms, 0.2, 3)),
  massBKilograms: kilograms(clamp(state.massBKilograms ?? defaultState.massBKilograms, 0.2, 3)),
  velocityAMetresPerSecond: metresPerSecond(
    clamp(state.velocityAMetresPerSecond ?? defaultState.velocityAMetresPerSecond, -5, 5),
  ),
  velocityBMetresPerSecond: metresPerSecond(
    clamp(state.velocityBMetresPerSecond ?? defaultState.velocityBMetresPerSecond, -5, 5),
  ),
});

const roundTo = (value: number, places: number): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const formatNumber = (value: number, places = 2): string => roundTo(value, places).toFixed(places);
const formatSigned = (value: number, places = 2): string =>
  value >= 0 ? `+${formatNumber(value, places)}` : formatNumber(value, places);

export const momentumModel = (state: MomentumState): KernelResult<MomentumModel> => {
  const initialA = momentum1D(state.massAKilograms, state.velocityAMetresPerSecond);
  if (!initialA.ok) return initialA;
  const initialB = momentum1D(state.massBKilograms, state.velocityBMetresPerSecond);
  if (!initialB.ok) return initialB;

  const collision = elasticCollision1D({
    mass1Kilograms: state.massAKilograms,
    mass2Kilograms: state.massBKilograms,
    velocity1MetresPerSecond: state.velocityAMetresPerSecond,
    velocity2MetresPerSecond: state.velocityBMetresPerSecond,
  });
  if (!collision.ok) return collision;

  const finalA = momentum1D(state.massAKilograms, collision.value.finalVelocity1MetresPerSecond);
  if (!finalA.ok) return finalA;
  const finalB = momentum1D(state.massBKilograms, collision.value.finalVelocity2MetresPerSecond);
  if (!finalB.ok) return finalB;

  const totalInitial = initialA.value + initialB.value;
  const totalFinal = finalA.value + finalB.value;

  return ok({
    initialMomentumA: initialA.value,
    initialMomentumB: initialB.value,
    finalMomentumA: finalA.value,
    finalMomentumB: finalB.value,
    totalInitialMomentum: totalInitial,
    totalFinalMomentum: totalFinal,
    finalVelocityA: collision.value.finalVelocity1MetresPerSecond,
    finalVelocityB: collision.value.finalVelocity2MetresPerSecond,
    impulseOnA: finalA.value - initialA.value,
    impulseOnB: finalB.value - initialB.value,
    kineticEnergyBeforeJoules: collision.value.totalKineticEnergyBeforeJoules,
    kineticEnergyAfterJoules: collision.value.totalKineticEnergyAfterJoules,
    trace: [
      { moment: "before", cart: "Cart A", momentumKilogramMetresPerSecond: initialA.value },
      { moment: "before", cart: "Cart B", momentumKilogramMetresPerSecond: initialB.value },
      { moment: "before", cart: "total", momentumKilogramMetresPerSecond: totalInitial },
      { moment: "after", cart: "Cart A", momentumKilogramMetresPerSecond: finalA.value },
      { moment: "after", cart: "Cart B", momentumKilogramMetresPerSecond: finalB.value },
      { moment: "after", cart: "total", momentumKilogramMetresPerSecond: totalFinal },
    ],
  });
};

export const MomentumCollisionDiagram = ({
  state,
  model,
}: {
  readonly state: MomentumState;
  readonly model: MomentumModel;
}) => {
  const chartData = model.trace.map((point) => ({
    x: point.moment === "before" ? 0 : 1,
    y: point.momentumKilogramMetresPerSecond,
    series: point.cart,
  }));
  const maxMagnitude = Math.max(
    1,
    ...model.trace.map((point) => Math.abs(point.momentumKilogramMetresPerSecond)),
  );
  const speedScale = 20;
  const beforeAX = 92;
  const beforeBX = 254;
  const afterAX = 92 + model.finalVelocityA * speedScale;
  const afterBX = 254 + model.finalVelocityB * speedScale;

  return (
    <div className="energy-stage" aria-label="Collision visual">
      <svg aria-label="Elastic collision diagram" role="img" viewBox="0 0 360 190">
        <defs>
          <marker id="momentum-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
            <path d="M0,0 L8,4 L0,8 Z" fill="#1f5f8b" />
          </marker>
        </defs>
        <rect fill="#f8fbff" height="190" rx="18" width="360" />
        <line stroke="#cbd5e1" strokeWidth="3" x1="36" x2="324" y1="92" y2="92" />
        <text fill="#10201a" fontSize="12" fontWeight="800" x="40" y="32">
          before
        </text>
        <text fill="#10201a" fontSize="12" fontWeight="800" x="40" y="124">
          after
        </text>
        <rect fill="#f0b429" height="32" rx="7" width="52" x={beforeAX - 26} y="58" />
        <rect fill="#5aa9e6" height="32" rx="7" width="62" x={beforeBX - 31} y="58" />
        <line
          markerEnd="url(#momentum-arrow)"
          stroke="#1f5f8b"
          strokeLinecap="round"
          strokeWidth="5"
          x1={beforeAX}
          x2={beforeAX + state.velocityAMetresPerSecond * speedScale}
          y1="50"
          y2="50"
        />
        <line
          markerEnd="url(#momentum-arrow)"
          stroke="#1f5f8b"
          strokeLinecap="round"
          strokeWidth="5"
          x1={beforeBX}
          x2={beforeBX + state.velocityBMetresPerSecond * speedScale}
          y1="50"
          y2="50"
        />
        <rect fill="#f0b429" height="32" rx="7" width="52" x={afterAX - 26} y="134" />
        <rect fill="#5aa9e6" height="32" rx="7" width="62" x={afterBX - 31} y="134" />
        <line
          markerEnd="url(#momentum-arrow)"
          stroke="#027a48"
          strokeLinecap="round"
          strokeWidth="5"
          x1={afterAX}
          x2={afterAX + model.finalVelocityA * speedScale}
          y1="174"
          y2="174"
        />
        <line
          markerEnd="url(#momentum-arrow)"
          stroke="#027a48"
          strokeLinecap="round"
          strokeWidth="5"
          x1={afterBX}
          x2={afterBX + model.finalVelocityB * speedScale}
          y1="174"
          y2="174"
        />
      </svg>
      <LineChart
        data={chartData}
        x={{ domain: { min: 0, max: 1 } }}
        y={{ domain: { min: -maxMagnitude, max: maxMagnitude } }}
      />
    </div>
  );
};

const setScenario = (
  set: (key: keyof MomentumState, value: MomentumState[keyof MomentumState]) => void,
  state: MomentumState,
) => {
  set("massAKilograms", state.massAKilograms);
  set("massBKilograms", state.massBKilograms);
  set("velocityAMetresPerSecond", state.velocityAMetresPerSecond);
  set("velocityBMetresPerSecond", state.velocityBMetresPerSecond);
};

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<MomentumState>();
  const current = currentState(state);
  const model = useMemo(() => momentumModel(current), [current]);

  return (
    <section aria-label="Collision controls" className="vector-lab vector-lab--product">
      <div className="vector-controls vector-controls--product" aria-label="Momentum controls">
        <p className="lab-kicker">Tune the collision</p>
        <ControlGroup legend="Cart mass and velocity controls">
          <Slider
            label="Mass of cart A"
            max={3}
            min={0.2}
            onChange={(value) => set("massAKilograms", kilograms(value))}
            step={0.1}
            unit="kg"
            value={current.massAKilograms}
          />
          <Slider
            label="Mass of cart B"
            max={3}
            min={0.2}
            onChange={(value) => set("massBKilograms", kilograms(value))}
            step={0.1}
            unit="kg"
            value={current.massBKilograms}
          />
          <Slider
            label="Initial velocity of cart A"
            max={5}
            min={-5}
            onChange={(value) => set("velocityAMetresPerSecond", metresPerSecond(value))}
            step={0.1}
            unit="m s^-1"
            value={current.velocityAMetresPerSecond}
          />
          <Slider
            label="Initial velocity of cart B"
            max={5}
            min={-5}
            onChange={(value) => set("velocityBMetresPerSecond", metresPerSecond(value))}
            step={0.1}
            unit="m s^-1"
            value={current.velocityBMetresPerSecond}
          />
        </ControlGroup>
        <div className="preset-strip" aria-label="Scenario presets">
          {presets.map((preset) => (
            <button key={preset.label} onClick={() => setScenario(set, preset.state)} type="button">
              {preset.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => stage.advance()}>
          Reveal collision result
        </button>
      </div>
      <section className="formula-panel formula-panel--product" aria-label="Before reveal cue">
        <p className="lab-kicker">Before reveal</p>
        <h3>Watch the system, not one cart</h3>
        <p>
          During impact each cart receives an impulse. The question is whether the two-cart
          system receives an external horizontal impulse.
        </p>
        {model.ok ? (
          <p>
            Current total momentum before impact is {formatSigned(model.value.totalInitialMomentum)} kg m s^-1.
            Commit your prediction before the final velocities are shown.
          </p>
        ) : (
          <p role="alert">The current settings need finite values.</p>
        )}
      </section>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const state = currentState(useSimState<Partial<MomentumState>>());
  const model = momentumModel(state);

  if (!model.ok) {
    return <p role="alert">The current collision settings are outside the supported range.</p>;
  }

  return (
    <section aria-label="Observation unlocked" className="vector-lab vector-lab--product">
      <div className="vector-stage vector-stage--product">
        <MomentumCollisionDiagram model={model.value} state={state} />
        <dl aria-label="Momentum readout" className="result-readout result-readout--cards">
          <div>
            <dt>Total momentum before</dt>
            <dd>{formatSigned(model.value.totalInitialMomentum)} kg m s^-1</dd>
          </div>
          <div>
            <dt>Total momentum after</dt>
            <dd>{formatSigned(model.value.totalFinalMomentum)} kg m s^-1</dd>
          </div>
          <div>
            <dt>Impulse on cart A</dt>
            <dd>{formatSigned(model.value.impulseOnA)} N s</dd>
          </div>
        </dl>
      </div>
      <section className="formula-panel formula-panel--product" aria-label="Formula used">
        <p className="lab-kicker">Formula used</p>
        <h3>Total momentum is a system total</h3>
        <p className="formula">p = mv, total p = m_Au_A + m_Bu_B, impulse J = change in p</p>
        <p>
          Before: p = ({formatNumber(state.massAKilograms, 2)} kg)({formatSigned(state.velocityAMetresPerSecond)} m s^-1)
          + ({formatNumber(state.massBKilograms, 2)} kg)({formatSigned(state.velocityBMetresPerSecond)} m s^-1)
          = {formatSigned(model.value.totalInitialMomentum)} kg m s^-1.
        </p>
        <p>
          After the elastic collision: v_A = {formatSigned(model.value.finalVelocityA)} m s^-1 and v_B ={" "}
          {formatSigned(model.value.finalVelocityB)} m s^-1, so total p ={" "}
          {formatSigned(model.value.totalFinalMomentum)} kg m s^-1.
        </p>
        <p>
          Cart A impulse = change in p = {formatSigned(model.value.impulseOnA)} N s. Cart B receives{" "}
          {formatSigned(model.value.impulseOnB)} N s, equal in size and opposite in direction.
        </p>
        <p className="formula-note">
          Interpretation: each cart changes momentum, but the isolated pair keeps the same total
          momentum because their internal impulses cancel.
        </p>
        <button type="button" onClick={() => stage.advance()}>
          Explain the collision
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
      <h3>Choose the system boundary</h3>
      <p>
        Try a preset with unequal masses. Which quantities belong to one cart, and which belong to
        the two-cart system?
      </p>
      <p className="formula-note">
        Use total p before = total p after when external horizontal impulse is negligible.
      </p>
      <button type="button" onClick={() => stage.reset()}>
        Try another collision
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
      <h3>Will total momentum change?</h3>
      <p>
        Commit a prediction before the final velocities appear. The reveal will separate each
        cart's momentum change from the total momentum of the isolated pair.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Set up collision
      </button>
    </section>
  );
};

export const MomentumSim = () => (
  <SimRuntime spec={momentumSpec} packageId={momentumPackageId}>
    <StageSurface />
  </SimRuntime>
);

export default MomentumSim;
