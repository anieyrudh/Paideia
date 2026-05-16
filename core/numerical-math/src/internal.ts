import { err, ok, type Function2D, type Interval, type KernelResult } from "@paideia/shared";

export const sample = (f: Function2D, x: number): KernelResult<number> => {
  if (!Number.isFinite(x)) {
    return err("precondition-violated", `x must be finite; got ${x}`);
  }

  try {
    const value = f(x);
    return Number.isFinite(value)
      ? ok(value)
      : err("undefined-at-point", `Function is undefined at x=${x}`);
  } catch (cause) {
    return err("undefined-at-point", `Function threw at x=${x}`, cause);
  }
};

export const validateBounds = (bounds: Interval): KernelResult<void> => {
  if (!Number.isFinite(bounds.min) || !Number.isFinite(bounds.max)) {
    return err(
      "precondition-violated",
      `Bounds must be finite; got [${bounds.min}, ${bounds.max}]`,
    );
  }

  if (bounds.min >= bounds.max) {
    return err(
      "precondition-violated",
      `Bounds must satisfy min < max; got [${bounds.min}, ${bounds.max}]`,
    );
  }

  return ok(undefined);
};

export const validatePositiveInteger = (
  value: number,
  name: string,
): KernelResult<void> =>
  Number.isInteger(value) && value > 0
    ? ok(undefined)
    : err("precondition-violated", `${name} must be a positive integer; got ${value}`);

export const adaptiveStep = (x: number): number =>
  Math.cbrt(Number.EPSILON) * Math.max(1, Math.abs(x));

export const assertUsableStep = (x: number, h: number): KernelResult<void> => {
  if (!Number.isFinite(h) || h <= 0) {
    return err("precondition-violated", `h must be a positive finite number; got ${h}`);
  }

  if (x + h === x || x - h === x) {
    return err("numerical-instability", `h=${h} is too small around x=${x}`);
  }

  return ok(undefined);
};

export const factorial = (n: number): number => {
  let value = 1;
  for (let i = 2; i <= n; i += 1) value *= i;
  return value;
};
