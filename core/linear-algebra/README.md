# @paideia/linear-algebra

Deterministic 2D linear algebra for Paideia simulations. This package owns
finite vectors, row-major 2x2 matrices, transforms, and real eigenpairs so
containers do not hand-roll matrix conventions.

## Exports

- `Vector2`
- `Matrix2`
- `Eigenpair2`
- `linearAlgebraTolerance`
- `vector2`
- `matrix2`
- `add2`
- `subtract2`
- `scale2`
- `dot2`
- `norm2`
- `normalize2`
- `determinant2`
- `trace2`
- `transpose2`
- `multiplyMatrixVector2`
- `multiplyMatrix2`
- `eigenvalues2`
- `eigenvectors2`

## Usage

```ts
import {
  eigenvectors2,
  matrix2,
  multiplyMatrixVector2,
} from "@paideia/linear-algebra";

const transform = matrix2(3, 1, 0, 2);
if (!transform.ok) throw new Error(transform.error.message);

const pairs = eigenvectors2(transform.value);
if (!pairs.ok) throw new Error(pairs.error.message);

const first = pairs.value[0];
const transformed = multiplyMatrixVector2(transform.value, first.vector);
```

Matrices are row-major: `[[a, b], [c, d]]` maps `[x, y]` to
`[a*x + b*y, c*x + d*y]`.

## Error handling

Expected failure modes are returned as `KernelResult.err(...)`, not thrown:

- non-finite vector or matrix entries;
- attempts to normalize a zero vector;
- matrices with complex eigenvalues;
- defective repeated-root matrices with no two-vector real eigenbasis.

This package has no rendering, UI, persistence, or hidden mutable state.
