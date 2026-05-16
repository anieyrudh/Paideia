import { useState } from "react";
import { clearPrediction } from "@paideia/prediction-gate";
import type { ShellContainer } from "./catalogue-types.js";
import { containers } from "./generated/catalogue.js";

const selectedContainer = containers[0];

const StageList = () => {
  const stages = [
    { name: "Predict", detail: "commit first" },
    { name: "Manipulate", detail: "move the vectors" },
    { name: "Observe", detail: "read the result" },
    { name: "Explain", detail: "name the reason" },
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
  <nav aria-label="Concept packages" className="package-list">
    {containers.map((container) => (
      <a
        aria-current={container.id === active.id ? "page" : undefined}
        className="package-row"
        href={`#${container.id}`}
        key={container.id}
      >
        <span>{container.title}</span>
        <small>{container.subjectLabel} / {container.level}</small>
      </a>
    ))}
  </nav>
);

export const App = () => {
  const [resetVersion, setResetVersion] = useState(0);
  const active = selectedContainer;
  const activeSim = active.sims[0];
  const Sim = activeSim.component;

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
            <p>{containers.length} lab ready</p>
          </div>
          <ContainerList active={active} />
        </aside>

        <section className="content-panel" aria-labelledby="container-title">
          <div className="container-header">
            <div>
              <p className="meta-line">{active.subjectLabel} / {active.syllabusRef}</p>
              <h1 id="container-title">{active.title}</h1>
              <p>{active.summary}</p>
            </div>
            <a className="primary-jump" href="#lab">Open vector lab</a>
          </div>

          <StageList />

          <div className="lab-layout" id="lab">
            <section className="sim-panel" aria-labelledby="sim-title">
              <div className="sim-header">
                <div>
                  <p className="meta-line">Interactive lab</p>
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

            <aside className="lab-brief" aria-label="Lab brief">
              <section className="brief-section" aria-labelledby="predict-title">
                <h2 id="predict-title">First move</h2>
                <p>{active.predictPrompt}</p>
              </section>

              <section className="brief-section" aria-labelledby="misconception-title">
                <h2 id="misconception-title">Watch for</h2>
                <ul>
                  {active.misconceptions.map((misconception) => (
                    <li key={misconception}>{misconception}</li>
                  ))}
                </ul>
              </section>

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
