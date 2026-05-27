import { describe, expect, it } from "vitest";

import {
  attemptPhaseAdvance,
  divideMeiosis,
  divideMitosis,
  dnaContentMultiplier,
  evaluateCheckpoint,
  initialCell,
  ploidy,
  type CellState,
  type CheckpointConditions,
} from "./index.js";

const unwrap = <T>(result: { ok: true; value: T } | { ok: false }): T => {
  if (!result.ok) throw new Error("expected ok result");
  return result.value;
};

const happy: CheckpointConditions = {
  dnaDamaged: false,
  replicationComplete: true,
  chromosomesAligned: true,
  nutrientsSufficient: true,
};

describe("constructors", () => {
  it("ploidy rejects zero, negatives, and non-integers", () => {
    expect(ploidy(0).ok).toBe(false);
    expect(ploidy(-1).ok).toBe(false);
    expect(ploidy(1.5).ok).toBe(false);
    expect(ploidy(2).ok).toBe(true);
  });

  it("dnaContentMultiplier requires >= 1", () => {
    expect(dnaContentMultiplier(0.5).ok).toBe(false);
    expect(dnaContentMultiplier(1).ok).toBe(true);
    expect(dnaContentMultiplier(2).ok).toBe(true);
    expect(dnaContentMultiplier(4).ok).toBe(true);
  });
});

describe("initialCell", () => {
  it("defaults to diploid G1 with dnaContent 1 and zero divisions", () => {
    const cell = initialCell();
    expect(cell.phase).toBe("G1");
    expect(cell.ploidy as number).toBe(2);
    expect(cell.dnaContent as number).toBe(1);
    expect(cell.divisions).toBe(0);
  });

  it("respects ploidy override", () => {
    const cell = initialCell({ ploidy: unwrap(ploidy(4)) });
    expect(cell.ploidy as number).toBe(4);
  });
});

describe("evaluateCheckpoint", () => {
  it("G1/S fails on DNA damage", () => {
    const status = evaluateCheckpoint("G1/S", { ...happy, dnaDamaged: true });
    expect(status.satisfied).toBe(false);
    expect(status.reasons.length).toBeGreaterThan(0);
  });

  it("G1/S fails on insufficient nutrients", () => {
    const status = evaluateCheckpoint("G1/S", {
      ...happy,
      nutrientsSufficient: false,
    });
    expect(status.satisfied).toBe(false);
  });

  it("G2/M fails on incomplete replication", () => {
    const status = evaluateCheckpoint("G2/M", {
      ...happy,
      replicationComplete: false,
    });
    expect(status.satisfied).toBe(false);
  });

  it("Spindle fails on misaligned chromosomes", () => {
    const status = evaluateCheckpoint("Spindle", {
      ...happy,
      chromosomesAligned: false,
    });
    expect(status.satisfied).toBe(false);
  });

  it("all checkpoints pass with happy conditions", () => {
    expect(evaluateCheckpoint("G1/S", happy).satisfied).toBe(true);
    expect(evaluateCheckpoint("G2/M", happy).satisfied).toBe(true);
    expect(evaluateCheckpoint("Spindle", happy).satisfied).toBe(true);
  });
});

