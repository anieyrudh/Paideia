# core/functional-dependencies - agent contract

## What this module is

Pure functional-dependency kernels for database-normalisation simulations. It
owns deterministic attribute-set validation, closure, key discovery, minimal
cover construction, normal-form classification, and binary lossless-join checks
over small educational schemas. It returns values only; SQL parsing, ER
diagrams, query execution, storage, indexing, and UI explanation text live
elsewhere.

Attributes are caller-defined strings and are case-sensitive. Functional
dependencies are represented as sets of branded attributes on the left and
right sides. Output sets are canonicalised in sorted order so simulations can
compare results and render stable traces.

## Public interface

Exports from `@paideia/functional-dependencies`:

- `AttributeName = Brand<string, "FunctionalDependencies.AttributeName">`
- `AttributeSet = readonly AttributeName[]`
- `FunctionalDependency = { determinant: AttributeSet; dependent: AttributeSet }`
- `RelationSchema = { attributes: AttributeSet; dependencies: readonly FunctionalDependency[] }`
- `NormalForm = "1NF" | "2NF" | "3NF" | "BCNF"`
- `NormalFormReport = { highestNormalForm: NormalForm; violations: readonly string[]; candidateKeys: readonly AttributeSet[] }`
- `attributeName(value: string): KernelResult<AttributeName>`
- `attributeSet(values: readonly string[]): KernelResult<AttributeSet>`
- `functionalDependency(determinant: AttributeSet, dependent: AttributeSet): KernelResult<FunctionalDependency>`
- `relationSchema(attributes: AttributeSet, dependencies: readonly FunctionalDependency[]): KernelResult<RelationSchema>`
- `attributeClosure(seed: AttributeSet, dependencies: readonly FunctionalDependency[]): KernelResult<AttributeSet>`
- `isSuperkey(schema: RelationSchema, attributes: AttributeSet): KernelResult<boolean>`
- `candidateKeys(schema: RelationSchema): KernelResult<readonly AttributeSet[]>`
- `minimalCover(dependencies: readonly FunctionalDependency[]): KernelResult<readonly FunctionalDependency[]>`
- `classifyNormalForm(schema: RelationSchema): KernelResult<NormalFormReport>`
- `isLosslessBinaryDecomposition(schema: RelationSchema, left: AttributeSet, right: AttributeSet): KernelResult<boolean>`

## Invariants the caller must preserve

- Attribute names must be non-empty, trimmed strings.
- Attribute sets must not contain duplicates.
- Functional dependencies must have non-empty determinant and dependent sets.
- Every dependency attribute must exist in the relation schema when a schema is
  supplied.
- Closure and key operations are intended for small teaching schemas; schemas
  with more than 12 attributes return `KernelResult.err("out-of-domain", ...)`.
- Candidate keys are minimal superkeys.
- Minimal cover output uses singleton right-hand sides and removes redundant
  dependencies where possible.
- Normal-form classification assumes 1NF atomic attributes are already
  satisfied by the caller.

Violations return `KernelResult.err("precondition-violated", ...)` or
`KernelResult.err("out-of-domain", ...)`.

## What this module does NOT do

- Does not parse SQL, DDL, natural-language dependencies, or table data.
- Does not draw dependency graphs, decomposition trees, or normalisation steps.
- Does not synthesize full 3NF or BCNF decompositions.
- Does not model multivalued dependencies, 4NF, 5NF, denormalisation tradeoffs,
  indexing, transactions, or query cost.
- Does not import branch-specific content or flags.

## When to consider this module

Use `core/functional-dependencies` when a database sim needs canonical attribute
closure, keys, minimal cover, normal-form checks, or a lossless binary
decomposition verdict. If a container is about to inline closure loops,
candidate-key search, or BCNF/3NF violation checks, use this module instead.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current consumer.
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` for changes to closure semantics, key minimality, or public
   normal-form classification.

## Anti-patterns (will be rejected in PR review)

- Treating missing schema attributes as valid by silently ignoring them.
- Mutating caller-owned attribute arrays or dependency arrays.
- Returning non-canonical unsorted sets from public functions.
- Adding a SQL parser, table scanner, or query optimiser inside this kernel.
- Hidden global caches, implicit schemas, or external data fetches.
- Branch-specific defaults (`if 50.043 then ...`).

## How the Anieyrudh Filter reads this module

The Filter probes that displayed normalisation steps match this kernel:
attribute closure visibly grows only when determinants are contained; candidate
keys are minimal; BCNF violations are shown when a non-superkey determinant
controls a non-trivial dependency; and lossless decomposition explanations name
the shared attributes used in the check.
