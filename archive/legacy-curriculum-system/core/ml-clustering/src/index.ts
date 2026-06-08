import { err, ok, type KernelResult } from "@paideia/shared";

export const mlClusteringTolerance = {
  default: 1e-9,
  tight: 1e-12,
  loose: 1e-6,
} as const;

export type Vector = readonly number[];

export interface AssignToCentroidsInput {
  readonly points: readonly Vector[];
  readonly centroids: readonly Vector[];
}

export interface ClusterAssignment {
  readonly pointIndex: number;
  readonly centroidIndex: number;
  readonly squaredDistance: number;
}

export interface AssignmentResult {
  readonly assignments: readonly ClusterAssignment[];
  readonly inertia: number;
}

export interface RecomputeCentroidsInput {
  readonly points: readonly Vector[];
  readonly assignments: readonly ClusterAssignment[];
  readonly clusterCount: number;
}

export interface KMeansStepInput extends AssignToCentroidsInput {}

export interface KMeansStepResult {
  readonly assignments: readonly ClusterAssignment[];
  readonly centroids: readonly Vector[];
  readonly inertia: number;
}

const validateVector = (vector: Vector, dimension: number, label: string): KernelResult<void> => {
  if (vector.length !== dimension) {
    return err("precondition-violated", `${label} must have dimension ${dimension}`);
  }
  for (const [index, value] of vector.entries()) {
    if (!Number.isFinite(value)) {
      return err("precondition-violated", `${label}[${index}] must be finite; got ${value}`);
    }
  }
  return ok(undefined);
};

const validatePointSet = (points: readonly Vector[], centroids: readonly Vector[]): KernelResult<number> => {
  if (points.length === 0) return err("precondition-violated", "points must not be empty");
  if (centroids.length === 0) return err("precondition-violated", "centroids must not be empty");
  const dimension = points[0]?.length ?? 0;
  if (dimension === 0) return err("precondition-violated", "vectors must not be empty");
  for (const [index, point] of points.entries()) {
    const valid = validateVector(point, dimension, `points[${index}]`);
    if (!valid.ok) return valid;
  }
  for (const [index, centroid] of centroids.entries()) {
    const valid = validateVector(centroid, dimension, `centroids[${index}]`);
    if (!valid.ok) return valid;
  }
  return ok(dimension);
};

export const squaredEuclideanDistance = (a: Vector, b: Vector): KernelResult<number> => {
  if (a.length === 0 || a.length !== b.length) {
    return err("precondition-violated", "vectors must be non-empty and have equal dimension");
  }
  let sum = 0;
  for (const [index, value] of a.entries()) {
    const other = b[index];
    if (other === undefined) {
      return err("precondition-violated", `vectors[${index}] is missing in second vector`);
    }
    if (!Number.isFinite(value) || !Number.isFinite(other)) {
      return err("precondition-violated", `vectors[${index}] must be finite`);
    }
    sum += (value - other) ** 2;
  }
  return Number.isFinite(sum)
    ? ok(sum)
    : err("numerical-instability", `squared distance must be finite; got ${sum}`);
};

export const assignToCentroids = (input: AssignToCentroidsInput): KernelResult<AssignmentResult> => {
  const valid = validatePointSet(input.points, input.centroids);
  if (!valid.ok) return valid;
  const assignments: ClusterAssignment[] = [];
  let inertia = 0;
  for (const [pointIndex, point] of input.points.entries()) {
    let bestCentroid = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const [centroidIndex, centroid] of input.centroids.entries()) {
      const distance = squaredEuclideanDistance(point, centroid);
      if (!distance.ok) return distance;
      if (distance.value < bestDistance) {
        bestDistance = distance.value;
        bestCentroid = centroidIndex;
      }
    }
    inertia += bestDistance;
    assignments.push(Object.freeze({ pointIndex, centroidIndex: bestCentroid, squaredDistance: bestDistance }));
  }
  return ok(Object.freeze({
    assignments: Object.freeze([...assignments]),
    inertia,
  }));
};

export const recomputeCentroids = (input: RecomputeCentroidsInput): KernelResult<readonly Vector[]> => {
  if (!Number.isInteger(input.clusterCount) || input.clusterCount <= 0) {
    return err("precondition-violated", `clusterCount must be a positive integer; got ${input.clusterCount}`);
  }
  if (input.points.length === 0) return err("precondition-violated", "points must not be empty");
  const dimension = input.points[0]?.length ?? 0;
  if (dimension === 0) return err("precondition-violated", "vectors must not be empty");
  const sums = Array.from({ length: input.clusterCount }, () => Array.from({ length: dimension }, () => 0));
  const counts = Array.from({ length: input.clusterCount }, () => 0);
  for (const [index, point] of input.points.entries()) {
    const valid = validateVector(point, dimension, `points[${index}]`);
    if (!valid.ok) return valid;
  }
  for (const assignment of input.assignments) {
    if (assignment.pointIndex < 0 || assignment.pointIndex >= input.points.length) {
      return err("precondition-violated", `pointIndex out of range; got ${assignment.pointIndex}`);
    }
    if (assignment.centroidIndex < 0 || assignment.centroidIndex >= input.clusterCount) {
      return err("precondition-violated", `centroidIndex out of range; got ${assignment.centroidIndex}`);
    }
    const point = input.points[assignment.pointIndex];
    if (point === undefined) return err("precondition-violated", "assignment point is missing");
    counts[assignment.centroidIndex] = (counts[assignment.centroidIndex] ?? 0) + 1;
    for (let dimensionIndex = 0; dimensionIndex < dimension; dimensionIndex += 1) {
      const row = sums[assignment.centroidIndex];
      if (row === undefined) return err("precondition-violated", "cluster accumulator is missing");
      row[dimensionIndex] = (row[dimensionIndex] ?? 0) + (point[dimensionIndex] ?? 0);
    }
  }
  const centroids = sums.map((sum, clusterIndex) => {
    const count = counts[clusterIndex] ?? 0;
    return Object.freeze(count === 0 ? [...sum] : sum.map((value) => value / count));
  });
  return ok(Object.freeze(centroids));
};

export const kMeansStep = (input: KMeansStepInput): KernelResult<KMeansStepResult> => {
  const assignment = assignToCentroids(input);
  if (!assignment.ok) return assignment;
  const centroids = recomputeCentroids({
    points: input.points,
    assignments: assignment.value.assignments,
    clusterCount: input.centroids.length,
  });
  if (!centroids.ok) return centroids;
  return ok(Object.freeze({
    assignments: assignment.value.assignments,
    centroids: centroids.value,
    inertia: assignment.value.inertia,
  }));
};
