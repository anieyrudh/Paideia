import {
  err,
  ok,
  type Function2D,
  type Interval,
  type KernelResult,
} from "@paideia/shared";
import type { AstNode } from "./ast.js";
import { applyAllowedFunction, isAllowedFunction } from "./functions.js";

const safeDomainKey: unique symbol = Symbol("paideia.functionEval.safeDomain");

type DomainBoundFunction = Function2D & {
  readonly [safeDomainKey]?: Interval;
};

const domainFor = (f: Function2D): Interval | undefined =>
  (f as DomainBoundFunction)[safeDomainKey];

const finiteOrUndefined = (value: number, context: string): KernelResult<number> =>
  Number.isFinite(value)
    ? ok(value)
    : err("undefined-at-point", `${context} is undefined at this point`);

const validateDomain = (domain: Interval): KernelResult<void> => {
  if (
    !Number.isFinite(domain.min) ||
    !Number.isFinite(domain.max) ||
    domain.min > domain.max
  ) {
    return err(
      "precondition-violated",
      `Domain must be a finite interval with min <= max; got [${domain.min}, ${domain.max}]`,
    );
  }
  return ok(undefined);
};

const inDomain = (x: number, domain: Interval): boolean =>
  x >= domain.min && x <= domain.max;

export const evaluateAst = (
  ast: AstNode,
  vars: Readonly<Record<string, number>>,
): KernelResult<number> => {
  switch (ast.kind) {
    case "number":
    case "constant":
      return finiteOrUndefined(ast.value, "Literal");
    case "variable": {
      const value = vars[ast.name];
      if (value === undefined) {
        return err("precondition-violated", `Missing value for variable '${ast.name}'`);
      }
      return finiteOrUndefined(value, `Variable '${ast.name}'`);
    }
    case "unary": {
      const argument = evaluateAst(ast.argument, vars);
      if (!argument.ok) return argument;
      return finiteOrUndefined(
        ast.operator === "-" ? -argument.value : argument.value,
        "Unary expression",
      );
    }
    case "binary": {
      const left = evaluateAst(ast.left, vars);
      if (!left.ok) return left;
      const right = evaluateAst(ast.right, vars);
      if (!right.ok) return right;

      if (ast.operator === "/" && right.value === 0) {
        return err("undefined-at-point", "Division by zero");
      }

      const value = (() => {
        switch (ast.operator) {
          case "+":
            return left.value + right.value;
          case "-":
            return left.value - right.value;
          case "*":
            return left.value * right.value;
          case "/":
            return left.value / right.value;
          case "^":
            return Math.pow(left.value, right.value);
        }
      })();

      return finiteOrUndefined(value, "Binary expression");
    }
    case "call": {
      if (!isAllowedFunction(ast.name)) {
        return err("precondition-violated", `Function '${ast.name}' is not allowed`);
      }
      const args: number[] = [];
      for (const argument of ast.args) {
        const value = evaluateAst(argument, vars);
        if (!value.ok) return value;
        args.push(value.value);
      }
      return finiteOrUndefined(applyAllowedFunction(ast.name, args), ast.name);
    }
  }
};

export const validateVariables = (
  ast: AstNode,
  freeVars: ReadonlySet<string>,
): KernelResult<void> => {
  switch (ast.kind) {
    case "number":
    case "constant":
      return ok(undefined);
    case "variable":
      return freeVars.has(ast.name)
        ? ok(undefined)
        : err("precondition-violated", `Identifier '${ast.name}' is not a free variable`);
    case "unary":
      return validateVariables(ast.argument, freeVars);
    case "binary": {
      const left = validateVariables(ast.left, freeVars);
      if (!left.ok) return left;
      return validateVariables(ast.right, freeVars);
    }
    case "call":
      for (const argument of ast.args) {
        const valid = validateVariables(argument, freeVars);
        if (!valid.ok) return valid;
      }
      return ok(undefined);
  }
};

export const evaluateAt = (
  f: Function2D,
  x: number,
  domain?: Interval,
): KernelResult<number> => {
  if (!Number.isFinite(x)) {
    return err("precondition-violated", `x must be finite; got ${x}`);
  }

  const activeDomain = domain ?? domainFor(f);
  if (activeDomain !== undefined) {
    const validDomain = validateDomain(activeDomain);
    if (!validDomain.ok) return validDomain;
    if (!inDomain(x, activeDomain)) {
      return err(
        "out-of-domain",
        `x=${x} is outside [${activeDomain.min}, ${activeDomain.max}]`,
      );
    }
  }

  try {
    return finiteOrUndefined(f(x), "Function");
  } catch (cause) {
    return err("undefined-at-point", `Function threw while evaluating at x=${x}`, cause);
  }
};

export const safeFunction = (fn: Function2D, domain: Interval): Function2D => {
  const wrapped: Function2D = (x: number): number => {
    const result = evaluateAt(fn, x, domain);
    return result.ok ? result.value : Number.NaN;
  };
  Object.defineProperty(wrapped, safeDomainKey, {
    enumerable: false,
    value: domain,
  });
  return wrapped;
};
