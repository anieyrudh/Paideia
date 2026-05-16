import { err, ok, type Function2D, type KernelResult } from "@paideia/shared";
import type { AstNode } from "./ast.js";
import { evaluateAst, safeFunction, evaluateAt, validateVariables } from "./evaluator.js";
import { allowedFunctions } from "./functions.js";
import { parseExpressionSource } from "./parser.js";

export type { AstNode } from "./ast.js";
export { allowedFunctions, evaluateAt, safeFunction };

const throwEvaluationFailure = (expr: string, message: string): never => {
  throw new Error(`Compiled expression '${expr}' failed: ${message}`);
};

export const parseExpression = (expr: string): KernelResult<AstNode> =>
  parseExpressionSource(expr);

export const evaluate = (
  expr: string,
  vars: Record<string, number>,
): KernelResult<number> => {
  const ast = parseExpression(expr);
  if (!ast.ok) return ast;
  const valid = validateVariables(ast.value, new Set(Object.keys(vars)));
  if (!valid.ok) return valid;
  return evaluateAst(ast.value, vars);
};

export function compile(expr: string, freeVars: readonly [string]): KernelResult<Function2D>;
export function compile(
  expr: string,
  freeVars: readonly [] | readonly [string, string, ...string[]],
): KernelResult<(vars: Record<string, number>) => number>;
export function compile(
  expr: string,
  freeVars: readonly string[],
): KernelResult<Function2D | ((vars: Record<string, number>) => number)>;
export function compile(
  expr: string,
  freeVars: readonly string[],
): KernelResult<Function2D | ((vars: Record<string, number>) => number)> {
  const duplicateVars = new Set<string>();
  for (const variable of freeVars) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(variable)) {
      return err("precondition-violated", `Invalid free variable name '${variable}'`);
    }
    if (duplicateVars.has(variable)) {
      return err("precondition-violated", `Duplicate free variable '${variable}'`);
    }
    duplicateVars.add(variable);
  }

  const ast = parseExpression(expr);
  if (!ast.ok) return ast;

  const valid = validateVariables(ast.value, duplicateVars);
  if (!valid.ok) return valid;

  if (freeVars.length === 1) {
    const variable = freeVars[0];
    if (variable === undefined) {
      return err("precondition-violated", "Missing free variable");
    }
    return ok((x: number): number => {
      const result = evaluateAst(ast.value, { [variable]: x });
      return result.ok ? result.value : throwEvaluationFailure(expr, result.error.message);
    });
  }

  return ok((vars: Record<string, number>): number => {
    const result = evaluateAst(ast.value, vars);
    return result.ok ? result.value : throwEvaluationFailure(expr, result.error.message);
  });
}
