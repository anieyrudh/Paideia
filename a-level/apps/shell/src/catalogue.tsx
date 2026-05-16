import type { ComponentType } from "react";
import {
  ResultantMagnitudeSim,
  packageId,
  simId,
} from "@paideia/a-level-physics-sims/resultant-magnitude";

export type AidType = "simulation" | "misconception-audit" | "transfer-problem";

export interface ShellSim {
  readonly id: string;
  readonly title: string;
  readonly interactionType: string;
  readonly component: ComponentType;
}

export interface ShellContainer {
  readonly id: string;
  readonly branch: "a-level";
  readonly subject: string;
  readonly level: string;
  readonly title: string;
  readonly summary: string;
  readonly syllabusRef: string;
  readonly status: string;
  readonly packageId: string;
  readonly simId: string;
  readonly predictPrompt: string;
  readonly aidTypes: readonly AidType[];
  readonly misconceptions: readonly string[];
  readonly transferProblem: string;
  readonly sims: readonly [ShellSim, ...ShellSim[]];
}

export const containers: readonly [ShellContainer, ...ShellContainer[]] = [
  {
    id: "a-level/physics/scalars-and-vectors",
    branch: "a-level",
    subject: "Physics",
    level: "H2",
    title: "Scalars and Vectors",
    summary:
      "Distinguish scalar and vector quantities, then combine coplanar vectors without treating arrows as ordinary numbers.",
    syllabusRef: "9478 / Section I / 1(h)-1(j)",
    status: "draft",
    packageId,
    simId,
    predictPrompt:
      "Two displacement arrows each have length 5 m. One points east and one points north. What resultant magnitude do you expect?",
    aidTypes: ["simulation", "misconception-audit", "transfer-problem"],
    misconceptions: [
      "Magnitude-only vector addition",
      "Negative scalar does not reverse direction",
    ],
    transferProblem:
      "Field-trip route: compare total walking distance with straight-line displacement.",
    sims: [
      {
        id: "resultant-magnitude",
        title: "Resultant Magnitude Explorer",
        interactionType: "diagram-builder",
        component: ResultantMagnitudeSim,
      },
    ],
  },
];
