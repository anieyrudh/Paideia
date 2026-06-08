import {
  err,
  ok,
  probability,
  type Brand,
  type KernelResult,
  type Probability,
} from "@paideia/shared";

export type InventoryUnits = Brand<number, "InventoryModels.InventoryUnits">;
export type DemandUnitsPerPeriod = Brand<number, "InventoryModels.DemandUnitsPerPeriod">;
export type DemandStdDevUnitsPerPeriod = Brand<
  number,
  "InventoryModels.DemandStdDevUnitsPerPeriod"
>;
export type LeadTimePeriods = Brand<number, "InventoryModels.LeadTimePeriods">;
export type CostPerOrder = Brand<number, "InventoryModels.CostPerOrder">;
export type HoldingCostPerUnitPerPeriod = Brand<
  number,
  "InventoryModels.HoldingCostPerUnitPerPeriod"
>;
export type UnitCost = Brand<number, "InventoryModels.UnitCost">;
export type CostPerPeriod = Brand<number, "InventoryModels.CostPerPeriod">;
export type ZScore = Brand<number, "InventoryModels.ZScore">;

export interface EoqInput {
  readonly demandRate: DemandUnitsPerPeriod;
  readonly orderCost: CostPerOrder;
  readonly holdingCost: HoldingCostPerUnitPerPeriod;
}

export interface EoqAnalysis {
  readonly economicOrderQuantity: InventoryUnits;
  readonly cycleCount: number;
  readonly annualOrderingCost: CostPerPeriod;
  readonly annualHoldingCost: CostPerPeriod;
  readonly totalRelevantCost: CostPerPeriod;
}

export interface TotalAnnualCostInput {
  readonly demandRate: DemandUnitsPerPeriod;
  readonly orderQuantity: InventoryUnits;
  readonly orderCost: CostPerOrder;
  readonly holdingCost: HoldingCostPerUnitPerPeriod;
  readonly unitCost?: UnitCost;
}

export interface TotalAnnualCostAnalysis {
  readonly orderingCost: CostPerPeriod;
  readonly holdingCost: CostPerPeriod;
  readonly purchaseCost: CostPerPeriod | null;
  readonly totalRelevantCost: CostPerPeriod;
  readonly totalAnnualCost: CostPerPeriod;
}

export interface SafetyStockFromZInput {
  readonly zScore: ZScore;
  readonly demandStandardDeviation: DemandStdDevUnitsPerPeriod;
  readonly leadTime: LeadTimePeriods;
}

export interface SafetyStockFromServiceLevelInput {
  readonly serviceLevel: Probability;
  readonly demandStandardDeviation: DemandStdDevUnitsPerPeriod;
  readonly leadTime: LeadTimePeriods;
}

export interface SafetyStockAnalysis {
  readonly safetyStock: InventoryUnits;
  readonly demandStandardDeviationDuringLeadTime: InventoryUnits;
  readonly zScore: ZScore;
  readonly serviceLevel: Probability | null;
}

export interface ReorderPointInput {
  readonly averageDemand: DemandUnitsPerPeriod;
  readonly leadTime: LeadTimePeriods;
  readonly safetyStock?: InventoryUnits;
}

export interface ReorderPointAnalysis {
  readonly expectedLeadTimeDemand: InventoryUnits;
  readonly safetyStock: InventoryUnits;
  readonly reorderPoint: InventoryUnits;
}

export const inventoryUnits = (value: number): KernelResult<InventoryUnits> =>
  finite(value) && value >= 0
    ? ok(value as InventoryUnits)
    : err("out-of-domain", `inventoryUnits must be finite and non-negative, got ${value}`);

export const demandUnitsPerPeriod = (value: number): KernelResult<DemandUnitsPerPeriod> =>
  finite(value) && value > 0
    ? ok(value as DemandUnitsPerPeriod)
    : err("out-of-domain", `demandUnitsPerPeriod must be finite and positive, got ${value}`);

export const demandStdDevUnitsPerPeriod = (
  value: number,
): KernelResult<DemandStdDevUnitsPerPeriod> =>
  finite(value) && value >= 0
    ? ok(value as DemandStdDevUnitsPerPeriod)
    : err(
        "out-of-domain",
        `demandStdDevUnitsPerPeriod must be finite and non-negative, got ${value}`,
      );

export const leadTimePeriods = (value: number): KernelResult<LeadTimePeriods> =>
  finite(value) && value > 0
    ? ok(value as LeadTimePeriods)
    : err("out-of-domain", `leadTimePeriods must be finite and positive, got ${value}`);

