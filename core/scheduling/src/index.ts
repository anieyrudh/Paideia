import { err, ok, type Brand, type KernelResult } from "@paideia/shared";

export type Time = Brand<number, "Scheduling.Time">;
export type Duration = Brand<number, "Scheduling.Duration">;
export type NonNegativeDuration = Brand<number, "Scheduling.NonNegativeDuration">;
export type JobId = Brand<string, "Scheduling.JobId">;
export type ActivityId = Brand<string, "Scheduling.ActivityId">;

export type SequencingRule = "fcfs" | "spt" | "edd" | "critical-ratio";

export interface Job {
  readonly id: JobId;
  readonly processingTime: Duration;
  readonly arrivalTime?: Time;
  readonly dueTime?: Time;
  readonly priority?: number;
}

export interface ScheduledJob {
  readonly id: JobId;
  readonly startTime: Time;
  readonly completionTime: Time;
  readonly flowTime: Duration;
  readonly waitingTime: NonNegativeDuration;
  readonly lateness: number;
  readonly tardiness: NonNegativeDuration;
}

export interface ScheduleMetrics {
  readonly jobs: readonly ScheduledJob[];
  readonly makespan: Duration;
  readonly averageFlowTime: Duration;
  readonly averageWaitingTime: NonNegativeDuration;
  readonly averageTardiness: NonNegativeDuration;
  readonly maxLateness: number;
  readonly tardyJobCount: number;
}

export interface RoundRobinInput {
  readonly jobs: readonly Job[];
  readonly quantum: Duration;
}

export interface RoundRobinSlice {
  readonly id: JobId;
  readonly startTime: Time;
  readonly endTime: Time;
  readonly remainingAfter: NonNegativeDuration;
}

export interface RoundRobinSchedule extends ScheduleMetrics {
  readonly slices: readonly RoundRobinSlice[];
}

export interface Activity {
  readonly id: ActivityId;
  readonly duration: Duration;
  readonly predecessors?: readonly ActivityId[];
}

export interface ActivityTiming {
  readonly id: ActivityId;
  readonly earliestStart: Time;
  readonly earliestFinish: Time;
  readonly latestStart: Time;
  readonly latestFinish: Time;
  readonly slack: NonNegativeDuration;
  readonly critical: boolean;
}

export interface CriticalPathResult {
  readonly projectDuration: Duration;
  readonly activities: readonly ActivityTiming[];
  readonly criticalPath: readonly ActivityId[];
}

export const time = (value: number): KernelResult<Time> =>
  nonNegativeFinite(value, "time").ok
    ? ok(value as Time)
    : err("out-of-domain", `time must be finite and non-negative, got ${value}`);

export const duration = (value: number): KernelResult<Duration> =>
  positiveFinite(value, "duration").ok
    ? ok(value as Duration)
    : err("out-of-domain", `duration must be finite and positive, got ${value}`);

export const nonNegativeDuration = (
  value: number,
): KernelResult<NonNegativeDuration> =>
  nonNegativeFinite(value, "duration").ok
    ? ok(value as NonNegativeDuration)
    : err(
        "out-of-domain",
        `duration must be finite and non-negative, got ${value}`,
      );

export const jobId = (value: string): KernelResult<JobId> => {
  if (value.trim() !== value || value.length === 0) {
    return err("precondition-violated", "jobId must be non-empty and unpadded");
  }
  return ok(value as JobId);
};

export const activityId = (value: string): KernelResult<ActivityId> => {
  if (value.trim() !== value || value.length === 0) {
    return err("precondition-violated", "activityId must be non-empty and unpadded");
  }
  return ok(value as ActivityId);
};

export const sequenceJobs = (
  jobs: readonly Job[],
  rule: SequencingRule,
  now: Time = 0 as Time,
): KernelResult<readonly Job[]> => {
  const checked = validateJobs(jobs, rule);
  if (!checked.ok) {
    return checked;
  }
  const currentTime = time(now);
  if (!currentTime.ok) {
    return currentTime;
  }
  const ordered = checked.value.map((job, index) => ({ job, index })).sort((left, right) => {
    const rank = compareByRule(left.job, right.job, rule, currentTime.value);
    return rank === 0 ? compareTie(left, right, rule) : rank;
  });
  return ok(ordered.map((entry) => entry.job));
};

