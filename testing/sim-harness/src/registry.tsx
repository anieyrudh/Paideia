import type { ComponentType } from "react";
import { UnitClassificationLab } from "@paideia/a-level-physics-sims/unit-classification";
import { ResultantMagnitudeSim } from "@paideia/a-level-physics-sims/resultant-magnitude";
import { ResolvingVectorsSim } from "@paideia/a-level-physics-sims/resolving-vectors";

export interface SimHarnessEntry {
  readonly id: string;
  readonly title: string;
  readonly Component: ComponentType;
}

export const simRegistry = {
  "a-level/physics/physical-quantities-and-units/unit-classification-lab": {
    id: "a-level/physics/physical-quantities-and-units/unit-classification-lab",
    title: "Unit Classification Lab",
    Component: UnitClassificationLab,
  },
  "a-level/physics/scalars-and-vectors/resultant-magnitude": {
    id: "a-level/physics/scalars-and-vectors/resultant-magnitude",
    title: "Resultant Magnitude Explorer",
    Component: ResultantMagnitudeSim,
  },
  "a-level/physics/resolving-vectors/component-resolution": {
    id: "a-level/physics/resolving-vectors/component-resolution",
    title: "Component Resolution Explorer",
    Component: ResolvingVectorsSim,
  },
} satisfies Record<string, SimHarnessEntry>;

export type SimHarnessId = keyof typeof simRegistry;

export const getSimHarnessEntry = (id: string): SimHarnessEntry | null =>
  Object.prototype.hasOwnProperty.call(simRegistry, id)
    ? simRegistry[id as SimHarnessId]
    : null;
