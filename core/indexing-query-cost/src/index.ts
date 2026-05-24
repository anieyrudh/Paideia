import { err, ok, type Brand, type KernelResult } from "@paideia/shared";

export type PositiveInteger = Brand<number, "IndexingQueryCost.PositiveInteger">;
export type NonNegativeNumber = Brand<number, "IndexingQueryCost.NonNegativeNumber">;
export type Selectivity = Brand<number, "IndexingQueryCost.Selectivity">;

export interface TableStats {
  readonly rows: PositiveInteger;
  readonly pages: PositiveInteger;
  readonly distinctValues?: PositiveInteger;
}

export type IndexKind = "primary-btree" | "secondary-btree" | "hash";

export interface IndexStats {
  readonly kind: IndexKind;
  readonly leafPages: PositiveInteger;
  readonly fanout: PositiveInteger;
  readonly clustered: boolean;
}

export type PredicateKind = "equality" | "range";

export interface PredicateEstimate {
  readonly kind: PredicateKind;
  readonly selectivity: Selectivity;
  readonly expectedRows: NonNegativeNumber;
  readonly expectedPages: NonNegativeNumber;
  readonly assumptions: readonly string[];
}

export interface PlanEstimate {
  readonly plan: "table-scan" | "index-equality" | "index-range" | "hash-equality";
  readonly costPages: NonNegativeNumber;
  readonly expectedRows: NonNegativeNumber;
  readonly assumptions: readonly string[];
}

export const positiveInteger = (value: number): KernelResult<PositiveInteger> => {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1) {
    return err("out-of-domain", `positive integer expected, got ${value}`);
  }
  return ok(value as PositiveInteger);
};

export const nonNegativeNumber = (value: number): KernelResult<NonNegativeNumber> => {
  if (!Number.isFinite(value) || value < 0) {
    return err("out-of-domain", `non-negative finite number expected, got ${value}`);
  }
  return ok(value as NonNegativeNumber);
};

export const selectivity = (value: number): KernelResult<Selectivity> => {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    return err("out-of-domain", `selectivity must be in [0,1], got ${value}`);
  }
  return ok(value as Selectivity);
};

export const tableStats = (input: {
  readonly rows: number;
  readonly pages: number;
  readonly distinctValues?: number;
}): KernelResult<TableStats> => {
  const rows = positiveInteger(input.rows);
  if (!rows.ok) {
    return rows;
  }
  const pages = positiveInteger(input.pages);
  if (!pages.ok) {
    return pages;
  }
  if (input.distinctValues === undefined) {
    return ok({ rows: rows.value, pages: pages.value });
  }
  const distinctValues = positiveInteger(input.distinctValues);
  if (!distinctValues.ok) {
    return distinctValues;
  }
  if (distinctValues.value > rows.value) {
    return err("precondition-violated", "distinctValues cannot exceed table rows");
  }
  return ok({ rows: rows.value, pages: pages.value, distinctValues: distinctValues.value });
};

export const indexStats = (input: {
  readonly kind: IndexKind;
  readonly leafPages: number;
  readonly fanout: number;
  readonly clustered: boolean;
}): KernelResult<IndexStats> => {
  if (!validIndexKind(input.kind)) {
    return err("precondition-violated", `unsupported index kind ${input.kind}`);
  }
  const leafPages = positiveInteger(input.leafPages);
  if (!leafPages.ok) {
    return leafPages;
  }
  const fanout = positiveInteger(input.fanout);
  if (!fanout.ok) {
    return fanout;
  }
  if (fanout.value < 2) {
    return err("out-of-domain", "index fanout must be at least 2");
  }
  return ok({
    kind: input.kind,
    leafPages: leafPages.value,
    fanout: fanout.value,
    clustered: input.clustered,
  });
};

