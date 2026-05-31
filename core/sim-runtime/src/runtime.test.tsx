// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import type { TSimulationSpec } from "@paideia/content-schema";
import type { ConceptPackageId } from "@paideia/shared";
import {
  SimRuntime,
  useManipulate,
  useSimState,
  useStage,
  useTransition,
} from "./index.js";

interface SimState {
  readonly mass: number;
}

const packageId = "runtime-test-package" as ConceptPackageId;

const spec: TSimulationSpec = {
  id: "runtime-test-sim",
  title: "Runtime test simulation",
  interaction_type: "function-plot-with-draggable",
  kernel_deps: ["core/function-eval"],
  predict: {
    prompt: "Predict the mass effect before comparing with the observation.",
    commit_format: { kind: "value", unit: "kg" },
    rationale_required: true,
  },
  manipulate: {
    controls: [
      {
        id: "mass",
        label: "Mass",
        kind: "slider",
        kernel_binding: "core/test.mass",
        bounds: { min: 1, max: 10, step: 1 },
      },
    ],
  },
  observe: {
    renderers: [
      {
        id: "plot",
        module: "core/plotting",
        symbol: "FunctionPlot",
        props_binding: "state.mass",
      },
    ],
  },
  explain: {
    prompt: "Explain how the manipulated mass changed the observation.",
    socratic: true,
    expected_misconceptions_surfaced: [],
  },
};

const StagePanel = () => {
  const stage = useStage();
  const transition = useTransition();
  const state = useSimState<Partial<SimState>>();
  return (
    <div>
      <p>stage:{stage.current}</p>
      <p>mass:{state.mass ?? "unset"}</p>
      <p>transition:{transition === null ? "none" : `${transition.from}-${transition.to}`}</p>
      <button onClick={() => stage.advance()} type="button">
        advance
      </button>
      <button onClick={stage.reset} type="button">
        reset
      </button>
    </div>
  );
};

const ManipulatePanel = () => {
  const stage = useStage();
  if (stage.current !== "manipulate") return <p>not manipulating</p>;
  return <ManipulateControls />;
};

const ManipulateControls = () => {
  const manipulate = useManipulate<SimState>();
  return (
    <button onClick={() => manipulate.set("mass", 4)} type="button">
      set mass
    </button>
  );
};

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.useRealTimers();
});

