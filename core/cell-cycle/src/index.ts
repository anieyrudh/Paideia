import { type Brand, err, ok, type KernelResult } from "@paideia/shared";

/**
 * @paideia/cell-cycle — Deterministic cell-cycle state machine.
 *
 * Phase transitions (G0 / G1 / S / G2 / M), checkpoint evaluation
 * (G1/S, G2/M, Spindle), and ploidy + DNA-content bookkeeping across
 * mitosis and meiosis. No time-dependent dynamics, no molecular models, no
 * crossover/recombination, no apoptosis pathway.
 */

export type Phase = "G0" | "G1" | "S" | "G2" | "M";
export type CheckpointName = "G1/S" | "G2/M" | "Spindle";

export type Ploidy = Brand<number, "Ploidy_positive_integer">;
export type DnaContentMultiplier = Brand<number, "DnaContent_atLeast_1">;

export interface CellState {
  readonly phase: Phase;
  readonly ploidy: Ploidy;
  readonly dnaContent: DnaContentMultiplier;
  readonly divisions: number;
}

export interface CheckpointConditions {
  readonly dnaDamaged: boolean;
  readonly replicationComplete: boolean;
  readonly chromosomesAligned: boolean;
  readonly nutrientsSufficient: boolean;
}

export interface CheckpointStatus {
  readonly name: CheckpointName;
  readonly satisfied: boolean;
  readonly reasons: ReadonlyArray<string>;
}

// ──────────────────────────────────────────────────────────────────────────
// Constructors
// ──────────────────────────────────────────────────────────────────────────

const requireFinite = (
  value: number,
  label: string,
): KernelResult<number> =>
  typeof value === "number" && Number.isFinite(value)
    ? ok(value)
    : err(
        "precondition-violated",
        `${label} must be a finite number; got ${String(value)}.`,
      );

export const ploidy = (value: number): KernelResult<Ploidy> => {
  const finite = requireFinite(value, "Ploidy");
  if (!finite.ok) return finite;
  if (!Number.isInteger(finite.value)) {
    return err(
      "precondition-violated",
      `Ploidy must be an integer; got ${finite.value}.`,
    );
  }
  if (finite.value < 1) {
    return err(
      "out-of-domain",
      `Ploidy must be a positive integer; got ${finite.value}.`,
    );
  }
  return ok(finite.value as Ploidy);
};

export const dnaContentMultiplier = (
  value: number,
): KernelResult<DnaContentMultiplier> => {
  const finite = requireFinite(value, "DnaContentMultiplier");
  if (!finite.ok) return finite;
  if (finite.value < 1) {
    return err(
      "out-of-domain",
      `DnaContentMultiplier must be at least 1; got ${finite.value}.`,
    );
  }
  return ok(finite.value as DnaContentMultiplier);
};

// ──────────────────────────────────────────────────────────────────────────
// Initial cell
// ──────────────────────────────────────────────────────────────────────────

interface InitialCellOptions {
  readonly ploidy?: Ploidy;
  readonly phase?: Phase;
}

const DEFAULT_DIPLOID = 2 as Ploidy;
const ONE = 1 as DnaContentMultiplier;
const TWO = 2 as DnaContentMultiplier;

export const initialCell = (options: InitialCellOptions = {}): CellState => ({
  phase: options.phase ?? "G1",
  ploidy: options.ploidy ?? DEFAULT_DIPLOID,
  dnaContent: ONE,
  divisions: 0,
});

// ──────────────────────────────────────────────────────────────────────────
// Checkpoint evaluation
// ──────────────────────────────────────────────────────────────────────────

const evaluateG1S = (
  conditions: CheckpointConditions,
): CheckpointStatus => {
  const reasons: string[] = [];
  if (conditions.dnaDamaged) reasons.push("DNA damage detected.");
  if (!conditions.nutrientsSufficient) reasons.push("Insufficient nutrients for replication.");
  return { name: "G1/S", satisfied: reasons.length === 0, reasons };
};

const evaluateG2M = (
  conditions: CheckpointConditions,
): CheckpointStatus => {
  const reasons: string[] = [];
  if (!conditions.replicationComplete) reasons.push("DNA replication incomplete.");
  if (conditions.dnaDamaged) reasons.push("DNA damage detected after replication.");
  return { name: "G2/M", satisfied: reasons.length === 0, reasons };
};

const evaluateSpindle = (
  conditions: CheckpointConditions,
): CheckpointStatus => {
  const reasons: string[] = [];
  if (!conditions.chromosomesAligned) reasons.push("Chromosomes not aligned at metaphase plate.");
  return { name: "Spindle", satisfied: reasons.length === 0, reasons };
};

export const evaluateCheckpoint = (
  name: CheckpointName,
  conditions: CheckpointConditions,
): CheckpointStatus => {
  if (name === "G1/S") return evaluateG1S(conditions);
  if (name === "G2/M") return evaluateG2M(conditions);
  if (name === "Spindle") return evaluateSpindle(conditions);
  // Unreachable when the type narrows; defensive return for forged input.
  return { name, satisfied: false, reasons: ["Unknown checkpoint name."] };
};

