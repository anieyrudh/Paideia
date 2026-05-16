import type { ComponentType } from "react";
import { ResultantMagnitudeSim } from "@paideia/a-level-physics-sims/resultant-magnitude";

export interface SimHarnessEntry {
  readonly id: string;
  readonly title: string;
  readonly Component: ComponentType;
}

export const simRegistry = {
  "a-level/physics/scalars-and-vectors/resultant-magnitude": {
    id: "a-level/physics/scalars-and-vectors/resultant-magnitude",
    title: "Resultant Magnitude Explorer",
    Component: ResultantMagnitudeSim,
  },
} satisfies Record<string, SimHarnessEntry>;

export type SimHarnessId = keyof typeof simRegistry;

export const getSimHarnessEntry = (id: string): SimHarnessEntry | null =>
  Object.prototype.hasOwnProperty.call(simRegistry, id)
    ? simRegistry[id as SimHarnessId]
    : null;
