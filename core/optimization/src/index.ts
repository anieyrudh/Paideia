import {
  err,
  ok,
  type Function3D,
  type KernelResult,
  type Rect,
} from "@paideia/shared";

export type Point2 = readonly [number, number];

export interface GradientSample {
  readonly point: Point2;
  readonly value: number;
  readonly gradient: Point2;
  readonly stepSize: number;
}

export interface GradientDescentOptions {
  readonly learningRate?: number;
  readonly maxSteps?: number;
  readonly tolerance?: number;
  readonly h?: number;
  readonly domain?: Rect;
}

export interface GradientDescentTrace {
  readonly initial: GradientSample;
  readonly steps: readonly GradientSample[];
  readonly converged: boolean;
  readonly reason: "converged" | "max-steps" | "out-of-domain";
}

export interface LinearConstraint {
  readonly a: number;
  readonly b: number;
  readonly relation: "<=" | ">=" | "=";
  readonly c: number;
}

export interface LinearObjective {
  readonly cx: number;
  readonly cy: number;
  readonly direction: "min" | "max";
}

export interface FeasibleRegion {
  readonly domain: Rect;
  readonly constraints: readonly LinearConstraint[];
  readonly vertices: readonly Point2[];
}

export interface LinearProgramSolution {
  readonly point: Point2;
  readonly value: number;
  readonly activeConstraints: readonly number[];
}

export const optimizationTolerance = {
  default: 1e-7,
  tight: 1e-10,
  loose: 1e-5,
} as const;

const defaultGradientOptions = {
  learningRate: 0.1,
  maxSteps: 200,
  tolerance: optimizationTolerance.default,
  h: 1e-5,
} as const;

const finite = (value: number, name: string): KernelResult<number> =>
  Number.isFinite(value)
    ? ok(value)
    : err("precondition-violated", `${name} must be finite; got ${value}`);

const positiveFinite = (value: number, name: string): KernelResult<number> =>
  Number.isFinite(value) && value > 0
    ? ok(value)
    : err("precondition-violated", `${name} must be a positive finite number; got ${value}`);

const validatePoint = (point: Point2, name: string): KernelResult<Point2> => {
  const x = finite(point[0], `${name}[0]`);
  if (!x.ok) return x;
  const y = finite(point[1], `${name}[1]`);
  if (!y.ok) return y;
  return ok(point);
};

const validateDomain = (domain: Rect): KernelResult<Rect> => {
  for (const [axis, interval] of [
    ["x", domain.x],
    ["y", domain.y],
  ] as const) {
    const min = finite(interval.min, `${axis}.min`);
    if (!min.ok) return min;
    const max = finite(interval.max, `${axis}.max`);
    if (!max.ok) return max;
    if (interval.min >= interval.max) {
      return err("precondition-violated", `${axis} bounds must satisfy min < max`);
    }
  }
  return ok(domain);
};

const inDomain = ([x, y]: Point2, domain: Rect): boolean =>
  x >= domain.x.min - optimizationTolerance.tight &&
  x <= domain.x.max + optimizationTolerance.tight &&
  y >= domain.y.min - optimizationTolerance.tight &&
  y <= domain.y.max + optimizationTolerance.tight;

const sample = (f: Function3D, point: Point2): KernelResult<number> => {
  try {
    const value = f(point[0], point[1]);
    return Number.isFinite(value)
      ? ok(value)
      : err("undefined-at-point", `Objective is undefined at (${point[0]}, ${point[1]})`);
  } catch (cause) {
    return err("undefined-at-point", `Objective threw at (${point[0]}, ${point[1]})`, cause);
  }
};

const gradientAt = (f: Function3D, point: Point2, h: number): KernelResult<Point2> => {
  const [x, y] = point;
  const right = sample(f, [x + h, y]);
  if (!right.ok) return right;
  const left = sample(f, [x - h, y]);
  if (!left.ok) return left;
  const up = sample(f, [x, y + h]);
  if (!up.ok) return up;
  const down = sample(f, [x, y - h]);
  if (!down.ok) return down;

  return ok([(right.value - left.value) / (2 * h), (up.value - down.value) / (2 * h)]);
};

const gradientNorm = ([gx, gy]: Point2): number => Math.hypot(gx, gy);

const makeGradientSample = (
  f: Function3D,
  point: Point2,
  h: number,
  stepSize: number,
): KernelResult<GradientSample> => {
  const value = sample(f, point);
  if (!value.ok) return value;
  const gradient = gradientAt(f, point, h);
  if (!gradient.ok) return gradient;
  return ok({
    point,
    value: value.value,
    gradient: gradient.value,
    stepSize,
  });
};

