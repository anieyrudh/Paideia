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
          "sutd.freshmore.vector-transformations",
          "shared.linear-algebra.eigenvector-transformations",
        ],
        wrapperStatus: "mapped",
      },
      {
        id: "freshmore-physics-engineering",
        title: "Mechanics, circuits, and systems",
        discipline: "physics",
        plannedContainerIds: [
          "shared.physics.free-body-diagram-mechanics",
          "shared.circuits.circuit-phasor-reasoning",
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
          "sutd.epd.pid-step-response",
          "shared.control.pid-bode-builder",
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
          "sutd.esd.linear-programming-feasible-region",
          "shared.optimization.linear-programming-feasible-region",
          "shared.probability.bayes-updating",
          "sutd.csd.graph-search-and-shortest-paths",
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
          "sutd.csd.graph-search-and-shortest-paths",
          "shared.algorithms.graph-algorithm-explorer",
          "shared.optimization.gradient-descent-landscape",
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
          "sutd.asd.load-path-and-daylight-tradeoff",
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
          "sutd.dai.trust-calibration",
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
          "sutd.smt.ode-phase-portrait",
          "shared.dynamical-systems.ode-phase-portrait",
        ],
        wrapperStatus: "planned",
      },
    ],
  },
] as const satisfies readonly SutdPillar[];
