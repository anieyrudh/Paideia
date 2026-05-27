import { err, ok, type Brand, type KernelResult } from "@paideia/shared";

export type Money = Brand<number, "Finance.Money">;
export type NonNegativeMoney = Brand<number, "Finance.NonNegativeMoney">;
export type DiscountRate = Brand<number, "Finance.DiscountRate">;
export type FinancialRatio = Brand<number, "Finance.FinancialRatio">;
export type Period = Brand<number, "Finance.Period">;

export interface CashFlow {
  readonly period: Period;
  readonly amount: Money;
}

export interface PresentValueInput {
  readonly cashFlow: CashFlow;
  readonly discountRate: DiscountRate;
}

export interface NetPresentValueInput {
  readonly cashFlows: readonly CashFlow[];
  readonly discountRate: DiscountRate;
}

export interface IrrInput {
  readonly cashFlows: readonly CashFlow[];
  readonly lowerRate?: DiscountRate;
  readonly upperRate?: DiscountRate;
  readonly tolerance?: number;
  readonly maxIterations?: Period;
}

export interface IrrResult {
  readonly rate: DiscountRate;
  readonly npv: Money;
  readonly iterations: number;
}

export interface PaybackResult {
  readonly paidBack: boolean;
  readonly period: number | null;
  readonly cumulativeCashFlow: Money;
}

export interface LiquidityInput {
  readonly currentAssets: NonNegativeMoney;
  readonly currentLiabilities: NonNegativeMoney;
}

export interface QuickRatioInput extends LiquidityInput {
  readonly inventory: NonNegativeMoney;
}

export interface LeverageInput {
  readonly totalLiabilities: NonNegativeMoney;
  readonly totalEquity: Money;
}

export interface MarginInput {
  readonly numerator: Money;
  readonly revenue: NonNegativeMoney;
}

export interface TurnoverInput {
  readonly numerator: NonNegativeMoney;
  readonly denominator: NonNegativeMoney;
}

export interface FinancialSnapshot {
  readonly currentAssets: NonNegativeMoney;
  readonly inventory?: NonNegativeMoney;
  readonly currentLiabilities: NonNegativeMoney;
  readonly totalAssets: NonNegativeMoney;
  readonly totalLiabilities: NonNegativeMoney;
  readonly totalEquity: Money;
  readonly revenue: NonNegativeMoney;
  readonly netIncome: Money;
  readonly costOfGoodsSold?: NonNegativeMoney;
  readonly averageInventory?: NonNegativeMoney;
}

export interface RatioAnalysis {
  readonly currentRatio: FinancialRatio;
  readonly quickRatio: FinancialRatio | null;
  readonly debtToEquity: FinancialRatio;
  readonly netProfitMargin: FinancialRatio;
  readonly returnOnAssets: FinancialRatio;
  readonly inventoryTurnover: FinancialRatio | null;
}

export const money = (value: number): KernelResult<Money> =>
  finite(value) ? ok(value as Money) : err("out-of-domain", `money must be finite, got ${value}`);

export const nonNegativeMoney = (value: number): KernelResult<NonNegativeMoney> =>
  finite(value) && value >= 0
    ? ok(value as NonNegativeMoney)
    : err("out-of-domain", `nonNegativeMoney must be finite and non-negative, got ${value}`);

export const discountRate = (value: number): KernelResult<DiscountRate> => {
  if (!finite(value) || value <= -1) {
    return err("out-of-domain", `discountRate must be finite and greater than -1, got ${value}`);
  }
  return ok(value as DiscountRate);
};

export const financialRatio = (value: number): KernelResult<FinancialRatio> =>
  finite(value)
    ? ok(value as FinancialRatio)
    : err("out-of-domain", `financialRatio must be finite, got ${value}`);

export const period = (value: number): KernelResult<Period> => {
  if (!Number.isSafeInteger(value) || value < 0) {
    return err("precondition-violated", `period must be a non-negative safe integer, got ${value}`);
  }
  return ok(value as Period);
};