export const singleMachineSchedule = (
  jobs: readonly Job[],
  rule: SequencingRule = "fcfs",
): KernelResult<ScheduleMetrics> => {
  const checked = validateJobs(jobs, rule);
  if (!checked.ok) {
    return checked;
  }
  const unscheduled = [...checked.value];
  let clock = Math.min(...unscheduled.map((job) => job.arrivalTime ?? 0));
  const scheduled: ScheduledJob[] = [];
  while (unscheduled.length > 0) {
    const available = unscheduled.filter((job) => (job.arrivalTime ?? 0) <= clock);
    if (available.length === 0) {
      clock = Math.min(...unscheduled.map((job) => job.arrivalTime ?? 0));
      continue;
    }
    const job = available
      .map((candidate) => ({
        job: candidate,
        index: checked.value.findIndex((original) => original.id === candidate.id),
      }))
      .sort((left, right) => {
        const rank = compareByRule(left.job, right.job, rule, clock as Time);
        return rank === 0 ? compareTie(left, right, rule) : rank;
      })[0]?.job;
    if (job === undefined) {
      return err("precondition-violated", "no schedulable job was selected");
    }
    const index = unscheduled.findIndex((candidate) => candidate.id === job.id);
    if (index < 0) {
      return err("precondition-violated", `job ${job.id} was not in queue`);
    }
    unscheduled.splice(index, 1);
    const arrival = job.arrivalTime ?? (0 as Time);
    clock = Math.max(clock, arrival);
    const start = clock;
    const completion = start + job.processingTime;
    const due = job.dueTime ?? (completion as Time);
    scheduled.push({
      id: job.id,
      startTime: start as Time,
      completionTime: completion as Time,
      flowTime: (completion - arrival) as Duration,
      waitingTime: (start - arrival) as NonNegativeDuration,
      lateness: completion - due,
      tardiness: Math.max(0, completion - due) as NonNegativeDuration,
    });
    clock = completion;
  }
  return summarizeSchedule(scheduled);
};

export const roundRobinSchedule = (
  input: RoundRobinInput,
): KernelResult<RoundRobinSchedule> => {
  const checked = validateJobs(input.jobs, "fcfs");
  if (!checked.ok) {
    return checked;
  }
  const quantum = duration(input.quantum);
  if (!quantum.ok) {
    return quantum;
  }

  const sorted = [...checked.value].sort((left, right) => {
    const arrivalCompare = (left.arrivalTime ?? 0) - (right.arrivalTime ?? 0);
    return arrivalCompare === 0 ? compareAscii(left.id, right.id) : arrivalCompare;
  });
  const remaining = new Map<JobId, number>();
  const completions = new Map<JobId, number>();
  for (const job of sorted) {
    remaining.set(job.id, job.processingTime);
  }

  const ready: Job[] = [];
  const slices: RoundRobinSlice[] = [];
  let nextIndex = 0;
  let clock = sorted[0]?.arrivalTime ?? 0;
  while (completions.size < sorted.length) {
    while (
      nextIndex < sorted.length &&
      (sorted[nextIndex]?.arrivalTime ?? 0) <= clock
    ) {
      const next = sorted[nextIndex];
      if (next !== undefined) {
        ready.push(next);
      }
      nextIndex += 1;
    }
    if (ready.length === 0) {
      const nextArrival = sorted[nextIndex]?.arrivalTime;
      if (nextArrival === undefined) {
        break;
      }
      clock = nextArrival;
      continue;
    }
    const job = ready.shift();
    if (job === undefined) {
      continue;
    }
    const left = remaining.get(job.id);
    if (left === undefined) {
      return err("precondition-violated", `missing remaining time for ${job.id}`);
    }
    const run = Math.min(left, quantum.value);
    const start = clock;
    const end = start + run;
    const remainingAfter = left - run;
    slices.push({
      id: job.id,
      startTime: start as Time,
      endTime: end as Time,
      remainingAfter: remainingAfter as NonNegativeDuration,
    });
    clock = end;
    while (
      nextIndex < sorted.length &&
      (sorted[nextIndex]?.arrivalTime ?? 0) <= clock
    ) {
      const next = sorted[nextIndex];
      if (next !== undefined) {
        ready.push(next);
      }
      nextIndex += 1;
    }
    if (remainingAfter > 0) {
      remaining.set(job.id, remainingAfter);
      ready.push(job);
    } else {
      remaining.set(job.id, 0);
      completions.set(job.id, clock);
    }
  }

  const scheduled: ScheduledJob[] = [];
  for (const job of sorted) {
    const completion = completions.get(job.id);
    if (completion === undefined) {
      return err("precondition-violated", `job ${job.id} did not complete`);
    }
    const firstSlice = slices.find((slice) => slice.id === job.id);
    if (firstSlice === undefined) {
      return err("precondition-violated", `job ${job.id} was never scheduled`);
    }
    const arrival = job.arrivalTime ?? (0 as Time);
    const due = job.dueTime ?? (completion as Time);
    scheduled.push({
      id: job.id,
      startTime: firstSlice.startTime,
      completionTime: completion as Time,
      flowTime: (completion - arrival) as Duration,
      waitingTime: (completion - arrival - job.processingTime) as NonNegativeDuration,
      lateness: completion - due,
      tardiness: Math.max(0, completion - due) as NonNegativeDuration,
    });
  }
  const metrics = summarizeSchedule(scheduled);
  if (!metrics.ok) {
    return metrics;
  }
  return ok({ ...metrics.value, slices });
};

