import { useEffect, useMemo, useState } from "react";
import { clearPrediction } from "@paideia/prediction-gate";
import { containers, knowledgeGraph, type ShellContainer } from "./generated/knowledge-graph.js";
import { sutdPillars, type SutdPillar, type SutdPillarId } from "./curriculum-map.js";

const containerById = new Map<string, ShellContainer>(
  containers.map((container) => [container.id, container]),
);
const pillarById = new Map<string, SutdPillar>(sutdPillars.map((pillar) => [pillar.id, pillar]));
const pillarIdByContainerSegment = new Map<string, SutdPillarId>([
  ["asd", "asd"],
  ["csd", "istd-csd"],
  ["dai", "dai"],
  ["epd", "epd"],
  ["esd", "esd"],
  ["freshmore", "freshmore"],
  ["istd", "istd-csd"],
  ["smt", "smt"],
]);

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

const pillarForContainer = (container: ShellContainer): SutdPillar => {
  const explicitPillar = sutdPillars.find((pillar) =>
    pillar.clusters.some((cluster) =>
      cluster.plannedContainerIds.some((plannedId) => plannedIdToContainerId(plannedId) === container.id),
    ),
  );
  if (explicitPillar !== undefined) return explicitPillar;

  const [, segment] = container.id.split("/");
  const inferredPillarId =
    segment === undefined ? undefined : pillarIdByContainerSegment.get(segment);
  return (inferredPillarId === undefined ? undefined : pillarById.get(inferredPillarId)) ?? sutdPillars[0];
};

const ClusterCard = ({
  cluster,
}: {
  readonly cluster: SutdPillar["clusters"][number];
}) => {
  const mappedContainers = cluster.plannedContainerIds.map((containerId) => ({
    containerId,
    routeId: plannedIdToContainerId(containerId),
    container: containerById.get(plannedIdToContainerId(containerId)),
  }));

  return (
    <article className="cluster-card">
    <div>
      <p className="meta-line">{cluster.discipline}</p>
      <h3>{cluster.title}</h3>
    </div>
    <span data-status={cluster.wrapperStatus}>{cluster.wrapperStatus}</span>
    <ul>
      {mappedContainers.map(({ containerId, routeId, container }) => (
        <li key={containerId}>
          {container === undefined ? (
            <span>{containerId}</span>
          ) : (
            <a href={`#${routeId}`}>
              <strong>{container.title}</strong>
              <small>{containerId}</small>
            </a>
          )}
        </li>
      ))}
    </ul>
  </article>
  );
};

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
  resetVersion,
  onResetPrediction,
}: {
  readonly activeContainer: ShellContainer;
  readonly resetVersion: number;
  readonly onResetPrediction: () => void;
}) => {
  const activeSim = activeContainer.sims[0] ?? null;
  const Sim = activeSim?.component ?? null;
  const firstPrinciples =
    activeContainer.firstPrinciples.trim().length > 0
      ? activeContainer.firstPrinciples
      : activeContainer.summary;

  return (
    <section className="container-preview" aria-labelledby="container-title">
      <div className="container-preview__lead">
        <p className="meta-line">{activeContainer.subject} / {activeContainer.module}</p>
        <h2 id="container-title">{activeContainer.title}</h2>
        <p>{activeContainer.summary}</p>
      </div>

      <div className="container-workbench">
        <section aria-labelledby="sutd-learn-title">
          <p className="meta-line">Learn</p>
          <h3 id="sutd-learn-title">First principles</h3>
          <p>{firstPrinciples}</p>
        </section>

        <section aria-labelledby="sutd-transfer-title">
          <p className="meta-line">Transfer</p>
          <h3 id="sutd-transfer-title">Use it elsewhere</h3>
          <p>{activeContainer.transferProblem}</p>
        </section>
      </div>

      {Sim === null || activeSim === null ? null : (
        <section className="sutd-lab-bench" aria-labelledby="sutd-lab-title">
          <div className="sutd-lab-header">
            <div>
              <p className="meta-line">{activeSim.interactionType}</p>
              <p className="sutd-lab-title" id="sutd-lab-title">{activeSim.title}</p>
            </div>
            <button type="button" onClick={onResetPrediction}>
              Reset prediction
            </button>
          </div>
          <Sim key={resetVersion} />
        </section>
      )}
    </section>
  );
};

export const App = () => {
  const [resetVersion, setResetVersion] = useState(0);
  const [route, setRoute] = useState<HashRoute>(() => parseHashRoute());
  const routeContainer = useMemo(
    () => (route.kind === "container" ? containerById.get(route.id) ?? null : null),
    [route],
  );
  const activePillar = useMemo(() => {
    if (route.kind === "pillar") return pillarById.get(route.id) ?? sutdPillars[0];
    if (routeContainer !== null) return pillarForContainer(routeContainer);
    return readPillarFromHash();
  }, [route, routeContainer]);
  const activeContainer = useMemo(
    () => routeContainer ?? firstContainerForPillar(activePillar),
    [activePillar, routeContainer],
  );

  useEffect(() => {
    const onHashChange = () => {
      setRoute(parseHashRoute());
      setResetVersion((current) => current + 1);
    };
    globalThis.addEventListener("hashchange", onHashChange);
    return () => globalThis.removeEventListener("hashchange", onHashChange);
  }, []);

  const selectPillar = (pillar: SutdPillar) => {
    setRoute({ kind: "pillar", id: pillar.id });
    setResetVersion((current) => current + 1);
    globalThis.history?.replaceState(null, "", `#pillar/${pillar.id}`);
  };

  const resetPrediction = () => {
    if (activeContainer === null) return;
    clearPrediction(activeContainer.packageId, activeContainer.simId);
    setResetVersion((current) => current + 1);
  };

  return (
    <main className="app-shell">
      <nav className="global-nav" aria-label="Global navigation">
        <a href="../">All curricula</a>
      </nav>
      <header className="hero">
        <div>
          <p className="meta-line">Paideia SUTD</p>
          <h1>SUTD Learning Map</h1>
          <p>
            Choose a pillar, open a concept, and use the lab to connect the
            model, formula, and engineering decision.
          </p>
        </div>
        <dl className="stats-grid" aria-label="SUTD shell status">
          <div>
            <dt>{containers.length}</dt>
            <dd>interactive concepts</dd>
          </div>
          <div>
            <dt>{sutdPillars.length}</dt>
            <dd>pillar views</dd>
          </div>
          <div>
            <dt>{totalClusters}</dt>
            <dd>topic groups</dd>
          </div>
          <div>
            <dt>{knowledgeGraph.edges.length}</dt>
            <dd>concept links</dd>
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
            <p>{totalPlannedContainers} concepts in the current build map</p>
          </div>

          <div className="cluster-grid">
            {activePillar.clusters.map((cluster) => (
              <ClusterCard cluster={cluster} key={cluster.id} />
            ))}
          </div>

          {activeContainer === null ? (
            <EmptyContainerState />
          ) : (
            <ContainerPreview
              activeContainer={activeContainer}
              resetVersion={resetVersion}
              onResetPrediction={resetPrediction}
            />
          )}
        </section>
      </div>
    </main>
  );
};
