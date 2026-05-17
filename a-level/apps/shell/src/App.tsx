import { useEffect, useState } from "react";
import { clearPrediction } from "@paideia/prediction-gate";
import {
  containers,
  knowledgeGraph,
  type ShellContainer,
} from "./generated/knowledge-graph.js";

const containerById = new Map(containers.map((container) => [container.id, container]));

const readContainerFromHash = (): ShellContainer => {
  const hash = globalThis.location?.hash.slice(1) ?? "";
  return containerById.get(decodeURIComponent(hash)) ?? containers[0];
};

const StageList = () => {
  const stages = [
    { name: "Predict", detail: "commit first" },
    { name: "Manipulate", detail: "move the model" },
    { name: "Observe", detail: "read the result" },
    { name: "Explain", detail: "name the rule" },
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
}: {
  readonly active: ShellContainer;
}) => (
  <nav aria-label="Concept containers" className="package-list">
    {containers.map((container) => (
      <a
        aria-current={container.id === active.id ? "page" : undefined}
        className="package-row"
        href={`#${container.id}`}
        key={container.id}
      >
        <span>{container.title}</span>
        <small>{container.subject} / {container.level}</small>
      </a>
    ))}
  </nav>
);

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

export const App = () => {
  const [resetVersion, setResetVersion] = useState(0);
  const [active, setActive] = useState<ShellContainer>(() => readContainerFromHash());
  const activeSim = active.sims[0] ?? null;
  const Sim = activeSim?.component ?? null;

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
            <h2>Physics labs</h2>
            <p>{containers.length} container ready</p>
          </div>
          <ContainerList active={active} />
        </aside>

        <section className="content-panel" aria-labelledby="container-title">
          <div className="container-header">
            <div>
              <p className="meta-line">{active.subject} / {active.syllabusRef}</p>
              <h1 id="container-title">{active.title}</h1>
              <p>{active.summary}</p>
            </div>
            <div className="status-stack" aria-label="Container status">
              <span>{active.status}</span>
              <span>{active.aidTypes.join(" / ")}</span>
            </div>
          </div>

          <StageList />

          <div className="lab-layout" id="lab">
            {Sim === null || activeSim === null ? (
              <section className="sim-panel" aria-labelledby="sim-title">
                <div className="sim-header">
                  <div>
                    <p className="meta-line">content-only</p>
                    <h2 id="sim-title">No interactive simulation yet</h2>
                  </div>
                </div>
              </section>
            ) : (
              <section className="sim-panel" aria-labelledby="sim-title">
                <div className="sim-header">
                  <div>
                    <p className="meta-line">{activeSim.interactionType}</p>
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

            <aside className="lab-brief" aria-label="Lab brief">
              {active.predictPrompt.length > 0 ? (
                <section className="brief-section" aria-labelledby="predict-title">
                  <h2 id="predict-title">First move</h2>
                  <p>{active.predictPrompt}</p>
                </section>
              ) : null}

              <section className="brief-section" aria-labelledby="misconception-title">
                <h2 id="misconception-title">Watch for</h2>
                <ul>
                  {active.misconceptions.map((misconception) => (
                    <li key={misconception}>{misconception}</li>
                  ))}
                </ul>
              </section>

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
