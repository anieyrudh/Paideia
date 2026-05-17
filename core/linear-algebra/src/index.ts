import { err, ok, type KernelResult } from "@paideia/shared";

export type Vector2 = readonly [x: number, y: number];
export type Matrix2 = readonly [
  readonly [a: number, b: number],
  readonly [c: number, d: number],
];

export interface Eigenpair2 {
  readonly value: number;
  readonly vector: Vector2;
}

export const linearAlgebraTolerance = {
  default: 1e-10,
  zero: 1e-12,
  loose: 1e-8,
} as const;

const finite = (value: number): boolean => Number.isFinite(value);

const finiteResult = (value: number, label: string): KernelResult<number> =>
  finite(value)
    ? ok(value)
    : err("precondition-violated", `${label} must be finite; got ${value}`);

const validateVector2 = (vector: Vector2, label: string): KernelResult<void> =>
  finite(vector[0]) && finite(vector[1])
    ? ok(undefined)
    : err(
        "precondition-violated",
        `${label} must contain finite components; got [${vector[0]}, ${vector[1]}]`,
      );

const validateMatrix2 = (matrix: Matrix2, label: string): KernelResult<void> => {
  const [[a, b], [c, d]] = matrix;
  return finite(a) && finite(b) && finite(c) && finite(d)
    ? ok(undefined)
    : err(
        "precondition-violated",
        `${label} must contain finite entries; got [[${a}, ${b}], [${c}, ${d}]]`,
      );
};

const ensureFiniteVector2 = (vector: Vector2, label: string): KernelResult<Vector2> => {
  const valid = validateVector2(vector, label);
  return valid.ok ? ok(vector) : valid;
};

const ensureFiniteMatrix2 = (matrix: Matrix2, label: string): KernelResult<Matrix2> => {
  const valid = validateMatrix2(matrix, label);
  return valid.ok ? ok(matrix) : valid;
};

export const vector2 = (x: number, y: number): KernelResult<Vector2> =>
  ensureFiniteVector2([x, y], "Vector");

export const matrix2 = (
  a: number,
  b: number,
  c: number,
  d: number,
): KernelResult<Matrix2> => ensureFiniteMatrix2([[a, b], [c, d]], "Matrix");

export const add2 = (
  left: Vector2,
  right: Vector2,
): KernelResult<Vector2> => {
  const validLeft = validateVector2(left, "left");
  if (!validLeft.ok) return validLeft;
  const validRight = validateVector2(right, "right");
  if (!validRight.ok) return validRight;
  return ensureFiniteVector2([left[0] + right[0], left[1] + right[1]], "Sum");
};

export const subtract2 = (
  left: Vector2,
  right: Vector2,
): KernelResult<Vector2> => {
  const validLeft = validateVector2(left, "left");
  if (!validLeft.ok) return validLeft;
  const validRight = validateVector2(right, "right");
  if (!validRight.ok) return validRight;
  return ensureFiniteVector2([left[0] - right[0], left[1] - right[1]], "Difference");
};

export const scale2 = (
  vector: Vector2,
  scalar: number,
): KernelResult<Vector2> => {
  const validVector = validateVector2(vector, "vector");
  if (!validVector.ok) return validVector;
  const validScalar = finiteResult(scalar, "scalar");
  if (!validScalar.ok) return validScalar;
  return ensureFiniteVector2([vector[0] * scalar, vector[1] * scalar], "Scaled vector");
};

export const dot2 = (
  left: Vector2,
  right: Vector2,
): KernelResult<number> => {
  const validLeft = validateVector2(left, "left");
  if (!validLeft.ok) return validLeft;
  const validRight = validateVector2(right, "right");
  if (!validRight.ok) return validRight;
  return finiteResult(left[0] * right[0] + left[1] * right[1], "Dot product");
};

export const norm2 = (vector: Vector2): KernelResult<number> => {
  const validVector = validateVector2(vector, "vector");
  if (!validVector.ok) return validVector;
  return finiteResult(Math.hypot(vector[0], vector[1]), "Norm");
};

export const normalize2 = (vector: Vector2): KernelResult<Vector2> => {
  const length = norm2(vector);
  if (!length.ok) return length;
  if (length.value <= linearAlgebraTolerance.zero) {
    return err("precondition-violated", "Cannot normalize a zero-length vector");
  }
  return scale2(vector, 1 / length.value);
};

export const determinant2 = (matrix: Matrix2): KernelResult<number> => {
  const validMatrix = validateMatrix2(matrix, "matrix");
  if (!validMatrix.ok) return validMatrix;
  const [[a, b], [c, d]] = matrix;
  return finiteResult(a * d - b * c, "Determinant");
};

export const trace2 = (matrix: Matrix2): KernelResult<number> => {
  const validMatrix = validateMatrix2(matrix, "matrix");
  if (!validMatrix.ok) return validMatrix;
  return finiteResult(matrix[0][0] + matrix[1][1], "Trace");
};

export const transpose2 = (matrix: Matrix2): KernelResult<Matrix2> => {
  const validMatrix = validateMatrix2(matrix, "matrix");
  if (!validMatrix.ok) return validMatrix;
  return ensureFiniteMatrix2(
    [
      [matrix[0][0], matrix[1][0]],
      [matrix[0][1], matrix[1][1]],
    ],
    "Transpose",
  );
};