export const estimateSelectivity = (
  table: TableStats,
  kind: PredicateKind,
  selectivityHint?: Selectivity,
): KernelResult<PredicateEstimate> => {
  const checkedTable = tableStats(table);
  if (!checkedTable.ok) {
    return checkedTable;
  }
  if (!validPredicateKind(kind)) {
    return err("precondition-violated", `unsupported predicate kind ${kind}`);
  }
  const estimateSource = selectivityHint === undefined
    ? defaultSelectivity(checkedTable.value, kind)
    : {
        value: selectivityHint,
        assumption: "caller-supplied selectivity hint",
      };
  const checkedSelectivity = selectivity(estimateSource.value);
  if (!checkedSelectivity.ok) {
    return checkedSelectivity;
  }
  const expectedRows = nonNegativeNumber(checkedTable.value.rows * checkedSelectivity.value);
  if (!expectedRows.ok) {
    return expectedRows;
  }
  const expectedPages = nonNegativeNumber(
    Math.min(checkedTable.value.pages, checkedTable.value.pages * checkedSelectivity.value),
  );
  if (!expectedPages.ok) {
    return expectedPages;
  }
  return ok({
    kind,
    selectivity: checkedSelectivity.value,
    expectedRows: expectedRows.value,
    expectedPages: expectedPages.value,
    assumptions: [
      estimateSource.assumption,
      "expectedRows = rows * selectivity",
      "expectedPages = min(table pages, table pages * selectivity)",
    ],
  });
};

export const btreeHeight = (index: IndexStats): KernelResult<PositiveInteger> => {
  const checked = indexStats(index);
  if (!checked.ok) {
    return checked;
  }
  if (checked.value.kind === "hash") {
    return err("precondition-violated", "hash indexes do not have B+tree height");
  }
  const height = Math.max(1, Math.ceil(Math.log(checked.value.leafPages) / Math.log(checked.value.fanout)) + 1);
  return positiveInteger(height);
};

export const tableScanCost = (table: TableStats): KernelResult<PlanEstimate> => {
  const checked = tableStats(table);
  if (!checked.ok) {
    return checked;
  }
  const costPages = nonNegativeNumber(checked.value.pages);
  if (!costPages.ok) {
    return costPages;
  }
  const expectedRows = nonNegativeNumber(checked.value.rows);
  if (!expectedRows.ok) {
    return expectedRows;
  }
  return ok({
    plan: "table-scan",
    costPages: costPages.value,
    expectedRows: expectedRows.value,
    assumptions: ["reads every table page once", "logical page I/O only"],
  });
};

export const indexLookupCost = (
  table: TableStats,
  index: IndexStats,
  predicate: PredicateEstimate,
): KernelResult<PlanEstimate> => {
  const checkedTable = tableStats(table);
  if (!checkedTable.ok) {
    return checkedTable;
  }
  const checkedIndex = indexStats(index);
  if (!checkedIndex.ok) {
    return checkedIndex;
  }
  const checkedPredicate = predicateEstimate(checkedTable.value, predicate);
  if (!checkedPredicate.ok) {
    return checkedPredicate;
  }
  if (checkedIndex.value.kind === "hash" && checkedPredicate.value.kind !== "equality") {
    return err("precondition-violated", "hash indexes only support equality predicates");
  }

  if (checkedIndex.value.kind === "hash") {
    const dataPages = checkedIndex.value.clustered
      ? checkedPredicate.value.expectedPages
      : checkedPredicate.value.expectedRows;
    const cost = nonNegativeNumber(1 + dataPages);
    if (!cost.ok) {
      return cost;
    }
    return ok({
      plan: "hash-equality",
      costPages: cost.value,
      expectedRows: checkedPredicate.value.expectedRows,
      assumptions: [
        "one hash bucket probe",
        checkedIndex.value.clustered
          ? "clustered hash access estimates data pages by selectivity"
          : "unclustered hash access estimates one data page per matching row",
      ],
    });
  }

  const height = btreeHeight(checkedIndex.value);
  if (!height.ok) {
    return height;
  }
  const leafPages = checkedPredicate.value.kind === "range"
    ? Math.max(1, checkedIndex.value.leafPages * checkedPredicate.value.selectivity)
    : 1;
  const dataPages = checkedIndex.value.clustered
    ? checkedPredicate.value.expectedPages
    : checkedPredicate.value.expectedRows;
  const cost = nonNegativeNumber(height.value + leafPages + dataPages);
  if (!cost.ok) {
    return cost;
  }
  return ok({
    plan: checkedPredicate.value.kind === "equality" ? "index-equality" : "index-range",
    costPages: cost.value,
    expectedRows: checkedPredicate.value.expectedRows,
    assumptions: [
      `B+tree height ${height.value}`,
      checkedPredicate.value.kind === "range"
        ? "range scan visits a selectivity-weighted leaf-page span"
        : "equality lookup visits one leaf page",
      checkedIndex.value.clustered
        ? "clustered access estimates data pages by selectivity"
        : "unclustered access estimates one data page per matching row",
    ],
  });
};