export const validateCashFlows = (
  cashFlows: readonly CashFlow[],
): KernelResult<readonly CashFlow[]> => {
  if (cashFlows.length === 0) {
    return err("precondition-violated", "cashFlows must contain at least one entry");
  }
  let previousPeriod = -1;
  for (const flow of cashFlows) {
    const checkedPeriod = period(flow.period);
    if (!checkedPeriod.ok) {
      return checkedPeriod;
    }
    if (checkedPeriod.value <= previousPeriod) {
      return err("precondition-violated", "cashFlow periods must be strictly increasing");
    }
    const checkedAmount = money(flow.amount);
    if (!checkedAmount.ok) {
      return checkedAmount;
    }
    previousPeriod = checkedPeriod.value;
  }
  return ok([...cashFlows]);
};

export const discountFactor = (input: {
  readonly discountRate: DiscountRate;
  readonly period: Period;
}): KernelResult<number> => {
  const rate = discountRate(input.discountRate);
  if (!rate.ok) {
    return rate;
  }
  const elapsed = period(input.period);
  if (!elapsed.ok) {
    return elapsed;
  }
  const factor = 1 / (1 + rate.value) ** elapsed.value;
  if (!finite(factor) || factor <= 0) {
    return err("numerical-instability", "discount factor was non-finite");
  }
  return ok(factor);
};

export const presentValue = (input: PresentValueInput): KernelResult<Money> => {
  const checkedFlow = validateCashFlows([input.cashFlow]);
  if (!checkedFlow.ok) {
    return checkedFlow;
  }
  const factor = discountFactor({
    discountRate: input.discountRate,
    period: input.cashFlow.period,
  });
  if (!factor.ok) {
    return factor;
  }
  return checkedMoney(input.cashFlow.amount * factor.value, "presentValue");
};

export const netPresentValue = (
  input: NetPresentValueInput,
): KernelResult<Money> => {
  const checked = validateCashFlows(input.cashFlows);
  if (!checked.ok) {
    return checked;
  }
  const rate = discountRate(input.discountRate);
  if (!rate.ok) {
    return rate;
  }
  let total = 0;
  for (const flow of checked.value) {
    const pv = presentValue({ cashFlow: flow, discountRate: rate.value });
    if (!pv.ok) {
      return pv;
    }
    total += pv.value;
  }
  return checkedMoney(total, "netPresentValue");
};

export const internalRateOfReturn = (
  input: IrrInput,
): KernelResult<IrrResult> => {
  const checked = validateCashFlows(input.cashFlows);
  if (!checked.ok) {
    return checked;
  }
  const signs = cashFlowSigns(checked.value);
  if (!signs.hasNegative || !signs.hasPositive) {
    return err("precondition-violated", "IRR requires at least one negative and one positive cash flow");
  }
  if (cashFlowSignChanges(checked.value) > 1) {
    return err(
      "precondition-violated",
      "IRR requires a single cash-flow sign change for this teaching kernel",
    );
  }
  const lower = input.lowerRate === undefined ? discountRate(-0.999) : discountRate(input.lowerRate);
  if (!lower.ok) {
    return lower;
  }
  const upper = input.upperRate === undefined ? discountRate(10) : discountRate(input.upperRate);
  if (!upper.ok) {
    return upper;
  }
  if (lower.value >= upper.value) {
    return err("precondition-violated", "IRR lowerRate must be less than upperRate");
  }
  const tolerance = input.tolerance ?? 1e-7;
  if (!finite(tolerance) || tolerance <= 0) {
    return err("precondition-violated", "IRR tolerance must be finite and positive");
  }
  const maxIterations =
    input.maxIterations === undefined ? ok(100 as Period) : period(input.maxIterations);
  if (!maxIterations.ok) {
    return maxIterations;
  }
  let low: number = lower.value;
  let high: number = upper.value;
  let lowNpv = npvAtRate(checked.value, low);
  let highNpv = npvAtRate(checked.value, high);
  if (!finite(lowNpv) || !finite(highNpv)) {
    return err("numerical-instability", "IRR bracket produced non-finite NPV");
  }
  if (lowNpv === 0) {
    return irrResult(low, lowNpv, 0);
  }
  if (highNpv === 0) {
    return irrResult(high, highNpv, 0);
  }
  if (Math.sign(lowNpv) === Math.sign(highNpv)) {
    return err("convergence-failed", "IRR bracket does not straddle a root");
  }

  for (let iteration = 1; iteration <= maxIterations.value; iteration += 1) {
    const mid = (low + high) / 2;
    const midNpv = npvAtRate(checked.value, mid);
    if (!finite(midNpv)) {
      return err("numerical-instability", "IRR iteration produced non-finite NPV");
    }
    if (Math.abs(midNpv) <= tolerance || Math.abs(high - low) <= tolerance) {
      return irrResult(mid, midNpv, iteration);
    }
    if (Math.sign(midNpv) === Math.sign(lowNpv)) {
      low = mid;
      lowNpv = midNpv;
    } else {
      high = mid;
      highNpv = midNpv;
    }
  }
  return err("convergence-failed", "IRR did not converge within maxIterations");
};

