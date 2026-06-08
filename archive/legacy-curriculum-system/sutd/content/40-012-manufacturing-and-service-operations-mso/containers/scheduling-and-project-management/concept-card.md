---
subject: 40-012-manufacturing-and-service-operations-mso
concept: scheduling-and-project-management
branch: sutd
level: "SUTD 40.012"
syllabus_ref: "SUTD 40.012 Manufacturing and Service Operations / Scheduling and project management"
prerequisites:
  - activity-durations
  - precedence-constraints
aid_types:
  - simulation
  - transfer-problem
  - misconception-audit
status: reviewed
---

# Scheduling and Project Management

## Concept

Project schedules are networks of activities. Each activity has a duration and a
set of predecessors that must finish first. The critical path is the zero-slack
chain that fixes the earliest completion time of the project.

## Learning target

Given an activity-on-node network, compute earliest starts, earliest finishes,
latest starts, latest finishes, slack, and the critical path.

## Why it matters

In manufacturing and service operations, schedule risk is often hidden in
dependencies rather than in the single longest activity. A short activity can
control the launch date if it sits on the critical chain.

## Observable evidence

- Learner commits a prediction for the project duration before CPM output is
  revealed.
- Duration sliders visibly change the network, project duration, and slack.
- Revealed state shows the forward-pass and backward-pass formulas with units.

## Misconceptions

- "The longest activity is always the bottleneck."
- "Every delay changes the launch date."
- "Parallel work can be added by summing all durations."

## Kernel boundary

Critical-path timings come from a shared scheduling engine. The container
renders the network, controls, and transfer prompt only.
