import { err, ok, type Brand, type KernelResult } from "@paideia/shared";

export type SystemVariableId = Brand<string, "SystemsDynamics.VariableId">;

export interface StockSpec {
  readonly id: SystemVariableId;
  readonly label: string;
  readonly initial: number;
  readonly min?: number;
  readonly max?: number;
}

export interface FlowSpec {
  readonly id: SystemVariableId;
  readonly label: string;
  readonly source?: SystemVariableId;
  readonly target?: SystemVariableId;
  readonly rate: (state: SystemState, t: number) => number;
}

export interface AuxiliarySpec {
  readonly id: SystemVariableId;
  readonly label: string;
  readonly compute: (state: SystemState, t: number) => number;
}

export interface SystemModel {
  readonly stocks: readonly StockSpec[];
  readonly flows: readonly FlowSpec[];
  readonly auxiliaries?: readonly AuxiliarySpec[];
}

export type SystemState = Readonly<Record<string, number>>;

export interface TimePoint {
  readonly t: number;
  readonly state: SystemState;
}

export interface SimulationSpec {
  readonly dt: number;
  readonly duration: number;
}

const integerTolerance = 1e-9;
const reservedVariableIds = new Set(["__proto__", "prototype", "constructor"]);

export const systemVariableId = (value: string): KernelResult<SystemVariableId> =>
  value.length > 0 && value.trim() === value && !/\s/.test(value) && !reservedVariableIds.has(value)
    ? ok(value as SystemVariableId)
    : err(
      "precondition-violated",
      "System variable id must be non-empty, trimmed, contain no whitespace, and avoid reserved object keys",
    );

export const validateSystemModel = (
  model: SystemModel,
): KernelResult<SystemModel> => {
  if (model.stocks.length === 0) {
    return err("precondition-violated", "System model requires at least one stock");
  }

  const ids = new Set<string>();
  const stockIds = new Set<string>();

  for (const stock of model.stocks) {
    const validId = systemVariableId(stock.id);
    if (!validId.ok) return validId;
    if (!isTrimmedNonEmpty(stock.label)) {
      return err("precondition-violated", "Stock label must be non-empty and trimmed");
    }
    if (ids.has(stock.id)) {
      return err("precondition-violated", `Duplicate system variable id: ${stock.id}`);
    }
    ids.add(stock.id);
    stockIds.add(stock.id);

    if (!Number.isFinite(stock.initial)) {
      return err("out-of-domain", `Stock ${stock.id} initial value must be finite`);
    }
    const bounds = validateStockBounds(stock);
    if (!bounds.ok) return bounds;
  }

  for (const flow of model.flows) {
    const validFlow = validateFlow(flow, ids, stockIds);
    if (!validFlow.ok) return validFlow;
  }

  for (const auxiliary of model.auxiliaries ?? []) {
    const validId = systemVariableId(auxiliary.id);
    if (!validId.ok) return validId;
    if (!isTrimmedNonEmpty(auxiliary.label)) {
      return err("precondition-violated", "Auxiliary label must be non-empty and trimmed");
    }
    if (ids.has(auxiliary.id)) {
      return err("precondition-violated", `Duplicate system variable id: ${auxiliary.id}`);
    }
    ids.add(auxiliary.id);
  }

  return ok(model);
};

export const initialState = (model: SystemModel): KernelResult<SystemState> => {
  const validModel = validateSystemModel(model);
  if (!validModel.ok) return validModel;

  const state = emptyStateRecord();
  for (const stock of model.stocks) {
    state[stock.id] = stock.initial;
  }

  return ok(state);
};

export const evaluateAuxiliaries = (
  model: SystemModel,
  state: SystemState,
  t: number,
): KernelResult<SystemState> => {
  const validModel = validateSystemModel(model);
  if (!validModel.ok) return validModel;
  const validState = validateState(model, state);
  if (!validState.ok) return validState;
  if (!Number.isFinite(t)) return err("out-of-domain", "Time must be finite");

  const evaluated = copyState(state);
  const callbackState = freezeState(state);
  for (const auxiliary of model.auxiliaries ?? []) {
    const value = evaluateFunction(auxiliary.compute, callbackState, t, `Auxiliary ${auxiliary.id}`);
    if (!value.ok) return value;
    evaluated[auxiliary.id] = value.value;
  }

  return ok(evaluated);
};

