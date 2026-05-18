import { useEffect, useMemo, useState } from "react";
import { clearPrediction } from "@paideia/prediction-gate";
import { z } from "zod";
import {
  containers,
  knowledgeGraph,
  type AidType,
  type ShellContainer,
} from "./generated/knowledge-graph.js";

const containerById = new Map(containers.map((container) => [container.id, container]));
const MASTER_RECORD_KEY = "paideia.shell.a-level.mastery.v1";
const MasteryStatusSchema = z.enum(["not-started", "practicing", "mastered"]);
type MasteryStatus = z.infer<typeof MasteryStatusSchema>;
const MasteryRecordSchema = z.record(MasteryStatusSchema);
type MasteryRecord = z.infer<typeof MasteryRecordSchema>;

const masteryLabels = {
  "not-started": "Not started",
  practicing: "Practicing",
  mastered: "Mastered",
} satisfies Record<MasteryStatus, string>;

const statusLabels: Record<string, string> = {
  "content-only": "Read first",
  draft: "Try it",
  reviewed: "Ready to practise",
};

const aidTypeLabels = {
  simulation: "Interactive lab",
  "misconception-audit": "Misconception check",
  "transfer-problem": "Transfer challenge",
  "reasoning-lab": "Reasoning lab",
  notebook: "Notebook lab",
  "annotated-source": "Annotated source",
} satisfies Record<AidType, string>;

const interactionTypeLabels: Record<string, string> = {
  "diagram-builder": "Interactive diagram",
  visualizer: "Interactive visualizer",
  "data-lab": "Data lab",
  "decision-lab": "Decision lab",
  "decision-matrix": "Decision lab",
};

const learnerStatus = (status: string): string => statusLabels[status] ?? "Learning material";
const learnerAidTypes = (aidTypes: readonly AidType[]): string =>
  aidTypes.map((aidType) => aidTypeLabels[aidType]).join(" / ");
const learnerInteractionType = (interactionType: string): string =>
  interactionTypeLabels[interactionType] ?? "Interactive lab";

const readContainerFromHash = (): ShellContainer => {
  const hash = globalThis.location?.hash.slice(1) ?? "";
  return containerById.get(decodeURIComponent(hash)) ?? containers[0];
};

const readMasteryRecord = (): MasteryRecord => {
  try {
    const stored = globalThis.localStorage?.getItem(MASTER_RECORD_KEY);
    if (stored === null || stored === undefined) return {};
    return MasteryRecordSchema.parse(JSON.parse(stored));
  } catch (error) {
    console.warn("Ignoring invalid local mastery record.", error);
    return {};
  }
};

const writeMasteryRecord = (record: MasteryRecord) => {
  globalThis.localStorage?.setItem(MASTER_RECORD_KEY, JSON.stringify(record));
};

const containerSearchText = (container: ShellContainer) =>
  [
    container.title,
    container.subject,
    container.level,
    container.module,
    container.summary,
    container.syllabusRef,
    ...container.aidTypes,
    ...container.misconceptions,
    ...container.keyDefinitions,
  ]
    .join(" ")
    .toLocaleLowerCase();

const modules = Array.from(new Set(containers.map((container) => container.module))).filter(Boolean);
const containerIds = new Set(containers.map((container) => container.id));
const prerequisiteTitles = new Map(containers.map((container) => [container.id, container.title]));
const prerequisitesByContainer = new Map(
  containers.map((container) => [
    container.id,
    knowledgeGraph.edges
      .filter((edge) => edge.kind === "prerequisite" && edge.to === container.id && containerIds.has(edge.from))
      .map((edge) => edge.from),
  ]),
);

const orderedContainers = [...containers].sort((left, right) => {
  const leftPrerequisites = prerequisitesByContainer.get(left.id)?.length ?? 0;
  const rightPrerequisites = prerequisitesByContainer.get(right.id)?.length ?? 0;
  if (leftPrerequisites !== rightPrerequisites) return leftPrerequisites - rightPrerequisites;
  return left.title.localeCompare(right.title);
});

const StageList = () => {
  const stages = [
    { name: "Predict", detail: "commit first" },
    { name: "Manipulate", detail: "move the model" },
    { name: "Observe", detail: "read the result" },
    { name: "Explain", detail: "explain the cause" },
    { name: "Transfer", detail: "use it elsewhere" },
  ] as const;

  return (
    <ol className="stage-list" aria-label="PMOE-T stages">
      {stages.map((stage) => (
        <li key={stage.name}>
          <strong>{stage.name}</strong>
          <span>{stage.detail}</span>
        </li>
      ))}
    </ol>
  );
};

