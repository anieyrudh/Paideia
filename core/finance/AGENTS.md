# core/finance - agent contract

## What this module is

Pure finance kernels for cash-flow modelling and statement-ratio simulations. It
owns deterministic time-value-of-money calculations, IRR root finding, payback
periods, and common financial ratios. It returns readonly records only; table
rendering, spreadsheet editing, accounting ledgers, external data, and business
case narratives live elsewhere.

All currency values must use one caller-consistent currency. All periods are
caller-defined. If a container uses years, then discount rates are per year and
cash-flow periods are years.

## Public interface

Exports from `@paideia/finance`:

- `Money = Brand<number, "Finance.Money">`
- `NonNegativeMoney = Brand<number, "Finance.NonNegativeMoney">`
- `DiscountRate = Brand<number, "Finance.DiscountRate">`
- `FinancialRatio = Brand<number, "Finance.FinancialRatio">`
- `Period = Brand<number, "Finance.Period">`
- `CashFlow = { period: Period; amount: Money }`
- `PresentValueInput = { cashFlow: CashFlow; discountRate: DiscountRate }`
- `NetPresentValueInput = { cashFlows: readonly CashFlow[]; discountRate: DiscountRate }`
- `IrrInput = { cashFlows: readonly CashFlow[]; lowerRate?: DiscountRate; upperRate?: DiscountRate; tolerance?: number; maxIterations?: Period }`
- `IrrResult = { rate: DiscountRate; npv: Money; iterations: number }`
- `PaybackResult = { paidBack: boolean; period: number | null; cumulativeCashFlow: Money }`
- `LiquidityInput = { currentAssets: NonNegativeMoney; currentLiabilities: NonNegativeMoney }`
- `QuickRatioInput = LiquidityInput & { inventory: NonNegativeMoney }`
- `LeverageInput = { totalLiabilities: NonNegativeMoney; totalEquity: Money }`
- `MarginInput = { numerator: Money; revenue: NonNegativeMoney }`
- `TurnoverInput = { numerator: NonNegativeMoney; denominator: NonNegativeMoney }`
- `FinancialSnapshot = { currentAssets: NonNegativeMoney; inventory?: NonNegativeMoney; currentLiabilities: NonNegativeMoney; totalAssets: NonNegativeMoney; totalLiabilities: NonNegativeMoney; totalEquity: Money; revenue: NonNegativeMoney; netIncome: Money; costOfGoodsSold?: NonNegativeMoney; averageInventory?: NonNegativeMoney }`
- `RatioAnalysis = { currentRatio: FinancialRatio; quickRatio: FinancialRatio | null; debtToEquity: FinancialRatio; netProfitMargin: FinancialRatio; returnOnAssets: FinancialRatio; inventoryTurnover: FinancialRatio | null }`
- `money(value: number): KernelResult<Money>`
- `nonNegativeMoney(value: number): KernelResult<NonNegativeMoney>`
- `discountRate(value: number): KernelResult<DiscountRate>`
- `financialRatio(value: number): KernelResult<FinancialRatio>`
- `period(value: number): KernelResult<Period>`
- `validateCashFlows(cashFlows: readonly CashFlow[]): KernelResult<readonly CashFlow[]>`
- `discountFactor(input: { discountRate: DiscountRate; period: Period }): KernelResult<number>`
- `presentValue(input: PresentValueInput): KernelResult<Money>`
- `netPresentValue(input: NetPresentValueInput): KernelResult<Money>`
- `internalRateOfReturn(input: IrrInput): KernelResult<IrrResult>`
- `paybackPeriod(cashFlows: readonly CashFlow[]): KernelResult<PaybackResult>`
- `currentRatio(input: LiquidityInput): KernelResult<FinancialRatio>`
- `quickRatio(input: QuickRatioInput): KernelResult<FinancialRatio>`
- `debtToEquity(input: LeverageInput): KernelResult<FinancialRatio>`
- `netProfitMargin(input: MarginInput): KernelResult<FinancialRatio>`
- `returnOnAssets(input: { netIncome: Money; totalAssets: NonNegativeMoney }): KernelResult<FinancialRatio>`
- `inventoryTurnover(input: TurnoverInput): KernelResult<FinancialRatio>`
- `analyzeFinancialSnapshot(snapshot: FinancialSnapshot): KernelResult<RatioAnalysis>`

## Invariants the caller must preserve

- Currency values must be finite.
- Non-negative money values must be finite and `>= 0`.
- Discount rates must be finite and greater than `-1`.
- Periods must be non-negative safe integers.
- Cash-flow periods must be unique and sorted strictly increasing by period.
- Cash-flow arrays must contain at least one negative and one positive amount
  when IRR is requested.
- Ratio denominators must be finite and strictly positive.
- IRR brackets must straddle exactly one root over the requested interval for
  the educational bisection result to be meaningful.
- Public results must never contain `NaN` or `Infinity`.

Violations return `KernelResult.err("precondition-violated", ...)`,
`KernelResult.err("out-of-domain", ...)`, or
`KernelResult.err("numerical-instability", ...)`, or
`KernelResult.err("convergence-failed", ...)`.

## What this module does NOT do

- Does not render spreadsheets, dashboards, charts, or accounting ledgers.
- Does not fetch market prices, benchmark data, FX rates, or live statements.
- Does not infer currencies, inflation, taxes, WACC, terminal value, or calendar
  dates.
- Does not perform bookkeeping journal-entry validation.
- Does not model probabilistic scenarios or Monte Carlo simulations.
- Does not import branch-specific content or flags.

## When to consider this module

Use `core/finance` when a sim needs present value, NPV, IRR, payback period,
current ratio, quick ratio, leverage, margins, return on assets, or inventory
turnover. If a financial-statement or project-valuation sim is about to inline
DCF or ratio formulas, use this module instead.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current consumer.
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` for changes to formulas, root-finding behavior, or public
   financial types.

## Anti-patterns (will be rejected in PR review)

- Returning `NaN` or `Infinity` instead of `KernelResult.err(...)`.
- Treating zero denominators as zero ratios.
- Hiding multiple IRR/root cases behind one confident result.
- Mutating caller-owned cash-flow arrays.
- Hidden global caches, clock reads, random state, or external data fetches.
- Branch-specific defaults (`if DBA then ...`).

## How the Anieyrudh Filter reads this module

The Filter probes that displayed financial claims match this kernel: NPV bars use
the same discount rate and period spacing; IRR is described as a bracketed root,
not magic; ratio dashboards surface numerator, denominator, units, and benchmark
context; and payback readouts do not pretend that undiscounted payback is NPV.