export const multiplyMatrixVector2 = (
  matrix: Matrix2,
  vector: Vector2,
): KernelResult<Vector2> => {
  const validMatrix = validateMatrix2(matrix, "matrix");
  if (!validMatrix.ok) return validMatrix;
  const validVector = validateVector2(vector, "vector");
  if (!validVector.ok) return validVector;
  const [[a, b], [c, d]] = matrix;
  const [x, y] = vector;
  return ensureFiniteVector2([a * x + b * y, c * x + d * y], "Matrix-vector product");
};

export const multiplyMatrix2 = (
  left: Matrix2,
  right: Matrix2,
): KernelResult<Matrix2> => {
  const validLeft = validateMatrix2(left, "left");
  if (!validLeft.ok) return validLeft;
  const validRight = validateMatrix2(right, "right");
  if (!validRight.ok) return validRight;
  const [[a, b], [c, d]] = left;
  const [[e, f], [g, h]] = right;
  return ensureFiniteMatrix2(
    [
      [a * e + b * g, a * f + b * h],
      [c * e + d * g, c * f + d * h],
    ],
    "Matrix product",
  );
};

export const eigenvalues2 = (
  matrix: Matrix2,
): KernelResult<readonly [number, number]> => {
  const validMatrix = validateMatrix2(matrix, "matrix");
  if (!validMatrix.ok) return validMatrix;
  const determinant = determinant2(matrix);
  if (!determinant.ok) return determinant;
  const trace = trace2(matrix);
  if (!trace.ok) return trace;

  const discriminant = trace.value * trace.value - 4 * determinant.value;
  if (discriminant < -linearAlgebraTolerance.loose) {
    return err(
      "out-of-domain",
      "Matrix has complex conjugate eigenvalues; only real eigenvalues are supported",
    );
  }

  const clampedDiscriminant = Math.max(0, discriminant);
  const root = Math.sqrt(clampedDiscriminant);
  return ok([(trace.value + root) / 2, (trace.value - root) / 2]);
};

const residualNorm = (
  matrix: Matrix2,
  lambda: number,
  vector: Vector2,
): KernelResult<number> => {
  const transformed = multiplyMatrixVector2(matrix, vector);
  if (!transformed.ok) return transformed;
  const expected = scale2(vector, lambda);
  if (!expected.ok) return expected;
  const residual = subtract2(transformed.value, expected.value);
  if (!residual.ok) return residual;
  return norm2(residual.value);
};

const eigenvectorFor = (matrix: Matrix2, lambda: number): KernelResult<Vector2> => {
  const [[a, b], [c, d]] = matrix;
  const candidates: readonly Vector2[] = [
    [b, lambda - a],
    [lambda - d, c],
  ];

  let best: { readonly vector: Vector2; readonly residual: number } | undefined;

  for (const candidate of candidates) {
    const magnitude = norm2(candidate);
    if (!magnitude.ok) return magnitude;
    if (magnitude.value <= linearAlgebraTolerance.zero) continue;

    const unit = normalize2(candidate);
    if (!unit.ok) return unit;
    const residual = residualNorm(matrix, lambda, unit.value);
    if (!residual.ok) return residual;

    if (best === undefined || residual.value < best.residual) {
      best = { vector: unit.value, residual: residual.value };
    }
  }

  if (best === undefined) {
    return err(
      "numerical-instability",
      `Could not construct a stable eigenvector for eigenvalue ${lambda}`,
    );
  }

  if (best.residual > linearAlgebraTolerance.loose) {
    return err(
      "numerical-instability",
      `Eigenvector residual ${best.residual} exceeds tolerance ${linearAlgebraTolerance.loose}`,
    );
  }

  return ok(best.vector);
};

const isScalarMatrix = (matrix: Matrix2): boolean => {
  const [[a, b], [c, d]] = matrix;
  return (
    Math.abs(b) <= linearAlgebraTolerance.zero &&
    Math.abs(c) <= linearAlgebraTolerance.zero &&
    Math.abs(a - d) <= linearAlgebraTolerance.zero
  );
};

export const eigenvectors2 = (
  matrix: Matrix2,
): KernelResult<readonly [Eigenpair2, Eigenpair2]> => {
  const validMatrix = validateMatrix2(matrix, "matrix");
  if (!validMatrix.ok) return validMatrix;
  const values = eigenvalues2(matrix);
  if (!values.ok) return values;
  const [lambda1, lambda2] = values.value;

  if (Math.abs(lambda1 - lambda2) <= linearAlgebraTolerance.zero) {
    if (isScalarMatrix(matrix)) {
      return ok([
        { value: lambda1, vector: [1, 0] },
        { value: lambda2, vector: [0, 1] },
      ]);
    }
    return err(
      "precondition-violated",
      "Repeated non-scalar 2x2 matrices do not provide two independent real eigenvectors",
    );
  }

  const vector1 = eigenvectorFor(matrix, lambda1);
  if (!vector1.ok) return vector1;
  const vector2Result = eigenvectorFor(matrix, lambda2);
  if (!vector2Result.ok) return vector2Result;

  return ok([
    { value: lambda1, vector: vector1.value },
    { value: lambda2, vector: vector2Result.value },
  ]);
};