export const costPerOrder = (value: number): KernelResult<CostPerOrder> =>
  finite(value) && value > 0
    ? ok(value as CostPerOrder)
    : err("out-of-domain", `costPerOrder must be finite and positive, got ${value}`);

export const holdingCostPerUnitPerPeriod = (
  value: number,
): KernelResult<HoldingCostPerUnitPerPeriod> =>
  finite(value) && value > 0
    ? ok(value as HoldingCostPerUnitPerPeriod)
    : err(
        "out-of-domain",
        `holdingCostPerUnitPerPeriod must be finite and positive, got ${value}`,
      );

export const unitCost = (value: number): KernelResult<UnitCost> =>
  finite(value) && value >= 0
    ? ok(value as UnitCost)
    : err("out-of-domain", `unitCost must be finite and non-negative, got ${value}`);

export const costPerPeriod = (value: number): KernelResult<CostPerPeriod> =>
  finite(value) && value >= 0
    ? ok(value as CostPerPeriod)
    : err("out-of-domain", `costPerPeriod must be finite and non-negative, got ${value}`);

export const zScore = (value: number): KernelResult<ZScore> =>
  finite(value) && value >= 0
    ? ok(value as ZScore)
    : err("out-of-domain", `zScore must be finite and non-negative, got ${value}`);

export const economicOrderQuantity = (input: EoqInput): KernelResult<EoqAnalysis> => {
  const demand = demandUnitsPerPeriod(input.demandRate);
  if (!demand.ok) return demand;
  const setup = costPerOrder(input.orderCost);
  if (!setup.ok) return setup;
  const holding = holdingCostPerUnitPerPeriod(input.holdingCost);
  if (!holding.ok) return holding;

  const quantity = Math.sqrt((2 * demand.value * setup.value) / holding.value);
  const orderQuantity = inventoryUnits(quantity);
  if (!orderQuantity.ok) return orderQuantity;
  const cost = totalAnnualCost({
    demandRate: demand.value,
    orderQuantity: orderQuantity.value,
    orderCost: setup.value,
    holdingCost: holding.value,
  });
  if (!cost.ok) return cost;

  return ok(Object.freeze({
    economicOrderQuantity: orderQuantity.value,
    cycleCount: demand.value / orderQuantity.value,
    annualOrderingCost: cost.value.orderingCost,
    annualHoldingCost: cost.value.holdingCost,
    totalRelevantCost: cost.value.totalRelevantCost,
  }));
};

export const totalAnnualCost = (
  input: TotalAnnualCostInput,
): KernelResult<TotalAnnualCostAnalysis> => {
  const demand = demandUnitsPerPeriod(input.demandRate);
  if (!demand.ok) return demand;
  const quantity = positiveInventoryUnits(input.orderQuantity, "orderQuantity");
  if (!quantity.ok) return quantity;
  const setup = costPerOrder(input.orderCost);
  if (!setup.ok) return setup;
  const holding = holdingCostPerUnitPerPeriod(input.holdingCost);
  if (!holding.ok) return holding;
  const unit =
    input.unitCost === undefined ? null : unitCost(input.unitCost);
  if (unit !== null && !unit.ok) return unit;

  const orderingCost = checkedCost((demand.value / quantity.value) * setup.value, "orderingCost");
  if (!orderingCost.ok) return orderingCost;
  const holdingCost = checkedCost((quantity.value / 2) * holding.value, "holdingCost");
  if (!holdingCost.ok) return holdingCost;
  const totalRelevantCost = checkedCost(
    orderingCost.value + holdingCost.value,
    "totalRelevantCost",
  );
  if (!totalRelevantCost.ok) return totalRelevantCost;
  const purchaseCost =
    unit === null ? null : checkedCost(demand.value * unit.value, "purchaseCost");
  if (purchaseCost !== null && !purchaseCost.ok) return purchaseCost;
  const totalAnnual = checkedCost(
    totalRelevantCost.value + (purchaseCost === null ? 0 : purchaseCost.value),
    "totalAnnualCost",
  );
  if (!totalAnnual.ok) return totalAnnual;

  return ok(Object.freeze({
    orderingCost: orderingCost.value,
    holdingCost: holdingCost.value,
    purchaseCost: purchaseCost === null ? null : purchaseCost.value,
    totalRelevantCost: totalRelevantCost.value,
    totalAnnualCost: totalAnnual.value,
  }));
};

export const safetyStockFromZ = (
  input: SafetyStockFromZInput,
): KernelResult<SafetyStockAnalysis> => {
  const checkedZ = zScore(input.zScore);
  if (!checkedZ.ok) return checkedZ;
  const sigma = demandStdDevUnitsPerPeriod(input.demandStandardDeviation);
  if (!sigma.ok) return sigma;
  const leadTime = leadTimePeriods(input.leadTime);
  if (!leadTime.ok) return leadTime;
  return safetyStockAnalysis(checkedZ.value, sigma.value, leadTime.value, null);
};