describe("<SimRuntime>", () => {
  it("renders an error instead of children when SimulationSpec validation fails", () => {
    const invalidSpec = { ...spec, title: "x" } as TSimulationSpec;

    render(
      <SimRuntime packageId={packageId} spec={invalidSpec}>
        <div>partial simulation</div>
      </SimRuntime>,
    );

    expect(screen.getByRole("alert").textContent).toContain("Invalid SimulationSpec");
    expect(screen.queryByText("partial simulation")).toBeNull();
  });

  it("advances forward one PMOE-T stage at a time and refuses advancement after explain", () => {
    const results: string[] = [];
    const Controller = () => {
      const stage = useStage();
      return (
        <button
          onClick={() => {
            const result = stage.advance();
            results.push(result.ok ? "ok" : result.error.code);
          }}
          type="button"
        >
          advance tracked
        </button>
      );
    };

    render(
      <SimRuntime packageId={packageId} spec={spec}>
        <StagePanel />
        <Controller />
      </SimRuntime>,
    );

    expect(screen.getByText("stage:manipulate")).toBeTruthy();
    expect(screen.getByLabelText("Prediction checkpoint")).toBeTruthy();

    fireEvent.click(screen.getByText("advance tracked"));
    expect(screen.getByText("stage:observe")).toBeTruthy();

    fireEvent.click(screen.getByText("advance tracked"));
    expect(screen.getByText("stage:explain")).toBeTruthy();
    fireEvent.click(screen.getByText("advance tracked"));

    expect(results).toEqual(["ok", "ok", "precondition-violated"]);
  });

  it("uses the current stage for retained advance closures", () => {
    let retainedAdvance: (() => unknown) | null = null;

    const RetainAdvance = () => {
      const stage = useStage();
      useEffect(() => {
        retainedAdvance = stage.advance;
      }, []);
      return (
        <button onClick={() => stage.advance()} type="button">
          live advance
        </button>
      );
    };

    render(
      <SimRuntime packageId={packageId} spec={spec}>
        <StagePanel />
        <RetainAdvance />
      </SimRuntime>,
    );

    act(() => {
      retainedAdvance?.();
    });

    expect(screen.getByText("stage:observe")).toBeTruthy();
    expect(screen.getByLabelText("Prediction checkpoint")).toBeTruthy();
  });

  it("resets to the interactive workspace and clears runtime state", () => {
    render(
      <SimRuntime packageId={packageId} spec={spec}>
        <StagePanel />
        <ManipulatePanel />
      </SimRuntime>,
    );

    fireEvent.click(screen.getByText("set mass"));
    expect(screen.getByText("stage:manipulate")).toBeTruthy();
    expect(screen.getByText("mass:4")).toBeTruthy();

    fireEvent.click(screen.getByText("reset"));
    expect(screen.getByText("stage:manipulate")).toBeTruthy();
    expect(screen.getByText("mass:unset")).toBeTruthy();
  });

  it("allows manipulation on first load", () => {
    const observedErrors: unknown[] = [];
    const ImmediateManipulate = () => {
      try {
        useManipulate<SimState>();
      } catch (error) {
        observedErrors.push(error);
      }
      return <p>immediate hook probe</p>;
    };

    render(
      <SimRuntime packageId={packageId} spec={spec}>
        <ImmediateManipulate />
      </SimRuntime>,
    );

    expect(observedErrors).toEqual([]);
  });

  it("freezes nested runtime state exposed through useSimState", () => {
    interface NestedState {
      readonly nested: {
        count: number;
      };
    }

    const seen: Readonly<NestedState>[] = [];
    const NestedPanel = () => {
      const stage = useStage();
      if (stage.current !== "manipulate") {
        return <button onClick={() => stage.advance()} type="button">advance nested</button>;
      }
      return <NestedControls />;
    };
    const NestedControls = () => {
      const manipulate = useManipulate<NestedState>();
      seen.push(manipulate.state);
      return (
        <button onClick={() => manipulate.set("nested", source)} type="button">
          set nested
        </button>
      );
    };

    const source = { count: 1 };
    render(
      <SimRuntime packageId={packageId} spec={spec}>
        <NestedPanel />
      </SimRuntime>,
    );

    fireEvent.click(screen.getByText("set nested"));
    source.count = 99;

    expect(Object.isFrozen(seen.at(-1)?.nested)).toBe(true);
    expect(seen.at(-1)?.nested.count).toBe(1);
  });

  it("rejects mutable built-ins in runtime state", () => {
    const observedErrors: unknown[] = [];
    const MutableStatePanel = () => {
      const stage = useStage();
      if (stage.current !== "manipulate") {
        return <button onClick={() => stage.advance()} type="button">advance mutable</button>;
      }
      return <MutableStateControls />;
    };
    const MutableStateControls = () => {
      const manipulate = useManipulate<{ readonly value: unknown }>();
      return (
        <button
          onClick={() => {
            try {
              manipulate.set("value", new Map([["x", 1]]));
            } catch (error) {
              observedErrors.push(error);
            }
          }}
          type="button"
        >
          set mutable
        </button>
      );
    };

    render(
      <SimRuntime packageId={packageId} spec={spec}>
        <MutableStatePanel />
      </SimRuntime>,
    );

    fireEvent.click(screen.getByText("set mutable"));

    expect(observedErrors).toContainEqual(
      expect.objectContaining({ code: "precondition-violated" }),
    );
  });

  it("exposes a transition snapshot only during the configured transition window", () => {
    vi.useFakeTimers();

    render(
      <SimRuntime packageId={packageId} spec={spec}>
        <StagePanel />
      </SimRuntime>,
    );

    fireEvent.click(screen.getByText("advance"));
    expect(screen.getByText("transition:manipulate-observe")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(151);
    });
    expect(screen.getByText("transition:none")).toBeTruthy();
  });

  it("embeds a prediction checkpoint without hiding observe children", () => {
    render(
      <SimRuntime packageId={packageId} spec={spec}>
        <StagePanel />
        <div>observable output</div>
      </SimRuntime>,
    );

    expect(screen.getByLabelText("Prediction checkpoint")).toBeTruthy();
    expect(screen.getByText("observable output")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Prediction"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Rationale"), {
      target: { value: "The output should increase after the manipulation." },
    });
    fireEvent.click(screen.getByText("Commit prediction"));

    expect(screen.getByText("observable output")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Prediction checkpoint" })).toBeTruthy();
  });

  it("renders observe children when a valid SimulationSpec has no sim-level predict", () => {
    const packageLevelPredictSpec: TSimulationSpec = {
      ...spec,
      id: "package-level-predict-sim",
      predict: undefined,
    };

    render(
      <SimRuntime packageId={packageId} spec={packageLevelPredictSpec}>
        <StagePanel />
        <div>ungated observation</div>
      </SimRuntime>,
    );

    expect(screen.getByText("ungated observation")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
