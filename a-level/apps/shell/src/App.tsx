import { useMemo, useState } from "react";
import { clearPrediction } from "@paideia/prediction-gate";
import { containers, type ShellContainer } from "./catalogue.js";

const selectedContainer = containers[0];

const StageList = () => {
  const stages = ["Predict", "Manipulate", "Observe", "Explain", "Transfer"] as const;
  return (
    <ol className="stage-list" aria-label="PMOE-T stages">
      {stages.map((stage) => (
        <li key={stage}>{stage}</li>
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
        <small>{container.subject} / {container.level}</small>
      </a>
    ))}
  </nav>
);

export const App = () => {
  const [resetVersion, setResetVersion] = useState(0);
  const active = selectedContainer;
  const activeSim = active.sims[0];
  const Sim = activeSim.component;

  const aidText = useMemo(() => active.aidTypes.join(" / "), [active.aidTypes]);

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
            <small>Concept mastery workspace</small>
          </span>
        </a>
        <div className="topbar-actions">
          <a href="#sim">Launch sim</a>
          <a href="#transfer">Transfer</a>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar" aria-label="Catalogue">
          <div>
            <h2>Catalogue</h2>
            <p>1 concept package available</p>
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
            <div className="status-stack" aria-label="Package status">
              <span>{active.status}</span>
              <span>{aidText}</span>
            </div>
          </div>

          <StageList />

          <div className="learning-grid">
            <section className="doctrine-panel" aria-labelledby="predict-title">
              <h2 id="predict-title">Prediction gate</h2>
              <p>{active.predictPrompt}</p>
              <button type="button" onClick={resetPrediction}>
                Reset local prediction
              </button>
            </section>

            <section className="doctrine-panel" aria-labelledby="misconception-title">
              <h2 id="misconception-title">Misconceptions surfaced</h2>
              <ul>
                {active.misconceptions.map((misconception) => (
                  <li key={misconception}>{misconception}</li>
                ))}
              </ul>
            </section>

            <section className="doctrine-panel" id="transfer" aria-labelledby="transfer-title">
              <h2 id="transfer-title">Transfer target</h2>
              <p>{active.transferProblem}</p>
            </section>
          </div>

          <section className="sim-panel" id="sim" aria-labelledby="sim-title">
            <div className="sim-header">
              <div>
                <p className="meta-line">{activeSim.interactionType}</p>
                <h2 id="sim-title">{activeSim.title}</h2>
              </div>
              <a href="#container-title">Back to concept</a>
            </div>
            <div className="sim-surface">
              <Sim key={resetVersion} />
            </div>
          </section>
        </section>
      </div>
    </div>
  );
};
