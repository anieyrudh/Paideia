# Clean-Room Dependency Rebuilds

Paideia does not rewrite GPL, AGPL, LGPL, or otherwise incompatible repositories
to make them look permissive. If a dependency cannot be bundled under
`LICENSES.json`, either keep it out of the runtime path or build a clean-room
replacement with evidence.

## When This Applies

Use this process for any GPL/AGPL/LGPL runtime candidate, abandoned project with
unclear licensing, or library whose licence would complicate classroom forks,
browser bundling, or commercial hosting.

MIT, BSD, Apache-2.0, ISC, and other allowlisted packages do not need this
process. They still need `pnpm license:check`.

## Required Workflow

1. **Record the dependency decision.** Note the original repo, license, desired
   capability, and why iframe/service isolation is not enough.
2. **Benchmark the original.** In a separate branch or fixture, capture behavior,
   API examples, numerical tolerances, rendering screenshots, performance
   numbers, and edge cases. Do not copy implementation code.
3. **Write a clean specification.** Describe inputs, outputs, invariants,
   acceptance tests, and non-goals in Paideia terms.
4. **Implement independently.** A builder agent works from the specification and
   benchmarks only, not from the original source files.
5. **Evaluate independently.** A separate reviewer agent runs the benchmark
   suite against the replacement and compares behavior, performance, and edge
   cases.
6. **Repeat until parity.** Fix gaps until the replacement is at least equivalent
   for Paideia's declared use cases.
7. **Document provenance.** The PR records the original project as inspiration,
   the clean-room boundary, benchmark results, and residual differences.

## Agent Split

- **Research agent:** reads the original repo, records behavior and benchmark
  cases, and writes the clean specification. It does not write replacement code.
- **Builder agent:** implements from the clean specification and Paideia
  contracts. It does not read the original source.
- **Evaluation agent:** runs the benchmark suite, compares outputs, and reports
  gaps. It does not patch the implementation.

For large rebuilds, use separate Codex instances for each role so context and
responsibilities stay clean.

## Merge Bar

A clean-room replacement can merge only when:

- `pnpm license:check` passes with no rejected runtime dependency.
- The benchmark suite is committed and documented.
- The evaluation report shows parity or better for the Paideia use cases.
- The replacement has normal kernel/container tests and a non-empty
  `TECHNICAL.md` Filter section.
- Any known gaps are outside the declared scope and tracked in issues.

Shortcuts are not acceptable here. The goal is a durable educational platform,
not a temporary workaround around licensing.
