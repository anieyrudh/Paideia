import { PredictionGate, type PredictionScope } from "@paideia/prediction-gate";
import {
  activityId,
  criticalPath,
  duration,
  type Activity,
  type CriticalPathResult,
} from "@paideia/scheduling";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import type { ConceptPackageId, KernelResult } from "@paideia/shared";
import { err, ok } from "@paideia/shared";
import { ControlGroup, Slider } from "@paideia/ui-sim";
import type { TSimulationSpec } from "@paideia/content-schema";

export interface SchedulingProjectState {
  readonly requirements: number;
  readonly procurement: number;
  readonly prototype: number;
  readonly tooling: number;
  readonly pilot: number;
  readonly training: number;
  readonly launch: number;
}

export interface SchedulingProjectModel {
  readonly state: SchedulingProjectState;
  readonly result: CriticalPathResult;
  readonly criticalLabels: readonly string[];
  readonly nearCriticalLabels: readonly string[];
}

const labels = {
  requirements: "A Requirements",
  procurement: "B Procurement",
  prototype: "C Prototype",
  tooling: "D Tooling",
  pilot: "E Pilot",
  training: "F Training",
  launch: "G Launch",
} as const;

const defaultState: SchedulingProjectState = {
  requirements: 3,
  procurement: 4,
  prototype: 5,
  tooling: 6,
  pilot: 3,
  training: 4,
  launch: 2,
};

export const schedulingProjectPackageId =
  "sutd/40-012-manufacturing-and-service-operations-mso/scheduling-and-project-management" as ConceptPackageId;

export const schedulingProjectSimId = "schedule-critical-path-lab";

const activity = (
  id: keyof SchedulingProjectState | "launch",
  days: number,
  predecessors: readonly (keyof SchedulingProjectState | "launch")[] = [],
): KernelResult<Activity> => {
  const parsedId = activityId(id);
  const parsedDuration = duration(days);
  if (!parsedId.ok) return parsedId;
  if (!parsedDuration.ok) return parsedDuration;
  const parsedPredecessors = predecessors.map(activityId);
  const failed = parsedPredecessors.find((item) => !item.ok);
  if (failed !== undefined && !failed.ok) return failed;
  return ok({
    id: parsedId.value,
    duration: parsedDuration.value,
    predecessors: parsedPredecessors.map((item) => (item as { ok: true; value: Activity["id"] }).value),
  });
};

const clampDays = (value: number, min = 1, max = 12): number =>
  Math.min(max, Math.max(min, Math.round(Number.isFinite(value) ? value : min)));

const normalizeState = (input: Partial<SchedulingProjectState>): SchedulingProjectState => ({
  requirements: clampDays(input.requirements ?? defaultState.requirements),
  procurement: clampDays(input.procurement ?? defaultState.procurement),
  prototype: clampDays(input.prototype ?? defaultState.prototype),
  tooling: clampDays(input.tooling ?? defaultState.tooling),
  pilot: clampDays(input.pilot ?? defaultState.pilot),
  training: clampDays(input.training ?? defaultState.training),
  launch: clampDays(input.launch ?? defaultState.launch, 1, 6),
});

const schedulingPredictSpec = {
  prompt: "Predict the project duration in working days before the CPM calculation is revealed.",
  commit_format: { kind: "value", unit: "days" },
  rationale_required: true,
} as const;

export const schedulingProjectPredict = (state: SchedulingProjectState): KernelResult<number> => {
  const model = schedulingProjectModel(state);
  if (!model.ok) return model;
  return ok(model.value.result.projectDuration);
};

export const schedulingProjectModel = (
  input: Partial<SchedulingProjectState> = defaultState,
): KernelResult<SchedulingProjectModel> => {
  const state = normalizeState(input);
  const activities = [
    activity("requirements", state.requirements),
    activity("procurement", state.procurement, ["requirements"]),
    activity("prototype", state.prototype, ["requirements"]),
    activity("tooling", state.tooling, ["procurement"]),
    activity("pilot", state.pilot, ["prototype", "tooling"]),
    activity("training", state.training, ["prototype"]),
    activity("launch", state.launch, ["pilot", "training"]),
  ];
  const failed = activities.find((item) => !item.ok);
  if (failed !== undefined && !failed.ok) return failed;
  const result = criticalPath(activities.map((item) => (item as { ok: true; value: Activity }).value));
  if (!result.ok) return err(result.error.code, result.error.message);
  return ok({
    state,
    result: result.value,
    criticalLabels: result.value.criticalPath.map((id) => activityLabel(String(id))),
    nearCriticalLabels: result.value.activities
      .filter((item) => !item.critical && item.slack <= 2)
      .map((item) => activityLabel(String(item.id))),
  });
};