export const criticalPath = (
  activities: readonly Activity[],
): KernelResult<CriticalPathResult> => {
  const checked = validateActivities(activities);
  if (!checked.ok) {
    return checked;
  }
  const order = topologicalOrder(checked.value);
  if (!order.ok) {
    return order;
  }
  const byId = new Map(checked.value.map((activity) => [activity.id, activity]));
  const earliestStart = new Map<ActivityId, number>();
  const earliestFinish = new Map<ActivityId, number>();
  for (const id of order.value) {
    const activity = byId.get(id);
    if (activity === undefined) {
      return err("precondition-violated", `missing activity ${id}`);
    }
    const start = Math.max(
      0,
      ...(activity.predecessors ?? []).map((predecessor) => earliestFinish.get(predecessor) ?? 0),
    );
    earliestStart.set(id, start);
    earliestFinish.set(id, start + activity.duration);
  }
  const projectDuration = Math.max(...[...earliestFinish.values()]);
  const successors = buildSuccessors(checked.value);
  const latestFinish = new Map<ActivityId, number>();
  const latestStart = new Map<ActivityId, number>();
  for (const id of [...order.value].reverse()) {
    const activity = byId.get(id);
    if (activity === undefined) {
      return err("precondition-violated", `missing activity ${id}`);
    }
    const outgoing = successors.get(id) ?? [];
    const finish =
      outgoing.length === 0
        ? projectDuration
        : Math.min(...outgoing.map((successor) => latestStart.get(successor) ?? projectDuration));
    latestFinish.set(id, finish);
    latestStart.set(id, finish - activity.duration);
  }

  const timings = order.value.map((id) => {
    const es = earliestStart.get(id) ?? 0;
    const ef = earliestFinish.get(id) ?? 0;
    const ls = latestStart.get(id) ?? 0;
    const lf = latestFinish.get(id) ?? 0;
    const slack = Math.max(0, ls - es);
    return {
      id,
      earliestStart: es as Time,
      earliestFinish: ef as Time,
      latestStart: ls as Time,
      latestFinish: lf as Time,
      slack: slack as NonNegativeDuration,
      critical: slack <= 1e-9,
    };
  });
  const criticalPath = buildCriticalPath(timings, checked.value, successors);
  return ok({
    projectDuration: projectDuration as Duration,
    activities: timings,
    criticalPath,
  });
};

