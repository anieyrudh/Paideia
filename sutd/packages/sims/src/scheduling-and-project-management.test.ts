import { clearPrediction, isRevealed } from "@paideia/prediction-gate";
import { describe, expect, it } from "vitest";
import {
  schedulingProjectModel,
  schedulingProjectPackageId,
  schedulingProjectPredict,
  schedulingProjectSimId,
} from "./scheduling-and-project-management.js";

const unwrap = <T>(result: { ok: true; value: T } | { ok: false }): T => {
  if (!result.ok) throw new Error("expected ok result");
  return result.value;
};

describe("schedulingProjectModel", () => {
  it("computes critical path and slack from activity durations", () => {
    const model = unwrap(schedulingProjectModel());
    expect(model.result.projectDuration).toBe(18);
    expect(model.criticalLabels).toEqual([
      "A Requirements",
      "B Procurement",
      "D Tooling",
      "E Pilot",
      "G Launch",
    ]);
    expect(model.result.activities.find((item) => String(item.id) === "training")?.slack).toBe(4);
  });

  it("moves the critical path when prototype and training become longer", () => {
    const model = unwrap(schedulingProjectModel({ prototype: 9, training: 8 }));
    expect(model.result.projectDuration).toBe(22);
    expect(model.criticalLabels).toEqual([
      "A Requirements",
      "C Prototype",
      "F Training",
      "G Launch",
    ]);
  });

  it("keeps prediction value evidence aligned with the CPM result", () => {
    clearPrediction(schedulingProjectPackageId, schedulingProjectSimId);
    expect(isRevealed(schedulingProjectPackageId, schedulingProjectSimId)).toBe(false);
    const prediction = unwrap(schedulingProjectPredict({
      requirements: 3,
      procurement: 4,
      prototype: 5,
      tooling: 6,
      pilot: 3,
      training: 4,
      launch: 2,
    }));
    expect(prediction).toBe(18);
  });
});