export const schedulingProjectSpec: TSimulationSpec = {
  id: schedulingProjectSimId,
  title: "Schedule Critical Path Lab",
  interaction_type: "systems-flow-diagram",
  kernel_deps: [
    "core/content-schema",
    "core/shared",
    "core/scheduling",
    "core/algorithm-trace",
    "core/prediction-gate",
    "core/ui-sim",
  ],
  manipulate: {
    controls: [
      {
        id: "prototype-duration",
        label: "Prototype duration",
        kind: "slider",
        kernel_binding: "state.prototype",
        bounds: { min: 1, max: 12, step: 1 },
      },
      {
        id: "tooling-duration",
        label: "Tooling duration",
        kind: "slider",
        kernel_binding: "state.tooling",
        bounds: { min: 1, max: 12, step: 1 },
      },
      {
        id: "training-duration",
        label: "Training duration",
        kind: "slider",
        kernel_binding: "state.training",
        bounds: { min: 1, max: 12, step: 1 },
      },
    ],
  },
  predict: schedulingPredictSpec,
  observe: {
    renderers: [
      {
        id: "critical-path-readout",
        module: "@paideia/sutd-sims/scheduling-and-project-management",
        symbol: "SchedulingAndProjectManagement",
        props_binding:
          "Render CPM network, critical path, slack table, formula legend, substitution, units, and interpretation.",
      },
    ],
  },
  explain: {
    prompt: "Explain why an activity with positive slack can slip without moving launch.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "The longest activity always controls project duration.",
      "Every activity delay changes the completion date.",
    ],
  },
};

const activityLabel = (id: string): string =>
  labels[id as keyof typeof labels] ?? id.toUpperCase();

const fmt = (value: number): string => `${value.toFixed(0)} d`;

