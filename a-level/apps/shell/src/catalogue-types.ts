import type { ComponentType } from "react";

export type AidType = "simulation" | "misconception-audit" | "transfer-problem";

export interface ShellSim {
  readonly id: string;
  readonly title: string;
  readonly interactionType: string;
  readonly component: ComponentType;
}

export interface ShellContainer {
  readonly id: string;
  readonly branch: "a-level" | "sutd";
  readonly subject: string;
  readonly subjectLabel: string;
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