export const paybackPeriod = (
  cashFlows: readonly CashFlow[],
): KernelResult<PaybackResult> => {
  const checked = validateCashFlows(cashFlows);
  if (!checked.ok) {
    return checked;
  }
  let cumulative = 0;
  let previousCumulative = 0;
  let previousPeriod = checked.value[0]?.period ?? (0 as Period);
  for (const flow of checked.value) {
    previousCumulative = cumulative;
    cumulative += flow.amount;
    if (cumulative >= 0) {
      const periodResult =
        flow.amount === 0
          ? flow.period
          : previousPeriod + ((0 - previousCumulative) / flow.amount) * (flow.period - previousPeriod);
      return ok({
        paidBack: true,
        period: periodResult,
        cumulativeCashFlow: cumulative as Money,
      });
    }
    previousPeriod = flow.period;
  }
  return ok({
    paidBack: false,
    period: null,
    cumulativeCashFlow: cumulative as Money,
  });
};

export const currentRatio = (
  input: LiquidityInput,
): KernelResult<FinancialRatio> => {
  const assets = nonNegativeMoney(input.currentAssets);
  if (!assets.ok) {
    return assets;
  }
  const liabilities = positiveMoney(input.currentLiabilities, "currentLiabilities");
  if (!liabilities.ok) {
    return liabilities;
  }
  return checkedRatio(assets.value / liabilities.value, "currentRatio");
};

export const quickRatio = (input: QuickRatioInput): KernelResult<FinancialRatio> => {
  const assets = nonNegativeMoney(input.currentAssets);
  if (!assets.ok) {
    return assets;
  }
  const inventory = nonNegativeMoney(input.inventory);
  if (!inventory.ok) {
    return inventory;
  }
  const liabilities = positiveMoney(input.currentLiabilities, "currentLiabilities");
  if (!liabilities.ok) {
    return liabilities;
  }
  const quickAssets = assets.value - inventory.value;
  if (quickAssets < 0) {
    return err("precondition-violated", "inventory must not exceed currentAssets");
  }
  return checkedRatio(quickAssets / liabilities.value, "quickRatio");
};

export const debtToEquity = (
  input: LeverageInput,
): KernelResult<FinancialRatio> => {
  const liabilities = nonNegativeMoney(input.totalLiabilities);
  if (!liabilities.ok) {
    return liabilities;
  }
  const equity = positiveSignedMoney(input.totalEquity, "totalEquity");
  if (!equity.ok) {
    return equity;
  }
  return checkedRatio(liabilities.value / equity.value, "debtToEquity");
};

export const netProfitMargin = (
  input: MarginInput,
): KernelResult<FinancialRatio> => {
  const numerator = money(input.numerator);
  if (!numerator.ok) {
    return numerator;
  }
  const revenue = positiveMoney(input.revenue, "revenue");
  if (!revenue.ok) {
    return revenue;
  }
  return checkedRatio(numerator.value / revenue.value, "netProfitMargin");
};

export const returnOnAssets = (input: {
  readonly netIncome: Money;
  readonly totalAssets: NonNegativeMoney;
}): KernelResult<FinancialRatio> => {
  const netIncome = money(input.netIncome);
  if (!netIncome.ok) {
    return netIncome;
  }
  const totalAssets = positiveMoney(input.totalAssets, "totalAssets");
  if (!totalAssets.ok) {
    return totalAssets;
  }
  return checkedRatio(netIncome.value / totalAssets.value, "returnOnAssets");
};