const ManipulateStage = () => {
  const stage = useStage();
  const state = normalizeState(useSimState<Partial<SchedulingProjectState>>());
  const manipulate = useManipulate<SchedulingProjectState>();
  const model = schedulingProjectModel(state);
  if (!model.ok) {
    return <p role="alert">The critical-path model could not be evaluated.</p>;
  }
  const set = <K extends keyof SchedulingProjectState>(key: K, value: SchedulingProjectState[K]) => {
    manipulate.set(key, value);
  };

  return (
    <section aria-label="Schedule setup" role="region" style={styles.surface}>
      <div style={styles.layout}>
        <section style={styles.panel}>
          <p style={styles.kicker}>Manipulate</p>
          <h1 style={styles.h1}>Tune the activity durations</h1>
          <ControlGroup legend="Project durations">
            <div style={styles.controlStack}>
              <Slider
                label="Prototype duration"
                max={12}
                min={1}
                onChange={(prototype) => set("prototype", prototype)}
                step={1}
                unit="days"
                value={state.prototype}
              />
              <Slider
                label="Tooling duration"
                max={12}
                min={1}
                onChange={(tooling) => set("tooling", tooling)}
                step={1}
                unit="days"
                value={state.tooling}
              />
              <Slider
                label="Training duration"
                max={12}
                min={1}
                onChange={(training) => set("training", training)}
                step={1}
                unit="days"
                value={state.training}
              />
            </div>
          </ControlGroup>
          <button onClick={() => stage.advance()} style={styles.primaryButton} type="button">
            Reveal CPM
          </button>
        </section>
        <ScheduleNetwork model={model.value} revealed={false} />
      </div>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const model = schedulingProjectModel(useSimState<Partial<SchedulingProjectState>>());
  if (!model.ok) {
    return <p role="alert">The critical-path model could not be evaluated.</p>;
  }
  return (
    <section aria-label="Observation unlocked" role="region" style={styles.surface}>
      <div style={styles.metricGrid}>
        <Metric label="Project duration" note="earliest launch finish" value={fmt(model.value.result.projectDuration)} />
        <Metric label="Critical path" note="zero-slack activity chain" value={model.value.criticalLabels.join(" -> ")} />
        <Metric
          label="Near-critical work"
          note="non-critical activities with slack <= 2 d"
          value={model.value.nearCriticalLabels.join(", ") || "None"}
        />
      </div>
      <div style={styles.layout}>
        <ScheduleNetwork model={model.value} revealed />
        <FormulaPanel model={model.value} />
      </div>
      <button onClick={() => stage.advance()} style={styles.primaryButton} type="button">
        Transfer
      </button>
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();
  return (
    <section aria-label="Transfer challenge" role="region" style={styles.surface}>
      <section style={styles.panel}>
        <p style={styles.kicker}>Transfer</p>
        <h2 style={styles.h2}>Clinic fit-out launch</h2>
        <p>
          A clinic fit-out has design, procurement, installation, staff training, and
          licensing activities. Draw the predecessor network, compute earliest and
          latest times, then explain which delay changes the launch date.
        </p>
        <button onClick={() => stage.reset()} style={styles.primaryButton} type="button">
          Try another project
        </button>
      </section>
    </section>
  );
};

const PredictStage = () => (
  <section aria-label="Prediction setup" role="region" style={styles.surface}>
    <section style={styles.panel}>
      <p style={styles.kicker}>Predict</p>
      <h1 style={styles.h1}>Which path controls the launch?</h1>
      <PredictionGate
        packageId={schedulingProjectPackageId}
        predict={schedulingProjectSpec.predict ?? schedulingPredictSpec}
        simId={schedulingProjectSpec.id as PredictionScope}
      >
        <StageAdvanceButton />
      </PredictionGate>
    </section>
  </section>
);

const StageAdvanceButton = () => {
  const stage = useStage();
  return (
    <button onClick={() => stage.advance()} style={styles.primaryButton} type="button">
      Build schedule
    </button>
  );
};

const StageSurface = () => {
  const stage = useStage();
  if (stage.current === "manipulate") return <ManipulateStage />;
  if (stage.current === "observe") return <ObserveStage />;
  if (stage.current === "explain") return <ExplainStage />;
  return <PredictStage />;
};

const ScheduleNetwork = ({
  model,
  revealed,
}: {
  readonly model: SchedulingProjectModel;
  readonly revealed: boolean;
}) => {
  const timing = new Map(model.result.activities.map((item) => [String(item.id), item]));
  const node = (id: keyof typeof labels, x: number, y: number) => {
    const item = timing.get(id);
    const critical = item?.critical ?? false;
    return (
      <g key={id}>
        <rect
          fill={critical && revealed ? "#f3d7ca" : "#edf4f7"}
          height="54"
          rx="7"
          stroke={critical && revealed ? "#b6402a" : "#497180"}
          strokeWidth="2"
          width="126"
          x={x}
          y={y}
        />
        <text fill="#14242b" fontSize="12" fontWeight="700" x={x + 10} y={y + 20}>
          {activityLabel(id)}
        </text>
        <text fill="#38535d" fontSize="12" x={x + 10} y={y + 38}>
          {revealed && item !== undefined
            ? `ES ${item.earliestStart}, EF ${item.earliestFinish}, slack ${item.slack}`
            : `duration ${model.state[id]} d`}
        </text>
      </g>
    );
  };
  return (
    <section aria-label="Critical path network" style={styles.panel}>
      <p style={styles.kicker}>Visual model</p>
      <h2 style={styles.h2}>Activity-on-node network</h2>
      <svg aria-label="Project network diagram" role="img" viewBox="0 0 720 280" style={styles.svg}>
        <defs>
          <marker id="arrow-scheduling" markerHeight="7" markerWidth="8" orient="auto" refX="7" refY="3.5">
            <path d="M0,0 L8,3.5 L0,7 Z" fill="#44636e" />
          </marker>
        </defs>
        {[
          ["A", 146, 73, 184, 73],
          ["A", 146, 73, 184, 173],
          ["B", 310, 73, 350, 73],
          ["C", 310, 173, 350, 73],
          ["C", 310, 173, 350, 173],
          ["D", 476, 73, 518, 124],
          ["E", 476, 173, 518, 124],
          ["F", 476, 73, 518, 124],
        ].map((edge, index) => (
          <line
            key={index}
            markerEnd="url(#arrow-scheduling)"
            stroke="#44636e"
            strokeWidth="2"
            x1={edge[1] as number}
            x2={edge[3] as number}
            y1={edge[2] as number}
            y2={edge[4] as number}
          />
        ))}
        {node("requirements", 20, 46)}
        {node("procurement", 184, 46)}
        {node("prototype", 184, 146)}
        {node("tooling", 350, 46)}
        {node("training", 350, 146)}
        {node("pilot", 518, 96)}
        {node("launch", 518, 196)}
      </svg>
      <p style={styles.interpretation}>
        {revealed
          ? `Critical chain: ${model.criticalLabels.join(" -> ")}. A delay on this chain moves launch.`
          : "Adjust activity durations, then commit a prediction to reveal slack and the controlling chain."}
      </p>
    </section>
  );
};

const FormulaPanel = ({ model }: { readonly model: SchedulingProjectModel }) => {
  const pilot = model.result.activities.find((item) => String(item.id) === "pilot");
  return (
    <section aria-label="Formula panel" style={styles.panel}>
      <p style={styles.kicker}>Formula</p>
      <h2 style={styles.h2}>CPM forward and backward pass</h2>
      <pre style={styles.formula}>{`EF_i = ES_i + d_i
ES_i = max(EF_p for predecessor p)
slack_i = LS_i - ES_i`}</pre>
      <div style={styles.legendGrid}>
        <span style={{ ...styles.legendMark, background: "#b6402a" }} />
        <span>Red nodes: critical activities with zero slack.</span>
        <span style={{ ...styles.legendMark, background: "#497180" }} />
        <span>Blue nodes: non-critical activities with positive slack.</span>
      </div>
      <p style={styles.substitution}>
        Substitution for pilot: ES = max(EF prototype, EF tooling) =
        max({model.state.requirements + model.state.prototype} d,{" "}
        {model.state.requirements + model.state.procurement + model.state.tooling} d)
        = {pilot?.earliestStart ?? 0} d.
      </p>
      <p style={styles.interpretation}>
        Result: project duration is {fmt(model.result.projectDuration)}. Slack is
        measured in days; zero slack means any delay changes the launch date unless
        another activity is shortened.
      </p>
    </section>
  );
};

const Metric = ({
  label,
  note,
  value,
}: {
  readonly label: string;
  readonly note: string;
  readonly value: string;
}) => (
  <section style={styles.metric}>
    <span style={styles.metricLabel}>{label}</span>
    <strong style={styles.metricValue}>{value}</strong>
    <span>{note}</span>
  </section>
);

const styles = {
  surface: {
    color: "#172026",
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    padding: "1rem",
  },
  layout: {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: "repeat(auto-fit, minmax(20rem, 1fr))",
  },
  panel: {
    background: "#ffffff",
    border: "1px solid #c8d7cf",
    borderRadius: "8px",
    padding: "1rem",
  },
  kicker: {
    color: "#54645c",
    fontSize: "0.76rem",
    fontWeight: 700,
    letterSpacing: 0,
    margin: "0 0 0.35rem",
    textTransform: "uppercase",
  },
  h1: { fontSize: "2rem", lineHeight: 1.08, margin: "0 0 0.75rem" },
  h2: { fontSize: "1.35rem", lineHeight: 1.15, margin: "0 0 0.75rem" },
  controlStack: { display: "grid", gap: "0.8rem" },
  primaryButton: {
    background: "#155e63",
    border: "1px solid #155e63",
    borderRadius: "6px",
    color: "#ffffff",
    fontWeight: 700,
    marginTop: "1rem",
    padding: "0.65rem 0.9rem",
  },
  metricGrid: {
    display: "grid",
    gap: "0.75rem",
    gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))",
    marginBottom: "1rem",
  },
  metric: {
    background: "#f3f8f5",
    border: "1px solid #c4d8cd",
    borderRadius: "8px",
    display: "grid",
    gap: "0.2rem",
    padding: "0.85rem",
  },
  metricLabel: { color: "#506357", fontSize: "0.82rem", fontWeight: 700 },
  metricValue: { color: "#123f43", fontSize: "1.25rem", lineHeight: 1.15 },
  svg: { display: "block", maxWidth: "100%", width: "100%" },
  formula: {
    background: "#f6f3ec",
    border: "1px solid #d9ccb7",
    borderRadius: "6px",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    lineHeight: 1.6,
    overflowX: "auto",
    padding: "0.8rem",
    whiteSpace: "pre-wrap",
  },
  legendGrid: {
    display: "grid",
    gap: "0.4rem 0.55rem",
    gridTemplateColumns: "0.9rem 1fr",
    marginTop: "0.8rem",
  },
  legendMark: {
    borderRadius: "999px",
    display: "inline-block",
    height: "0.85rem",
    width: "0.85rem",
  },
  substitution: { marginTop: "0.9rem" },
  interpretation: { marginTop: "0.7rem" },
} as const;

export default function SchedulingAndProjectManagement() {
  return (
    <SimRuntime packageId={schedulingProjectPackageId} spec={schedulingProjectSpec}>
      <StageSurface />
    </SimRuntime>
  );
}