export const comparePlans = (
  plans: readonly PlanEstimate[],
): KernelResult<PlanEstimate> => {
  if (plans.length === 0) {
    return err("precondition-violated", "at least one plan is required");
  }
  let best: PlanEstimate | undefined;
  for (const plan of plans) {
    const checked = planEstimate(plan);
    if (!checked.ok) {
      return checked;
    }
    if (best === undefined || checked.value.costPages < best.costPages) {
      best = checked.value;
    }
  }
  if (best === undefined) {
    return err("precondition-violated", "no valid plan was supplied");
  }
  return ok(best);
};

export const insertMaintenanceCost = (
  indexes: readonly IndexStats[],
): KernelResult<NonNegativeNumber> => {
  let total = 0;
  for (const index of indexes) {
    const checked = indexStats(index);
    if (!checked.ok) {
      return checked;
    }
    if (checked.value.kind === "hash") {
      total += 1;
      continue;
    }
    const height = btreeHeight(checked.value);
    if (!height.ok) {
      return height;
    }
    total += height.value + 1;
  }
  return nonNegativeNumber(total);
};

const predicateEstimate = (
  table: TableStats,
  predicate: PredicateEstimate,
): KernelResult<PredicateEstimate> => {
  const checkedSelectivity = selectivity(predicate.selectivity);
  if (!checkedSelectivity.ok) {
    return checkedSelectivity;
  }
  if (!validPredicateKind(predicate.kind)) {
    return err("precondition-violated", `unsupported predicate kind ${predicate.kind}`);
  }
  const expected = estimateSelectivity(table, predicate.kind, checkedSelectivity.value);
  if (!expected.ok) {
    return expected;
  }
  if (!closeTo(predicate.expectedRows, expected.value.expectedRows)) {
    return err("precondition-violated", "predicate expectedRows does not match table and selectivity");
  }
  if (!closeTo(predicate.expectedPages, expected.value.expectedPages)) {
    return err("precondition-violated", "predicate expectedPages does not match table and selectivity");
  }
  return expected;
};

const planEstimate = (plan: PlanEstimate): KernelResult<PlanEstimate> => {
  if (!validPlan(plan.plan)) {
    return err("precondition-violated", `unsupported plan ${plan.plan}`);
  }
  const costPages = nonNegativeNumber(plan.costPages);
  if (!costPages.ok) {
    return costPages;
  }
  const expectedRows = nonNegativeNumber(plan.expectedRows);
  if (!expectedRows.ok) {
    return expectedRows;
  }
  if (!Array.isArray(plan.assumptions)) {
    return err("precondition-violated", "plan assumptions must be an array of strings");
  }
  if (plan.assumptions.some((assumption) => typeof assumption !== "string")) {
    return err("precondition-violated", "plan assumptions must contain only strings");
  }
  return ok({
    plan: plan.plan,
    costPages: costPages.value,
    expectedRows: expectedRows.value,
    assumptions: [...plan.assumptions],
  });
};

const defaultSelectivity = (
  table: TableStats,
  kind: PredicateKind,
): { readonly value: Selectivity; readonly assumption: string } => {
  if (kind === "range") {
    return {
      value: 0.1 as Selectivity,
      assumption: "default range selectivity is 0.1",
    };
  }
  if (table.distinctValues !== undefined) {
    return {
      value: (1 / table.distinctValues) as Selectivity,
      assumption: "equality selectivity estimated as 1 / distinct values",
    };
  }
  return {
    value: 0.1 as Selectivity,
    assumption: "default equality selectivity is 0.1 because distinct values are unknown",
  };
};

const validIndexKind = (kind: string): kind is IndexKind =>
  kind === "primary-btree" || kind === "secondary-btree" || kind === "hash";

const validPredicateKind = (kind: string): kind is PredicateKind =>
  kind === "equality" || kind === "range";

const validPlan = (plan: string): plan is PlanEstimate["plan"] =>
  plan === "table-scan" ||
  plan === "index-equality" ||
  plan === "index-range" ||
  plan === "hash-equality";

const closeTo = (left: number, right: number): boolean =>
  Number.isFinite(left) &&
  Number.isFinite(right) &&
  Math.abs(left - right) <= 1e-9 * Math.max(1, Math.abs(right));
