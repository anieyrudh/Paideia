import { useMemo, useState } from "react";
import type { TPredictSpec } from "@paideia/content-schema";
import { netForce, type Vector2 } from "@paideia/mechanics";
import { PredictionGate } from "@paideia/prediction-gate";
import { newtons, ok, type KernelResult, type Newtons } from "@paideia/shared";
import { ControlGroup, Slider } from "@paideia/ui-sim";

export const forcesEquilibriumPackageId = "forces-and-equilibrium";
export const forcesEquilibriumSimId = "force-balance";

export const forceBalancePredict: TPredictSpec = {
  prompt:
    "A 6 N force pulls left and a 5 N weight pulls down. What pair of support forces is needed for equilibrium?",
  commit_format: {
    kind: "multiple-choice",
    options: ["6 N right and 5 N up", "5 N right and 6 N up", "11 N right only", "1 N up only"],
    correct_index: 0,
  },
  rationale_required: true,
};

export interface ForceBalanceState {
  readonly supportRightNewtons: Newtons;
  readonly supportUpNewtons: Newtons;
}

export interface ForceBalanceModel {
  readonly net: Vector2;
  readonly magnitudeNewtons: Newtons;
  readonly isEquilibrium: boolean;
}

const fixedLeftNewtons = 6;
const fixedWeightNewtons = 5;
const toleranceNewtons = 0.25;

const roundTenths = (value: number): number => Math.round(value * 10) / 10;
const formatTenths = (value: number): string => roundTenths(value).toFixed(1);

export const forceBalanceModel = (state: ForceBalanceState): KernelResult<ForceBalanceModel> => {
  const total = netForce([
    { x: -fixedLeftNewtons, y: 0 },
    { x: 0, y: -fixedWeightNewtons },
    { x: state.supportRightNewtons, y: 0 },
    { x: 0, y: state.supportUpNewtons },
  ]);
  if (!total.ok) return total;

  const magnitude = Math.hypot(total.value.x, total.value.y);
  return ok({
    net: total.value,
    magnitudeNewtons: newtons(magnitude),
    isEquilibrium: magnitude <= toleranceNewtons,
  });
};

export const ForceBalanceDiagram = ({ state }: { readonly state: ForceBalanceState }) => {
  const model = forceBalanceModel(state);
  const center = { x: 150, y: 110 };
  const scale = 12;

  const arrow = (dx: number, dy: number, color: string, label: string) => (
    <g aria-label={label} role="img">
      <line
        stroke={color}
        strokeLinecap="round"
        strokeWidth="5"
        x1={center.x}
        x2={center.x + dx * scale}
        y1={center.y}
        y2={center.y - dy * scale}
      />
      <circle cx={center.x + dx * scale} cy={center.y - dy * scale} fill={color} r="5" />
    </g>
  );

  return (
    <svg aria-label="Force balance diagram" role="img" viewBox="0 0 300 220">
      <rect fill="#f8fbff" height="220" rx="18" width="300" />
      <rect fill="#ecfdf3" height="42" rx="8" width="70" x="115" y="89" />
      <text fill="#10201a" fontSize="12" fontWeight="800" x="125" y="114">
        object
      </text>
      {arrow(-fixedLeftNewtons, 0, "#b42318", "6 N left force")}
      {arrow(0, -fixedWeightNewtons, "#7a271a", "5 N weight")}
      {arrow(state.supportRightNewtons, 0, "#1f5f8b", "right support force")}
      {arrow(0, state.supportUpNewtons, "#7657d8", "up support force")}
      {model.ok ? (
        <text fill="#10201a" fontSize="12" fontWeight="800" x="30" y="202">
          Net force = ({formatTenths(model.value.net.x)}, {formatTenths(model.value.net.y)}) N
        </text>
      ) : null}
    </svg>
  );
};

const presets = [
  {
    label: "balanced",
    state: { supportRightNewtons: newtons(6), supportUpNewtons: newtons(5) },
  },
  {
    label: "too little lift",
    state: { supportRightNewtons: newtons(6), supportUpNewtons: newtons(3) },
  },
  {
    label: "sideways drift",
    state: { supportRightNewtons: newtons(8), supportUpNewtons: newtons(5) },
  },
] as const;

export const ForcesAndEquilibriumSim = () => {
  const [state, setState] = useState<ForceBalanceState>({
    supportRightNewtons: newtons(4),
    supportUpNewtons: newtons(4),
  });
  const model = useMemo(() => forceBalanceModel(state), [state]);

  return (
    <PredictionGate
      packageId={forcesEquilibriumPackageId}
      predict={forceBalancePredict}
      simId={forcesEquilibriumSimId}
    >
      <section aria-label="Forces and equilibrium explorer" className="vector-lab vector-lab--product">
        <div className="vector-controls vector-controls--product" aria-label="Force controls">
          <p className="lab-kicker">Balance the object</p>
          <ControlGroup legend="Support force controls">
            <Slider
              label="Right support force"
              max={10}
              min={0}
              onChange={(value) =>
                setState((current) => ({ ...current, supportRightNewtons: newtons(value) }))
              }
              step={0.5}
              unit="N"
              value={state.supportRightNewtons}
            />
            <Slider
              label="Up support force"
              max={10}
              min={0}
              onChange={(value) =>
                setState((current) => ({ ...current, supportUpNewtons: newtons(value) }))
              }
              step={0.5}
              unit="N"
              value={state.supportUpNewtons}
            />
          </ControlGroup>
          <div className="preset-strip" aria-label="Scenario presets">
            {presets.map((preset) => (
              <button key={preset.label} onClick={() => setState(preset.state)} type="button">
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="vector-stage vector-stage--product">
          <ForceBalanceDiagram state={state} />
          {model.ok ? (
            <dl aria-label="Observation unlocked" className="result-readout result-readout--cards">
              <div>
                <dt>Net horizontal force</dt>
                <dd>{formatTenths(model.value.net.x)} N</dd>
              </div>
              <div>
                <dt>Net vertical force</dt>
                <dd>{formatTenths(model.value.net.y)} N</dd>
              </div>
              <div>
                <dt>State</dt>
                <dd>{model.value.isEquilibrium ? "equilibrium" : "not balanced"}</dd>
              </div>
            </dl>
          ) : (
            <p role="alert">The forces cannot be evaluated for the current settings.</p>
          )}
        </div>

        <section className="formula-panel formula-panel--product" aria-label="Formula used">
          <p className="lab-kicker">Why balance works</p>
          <h3>Formula used</h3>
          <p className="formula">For equilibrium: sum Fx = 0 and sum Fy = 0.</p>
          {model.ok ? (
            <>
              <p>
                sum Fx = right support - left pull = {formatTenths(state.supportRightNewtons)} -{" "}
                {fixedLeftNewtons} = {formatTenths(model.value.net.x)} N
              </p>
              <p>
                sum Fy = up support - weight = {formatTenths(state.supportUpNewtons)} -{" "}
                {fixedWeightNewtons} = {formatTenths(model.value.net.y)} N
              </p>
              <p className="formula-note">
                A zero resultant means no acceleration. A non-zero resultant points in the
                direction the object would start to accelerate.
              </p>
            </>
          ) : null}
        </section>
      </section>
    </PredictionGate>
  );
};

export default ForcesAndEquilibriumSim;