export const gradientDescent = (
  f: Function3D,
  start: Point2,
  opts: GradientDescentOptions = {},
): KernelResult<GradientDescentTrace> => {
  const validStart = validatePoint(start, "start");
  if (!validStart.ok) return validStart;

  const learningRate = opts.learningRate ?? defaultGradientOptions.learningRate;
  const maxSteps = opts.maxSteps ?? defaultGradientOptions.maxSteps;
  const tolerance = opts.tolerance ?? defaultGradientOptions.tolerance;
  const h = opts.h ?? defaultGradientOptions.h;

  const validLearningRate = positiveFinite(learningRate, "learningRate");
  if (!validLearningRate.ok) return validLearningRate;
  const validTolerance = positiveFinite(tolerance, "tolerance");
  if (!validTolerance.ok) return validTolerance;
  const validH = positiveFinite(h, "h");
  if (!validH.ok) return validH;
  if (!Number.isInteger(maxSteps) || maxSteps <= 0) {
    return err("precondition-violated", `maxSteps must be a positive integer; got ${maxSteps}`);
  }
  if (opts.domain !== undefined) {
    const validDomain = validateDomain(opts.domain);
    if (!validDomain.ok) return validDomain;
    if (!inDomain(start, opts.domain)) {
      return err("out-of-domain", "Start point must be inside the supplied domain");
    }
  }

  const initial = makeGradientSample(f, start, h, 0);
  if (!initial.ok) return initial;
  if (gradientNorm(initial.value.gradient) <= tolerance) {
    return ok({ initial: initial.value, steps: [], converged: true, reason: "converged" });
  }

  const steps: GradientSample[] = [];
  let current = initial.value;

  for (let i = 0; i < maxSteps; i += 1) {
    const nextPoint: Point2 = [
      current.point[0] - learningRate * current.gradient[0],
      current.point[1] - learningRate * current.gradient[1],
    ];
    if (opts.domain !== undefined && !inDomain(nextPoint, opts.domain)) {
      return ok({
        initial: initial.value,
        steps,
        converged: false,
        reason: "out-of-domain",
      });
    }

    const next = makeGradientSample(f, nextPoint, h, learningRate);
    if (!next.ok) return next;
    steps.push(next.value);
    current = next.value;

    if (gradientNorm(current.gradient) <= tolerance) {
      return ok({
        initial: initial.value,
        steps,
        converged: true,
        reason: "converged",
      });
    }
  }

  return ok({
    initial: initial.value,
    steps,
    converged: false,
    reason: "max-steps",
  });
};

const validateConstraint = (
  constraint: LinearConstraint,
  index: number,
): KernelResult<LinearConstraint> => {
  const a = finite(constraint.a, `constraints[${index}].a`);
  if (!a.ok) return a;
  const b = finite(constraint.b, `constraints[${index}].b`);
  if (!b.ok) return b;
  const c = finite(constraint.c, `constraints[${index}].c`);
  if (!c.ok) return c;
  if (
    Math.abs(constraint.a) <= optimizationTolerance.tight &&
    Math.abs(constraint.b) <= optimizationTolerance.tight
  ) {
    return err("precondition-violated", `constraints[${index}] must have a non-zero normal`);
  }
  return ok(constraint);
};

const constraintValue = (constraint: LinearConstraint, [x, y]: Point2): number =>
  constraint.a * x + constraint.b * y;

const satisfiesConstraint = (
  point: Point2,
  constraint: LinearConstraint,
  tolerance = optimizationTolerance.loose,
): boolean => {
  const value = constraintValue(constraint, point);
  switch (constraint.relation) {
    case "<=":
      return value <= constraint.c + tolerance;
    case ">=":
      return value >= constraint.c - tolerance;
    case "=":
      return Math.abs(value - constraint.c) <= tolerance;
  }
};

const lineIntersection = (
  first: LinearConstraint,
  second: LinearConstraint,
): Point2 | undefined => {
  const determinant = first.a * second.b - second.a * first.b;
  if (Math.abs(determinant) <= optimizationTolerance.tight) return undefined;
  return [
    (first.c * second.b - second.c * first.b) / determinant,
    (first.a * second.c - second.a * first.c) / determinant,
  ];
};

const rectangleConstraints = (domain: Rect): readonly LinearConstraint[] => [
  { a: 1, b: 0, relation: ">=", c: domain.x.min },
  { a: 1, b: 0, relation: "<=", c: domain.x.max },
  { a: 0, b: 1, relation: ">=", c: domain.y.min },
  { a: 0, b: 1, relation: "<=", c: domain.y.max },
];