// ──────────────────────────────────────────────────────────────────────────
// Phase advance
// ──────────────────────────────────────────────────────────────────────────

const ensureValidState = (
  state: CellState,
): KernelResult<CellState> => {
  const p = ploidy(state.ploidy as unknown as number);
  if (!p.ok) return p;
  const d = dnaContentMultiplier(state.dnaContent as unknown as number);
  if (!d.ok) return d;
  if (
    typeof state.divisions !== "number" ||
    !Number.isFinite(state.divisions) ||
    !Number.isInteger(state.divisions) ||
    state.divisions < 0
  ) {
    return err(
      "precondition-violated",
      `state.divisions must be a non-negative integer; got ${String(state.divisions)}.`,
    );
  }
  return ok(state);
};

interface PhaseAdvanceResult {
  readonly next: CellState;
  readonly advanced: boolean;
  readonly checkpoint: CheckpointStatus | null;
}

export const attemptPhaseAdvance = (
  state: CellState,
  conditions: CheckpointConditions,
): KernelResult<PhaseAdvanceResult> => {
  const validated = ensureValidState(state);
  if (!validated.ok) return validated;

  switch (state.phase) {
    case "G0":
      // Quiescent; re-enter G1 only when nutrients are sufficient.
      if (conditions.nutrientsSufficient) {
        return ok({
          next: { ...state, phase: "G1" },
          advanced: true,
          checkpoint: null,
        });
      }
      return ok({ next: state, advanced: false, checkpoint: null });

    case "G1": {
      const status = evaluateG1S(conditions);
      if (status.satisfied) {
        return ok({
          next: { ...state, phase: "S" },
          advanced: true,
          checkpoint: status,
        });
      }
      return ok({ next: state, advanced: false, checkpoint: status });
    }

    case "S": {
      // S phase is not gated; replication progresses, doubling DNA content.
      if (conditions.replicationComplete) {
        return ok({
          next: { ...state, phase: "G2", dnaContent: TWO },
          advanced: true,
          checkpoint: null,
        });
      }
      return ok({ next: state, advanced: false, checkpoint: null });
    }

    case "G2": {
      const status = evaluateG2M(conditions);
      if (status.satisfied) {
        return ok({
          next: { ...state, phase: "M" },
          advanced: true,
          checkpoint: status,
        });
      }
      return ok({ next: state, advanced: false, checkpoint: status });
    }

    case "M": {
      const status = evaluateSpindle(conditions);
      // M -> G1 happens after the spindle checkpoint passes AND a division occurs.
      // We surface the status; the caller must use divideMitosis or divideMeiosis
      // to produce daughter cells.
      return ok({ next: state, advanced: false, checkpoint: status });
    }

    default:
      return err(
        "precondition-violated",
        `Unknown phase "${String(state.phase)}".`,
      );
  }
};

// ──────────────────────────────────────────────────────────────────────────
// Division
// ──────────────────────────────────────────────────────────────────────────

export const divideMitosis = (
  state: CellState,
): KernelResult<readonly [CellState, CellState]> => {
  const validated = ensureValidState(state);
  if (!validated.ok) return validated;
  if (state.phase !== "M") {
    return err(
      "precondition-violated",
      `divideMitosis requires phase "M"; got "${state.phase}".`,
    );
  }
  if ((state.dnaContent as unknown as number) !== 2) {
    return err(
      "out-of-domain",
      `divideMitosis requires dnaContent = 2; got ${state.dnaContent as unknown as number}.`,
    );
  }
  const daughter: CellState = {
    phase: "G1",
    ploidy: state.ploidy,
    dnaContent: ONE,
    divisions: state.divisions + 1,
  };
  return ok([daughter, { ...daughter }] as const);
};

export const divideMeiosis = (
  state: CellState,
): KernelResult<readonly [CellState, CellState, CellState, CellState]> => {
  const validated = ensureValidState(state);
  if (!validated.ok) return validated;
  if (state.phase !== "M") {
    return err(
      "precondition-violated",
      `divideMeiosis requires phase "M"; got "${state.phase}".`,
    );
  }
  if ((state.dnaContent as unknown as number) !== 2) {
    return err(
      "out-of-domain",
      `divideMeiosis requires dnaContent = 2; got ${state.dnaContent as unknown as number}.`,
    );
  }
  const ploidyValue = state.ploidy as unknown as number;
  if (ploidyValue % 2 !== 0) {
    return err(
      "out-of-domain",
      `divideMeiosis requires even ploidy to halve cleanly; got ${ploidyValue}.`,
    );
  }
  const halfPloidy = (ploidyValue / 2) as Ploidy;
  const gamete: CellState = {
    phase: "G1",
    ploidy: halfPloidy,
    dnaContent: ONE,
    divisions: state.divisions + 1,
  };
  return ok([
    gamete,
    { ...gamete },
    { ...gamete },
    { ...gamete },
  ] as const);
};