export const inventoryTurnover = (
  input: TurnoverInput,
): KernelResult<FinancialRatio> => {
  const numerator = nonNegativeMoney(input.numerator);
  if (!numerator.ok) {
    return numerator;
  }
  const denominator = positiveMoney(input.denominator, "denominator");
  if (!denominator.ok) {
    return denominator;
  }
  return checkedRatio(numerator.value / denominator.value, "inventoryTurnover");
};

export const analyzeFinancialSnapshot = (
  snapshot: FinancialSnapshot,
): KernelResult<RatioAnalysis> => {
  const current = currentRatio(snapshot);
  if (!current.ok) {
    return current;
  }
  const quick =
    snapshot.inventory === undefined
      ? ok(null)
      : quickRatio({
          currentAssets: snapshot.currentAssets,
          currentLiabilities: snapshot.currentLiabilities,
          inventory: snapshot.inventory,
        });
  if (!quick.ok) {
    return quick;
  }
  const leverage = debtToEquity(snapshot);
  if (!leverage.ok) {
    return leverage;
  }
  const margin = netProfitMargin({
    numerator: snapshot.netIncome,
    revenue: snapshot.revenue,
  });
  if (!margin.ok) {
    return margin;
  }
  const roa = returnOnAssets({
    netIncome: snapshot.netIncome,
    totalAssets: snapshot.totalAssets,
  });
  if (!roa.ok) {
    return roa;
  }
  const turnover =
    snapshot.costOfGoodsSold === undefined || snapshot.averageInventory === undefined
      ? ok(null)
      : inventoryTurnover({
          numerator: snapshot.costOfGoodsSold,
          denominator: snapshot.averageInventory,
        });
  if (!turnover.ok) {
    return turnover;
  }
  return ok({
    currentRatio: current.value,
    quickRatio: quick.value,
    debtToEquity: leverage.value,
    netProfitMargin: margin.value,
    returnOnAssets: roa.value,
    inventoryTurnover: turnover.value,
  });
};

const finite = (value: number): boolean => Number.isFinite(value);

const checkedMoney = (value: number, label: string): KernelResult<Money> =>
  finite(value)
    ? ok(value as Money)
    : err("numerical-instability", `${label} was non-finite`);

const checkedRatio = (value: number, label: string): KernelResult<FinancialRatio> =>
  finite(value)
    ? ok(value as FinancialRatio)
    : err("numerical-instability", `${label} was non-finite`);

const positiveMoney = (
  value: NonNegativeMoney,
  label: string,
): KernelResult<NonNegativeMoney> => {
  const checked = nonNegativeMoney(value);
  if (!checked.ok) {
    return checked;
  }
  if (checked.value <= 0) {
    return err("precondition-violated", `${label} must be positive`);
  }
  return checked;
};

const positiveSignedMoney = (
  value: Money,
  label: string,
): KernelResult<Money> => {
  const checked = money(value);
  if (!checked.ok) {
    return checked;
  }
  if (checked.value <= 0) {
    return err("precondition-violated", `${label} must be positive`);
  }
  return checked;
};

const cashFlowSigns = (
  cashFlows: readonly CashFlow[],
): { readonly hasNegative: boolean; readonly hasPositive: boolean } => ({
  hasNegative: cashFlows.some((flow) => flow.amount < 0),
  hasPositive: cashFlows.some((flow) => flow.amount > 0),
});

const cashFlowSignChanges = (cashFlows: readonly CashFlow[]): number => {
  let changes = 0;
  let previousSign = 0;
  for (const flow of cashFlows) {
    const currentSign = Math.sign(flow.amount);
    if (currentSign === 0) {
      continue;
    }
    if (previousSign !== 0 && currentSign !== previousSign) {
      changes += 1;
    }
    previousSign = currentSign;
  }
  return changes;
};

const npvAtRate = (cashFlows: readonly CashFlow[], rate: number): number =>
  cashFlows.reduce((sum, flow) => sum + flow.amount / (1 + rate) ** flow.period, 0);

const irrResult = (
  value: number,
  npv: number,
  iterations: number,
): KernelResult<IrrResult> => {
  const rate = discountRate(value);
  if (!rate.ok) {
    return rate;
  }
  const residual = money(npv);
  if (!residual.ok) {
    return residual;
  }
  return ok({ rate: rate.value, npv: residual.value, iterations });
};
