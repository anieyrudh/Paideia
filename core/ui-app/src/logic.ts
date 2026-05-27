import { err, ok, type KernelResult } from "@paideia/shared";

export type MasteryStatus = "not-started" | "practicing" | "mastered";
export type MasteryRecord = Readonly<Record<string, MasteryStatus>>;

export interface SearchableContainer {
  readonly id: string;
  readonly title: string;
  readonly subject: string;
  readonly level: string;
  readonly module: string;
  readonly summary: string;
  readonly keywords?: readonly string[];
}

export interface SearchResultSummary {
  readonly visible: number;
  readonly total: number;
  readonly label: string;
}

export interface MasterySummary {
  readonly total: number;
  readonly notStarted: number;
  readonly practicing: number;
  readonly mastered: number;
  readonly percentMastered: number;
}

const masteryStatuses = new Set<MasteryStatus>([
  "not-started",
  "practicing",
  "mastered",
]);

export const normalizeSearchQuery = (query: string): string =>
  query
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLocaleLowerCase();

export const filterContainers = (
  containers: readonly SearchableContainer[],
  query: string,
  selectedModule = "all",
): KernelResult<readonly SearchableContainer[]> => {
  const normalizedQuery = normalizeSearchQuery(query);
  const moduleFilter = selectedModule.trim();

  for (const container of containers) {
    if (!validContainer(container)) {
      return err(
        "precondition-violated",
        "Containers must have non-empty trimmed id, title, subject, level, module, and summary",
      );
    }
  }

  return ok(containers.filter((container) => {
    const moduleMatches = moduleFilter === "all" || container.module === moduleFilter;
    if (!moduleMatches) return false;
    if (normalizedQuery.length === 0) return true;
    return containerSearchText(container).includes(normalizedQuery);
  }));
};

export const searchResultSummary = (
  visible: number,
  total: number,
): SearchResultSummary => {
  const safeVisible = finiteNonNegativeInteger(visible) ? visible : 0;
  const safeTotal = finiteNonNegativeInteger(total) ? total : 0;
  return {
    visible: safeVisible,
    total: safeTotal,
    label: `${safeVisible} of ${safeTotal} containers`,
  };
};

export const masteryStatus = (value: string): KernelResult<MasteryStatus> =>
  masteryStatuses.has(value as MasteryStatus)
    ? ok(value as MasteryStatus)
    : err("precondition-violated", `Unknown mastery status: ${value}`);

export const masterySummary = (
  containers: readonly SearchableContainer[],
  mastery: MasteryRecord,
): MasterySummary => {
  let practicing = 0;
  let mastered = 0;

  for (const container of containers) {
    const status = mastery[container.id] ?? "not-started";
    if (status === "practicing") practicing += 1;
    if (status === "mastered") mastered += 1;
  }

  const total = containers.length;
  const notStarted = Math.max(0, total - practicing - mastered);

  return {
    total,
    notStarted,
    practicing,
    mastered,
    percentMastered: total === 0 ? 0 : mastered / total,
  };
};

export const nextReadyContainers = (
  containers: readonly SearchableContainer[],
  prerequisiteIdsByContainer: ReadonlyMap<string, readonly string[]>,
  mastery: MasteryRecord,
  limit = 5,
): KernelResult<readonly SearchableContainer[]> => {
  if (!Number.isInteger(limit) || limit < 1) {
    return err("out-of-domain", `Ready-container limit must be a positive integer; got ${limit}`);
  }

  const containerIds = new Set(containers.map((container) => container.id));
  for (const container of containers) {
    if (!validContainer(container)) {
      return err(
        "precondition-violated",
        "Containers must have non-empty trimmed id, title, subject, level, module, and summary",
      );
    }
  }

  const ready = containers.filter((container) => {
    if (mastery[container.id] === "mastered") return false;
    const prerequisites = prerequisiteIdsByContainer.get(container.id) ?? [];
    return prerequisites.every(
      (id) => !containerIds.has(id) || mastery[id] === "mastered",
    );
  });

  return ok(ready.slice(0, limit));
};

const containerSearchText = (container: SearchableContainer): string =>
  normalizeSearchQuery(
    [
      container.id,
      container.title,
      container.subject,
      container.level,
      container.module,
      container.summary,
      ...(container.keywords ?? []),
    ].join(" "),
  );

const validContainer = (container: SearchableContainer): boolean =>
  [
    container.id,
    container.title,
    container.subject,
    container.level,
    container.module,
    container.summary,
  ].every((value) => value.length > 0 && value.trim() === value);

const finiteNonNegativeInteger = (value: number): boolean =>
  Number.isInteger(value) && value >= 0;