const ContainerList = ({
  active,
  query,
  selectedModule,
  visibleContainers,
  onQueryChange,
  onModuleChange,
}: {
  readonly active: ShellContainer;
  readonly query: string;
  readonly selectedModule: string;
  readonly visibleContainers: readonly ShellContainer[];
  readonly onQueryChange: (query: string) => void;
  readonly onModuleChange: (module: string) => void;
}) => {
  const resultLabel = `${visibleContainers.length} of ${containers.length} containers`;

  return (
    <div className="curriculum-browser">
      <label className="search-control">
        <span>Search curriculum</span>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.currentTarget.value)}
          placeholder="vector, unit, force..."
        />
      </label>

      <nav aria-label="Subject modules" className="module-nav">
        <button
          aria-pressed={selectedModule === "all"}
          type="button"
          onClick={() => onModuleChange("all")}
        >
          All modules
        </button>
        {modules.map((module) => (
          <button
            aria-pressed={selectedModule === module}
            key={module}
            type="button"
            onClick={() => onModuleChange(module)}
          >
            {module}
          </button>
        ))}
      </nav>

      <p className="result-count">{resultLabel}</p>

      <nav aria-label="Concept containers" className="package-list">
        {visibleContainers.map((container) => (
          <a
            aria-current={container.id === active.id ? "page" : undefined}
            className="package-row"
            href={`#${container.id}`}
            key={container.id}
          >
            <span>{container.title}</span>
            <small>{container.module} / {container.level}</small>
          </a>
        ))}
      </nav>
    </div>
  );
};