const validateJobs = (
  jobs: readonly Job[],
  rule: SequencingRule,
): KernelResult<readonly Job[]> => {
  if (jobs.length === 0) {
    return err("precondition-violated", "at least one job is required");
  }
  const seen = new Set<string>();
  for (const job of jobs) {
    const id = jobId(job.id);
    if (!id.ok) {
      return id;
    }
    if (seen.has(id.value)) {
      return err("precondition-violated", `duplicate job ${id.value}`);
    }
    seen.add(id.value);
    const processing = duration(job.processingTime);
    if (!processing.ok) {
      return processing;
    }
    if (job.arrivalTime !== undefined) {
      const arrival = time(job.arrivalTime);
      if (!arrival.ok) {
        return arrival;
      }
    }
    if (job.dueTime !== undefined) {
      const due = time(job.dueTime);
      if (!due.ok) {
        return due;
      }
    }
    if (job.priority !== undefined && !Number.isFinite(job.priority)) {
      return err("out-of-domain", `priority must be finite for ${id.value}`);
    }
    if ((rule === "edd" || rule === "critical-ratio") && job.dueTime === undefined) {
      return err("precondition-violated", `${rule} requires dueTime for ${id.value}`);
    }
  }
  return ok([...jobs]);
};

const compareByRule = (
  left: Job,
  right: Job,
  rule: SequencingRule,
  now: Time,
): number => {
  if (rule === "spt") {
    return left.processingTime - right.processingTime;
  }
  if (rule === "edd") {
    return (left.dueTime ?? 0) - (right.dueTime ?? 0);
  }
  if (rule === "critical-ratio") {
    const leftRatio = ((left.dueTime ?? 0) - now) / left.processingTime;
    const rightRatio = ((right.dueTime ?? 0) - now) / right.processingTime;
    return leftRatio - rightRatio;
  }
  const arrivalCompare = (left.arrivalTime ?? 0) - (right.arrivalTime ?? 0);
  return arrivalCompare;
};

const compareTie = (
  left: Readonly<{ job: Job; index: number }>,
  right: Readonly<{ job: Job; index: number }>,
  rule: SequencingRule,
): number => {
  if (rule === "fcfs") {
    return left.index - right.index;
  }
  const idCompare = compareAscii(left.job.id, right.job.id);
  return idCompare === 0 ? left.index - right.index : idCompare;
};

const summarizeSchedule = (
  jobs: readonly ScheduledJob[],
): KernelResult<ScheduleMetrics> => {
  if (jobs.length === 0) {
    return err("precondition-violated", "scheduled jobs must not be empty");
  }
  const makespan = Math.max(...jobs.map((job) => job.completionTime));
  const averageFlowTime = average(jobs.map((job) => job.flowTime));
  const averageWaitingTime = average(jobs.map((job) => job.waitingTime));
  const averageTardiness = average(jobs.map((job) => job.tardiness));
  const maxLateness = Math.max(...jobs.map((job) => job.lateness));
  for (const value of [makespan, averageFlowTime, averageWaitingTime, averageTardiness, maxLateness]) {
    if (!Number.isFinite(value)) {
      return err("out-of-domain", "schedule metric is non-finite");
    }
  }
  return ok({
    jobs: [...jobs],
    makespan: makespan as Duration,
    averageFlowTime: averageFlowTime as Duration,
    averageWaitingTime: averageWaitingTime as NonNegativeDuration,
    averageTardiness: averageTardiness as NonNegativeDuration,
    maxLateness,
    tardyJobCount: jobs.filter((job) => job.tardiness > 0).length,
  });
};

const validateActivities = (
  activities: readonly Activity[],
): KernelResult<readonly Activity[]> => {
  if (activities.length === 0) {
    return err("precondition-violated", "at least one activity is required");
  }
  const ids = new Set<string>();
  for (const activity of activities) {
    const id = activityId(activity.id);
    if (!id.ok) {
      return id;
    }
    if (ids.has(id.value)) {
      return err("precondition-violated", `duplicate activity ${id.value}`);
    }
    ids.add(id.value);
    const length = duration(activity.duration);
    if (!length.ok) {
      return length;
    }
  }
  for (const activity of activities) {
    for (const predecessor of activity.predecessors ?? []) {
      if (!ids.has(predecessor)) {
        return err("precondition-violated", `missing predecessor ${predecessor}`);
      }
      if (predecessor === activity.id) {
        return err("precondition-violated", `activity ${activity.id} depends on itself`);
      }
    }
  }
  return ok([...activities]);
};