export const stepEuler = (
  model: SystemModel,
  state: SystemState,
  t: number,
  dt: number,
): KernelResult<SystemState> => {
  const validModel = validateSystemModel(model);
  if (!validModel.ok) return validModel;
  const validState = validateState(model, state);
  if (!validState.ok) return validState;
  if (!Number.isFinite(t)) return err("out-of-domain", "Time must be finite");
  if (!Number.isFinite(dt) || dt <= 0) {
    return err("out-of-domain", "dt must be a finite positive number");
  }

  const stateForRates = evaluateAuxiliaries(model, state, t);
  if (!stateForRates.ok) return stateForRates;

  const deltas = emptyStateRecord();
  for (const stock of model.stocks) {
    deltas[stock.id] = 0;
  }

  for (const flow of model.flows) {
    const rate = evaluateFunction(flow.rate, stateForRates.value, t, `Flow ${flow.id}`);
    if (!rate.ok) return rate;
    if (flow.source !== undefined) deltas[flow.source] = (deltas[flow.source] ?? 0) - rate.value;
    if (flow.target !== undefined) deltas[flow.target] = (deltas[flow.target] ?? 0) + rate.value;
  }

  const next = emptyStateRecord();
  for (const stock of model.stocks) {
    const current = state[stock.id];
    const delta = deltas[stock.id];
    if (current === undefined || delta === undefined) {
      return err("precondition-violated", `Missing state or delta for stock ${stock.id}`);
    }
    const value = current + dt * delta;
    if (!Number.isFinite(value)) {
      return err("numerical-instability", `Stock ${stock.id} became non-finite`);
    }
    if (stock.min !== undefined && value < stock.min - integerTolerance) {
      return err("out-of-domain", `Stock ${stock.id} fell below min bound`);
    }
    if (stock.max !== undefined && value > stock.max + integerTolerance) {
      return err("out-of-domain", `Stock ${stock.id} exceeded max bound`);
    }
    next[stock.id] = clampRoundoff(value, stock);
  }

  return ok(next);
};

export const simulateSystem = (
  model: SystemModel,
  spec: SimulationSpec,
): KernelResult<readonly TimePoint[]> => {
  const validModel = validateSystemModel(model);
  if (!validModel.ok) return validModel;
  const validSpec = validateSimulationSpec(spec);
  if (!validSpec.ok) return validSpec;

  const start = initialState(model);
  if (!start.ok) return start;

  const steps = Math.round(spec.duration / spec.dt);
  const initialPoint = evaluateAuxiliaries(model, start.value, 0);
  if (!initialPoint.ok) return initialPoint;

  const points: TimePoint[] = [{ t: 0, state: initialPoint.value }];
  let state = start.value;

  for (let step = 0; step < steps; step += 1) {
    const t = step * spec.dt;
    const next = stepEuler(model, state, t, spec.dt);
    if (!next.ok) return next;
    state = next.value;
    const pointT = (step + 1) * spec.dt;
    const pointState = evaluateAuxiliaries(model, state, pointT);
    if (!pointState.ok) return pointState;
    points.push({ t: pointT, state: pointState.value });
  }

  return ok(points);
};

const validateFlow = (
  flow: FlowSpec,
  ids: Set<string>,
  stockIds: ReadonlySet<string>,
): KernelResult<FlowSpec> => {
  const validId = systemVariableId(flow.id);
  if (!validId.ok) return validId;
  if (!isTrimmedNonEmpty(flow.label)) {
    return err("precondition-violated", "Flow label must be non-empty and trimmed");
  }
  if (ids.has(flow.id)) {
    return err("precondition-violated", `Duplicate system variable id: ${flow.id}`);
  }
  ids.add(flow.id);

  if (flow.source === undefined && flow.target === undefined) {
    return err("precondition-violated", `Flow ${flow.id} requires a source or target`);
  }
  if (flow.source !== undefined && !stockIds.has(flow.source)) {
    return err("precondition-violated", `Flow ${flow.id} source must reference a stock`);
  }
  if (flow.target !== undefined && !stockIds.has(flow.target)) {
    return err("precondition-violated", `Flow ${flow.id} target must reference a stock`);
  }

  return ok(flow);
};