const dedupePoints = (points: readonly Point2[]): readonly Point2[] => {
  const unique: Point2[] = [];
  for (const point of points) {
    if (
      !unique.some(
        ([x, y]) =>
          Math.abs(x - point[0]) <= optimizationTolerance.loose &&
          Math.abs(y - point[1]) <= optimizationTolerance.loose,
      )
    ) {
      unique.push(point);
    }
  }
  return unique;
};

const sortClockwise = (points: readonly Point2[]): readonly Point2[] => {
  if (points.length <= 2) return points;
  const center: Point2 = [
    points.reduce((sum, point) => sum + point[0], 0) / points.length,
    points.reduce((sum, point) => sum + point[1], 0) / points.length,
  ];
  return [...points].sort(
    (left, right) =>
      Math.atan2(left[1] - center[1], left[0] - center[0]) -
      Math.atan2(right[1] - center[1], right[0] - center[0]),
  );
};

export const linearFeasibleRegion = (
  constraints: readonly LinearConstraint[],
  domain: Rect,
): KernelResult<FeasibleRegion> => {
  const validDomain = validateDomain(domain);
  if (!validDomain.ok) return validDomain;

  const validatedConstraints: LinearConstraint[] = [];
  for (let i = 0; i < constraints.length; i += 1) {
    const constraint = constraints[i];
    if (constraint === undefined) {
      return err("precondition-violated", `constraints[${i}] is missing`);
    }
    const validConstraint = validateConstraint(constraint, i);
    if (!validConstraint.ok) return validConstraint;
    validatedConstraints.push(validConstraint.value);
  }

  const allConstraints = [...validatedConstraints, ...rectangleConstraints(domain)];
  const candidates: Point2[] = [];

  for (let i = 0; i < allConstraints.length; i += 1) {
    const first = allConstraints[i];
    if (first === undefined) continue;
    for (let j = i + 1; j < allConstraints.length; j += 1) {
      const second = allConstraints[j];
      if (second === undefined) continue;
      const point = lineIntersection(first, second);
      if (point !== undefined && allConstraints.every((constraint) => satisfiesConstraint(point, constraint))) {
        candidates.push(point);
      }
    }
  }

  const vertices = sortClockwise(dedupePoints(candidates));
  if (vertices.length === 0) {
    return err("precondition-violated", "Constraints have no feasible point inside the supplied domain");
  }

  return ok({
    domain,
    constraints: validatedConstraints,
    vertices,
  });
};

const objectiveValue = (objective: LinearObjective, [x, y]: Point2): number =>
  objective.cx * x + objective.cy * y;

export const optimizeLinearObjective = (
  region: FeasibleRegion,
  objective: LinearObjective,
): KernelResult<LinearProgramSolution> => {
  const validDomain = validateDomain(region.domain);
  if (!validDomain.ok) return validDomain;
  const cx = finite(objective.cx, "objective.cx");
  if (!cx.ok) return cx;
  const cy = finite(objective.cy, "objective.cy");
  if (!cy.ok) return cy;
  if (
    Math.abs(objective.cx) <= optimizationTolerance.tight &&
    Math.abs(objective.cy) <= optimizationTolerance.tight
  ) {
    return err("precondition-violated", "Objective vector must be non-zero");
  }
  if (region.vertices.length === 0) {
    return err("precondition-violated", "Feasible region has no vertices");
  }

  const vertices: Point2[] = [];
  for (let i = 0; i < region.vertices.length; i += 1) {
    const point = region.vertices[i];
    if (point === undefined) {
      return err("precondition-violated", `region.vertices[${i}] is missing`);
    }
    const validPoint = validatePoint(point, `region.vertices[${i}]`);
    if (!validPoint.ok) return validPoint;
    vertices.push(validPoint.value);
  }

  let bestPoint = vertices[0];
  if (bestPoint === undefined) {
    return err("precondition-violated", "Feasible region has no vertices");
  }
  let bestValue = objectiveValue(objective, bestPoint);
  if (!Number.isFinite(bestValue)) {
    return err("numerical-instability", "Linear objective value must be finite");
  }

  for (const point of vertices.slice(1)) {
    const value = objectiveValue(objective, point);
    if (!Number.isFinite(value)) {
      return err("numerical-instability", "Linear objective value must be finite");
    }
    const isBetter =
      objective.direction === "max"
        ? value > bestValue + optimizationTolerance.tight
        : value < bestValue - optimizationTolerance.tight;
    if (isBetter) {
      bestPoint = point;
      bestValue = value;
    }
  }

  const activeConstraints = region.constraints
    .map((constraint, index) => ({ constraint, index }))
    .filter(
      ({ constraint }) =>
        Math.abs(constraintValue(constraint, bestPoint) - constraint.c) <= optimizationTolerance.loose,
    )
    .map(({ index }) => index);

  return ok({
    point: bestPoint,
    value: bestValue,
    activeConstraints,
  });
};
