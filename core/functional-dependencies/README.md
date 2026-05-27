# @paideia/functional-dependencies

Deterministic functional-dependency kernels for database-normalisation
containers. The package owns closure, candidate keys, minimal covers,
normal-form classification, and binary lossless decomposition checks for small
teaching schemas.

It does not parse SQL or render diagrams. Simulations should use this package
for the canonical result, then render their own tables, traces, or concept
maps.

```ts
import {
  attributeSet,
  candidateKeys,
  functionalDependency,
  relationSchema,
} from "@paideia/functional-dependencies";

const attributes = attributeSet(["student", "course", "instructor"]);
if (!attributes.ok) throw new Error(attributes.error.message);

const determinant = attributeSet(["student", "course"]);
if (!determinant.ok) throw new Error(determinant.error.message);

const dependent = attributeSet(["instructor"]);
if (!dependent.ok) throw new Error(dependent.error.message);

const dependency = functionalDependency(
  determinant.value,
  dependent.value,
);
if (!dependency.ok) throw new Error(dependency.error.message);

const schema = relationSchema(attributes.value, [dependency.value]);
if (!schema.ok) throw new Error(schema.error.message);

const keys = candidateKeys(schema.value);
if (!keys.ok) throw new Error(keys.error.message);
// keys.value => [["course", "student"]]
```

Use this when a sim needs to show how a closure grows, why a set of attributes
is a key, or why a decomposition is lossless.