const validateStockBounds = (stock: StockSpec): KernelResult<StockSpec> => {
  if (stock.min !== undefined && !Number.isFinite(stock.min)) {
    return err("out-of-domain", `Stock ${stock.id} min bound must be finite`);
  }
  if (stock.max !== undefined && !Number.isFinite(stock.max)) {
    return err("out-of-domain", `Stock ${stock.id} max bound must be finite`);
  }
  if (stock.min !== undefined && stock.max !== undefined && stock.min > stock.max) {
    return err("precondition-violated", `Stock ${stock.id} min must be <= max`);
  }
  if (stock.min !== undefined && stock.initial < stock.min) {
    return err("out-of-domain", `Stock ${stock.id} initial value is below min`);
  }
  if (stock.max !== undefined && stock.initial > stock.max) {
    return err("out-of-domain", `Stock ${stock.id} initial value exceeds max`);
  }

  return ok(stock);
};

const validateState = (
  model: SystemModel,
  state: SystemState,
): KernelResult<SystemState> => {
  for (const stock of model.stocks) {
    if (!Object.prototype.hasOwnProperty.call(state, stock.id)) {
      return err("precondition-violated", `Missing state value for stock ${stock.id}`);
    }
    const value = state[stock.id];
    if (value === undefined) {
      return err("precondition-violated", `Missing state value for stock ${stock.id}`);
    }
    if (!Number.isFinite(value)) {
      return err("out-of-domain", `State value for stock ${stock.id} must be finite`);
    }
  }

  return ok(state);
};

const validateSimulationSpec = (
  spec: SimulationSpec,
): KernelResult<SimulationSpec> => {
  if (!Number.isFinite(spec.dt) || spec.dt <= 0) {
    return err("out-of-domain", "dt must be a finite positive number");
  }
  if (!Number.isFinite(spec.duration) || spec.duration <= 0) {
    return err("out-of-domain", "duration must be a finite positive number");
  }
  const steps = spec.duration / spec.dt;
  if (Math.abs(steps - Math.round(steps)) > integerTolerance) {
    return err("precondition-violated", "duration must be an integer multiple of dt");
  }

  return ok(spec);
};

const evaluateFunction = (
  fn: (state: SystemState, t: number) => number,
  state: SystemState,
  t: number,
  label: string,
): KernelResult<number> => {
  let value: number;
  let repeated: number;
  try {
    value = fn(freezeState(state), t);
    repeated = fn(freezeState(state), t);
  } catch (cause) {
    return err("precondition-violated", `${label} threw while evaluating`, cause);
  }
  if (value !== repeated) {
    return err("precondition-violated", `${label} must be deterministic for the same state and time`);
  }
  return Number.isFinite(value)
    ? ok(value)
    : err("numerical-instability", `${label} returned a non-finite value`);
};

const emptyStateRecord = (): Record<string, number> => Object.create(null) as Record<string, number>;

const copyState = (state: SystemState): Record<string, number> => {
  const copied = emptyStateRecord();
  for (const [key, value] of Object.entries(state)) {
    copied[key] = value;
  }
  return copied;
};

const freezeState = (state: SystemState): SystemState => Object.freeze(copyState(state));

const clampRoundoff = (value: number, stock: StockSpec): number => {
  if (stock.min !== undefined && Math.abs(value - stock.min) <= integerTolerance) {
    return stock.min;
  }
  if (stock.max !== undefined && Math.abs(value - stock.max) <= integerTolerance) {
    return stock.max;
  }
  return value;
};

const isTrimmedNonEmpty = (value: string): boolean =>
  value.length > 0 && value.trim() === value;
