# @paideia/finance

Pure finance helpers for Paideia project-valuation, accounting, and analytics
simulations.

Use this package when a container needs present value, NPV, IRR, payback period,
current ratio, quick ratio, leverage, margins, return on assets, or inventory
turnover.

```ts
import {
  discountRate,
  money,
  netPresentValue,
  period,
} from "@paideia/finance";

const rate = discountRate(0.1);
const year0 = period(0);
const year1 = period(1);
const investment = money(-1_000);
const returnYear1 = money(1_150);

if (rate.ok && year0.ok && year1.ok && investment.ok && returnYear1.ok) {
  const npv = netPresentValue({
    discountRate: rate.value,
    cashFlows: [
      { period: year0.value, amount: investment.value },
      { period: year1.value, amount: returnYear1.value },
    ],
  });
  console.log(npv);
}
```

## Assumptions

- Money values use one caller-consistent currency.
- Periods are non-negative integers. The caller decides whether a period means
  years, months, terms, or weeks.
- Discount rates are decimal rates per period, so 10% is `0.1`.
- IRR uses deterministic bisection over the caller-provided bracket. If the
  bracket does not straddle a root, the function returns `convergence-failed`.
- Payback period is undiscounted and should not be presented as an NPV
  substitute.
- Ratios require positive denominators; zero denominators are precondition
  failures, not zero-valued ratios.
