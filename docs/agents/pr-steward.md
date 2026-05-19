# PR Steward

The PR steward is a conservative maintenance agent for open pull requests. Its
job is to shorten the boring failure loop, not to replace maintainer judgment.

## Operating Modes

| Mode | Trigger | Behavior |
| --- | --- | --- |
| Daily steward | Scheduled once per day | Summarize open PRs, labels, CI state, CodeRabbit state, and next actions |
| Active repair | PR has `needs-agent-fix` or `agent-active` | Attempt narrow mechanical fixes, rerun gates, and report outcome |
| Human handoff | PR has `human-review-required`, `blocked:p0`, or unresolved policy risk | Stop editing and write a concise blocker summary |

## How The Steward Reads PRs

For each open PR, read:

1. PR title, body, labels, author, base branch, and changed files.
2. Latest CI check runs and failing job logs.
3. CodeRabbit review summary and unresolved actionable comments.
4. Local contracts touched by the diff:
   - `AGENTS.md`
   - `docs/container-spec.md`
   - `core/<module>/AGENTS.md`
   - container `TECHNICAL.md`
   - package `README.md`
5. The relevant test matrix in `docs/quality/test-matrix.md`.

Do not inspect unrelated branches or rewrite unrelated files.

## Classification

| Class | Meaning | Steward action |
| --- | --- | --- |
| P0 | Merge would break a hard invariant, security/license boundary, container contract, or core public contract | Add or keep `blocked:p0`, stop, summarize |
| P1 | Significant correctness, accessibility, test, or architecture issue | Fix only if clearly mechanical; otherwise add `blocked:p1` and summarize |
| P2 | Maintainability, polish, naming, docs, or extra coverage issue | Fix when low-risk and inside scope |
| Mechanical | Generated file drift, lint, simple type error, missing test fixture, stale graph | Fix when PR is labeled for agent repair |
| Product judgment | Educational framing, UX direction, content truth, dependency policy | Add `human-review-required`, stop |

## When The Steward May Push Fixes

The steward may push to the PR branch when:

- The PR has `needs-agent-fix` or `agent-active`.
- The branch is not protected against bot commits.
- The fix is limited to the files already touched by the PR, generated outputs,
  tests for the changed behavior, or documentation directly tied to the PR.
- The fix addresses CI failure, CodeRabbit P2/P1 mechanical comments, stale
  generated files, or obvious accessibility semantics.
- The steward can run the relevant local command or explain why it could not.

Preferred fix order:

1. Reproduce the failure locally when practical.
2. Make the smallest scoped change.
3. Run the narrow gate first.
4. Run the broader gate when the narrow gate passes.
5. Push one commit with a clear Conventional Commit message.
6. Comment with commands run and remaining risks.

## When The Steward Must Escalate

The steward must stop and request human review when:

- A fix requires changing a core public API.
- A test failure suggests the implementation and contract disagree.
- CodeRabbit flags security, licensing, data exposure, or dependency risk.
- The PR introduces GPL/AGPL/LGPL or proprietary runtime code.
- Educational content, citations, or misconception claims need judgment.
- The same class of failure recurs after two repair attempts.
- The PR is too broad to reason about confidently.
- There are unresolved P0 comments from CodeRabbit, CI, or Paideia reviewers.

Escalation format:

```text
Blocked: <P0|P1|human-review-required>
PR: #<number> <title>
Failure: <one sentence>
Evidence: <CI job, CodeRabbit thread, file path, or command output>
Tried:
- <attempt 1>
- <attempt 2>
Decision needed:
- <specific maintainer choice>
```

## CodeRabbit Handling

The steward treats CodeRabbit as a reviewer, not an oracle.

1. Read unresolved comments and group them by severity.
2. Fix comments that are local, mechanical, and consistent with Paideia
   contracts.
3. If a comment conflicts with `AGENTS.md`, `docs/container-spec.md`, or a core
   contract, follow the repo contract and explain the conflict in a PR comment.
4. Do not mark a thread resolved unless the code was changed or the explanation
   directly answers the concern.
5. After fixes, ask CodeRabbit for another pass only once per repair loop.

## Loop Limit

Maximum active repair loop per PR: **three rounds**.

A round is:

1. Inspect failing CI or review comments.
2. Push at most one fix commit.
3. Rerun or wait for checks.
4. Summarize the result.

After three rounds, apply `human-review-required` and stop. This prevents an
agent from churning on ambiguous product or architecture decisions.

## Labels

| Label | Meaning |
| --- | --- |
| `needs-agent-fix` | The maintainer wants the steward to attempt a narrow repair |
| `agent-active` | An agent is currently working on the PR |
| `human-review-required` | Automation must stop until a maintainer decides |
| `blocked:p0` | Hard blocker; no merge |
| `blocked:p1` | Significant blocker; no merge until resolved or explicitly deferred |
| `ci-failed` | One or more required checks failed |
| `coderabbit-actionable` | CodeRabbit has unresolved comments worth acting on |

## Merge Policy

The steward does not merge PRs by default.

It may recommend that a PR is ready when:

- Required CI is green.
- `pnpm container:validate`, `pnpm boundary`, and `pnpm license:check` pass where
  relevant.
- No `blocked:p0`, `blocked:p1`, `ci-failed`, or `coderabbit-actionable` labels
  remain.
- CodeRabbit and human review comments are resolved or explicitly deferred.
- The PR body lists the validation commands and any residual risks.