const KnowledgeGraphBrief = ({
  active,
}: {
  readonly active: ShellContainer;
}) => {
  const graphText = `${knowledgeGraph.nodes.length} concept node / ${knowledgeGraph.edges.length} links`;
  const graphItems = [
    ...active.prerequisites.map((concept) => `Prerequisite: ${concept}`),
    ...active.downstream.map((concept) => `Next: ${concept}`),
    ...active.siblings.map((concept) => `Related: ${concept}`),
  ];

  return (
    <section className="brief-section" aria-labelledby="graph-title">
      <h2 id="graph-title">Knowledge graph</h2>
      <p>{graphText}</p>
      <ul>
        {graphItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
};

const MasteryMap = ({
  active,
  mastery,
  onMasteryChange,
}: {
  readonly active: ShellContainer;
  readonly mastery: MasteryRecord;
  readonly onMasteryChange: (containerId: string, status: MasteryStatus) => void;
}) => {
  const masteredCount = containers.filter((container) => mastery[container.id] === "mastered").length;

  return (
    <section className="mastery-map" aria-labelledby="mastery-title">
      <div className="mastery-header">
        <div>
          <p className="meta-line">learner map</p>
          <h2 id="mastery-title">Mastery map</h2>
        </div>
        <strong>{masteredCount}/{containers.length} mastered</strong>
      </div>

      <ol className="mastery-path">
        {orderedContainers.map((container) => {
          const status = mastery[container.id] ?? "not-started";
          const prerequisites = prerequisitesByContainer.get(container.id) ?? [];
          const unmetPrerequisites = prerequisites.filter((id) => mastery[id] !== "mastered");
          const readiness =
            unmetPrerequisites.length === 0
              ? "Ready"
              : `Build ${unmetPrerequisites.map((id) => prerequisiteTitles.get(id) ?? id).join(", ")}`;

          return (
            <li
              className="mastery-node"
              data-status={status}
              aria-current={container.id === active.id ? "step" : undefined}
              key={container.id}
            >
              <a href={`#${container.id}`}>
                <span>{container.title}</span>
                <small>{readiness}</small>
              </a>
              <div className="mastery-actions" aria-label={`${container.title} mastery`}>
                <button
                  aria-pressed={status === "practicing"}
                  type="button"
                  onClick={() => onMasteryChange(container.id, "practicing")}
                >
                  Practice
                </button>
                <button
                  aria-pressed={status === "mastered"}
                  type="button"
                  onClick={() => onMasteryChange(container.id, "mastered")}
                >
                  Mastered
                </button>
              </div>
              <p>{masteryLabels[status]}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

const ConceptContent = ({
  active,
}: {
  readonly active: ShellContainer;
}) => (
  <section className="concept-panel" aria-labelledby="concept-brief-title">
    <div className="concept-section concept-lead">
      <p className="meta-line">concept card</p>
      <h2 id="concept-brief-title">First principles</h2>
      <p>{active.firstPrinciples}</p>
    </div>

    <div className="concept-grid">
      <section className="concept-section" aria-labelledby="definitions-title">
        <h3 id="definitions-title">Key definitions</h3>
        <ul>
          {active.keyDefinitions.map((definition) => (
            <li key={definition}>{definition}</li>
          ))}
        </ul>
      </section>

      <section className="concept-section" aria-labelledby="examples-title">
        <h3 id="examples-title">Canonical examples</h3>
        <ul>
          {active.canonicalExamples.map((example) => (
            <li key={example}>{example}</li>
          ))}
        </ul>
      </section>

      <section className="concept-section" aria-labelledby="strategy-title">
        <h3 id="strategy-title">Problem-solving algorithm</h3>
        <ol>
          {active.problemSolvingSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    </div>
  </section>
);

export const App = () => {
  const [resetVersion, setResetVersion] = useState(0);
  const [active, setActive] = useState<ShellContainer>(() => readContainerFromHash());
  const [query, setQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState("all");
  const [mastery, setMastery] = useState<MasteryRecord>(() => readMasteryRecord());
  const activeSim = active.sims[0] ?? null;
  const Sim = activeSim?.component ?? null;
  const visibleContainers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return containers.filter((container) => {
      const moduleMatches = selectedModule === "all" || container.module === selectedModule;
      const queryMatches =
        normalizedQuery.length === 0 || containerSearchText(container).includes(normalizedQuery);
      return moduleMatches && queryMatches;
    });
  }, [query, selectedModule]);

  useEffect(() => {
    const onHashChange = () => {
      setActive(readContainerFromHash());
      setResetVersion((current) => current + 1);
    };
    globalThis.addEventListener("hashchange", onHashChange);
    return () => globalThis.removeEventListener("hashchange", onHashChange);
  }, []);

  const resetPrediction = () => {
    clearPrediction(active.packageId, active.simId);
    setResetVersion((current) => current + 1);
  };

  const updateMastery = (containerId: string, status: MasteryStatus) => {
    setMastery((current) => {
      const next = { ...current, [containerId]: status };
      writeMasteryRecord(next);
      return next;
    });
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" id="top" aria-label="Paideia A-Level home">
          <span className="brand-mark">P</span>
          <span>
            <strong>Paideia A-Level</strong>
            <small>Physics lab</small>
          </span>
        </a>
        <div className="topbar-actions">
          <a href="#lab">Start lab</a>
          <a href="#transfer">Challenge</a>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar" aria-label="Physics labs">
          <div>
            <h2>A-Level Physics</h2>
            <p>{containers.length} concepts ready</p>
          </div>
          <ContainerList
            active={active}
            query={query}
            selectedModule={selectedModule}
            visibleContainers={visibleContainers}
            onQueryChange={setQuery}
            onModuleChange={setSelectedModule}
          />
        </aside>

        <section className="content-panel" aria-labelledby="container-title">
          <div className="container-header">
            <div>
              <p className="meta-line">{active.subject} / {active.syllabusRef}</p>
              <h1 id="container-title">{active.title}</h1>
              <p>{active.summary}</p>
            </div>
            <div className="status-stack" aria-label="Container status">
              <span>{learnerStatus(active.status)}</span>
              <span>{learnerAidTypes(active.aidTypes)}</span>
            </div>
          </div>

          <MasteryMap active={active} mastery={mastery} onMasteryChange={updateMastery} />

          <StageList />

          <div className="lab-layout" id="lab">
            <div className="learning-column">
              <ConceptContent active={active} />

              {Sim === null || activeSim === null ? (
                <section className="sim-panel" aria-labelledby="sim-title">
                  <div className="sim-header">
                    <div>
                      <p className="meta-line">{learnerStatus(active.status)}</p>
                      <h2 id="sim-title">No interactive simulation yet</h2>
                    </div>
                  </div>
                </section>
              ) : (
                <section className="sim-panel" aria-labelledby="sim-title">
                  <div className="sim-header">
                    <div>
                      <p className="meta-line">{learnerInteractionType(activeSim.interactionType)}</p>
                      <h2 id="sim-title">{activeSim.title}</h2>
                    </div>
                    <button type="button" onClick={resetPrediction}>
                      Reset prediction
                    </button>
                  </div>
                  <div className="sim-surface">
                    <Sim key={resetVersion} />
                  </div>
                </section>
              )}
            </div>

            <aside className="lab-brief" aria-label="Lab brief">
              {active.predictPrompt.length > 0 ? (
                <section className="brief-section" aria-labelledby="predict-title">
                  <h2 id="predict-title">First move</h2>
                  <p>{active.predictPrompt}</p>
                </section>
              ) : null}

              <KnowledgeGraphBrief active={active} />

              <section className="brief-section" id="transfer" aria-labelledby="transfer-title">
                <h2 id="transfer-title">Next challenge</h2>
                <p>{active.transferProblem}</p>
              </section>
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
};
