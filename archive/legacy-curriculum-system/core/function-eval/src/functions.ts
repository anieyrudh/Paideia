export const allowedFunctions = [
  "abs",
  "acos",
  "asin",
  "atan",
  "ceil",
  "cos",
  "exp",
  "floor",
  "ln",
  "log",
  "max",
  "min",
  "pow",
  "round",
  "sin",
  "sqrt",
  "tan",
] as const satisfies readonly string[];

export type AllowedFunctionName = (typeof allowedFunctions)[number];

const allowedFunctionSet = new Set<string>(allowedFunctions);

export const isAllowedFunction = (name: string): name is AllowedFunctionName =>
  allowedFunctionSet.has(name);

export const functionArity = (
  name: AllowedFunctionName,
): { readonly min: number; readonly max: number } => {
  switch (name) {
    case "max":
    case "min":
      return { min: 2, max: Number.POSITIVE_INFINITY };
    case "pow":
      return { min: 2, max: 2 };
    case "log":
      return { min: 1, max: 2 };
    default:
      return { min: 1, max: 1 };
  }
};

export const applyAllowedFunction = (
  name: AllowedFunctionName,
  args: readonly number[],
): number => {
  switch (name) {
    case "abs":
      return Math.abs(args[0] as number);
    case "acos":
      return Math.acos(args[0] as number);
    case "asin":
      return Math.asin(args[0] as number);
    case "atan":
      return Math.atan(args[0] as number);
    case "ceil":
      return Math.ceil(args[0] as number);
    case "cos":
      return Math.cos(args[0] as number);
    case "exp":
      return Math.exp(args[0] as number);
    case "floor":
      return Math.floor(args[0] as number);
    case "ln":
      return Math.log(args[0] as number);
    case "log":
      if (args.length === 2) {
        return Math.log(args[0] as number) / Math.log(args[1] as number);
      }
      return Math.log10(args[0] as number);
    case "max":
      return Math.max(...args);
    case "min":
      return Math.min(...args);
    case "pow":
      return Math.pow(args[0] as number, args[1] as number);
    case "round":
      return Math.round(args[0] as number);
    case "sin":
      return Math.sin(args[0] as number);
    case "sqrt":
      return Math.sqrt(args[0] as number);
    case "tan":
      return Math.tan(args[0] as number);
  }
};