export const safetyStockFromServiceLevel = (
  input: SafetyStockFromServiceLevelInput,
): KernelResult<SafetyStockAnalysis> => {
  const serviceLevel = checkedServiceLevel(input.serviceLevel);
  if (!serviceLevel.ok) return serviceLevel;
  const sigma = demandStdDevUnitsPerPeriod(input.demandStandardDeviation);
  if (!sigma.ok) return sigma;
  const leadTime = leadTimePeriods(input.leadTime);
  if (!leadTime.ok) return leadTime;
  const z = zScore(inverseStandardNormal(serviceLevel.value));
  if (!z.ok) return z;
  return safetyStockAnalysis(z.value, sigma.value, leadTime.value, serviceLevel.value);
};

export const reorderPoint = (input: ReorderPointInput): KernelResult<ReorderPointAnalysis> => {
  const demand = demandUnitsPerPeriod(input.averageDemand);
  if (!demand.ok) return demand;
  const leadTime = leadTimePeriods(input.leadTime);
  if (!leadTime.ok) return leadTime;
  const safety =
    input.safetyStock === undefined ? inventoryUnits(0) : inventoryUnits(input.safetyStock);
  if (!safety.ok) return safety;

  const expected = inventoryUnits(demand.value * leadTime.value);
  if (!expected.ok) return expected;
  const point = inventoryUnits(expected.value + safety.value);
  if (!point.ok) return point;

  return ok(Object.freeze({
    expectedLeadTimeDemand: expected.value,
    safetyStock: safety.value,
    reorderPoint: point.value,
  }));
};

const finite = (value: number): boolean => Number.isFinite(value);

const positiveInventoryUnits = (
  value: InventoryUnits,
  label: string,
): KernelResult<InventoryUnits> =>
  finite(value) && value > 0
    ? ok(value as InventoryUnits)
    : err("out-of-domain", `${label} must be finite and positive, got ${value}`);

const checkedCost = (value: number, label: string): KernelResult<CostPerPeriod> =>
  finite(value) && value >= 0
    ? ok(value as CostPerPeriod)
    : err("numerical-instability", `${label} was non-finite or negative`);

const checkedServiceLevel = (value: Probability): KernelResult<Probability> => {
  const checked = probability(value);
  if (!checked.ok) return checked;
  if (checked.value < 0.5 || checked.value >= 1) {
    return err("out-of-domain", "serviceLevel must be in [0.5, 1) for safety stock");
  }
  return checked;
};

const safetyStockAnalysis = (
  z: ZScore,
  sigma: DemandStdDevUnitsPerPeriod,
  leadTime: LeadTimePeriods,
  serviceLevel: Probability | null,
): KernelResult<SafetyStockAnalysis> => {
  const leadTimeSigma = inventoryUnits(sigma * Math.sqrt(leadTime));
  if (!leadTimeSigma.ok) return leadTimeSigma;
  const stock = inventoryUnits(z * leadTimeSigma.value);
  if (!stock.ok) return stock;
  return ok(Object.freeze({
    safetyStock: stock.value,
    demandStandardDeviationDuringLeadTime: leadTimeSigma.value,
    zScore: z,
    serviceLevel,
  }));
};

const inverseStandardNormal = (p: Probability): number => {
  const probabilityValue = Number(p);
  const a = [
    -39.69683028665376,
    220.9460984245205,
    -275.9285104469687,
    138.357751867269,
    -30.66479806614716,
    2.506628277459239,
  ] as const;
  const b = [
    -54.47609879822406,
    161.5858368580409,
    -155.6989798598866,
    66.80131188771972,
    -13.28068155288572,
  ] as const;
  const c = [
    -0.007784894002430293,
    -0.3223964580411365,
    -2.400758277161838,
    -2.549732539343734,
    4.374664141464968,
    2.938163982698783,
  ] as const;
  const d = [
    0.007784695709041462,
    0.3224671290700398,
    2.445134137142996,
    3.754408661907416,
  ] as const;
  const lower = 0.02425;
  const upper = 1 - lower;

  if (probabilityValue < lower) {
    const q = Math.sqrt(-2 * Math.log(probabilityValue));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (probabilityValue <= upper) {
    const q = probabilityValue - 0.5;
    const r = q * q;
    return (
      (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) *
      q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }

  const q = Math.sqrt(-2 * Math.log(1 - probabilityValue));
  return -(
    (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
};