const topologicalOrder = (
  activities: readonly Activity[],
): KernelResult<readonly ActivityId[]> => {
  const indegree = new Map<ActivityId, number>();
  const successors = buildSuccessors(activities);
  for (const activity of activities) {
    indegree.set(activity.id, activity.predecessors?.length ?? 0);
  }
  const ready = [...indegree.entries()]
    .filter(([, degree]) => degree === 0)
    .map(([id]) => id)
    .sort(compareAscii);
  const order: ActivityId[] = [];
  while (ready.length > 0) {
    const id = ready.shift();
    if (id === undefined) {
      break;
    }
    order.push(id);
    for (const successor of successors.get(id) ?? []) {
      const next = (indegree.get(successor) ?? 0) - 1;
      indegree.set(successor, next);
      if (next === 0) {
        ready.push(successor);
        ready.sort(compareAscii);
      }
    }
  }
  if (order.length !== activities.length) {
    return err("precondition-violated", "activity graph must be acyclic");
  }
  return ok(order);
};

const buildSuccessors = (
  activities: readonly Activity[],
): Map<ActivityId, ActivityId[]> => {
  const successors = new Map<ActivityId, ActivityId[]>();
  for (const activity of activities) {
    successors.set(activity.id, []);
  }
  for (const activity of activities) {
    for (const predecessor of activity.predecessors ?? []) {
      successors.get(predecessor)?.push(activity.id);
    }
  }
  return successors;
};

const buildCriticalPath = (
  timings: readonly ActivityTiming[],
  activities: readonly Activity[],
  successors: ReadonlyMap<ActivityId, readonly ActivityId[]>,
): readonly ActivityId[] => {
  const timingById = new Map(timings.map((timing) => [timing.id, timing]));
  const activityById = new Map(activities.map((activity) => [activity.id, activity]));
  const roots = timings
    .filter((timing) => timing.critical)
    .filter((timing) => (activityById.get(timing.id)?.predecessors?.length ?? 0) === 0)
    .sort((left, right) => compareAscii(left.id, right.id));
  const first = roots[0];
  if (first === undefined) {
    return [];
  }
  const path: ActivityId[] = [first.id];
  let current = first;
  while (true) {
    const candidates = (successors.get(current.id) ?? [])
      .map((id) => timingById.get(id))
      .filter((timing): timing is ActivityTiming => timing !== undefined)
      .filter(
        (timing) =>
          timing.critical &&
          Math.abs(timing.earliestStart - current.earliestFinish) <= 1e-9,
      )
      .sort((left, right) => compareAscii(left.id, right.id));
    const next = candidates[0];
    if (next === undefined) {
      break;
    }
    path.push(next.id);
    current = next;
  }
  return path;
};

const average = (values: readonly number[]): number =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

const positiveFinite = (value: number, label: string): KernelResult<number> => {
  if (!Number.isFinite(value) || value <= 0) {
    return err("out-of-domain", `${label} must be finite and positive, got ${value}`);
  }
  return ok(value);
};

const nonNegativeFinite = (
  value: number,
  label: string,
): KernelResult<number> => {
  if (!Number.isFinite(value) || value < 0) {
    return err(
      "out-of-domain",
      `${label} must be finite and non-negative, got ${value}`,
    );
  }
  return ok(value);
};

const compareAscii = (left: string, right: string): number => {
  const max = Math.max(left.length, right.length);
  for (let index = 0; index < max; index += 1) {
    const leftCode = left.charCodeAt(index);
    const rightCode = right.charCodeAt(index);
    if (Number.isNaN(leftCode)) {
      return Number.isNaN(rightCode) ? 0 : -1;
    }
    if (Number.isNaN(rightCode)) {
      return 1;
    }
    if (leftCode !== rightCode) {
      return leftCode - rightCode;
    }
  }
  return 0;
};
