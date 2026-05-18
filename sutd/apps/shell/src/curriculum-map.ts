export type SutdPillarId = "freshmore" | "epd" | "esd" | "istd-csd" | "asd" | "dai" | "smt";

export interface SutdCluster {
  readonly id: string;
  readonly title: string;
  readonly discipline: string;
  readonly plannedContainerIds: readonly string[];
  readonly wrapperStatus: "mapped" | "planned";
}

export interface SutdPillar {
  readonly id: SutdPillarId;
  readonly title: string;
  readonly programmeLabel: string;
  readonly clusters: readonly SutdCluster[];
}

export const sutdPillars = [
  {
    id: "freshmore",
    title: "Freshmore",
    programmeLabel: "Common core",
    clusters: [
      {
        id: "freshmore-calculus-linear-algebra",
        title: "Calculus and linear algebra",
        discipline: "math",
        plannedContainerIds: [
          "shared.calculus.derivative-intuition",
          "shared.linear-algebra.eigenvectors",
        ],
        wrapperStatus: "mapped",
      },
      {
        id: "freshmore-physics-engineering",
        title: "Mechanics, circuits, and systems",
        discipline: "physics",
        plannedContainerIds: [
          "shared.physics.free-body-diagrams",
          "shared.engineering.circuit-phasor-reasoning",
        ],
        wrapperStatus: "mapped",
      },
    ],
  },
  {
    id: "epd",
    title: "EPD",
    programmeLabel: "Engineering Product Development",
    clusters: [
      {
        id: "epd-control-systems",
        title: "Control, signals, and design loops",
        discipline: "engineering",
        plannedContainerIds: [
          "shared.control.pid-step-response",
          "shared.signals.frequency-response",
        ],
        wrapperStatus: "mapped",
      },
    ],
  },
  {
    id: "esd",
    title: "ESD",
    programmeLabel: "Engineering Systems and Design",
    clusters: [
      {
        id: "esd-optimisation-probability",
        title: "Optimisation, probability, and networks",
        discipline: "systems",
        plannedContainerIds: [
          "shared.optimisation.linear-programming-feasible-region",
          "shared.probability.bayes-updating",
          "shared.graphs.shortest-paths",
        ],
        wrapperStatus: "mapped",
      },
    ],
  },
  {
    id: "istd-csd",
    title: "ISTD/CSD",
    programmeLabel: "Information Systems Technology and Design / Computer Science and Design",
    clusters: [
      {
        id: "istd-csd-algorithms-ai",
        title: "Algorithms, AI, and computation",
        discipline: "cs",
        plannedContainerIds: [
          "shared.algorithms.graph-traversal",
          "shared.ml.gradient-descent",
          "shared.ai.attention-heatmaps",
        ],
        wrapperStatus: "mapped",
      },
    ],
  },
  {
    id: "asd",
    title: "ASD",
    programmeLabel: "Architecture and Sustainable Design",
    clusters: [
      {
        id: "asd-spatial-environmental-systems",
        title: "Spatial, structural, and environmental systems",
        discipline: "architecture",
        plannedContainerIds: [
          "shared.design.load-paths",
          "shared.design.daylighting-analysis",
        ],
        wrapperStatus: "planned",
      },
    ],
  },
  {
    id: "dai",
    title: "DAI",
    programmeLabel: "Design and Artificial Intelligence",
    clusters: [
      {
        id: "dai-human-ai-evaluation",
        title: "Human-centred AI and evaluation",
        discipline: "design-ai",
        plannedContainerIds: [
          "shared.ai.trust-calibration",
          "shared.ai.model-evaluation",
        ],
        wrapperStatus: "planned",
      },
    ],
  },
  {
    id: "smt",
    title: "SMT",
    programmeLabel: "Science, Mathematics and Technology",
    clusters: [
      {
        id: "smt-advanced-science-math",
        title: "Advanced science and mathematical modelling",
        discipline: "science",
        plannedContainerIds: [
          "shared.physics.quantum-confinement",
          "shared.math.differential-equations-phase-portrait",
        ],
        wrapperStatus: "planned",
      },
    ],
  },
] as const satisfies readonly SutdPillar[];
