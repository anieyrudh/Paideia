# @paideia/indexing-query-cost

Deterministic page-I/O cost estimates for database indexing containers. The
package owns small teaching models for table scans, equality/range predicates,
B+tree height, index lookup cost, plan comparison, and insert maintenance cost.

It does not parse SQL or model a real DBMS optimizer. Simulations should use
this package for the canonical estimates, then render their own plan diagrams,
tables, or explanatory traces.

```ts
import {
  comparePlans,
  estimateSelectivity,
  indexLookupCost,
  indexStats,
  tableScanCost,
  tableStats,
} from "@paideia/indexing-query-cost";

const table = tableStats({ rows: 1_000, pages: 100, distinctValues: 100 });
if (!table.ok) throw new Error(table.error.message);

const index = indexStats({
  kind: "secondary-btree",
  leafPages: 100,
  fanout: 10,
  clustered: false,
});
if (!index.ok) throw new Error(index.error.message);

const predicate = estimateSelectivity(table.value, "equality");
if (!predicate.ok) throw new Error(predicate.error.message);

const scan = tableScanCost(table.value);
if (!scan.ok) throw new Error(scan.error.message);

const lookup = indexLookupCost(table.value, index.value, predicate.value);
if (!lookup.ok) throw new Error(lookup.error.message);

const best = comparePlans([scan.value, lookup.value]);
if (!best.ok) throw new Error(best.error.message);
```

Use this when a sim needs to show why an index helps, why unclustered access can
still be expensive, or why a hash index is unsuitable for a range predicate.
