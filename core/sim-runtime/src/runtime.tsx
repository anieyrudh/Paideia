import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { SimulationSpec, type TSimulationSpec } from "@paideia/content-schema";
import { PredictionGate } from "@paideia/prediction-gate";
import {
  err,
  ok,
  type ConceptPackageId,
  type KernelError,
  type KernelResult,
} from "@paideia/shared";

export type PmoeTStage = "predict" | "manipulate" | "observe" | "explain";

export interface StageTransition {
  readonly from: PmoeTStage;
  readonly to: PmoeTStage;
  readonly t: number;
}

export interface StageController {
  readonly current: PmoeTStage;
  readonly advance: () => KernelResult<void>;
  readonly reset: () => void;
}

export interface ManipulateController<S extends object> {
  readonly state: Readonly<S>;
  readonly set: <K extends keyof S>(k: K, v: S[K]) => void;
}

export interface SimContext<S extends object = Record<string, unknown>> {
  readonly spec: TSimulationSpec;
  readonly store: {
    readonly state: Readonly<S>;
    readonly set: <K extends keyof S>(k: K, v: S[K]) => void;
  };
  readonly stage: StageController;
  readonly transition: StageTransition | null;
}

export interface SimRuntimeProps {
  readonly spec: TSimulationSpec;
  readonly packageId: ConceptPackageId;
  readonly children: ReactNode;
}

interface RuntimeContextValue {
  readonly spec: TSimulationSpec;
  readonly packageId: ConceptPackageId;
  readonly state: Readonly<Record<PropertyKey, unknown>>;
  readonly setStateKey: (key: PropertyKey, value: unknown) => void;
  readonly stage: StageController;
  readonly transition: StageTransition | null;
}

const stageOrder = ["predict", "manipulate", "observe", "explain"] as const;
const transitionMs = 150;

const RuntimeContext = createContext<RuntimeContextValue | null>(null);

const preconditionError = (message: string): KernelError => ({
  code: "precondition-violated",
  message,
});

const throwPrecondition = (message: string): never => {
  throw preconditionError(message);
};

const nextStage = (stage: PmoeTStage): PmoeTStage | null => {
  const index = stageOrder.indexOf(stage);
  return stageOrder[index + 1] ?? null;
};

const runtimeError = (message: string): ReactNode => (
  <section aria-label="Simulation runtime error" role="alert">
    {message}
  </section>
);

const useRuntime = (): RuntimeContextValue => {
  const context = useContext(RuntimeContext);
  if (context === null) {
    return throwPrecondition("SimRuntime hooks must be used inside <SimRuntime>.");
  }
  return context;
};

const immutableStateValue = (value: unknown, seen = new WeakSet<object>()): unknown => {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) {
    return throwPrecondition("SimRuntime state must be acyclic JSON-like data.");
  }
  if (value instanceof Date || value instanceof Map || value instanceof Set) {
    return throwPrecondition("SimRuntime state must not contain mutable built-ins.");
  }
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) {
    return throwPrecondition("SimRuntime state must contain only plain objects, arrays, and primitives.");
  }

  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((entry) => immutableStateValue(entry, seen));
  }

  const source = value as Record<PropertyKey, unknown>;
  const output: Record<PropertyKey, unknown> = {};
  for (const key of Reflect.ownKeys(source)) {
    output[key] = immutableStateValue(source[key], seen);
  }
  return output;
};

const deepFreeze = <T,>(value: T, seen = new WeakSet<object>()): Readonly<T> => {
  if (value === null || typeof value !== "object") return value as Readonly<T>;
  if (seen.has(value)) return value as Readonly<T>;
  seen.add(value);
  const record = value as Record<PropertyKey, unknown>;
  for (const key of Reflect.ownKeys(record)) {
    deepFreeze(record[key], seen);
  }
  return Object.freeze(value) as Readonly<T>;
};

const frozenEmptyState = (): Readonly<Record<PropertyKey, unknown>> => deepFreeze({});

const useFrozenState = (
  state: Readonly<Record<PropertyKey, unknown>>,
): Readonly<Record<PropertyKey, unknown>> =>
  useMemo(() => deepFreeze({ ...state }), [state]);

export const SimRuntime = ({ spec, packageId, children }: SimRuntimeProps) => {
  const parsed = useMemo(() => SimulationSpec.safeParse(spec), [spec]);
  const [current, setCurrent] = useState<PmoeTStage>("manipulate");
  const currentRef = useRef<PmoeTStage>("manipulate");
  const [transition, setTransition] = useState<StageTransition | null>(null);
  const [state, setState] = useState<Readonly<Record<PropertyKey, unknown>>>(() =>
    frozenEmptyState(),
  );
  const frozenState = useFrozenState(state);

  useEffect(() => {
    currentRef.current = "manipulate";
    setCurrent("manipulate");
    setTransition(null);
    setState(frozenEmptyState());
  }, [parsed.success ? parsed.data.id : null, packageId]);

  useEffect(() => {
    if (transition === null) return;
    const handle = setTimeout(() => setTransition(null), transitionMs);
    return () => clearTimeout(handle);
  }, [transition]);

  const advance = useCallback((): KernelResult<void> => {
    const from = currentRef.current;
    const to = nextStage(from);
    if (to === null) {
      return err("precondition-violated", "Cannot advance beyond explain.");
    }
    currentRef.current = to;
    setTransition({ from, to, t: Date.now() });
    setCurrent(to);
    return ok(undefined);
  }, []);

  const reset = useCallback((): void => {
    currentRef.current = "manipulate";
    setCurrent("manipulate");
    setTransition(null);
    setState(frozenEmptyState());
  }, []);

  const setStateKey = useCallback((key: PropertyKey, value: unknown): void => {
    const immutableValue = immutableStateValue(value);
    setState((previous) => deepFreeze({ ...previous, [key]: immutableValue }));
  }, []);

  const stage = useMemo<StageController>(
    () => ({ current, advance, reset }),
    [advance, current, reset],
  );

  if (!parsed.success) {
    return runtimeError("Invalid SimulationSpec: simulation runtime could not mount.");
  }

  const value: RuntimeContextValue = {
    spec: parsed.data,
    packageId,
    state: frozenState,
    setStateKey,
    stage,
    transition,
  };

  const wrappedChildren =
    parsed.data.predict === undefined ? (
      children
    ) : (
      <PredictionGate packageId={packageId} predict={parsed.data.predict} simId={parsed.data.id}>
        {children}
      </PredictionGate>
    );

  return <RuntimeContext.Provider value={value}>{wrappedChildren}</RuntimeContext.Provider>;
};

export const useSimState = <S extends object>(): Readonly<S> => {
  const context = useRuntime();
  return context.state as Readonly<S>;
};

export const useStage = (): StageController => {
  const context = useRuntime();
  return context.stage;
};

export const useTransition = (): StageTransition | null => {
  const context = useRuntime();
  return context.transition;
};

export const useManipulate = <S extends object>(): ManipulateController<S> => {
  const context = useRuntime();
  if (context.stage.current !== "manipulate") {
    return throwPrecondition("useManipulate may only be called during the manipulate stage.");
  }

  return {
    state: context.state as Readonly<S>,
    set: <K extends keyof S>(key: K, value: S[K]): void => {
      context.setStateKey(key, value);
    },
  };
};
