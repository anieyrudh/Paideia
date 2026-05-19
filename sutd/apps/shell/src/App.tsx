import { useMemo, useState } from "react";
import { containers, knowledgeGraph, type ShellContainer } from "./generated/knowledge-graph.js";
import { sutdPillars, type SutdPillar } from "./curriculum-map.js";

const containerById = new Map<string, ShellContainer>(
  containers.map((container) => [container.id, container]),
);
const pillarById = new Map<string, SutdPillar>(sutdPillars.map((pillar) => [pillar.id, pillar]));

type HashRoute =
  | { readonly kind: "container"; readonly id: string }
  | { readonly kind: "pillar"; readonly id: string }
  | { readonly kind: "empty"; readonly id: "" };

const parseHashRoute = (): HashRoute => {
  const hash = decodeURIComponent(globalThis.location?.hash.slice(1) ?? "");
  if (hash.length === 0) return { kind: "empty", id: "" };
  if (hash.startsWith("pillar/")) return { kind: "pillar", id: hash.slice("pillar/".length) };
  return { kind: "container", id: hash };
};

const readContainerFromHash = (): ShellContainer | null => {
  const route = parseHashRoute();
  const containerId = route.kind === "container" ? route.id : "";
  return containerById.get(containerId) ?? null;
};

const readPillarFromHash = (): SutdPillar => {
  const route = parseHashRoute();
  const pillarId = route.kind === "pillar" ? route.id : "";
  return pillarById.get(pillarId) ?? sutdPillars[0];
};

const totalClusters = sutdPillars.reduce((sum, pillar) => sum + pillar.clusters.length, 0);
const totalPlannedContainers = sutdPillars.reduce(
  (sum, pillar) =>
    sum +
    pillar.clusters.reduce(
      (clusterSum, cluster) => clusterSum + cluster.plannedContainerIds.length,
      0,
    ),
  0,
);

const plannedIdToContainerId = (id: string): string => id.replace(/\./g, "/");

const firstContainerForPillar = (pillar: SutdPillar): ShellContainer | null => {
  for (const cluster of pillar.clusters) {
    for (const plannedId of cluster.plannedContainerIds) {
      const container = containerById.get(plannedIdToContainerId(plannedId));
      if (container !== undefined) return container;
    }
  }

  return null;
};

const ClusterCard = ({
  cluster,
}: {
  readonly cluster: SutdPillar["clusters"][number];
}) => (
  <article className="cluster-card">
    <div>
      <p className="meta-line">{cluster.discipline}</p>
      <h3>{cluster.title}</h3>
    </div>
    <span data-status={cluster.wrapperStatus}>{cluster.wrapperStatus}</span>
    <ul>
      {cluster.plannedContainerIds.map((containerId) => (
        <li key={containerId}>{containerId}</li>
      ))}
    </ul>
  </article>
);

const EmptyContainerState = () => (
  <section className="empty-state" aria-labelledby="empty-container-title">
    <p className="meta-line">generated graph</p>
    <h2 id="empty-container-title">No SUTD product containers wired yet</h2>
    <p>
      The shell is ready for generated shared and SUTD wrapper containers once
      container manifests land under the SUTD branch.
    </p>
  </section>
);

const ContainerPreview = ({
  activeContainer,
}: {
  readonly activeContainer: ShellContainer;
}) => (
  <section className="container-preview" aria-labelledby="container-title">
    <p className="meta-line">{activeContainer.subject} / {activeContainer.module}</p>
    <h2 id="container-title">{activeContainer.title}</h2>
    <p>{activeContainer.summary}</p>
  </section>
);

export const App = () => {
  const [activePillar, setActivePillar] = useState<SutdPillar>(() => readPillarFromHash());
  const activeContainer = useMemo(
    () => readContainerFromHash() ?? firstContainerForPillar(activePillar),
    [activePillar],
  );

  const selectPillar = (pillar: SutdPillar) => {
    setActivePillar(pillar);
    globalThis.history?.replaceState(null, "", `#pillar/${pillar.id}`);
  };

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="meta-line">Paideia SUTD</p>
          <h1>SUTD curriculum wrapper substrate</h1>
          <p>
            Shared concept containers can map into Freshmore and pillar-specific
            learning paths without duplicating A-Level content.
          </p>
        </div>
        <dl className="stats-grid" aria-label="SUTD shell status">
          <div>
            <dt>{containers.length}</dt>
            <dd>product containers wired</dd>
          </div>
          <div>
            <dt>{sutdPillars.length}</dt>
            <dd>pillar views</dd>
          </div>
          <div>
            <dt>{totalClusters}</dt>
            <dd>concept clusters</dd>
          </div>
          <div>
            <dt>{knowledgeGraph.edges.length}</dt>
            <dd>graph links</dd>
          </div>
        </dl>
      </header>

      <div className="workspace">
        <aside className="pillar-nav" aria-label="SUTD pillars">
          {sutdPillars.map((pillar) => (
            <button
              aria-pressed={pillar.id === activePillar.id}
              key={pillar.id}
              type="button"
              onClick={() => selectPillar(pillar)}
            >
              <span>{pillar.title}</span>
              <small>{pillar.programmeLabel}</small>
            </button>
          ))}
        </aside>

        <section className="pillar-panel" aria-labelledby="pillar-title">
          <div className="panel-header">
            <div>
              <p className="meta-line">{activePillar.programmeLabel}</p>
              <h2 id="pillar-title">{activePillar.title}</h2>
            </div>
            <p>{totalPlannedContainers} planned shared/container references</p>
          </div>

          <div className="cluster-grid">
            {activePillar.clusters.map((cluster) => (
              <ClusterCard cluster={cluster} key={cluster.id} />
            ))}
          </div>

          {activeContainer === null ? (
            <EmptyContainerState />
          ) : (
            <ContainerPreview activeContainer={activeContainer} />
          )}
        </section>
      </div>
    </main>
  );
};