describe("attemptPhaseAdvance", () => {
  it("G1 -> S when G1/S checkpoint passes", () => {
    const advance = unwrap(attemptPhaseAdvance(initialCell(), happy));
    expect(advance.advanced).toBe(true);
    expect(advance.next.phase).toBe("S");
  });

  it("G1 stays put when DNA is damaged", () => {
    const advance = unwrap(
      attemptPhaseAdvance(initialCell(), { ...happy, dnaDamaged: true }),
    );
    expect(advance.advanced).toBe(false);
    expect(advance.next.phase).toBe("G1");
    expect(advance.checkpoint?.satisfied).toBe(false);
  });

  it("S -> G2 doubles DNA content", () => {
    const sPhase: CellState = { ...initialCell(), phase: "S" };
    const advance = unwrap(attemptPhaseAdvance(sPhase, happy));
    expect(advance.advanced).toBe(true);
    expect(advance.next.phase).toBe("G2");
    expect(advance.next.dnaContent as number).toBe(2);
  });

  it("S stays in S until replication is complete", () => {
    const sPhase: CellState = { ...initialCell(), phase: "S" };
    const advance = unwrap(
      attemptPhaseAdvance(sPhase, { ...happy, replicationComplete: false }),
    );
    expect(advance.advanced).toBe(false);
    expect(advance.next.phase).toBe("S");
  });

  it("G2 -> M when G2/M checkpoint passes", () => {
    const g2: CellState = {
      ...initialCell(),
      phase: "G2",
      dnaContent: unwrap(dnaContentMultiplier(2)),
    };
    const advance = unwrap(attemptPhaseAdvance(g2, happy));
    expect(advance.advanced).toBe(true);
    expect(advance.next.phase).toBe("M");
  });

  it("M reports Spindle checkpoint without advancing", () => {
    const m: CellState = {
      ...initialCell(),
      phase: "M",
      dnaContent: unwrap(dnaContentMultiplier(2)),
    };
    const advance = unwrap(attemptPhaseAdvance(m, happy));
    expect(advance.advanced).toBe(false);
    expect(advance.checkpoint?.name).toBe("Spindle");
    expect(advance.checkpoint?.satisfied).toBe(true);
  });

  it("G0 stays G0 without nutrients", () => {
    const g0: CellState = { ...initialCell(), phase: "G0" };
    const advance = unwrap(
      attemptPhaseAdvance(g0, { ...happy, nutrientsSufficient: false }),
    );
    expect(advance.advanced).toBe(false);
    expect(advance.next.phase).toBe("G0");
  });

  it("G0 -> G1 when nutrients restored", () => {
    const g0: CellState = { ...initialCell(), phase: "G0" };
    const advance = unwrap(attemptPhaseAdvance(g0, happy));
    expect(advance.advanced).toBe(true);
    expect(advance.next.phase).toBe("G1");
  });
});

describe("divideMitosis", () => {
  const ready: CellState = {
    phase: "M",
    ploidy: unwrap(ploidy(2)),
    dnaContent: unwrap(dnaContentMultiplier(2)),
    divisions: 0,
  };

  it("produces two diploid G1 daughters with dnaContent 1", () => {
    const daughters = unwrap(divideMitosis(ready));
    for (const d of daughters) {
      expect(d.phase).toBe("G1");
      expect(d.ploidy as number).toBe(2);
      expect(d.dnaContent as number).toBe(1);
      expect(d.divisions).toBe(1);
    }
  });

  it("rejects mitosis outside M phase", () => {
    const result = divideMitosis({ ...ready, phase: "G1" });
    expect(result.ok).toBe(false);
  });

  it("rejects mitosis when DNA hasn't doubled", () => {
    const result = divideMitosis({
      ...ready,
      dnaContent: unwrap(dnaContentMultiplier(1)),
    });
    expect(result.ok).toBe(false);
  });
});

describe("divideMeiosis", () => {
  const ready: CellState = {
    phase: "M",
    ploidy: unwrap(ploidy(2)),
    dnaContent: unwrap(dnaContentMultiplier(2)),
    divisions: 0,
  };

  it("produces four haploid G1 gametes from a diploid", () => {
    const gametes = unwrap(divideMeiosis(ready));
    expect(gametes).toHaveLength(4);
    for (const g of gametes) {
      expect(g.phase).toBe("G1");
      expect(g.ploidy as number).toBe(1);
      expect(g.dnaContent as number).toBe(1);
      expect(g.divisions).toBe(1);
    }
  });

  it("rejects meiosis from an odd-ploidy cell", () => {
    const odd: CellState = {
      ...ready,
      ploidy: unwrap(ploidy(3)),
    };
    const result = divideMeiosis(odd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("out-of-domain");
  });

  it("rejects meiosis outside M phase", () => {
    const result = divideMeiosis({ ...ready, phase: "S" });
    expect(result.ok).toBe(false);
  });

  it("rejects meiosis when DNA hasn't doubled", () => {
    const result = divideMeiosis({
      ...ready,
      dnaContent: unwrap(dnaContentMultiplier(1)),
    });
    expect(result.ok).toBe(false);
  });
});
