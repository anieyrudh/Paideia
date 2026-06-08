import { err, ok, type KernelResult } from "@paideia/shared";

export type Bit = 0 | 1;
export type LogicVector = readonly Bit[];

export interface BinaryStringOptions {
  readonly width?: number;
}

export type GateKind = "not" | "and" | "or" | "xor" | "nand" | "nor" | "xnor";

export interface HalfAdderResult {
  readonly sum: Bit;
  readonly carry: Bit;
}

export interface FullAdderResult {
  readonly sum: Bit;
  readonly carryOut: Bit;
}

export interface RippleCarryAddResult {
  readonly sum: LogicVector;
  readonly carryOut: Bit;
  readonly unsignedValue: number;
}

export interface TruthTableRow {
  readonly inputs: Record<string, Bit>;
  readonly output: Bit;
}

export interface TruthTable {
  readonly inputNames: readonly string[];
  readonly rows: readonly TruthTableRow[];
}

export type ImplicantBit = Bit | null;

export interface Implicant {
  readonly pattern: readonly ImplicantBit[];
  readonly covers: readonly number[];
}

export interface SumOfProductsResult {
  readonly inputNames: readonly string[];
  readonly implicants: readonly Implicant[];
  readonly expression: string;
}

export interface DFlipFlopInput {
  readonly d: Bit;
  readonly previousQ: Bit;
  readonly clockRisingEdge: boolean;
}

export interface DFlipFlopResult {
  readonly q: Bit;
  readonly notQ: Bit;
}

type WorkingImplicant = {
  readonly pattern: readonly ImplicantBit[];
  readonly covers: readonly number[];
  readonly used: boolean;
};

export const bit = (value: boolean | number): KernelResult<Bit> => {
  if (value === true) {
    return ok(1);
  }
  if (value === false) {
    return ok(0);
  }
  if (value === 0 || value === 1) {
    return ok(value);
  }
  return err("out-of-domain", `Bit must be 0, 1, true, or false; got ${value}`);
};

export const bits = (
  values: readonly (boolean | number)[],
): KernelResult<LogicVector> => {
  const result: Bit[] = [];
  for (let index = 0; index < values.length; index += 1) {
    const raw = values[index];
    const parsed = bit(raw ?? Number.NaN);
    if (!parsed.ok) {
      return err(
        parsed.error.code,
        `Invalid bit at index ${index}: ${parsed.error.message}`,
        parsed.error,
      );
    }
    result.push(parsed.value);
  }
  return ok(result);
};

export const binaryStringToBits = (value: string): KernelResult<LogicVector> => {
  if (!/^[01]+$/.test(value)) {
    return err(
      "out-of-domain",
      `Binary string must contain only 0 and 1, got "${value}"`,
    );
  }
  return ok([...value].reverse().map((char): Bit => (char === "1" ? 1 : 0)));
};

export const bitsToBinaryString = (
  values: LogicVector,
  opts?: BinaryStringOptions,
): KernelResult<string> => {
  const vector = validateVector(values, "values");
  if (!vector.ok) {
    return vector;
  }

  const width = opts?.width;
  if (width !== undefined) {
    if (!Number.isInteger(width) || width < vector.value.length) {
      return err(
        "precondition-violated",
        `width must be an integer >= ${vector.value.length}, got ${width}`,
      );
    }
  }

  const rendered =
    vector.value.length === 0 ? "0" : [...vector.value].reverse().join("");
  return ok(width === undefined ? rendered : rendered.padStart(width, "0"));
};

export const notBit = (value: Bit): KernelResult<Bit> => {
  const parsed = validateBit(value, "value");
  if (!parsed.ok) {
    return parsed;
  }
  return ok(parsed.value === 1 ? 0 : 1);
};

export const andGate = (values: LogicVector): KernelResult<Bit> =>
  foldGate(values, "and", (ones, length) => ones === length);

export const orGate = (values: LogicVector): KernelResult<Bit> =>
  foldGate(values, "or", (ones) => ones > 0);

export const xorGate = (values: LogicVector): KernelResult<Bit> =>
  foldGate(values, "xor", (ones) => ones % 2 === 1);

export const nandGate = (values: LogicVector): KernelResult<Bit> => {
  const result = andGate(values);
  return result.ok ? ok(invert(result.value)) : result;
};

export const norGate = (values: LogicVector): KernelResult<Bit> => {
  const result = orGate(values);
  return result.ok ? ok(invert(result.value)) : result;
};

export const xnorGate = (values: LogicVector): KernelResult<Bit> => {
  const result = xorGate(values);
  return result.ok ? ok(invert(result.value)) : result;
};

export const evaluateGate = (
  kind: GateKind,
  values: LogicVector,
): KernelResult<Bit> => {
  switch (kind) {
    case "not":
      if (values.length !== 1) {
        return err("precondition-violated", "not gate requires exactly one bit");
      }
      return notBit(values[0] ?? 0);
    case "and":
      return andGate(values);
    case "or":
      return orGate(values);
    case "xor":
      return xorGate(values);
    case "nand":
      return nandGate(values);
    case "nor":
      return norGate(values);
    case "xnor":
      return xnorGate(values);
    default:
      return err(
        "precondition-violated",
        `Unsupported gate kind "${String(kind)}"`,
      );
  }
};

export const halfAdder = (a: Bit, b: Bit): KernelResult<HalfAdderResult> => {
  const pair = validateVector([a, b], "half-adder inputs");
  if (!pair.ok) {
    return pair;
  }
  return ok({
    sum: xorBits(a, b),
    carry: andBits(a, b),
  });
};

export const fullAdder = (
  a: Bit,
  b: Bit,
  carryIn: Bit,
): KernelResult<FullAdderResult> => {
  const triple = validateVector([a, b, carryIn], "full-adder inputs");
  if (!triple.ok) {
    return triple;
  }
  const ones = a + b + carryIn;
  return ok({
    sum: ones % 2 === 1 ? 1 : 0,
    carryOut: ones >= 2 ? 1 : 0,
  });
};

export const rippleCarryAdd = (
  a: LogicVector,
  b: LogicVector,
  carryIn: Bit = 0,
): KernelResult<RippleCarryAddResult> => {
  const left = validateNonEmptyVector(a, "a");
  if (!left.ok) {
    return left;
  }
  const right = validateNonEmptyVector(b, "b");
  if (!right.ok) {
    return right;
  }
  const carry = validateBit(carryIn, "carryIn");
  if (!carry.ok) {
    return carry;
  }

  const width = Math.max(left.value.length, right.value.length);
  const sum: Bit[] = [];
  let currentCarry = carry.value;
  for (let index = 0; index < width; index += 1) {
    const added = fullAdder(
      left.value[index] ?? 0,
      right.value[index] ?? 0,
      currentCarry,
    );
    if (!added.ok) {
      return added;
    }
    sum.push(added.value.sum);
    currentCarry = added.value.carryOut;
  }

  return ok({
    sum,
    carryOut: currentCarry,
    unsignedValue: unsignedValue([...sum, currentCarry]),
  });
};

export const truthTable = (
  inputNames: readonly string[],
  evaluator: (inputs: Readonly<Record<string, Bit>>) => Bit,
): KernelResult<TruthTable> => {
  const names = validateInputNames(inputNames, 10);
  if (!names.ok) {
    return names;
  }

  const rows: TruthTableRow[] = [];
  const rowCount = 2 ** names.value.length;
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const inputs = rowInputs(names.value, rowIndex);
    let output: Bit;
    try {
      output = evaluator(inputs);
    } catch (cause) {
      return err(
        "precondition-violated",
        `truthTable evaluator threw on row ${rowIndex}`,
        cause,
      );
    }
    const parsed = validateBit(output, "truthTable output");
    if (!parsed.ok) {
      return err(
        parsed.error.code,
        `truthTable evaluator returned invalid output on row ${rowIndex}`,
        parsed.error,
      );
    }
    rows.push({ inputs, output: parsed.value });
  }

  return ok({ inputNames: names.value, rows });
};

export const sumOfProducts = (
  inputNames: readonly string[],
  minterms: readonly number[],
  dontCareMinterms: readonly number[] = [],
): KernelResult<SumOfProductsResult> => {
  const names = validateInputNames(inputNames, 6);
  if (!names.ok) {
    return names;
  }

  const normalized = normalizeMinterms(
    names.value.length,
    minterms,
    dontCareMinterms,
  );
  if (!normalized.ok) {
    return normalized;
  }

  if (normalized.value.minterms.length === 0) {
    return ok({ inputNames: names.value, implicants: [], expression: "0" });
  }

  const allCount = 2 ** names.value.length;
  if (normalized.value.minterms.length === allCount) {
    const allPattern = names.value.map((): ImplicantBit => null);
    return ok({
      inputNames: names.value,
      implicants: [{ pattern: allPattern, covers: normalized.value.minterms }],
      expression: "1",
    });
  }

  const primeImplicants = findPrimeImplicants(
    names.value.length,
    normalized.value.coveredTerms,
  );
  const selected = selectImplicants(primeImplicants, normalized.value.minterms);
  return ok({
    inputNames: names.value,
    implicants: selected,
    expression: selected.map((term) => termExpression(names.value, term)).join(" + "),
  });
};

export const dFlipFlop = (
  input: DFlipFlopInput,
): KernelResult<DFlipFlopResult> => {
  const d = validateBit(input.d, "d");
  if (!d.ok) {
    return d;
  }
  const previousQ = validateBit(input.previousQ, "previousQ");
  if (!previousQ.ok) {
    return previousQ;
  }
  if (typeof input.clockRisingEdge !== "boolean") {
    return err(
      "precondition-violated",
      `clockRisingEdge must be a boolean, got ${String(input.clockRisingEdge)}`,
    );
  }
  const q = input.clockRisingEdge ? d.value : previousQ.value;
  return ok({ q, notQ: invert(q) });
};

const validateBit = (value: number, label: string): KernelResult<Bit> => {
  if (value === 0 || value === 1) {
    return ok(value);
  }
  return err("out-of-domain", `${label} must be a Bit (0 or 1), got ${value}`);
};

const validateVector = (
  values: readonly number[],
  label: string,
): KernelResult<LogicVector> => {
  const result: Bit[] = [];
  for (let index = 0; index < values.length; index += 1) {
    const parsed = validateBit(values[index] ?? Number.NaN, `${label}[${index}]`);
    if (!parsed.ok) {
      return parsed;
    }
    result.push(parsed.value);
  }
  return ok(result);
};

const validateNonEmptyVector = (
  values: LogicVector,
  label: string,
): KernelResult<LogicVector> => {
  if (values.length === 0) {
    return err("precondition-violated", `${label} must include at least one bit`);
  }
  return validateVector(values, label);
};

const foldGate = (
  values: LogicVector,
  label: string,
  predicate: (ones: number, length: number) => boolean,
): KernelResult<Bit> => {
  const vector = validateNonEmptyVector(values, label);
  if (!vector.ok) {
    return vector;
  }
  const ones = vector.value.reduce<number>(
    (count, value) => count + value,
    0,
  );
  return ok(predicate(ones, vector.value.length) ? 1 : 0);
};

const invert = (value: Bit): Bit => (value === 1 ? 0 : 1);
const andBits = (a: Bit, b: Bit): Bit => (a === 1 && b === 1 ? 1 : 0);
const xorBits = (a: Bit, b: Bit): Bit => (a === b ? 0 : 1);

const unsignedValue = (values: LogicVector): number =>
  values.reduce<number>(
    (total, value, index) => total + value * 2 ** index,
    0,
  );

const validateInputNames = (
  inputNames: readonly string[],
  maxVariables: number,
): KernelResult<readonly string[]> => {
  if (inputNames.length === 0 || inputNames.length > maxVariables) {
    return err(
      "precondition-violated",
      `inputNames must contain 1 to ${maxVariables} names`,
    );
  }

  const seen = new Set<string>();
  for (const name of inputNames) {
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) {
      return err(
        "precondition-violated",
        `Input name must be a non-empty identifier, got "${name}"`,
      );
    }
    if (seen.has(name)) {
      return err("precondition-violated", `Duplicate input name "${name}"`);
    }
    seen.add(name);
  }
  return ok([...inputNames]);
};

const rowInputs = (
  inputNames: readonly string[],
  rowIndex: number,
): Record<string, Bit> => {
  const inputs: Record<string, Bit> = {};
  for (let index = 0; index < inputNames.length; index += 1) {
    const name = inputNames[index];
    if (name !== undefined) {
      const shift = inputNames.length - index - 1;
      inputs[name] = ((rowIndex >> shift) & 1) === 1 ? 1 : 0;
    }
  }
  return inputs;
};

const normalizeMinterms = (
  variableCount: number,
  minterms: readonly number[],
  dontCares: readonly number[],
): KernelResult<{
  readonly minterms: readonly number[];
  readonly coveredTerms: readonly number[];
}> => {
  const max = 2 ** variableCount - 1;
  const mintermSet = uniqueSorted(minterms);
  const dontCareSet = uniqueSorted(dontCares);

  for (const value of [...mintermSet, ...dontCareSet]) {
    if (!Number.isInteger(value) || value < 0 || value > max) {
      return err(
        "out-of-domain",
        `Minterm must be an integer in [0, ${max}], got ${value}`,
      );
    }
  }

  for (const value of mintermSet) {
    if (dontCareSet.includes(value)) {
      return err(
        "precondition-violated",
        `Minterm ${value} cannot also be a don't-care term`,
      );
    }
  }

  return ok({
    minterms: mintermSet,
    coveredTerms: uniqueSorted([...mintermSet, ...dontCareSet]),
  });
};

const uniqueSorted = (values: readonly number[]): readonly number[] =>
  [...new Set(values)].sort((a, b) => a - b);

const findPrimeImplicants = (
  variableCount: number,
  terms: readonly number[],
): readonly Implicant[] => {
  let current = terms.map(
    (term): WorkingImplicant => ({
      pattern: mintermPattern(variableCount, term),
      covers: [term],
      used: false,
    }),
  );
  const primes = new Map<string, Implicant>();

  while (current.length > 0) {
    const next = new Map<string, WorkingImplicant>();
    const usedKeys = new Set<string>();

    for (let leftIndex = 0; leftIndex < current.length; leftIndex += 1) {
      const left = current[leftIndex];
      if (left === undefined) {
        continue;
      }
      for (let rightIndex = leftIndex + 1; rightIndex < current.length; rightIndex += 1) {
        const right = current[rightIndex];
        if (right === undefined) {
          continue;
        }
        const combined = combineImplicants(left, right);
        if (combined !== null) {
          usedKeys.add(implicantKey(left));
          usedKeys.add(implicantKey(right));
          next.set(implicantKey(combined), combined);
        }
      }
    }

    for (const candidate of current) {
      if (!usedKeys.has(implicantKey(candidate))) {
        primes.set(implicantKey(candidate), {
          pattern: candidate.pattern,
          covers: candidate.covers,
        });
      }
    }

    current = [...next.values()].sort(compareWorkingImplicants);
  }

  return [...primes.values()].sort(compareImplicants);
};

const mintermPattern = (
  variableCount: number,
  minterm: number,
): readonly ImplicantBit[] => {
  const pattern: ImplicantBit[] = [];
  for (let index = variableCount - 1; index >= 0; index -= 1) {
    pattern.push(((minterm >> index) & 1) === 1 ? 1 : 0);
  }
  return pattern;
};

const combineImplicants = (
  left: WorkingImplicant,
  right: WorkingImplicant,
): WorkingImplicant | null => {
  let differences = 0;
  const pattern: ImplicantBit[] = [];

  for (let index = 0; index < left.pattern.length; index += 1) {
    const a = left.pattern[index];
    const b = right.pattern[index];
    if (a === undefined || b === undefined) {
      return null;
    }
    if (a === b) {
      pattern.push(a);
    } else if (a !== null && b !== null) {
      differences += 1;
      pattern.push(null);
    } else {
      return null;
    }
  }

  if (differences !== 1) {
    return null;
  }

  return {
    pattern,
    covers: uniqueSorted([...left.covers, ...right.covers]),
    used: false,
  };
};

const selectImplicants = (
  primes: readonly Implicant[],
  minterms: readonly number[],
): readonly Implicant[] => {
  const essentials = new Map<string, Implicant>();

  for (const minterm of minterms) {
    const covering = primes.filter((prime) => coversMinterm(prime, minterm));
    if (covering.length === 1) {
      const prime = covering[0];
      if (prime !== undefined) {
        essentials.set(implicantKey(prime), prime);
      }
    }
  }

  const essentialList = [...essentials.values()].sort(compareImplicants);
  const remaining = minterms.filter(
    (minterm) => !essentialList.some((prime) => coversMinterm(prime, minterm)),
  );
  if (remaining.length === 0) {
    return essentialList;
  }

  const essentialKeys = new Set(essentialList.map(implicantKey));
  const candidates = primes
    .filter((prime) => !essentialKeys.has(implicantKey(prime)))
    .filter((prime) => remaining.some((minterm) => coversMinterm(prime, minterm)))
    .sort(compareImplicants);
  const extraCover = exactCover(candidates, remaining);
  return [...essentialList, ...extraCover].sort(compareImplicants);
};

const coversMinterm = (implicant: Implicant, minterm: number): boolean =>
  implicant.covers.includes(minterm);

const countUncovered = (
  implicant: Implicant,
  uncovered: ReadonlySet<number>,
): number => implicant.covers.filter((term) => uncovered.has(term)).length;

const exactCover = (
  candidates: readonly Implicant[],
  minterms: readonly number[],
): readonly Implicant[] => {
  let best: readonly Implicant[] | null = null;
  const target = new Set(minterms);

  const search = (
    selected: readonly Implicant[],
    covered: ReadonlySet<number>,
  ): void => {
    if (best !== null && coverScore(selected) >= coverScore(best)) {
      return;
    }

    if ([...target].every((minterm) => covered.has(minterm))) {
      best =
        best === null || compareCover(selected, best) < 0
          ? [...selected].sort(compareImplicants)
          : best;
      return;
    }

    const nextMinterm = chooseMostConstrainedMinterm(
      target,
      covered,
      candidates,
      selected,
    );
    if (nextMinterm === null) {
      return;
    }

    const selectedKeys = new Set(selected.map(implicantKey));
    const options = candidates
      .filter((candidate) => !selectedKeys.has(implicantKey(candidate)))
      .filter((candidate) => coversMinterm(candidate, nextMinterm))
      .sort((a, b) => {
        const coverageDelta =
          countUncovered(b, differenceSet(target, covered)) -
          countUncovered(a, differenceSet(target, covered));
        return coverageDelta !== 0 ? coverageDelta : compareImplicants(a, b);
      });

    for (const option of options) {
      search(
        [...selected, option],
        new Set([...covered, ...option.covers.filter((term) => target.has(term))]),
      );
    }
  };

  search([], new Set<number>());
  return best ?? [];
};

const chooseMostConstrainedMinterm = (
  target: ReadonlySet<number>,
  covered: ReadonlySet<number>,
  candidates: readonly Implicant[],
  selected: readonly Implicant[],
): number | null => {
  const selectedKeys = new Set(selected.map(implicantKey));
  let best: { readonly minterm: number; readonly optionCount: number } | null = null;

  for (const minterm of target) {
    if (covered.has(minterm)) {
      continue;
    }
    const optionCount = candidates.filter(
      (candidate) =>
        !selectedKeys.has(implicantKey(candidate)) &&
        coversMinterm(candidate, minterm),
    ).length;
    if (optionCount === 0) {
      return null;
    }
    if (best === null || optionCount < best.optionCount) {
      best = { minterm, optionCount };
    }
  }

  return best?.minterm ?? null;
};

const differenceSet = (
  target: ReadonlySet<number>,
  covered: ReadonlySet<number>,
): ReadonlySet<number> =>
  new Set([...target].filter((minterm) => !covered.has(minterm)));

const coverScore = (implicants: readonly Implicant[]): number =>
  implicants.length * 1000 + literalCount(implicants);

const literalCount = (implicants: readonly Implicant[]): number =>
  implicants.reduce<number>(
    (total, implicant) =>
      total + implicant.pattern.filter((value) => value !== null).length,
    0,
  );

const compareCover = (
  a: readonly Implicant[],
  b: readonly Implicant[],
): number => {
  const scoreDelta = coverScore(a) - coverScore(b);
  if (scoreDelta !== 0) {
    return scoreDelta;
  }
  return a
    .map(implicantKey)
    .join("|")
    .localeCompare(b.map(implicantKey).join("|"));
};

const termExpression = (
  inputNames: readonly string[],
  implicant: Implicant,
): string => {
  const parts: string[] = [];
  for (let index = 0; index < implicant.pattern.length; index += 1) {
    const value = implicant.pattern[index];
    const name = inputNames[index];
    if (value !== null && value !== undefined && name !== undefined) {
      parts.push(value === 1 ? name : `!${name}`);
    }
  }
  return parts.length === 0 ? "1" : parts.join("");
};

const implicantKey = (implicant: {
  readonly pattern: readonly ImplicantBit[];
  readonly covers: readonly number[];
}): string => `${implicant.pattern.map((bitValue) => bitKey(bitValue)).join("")}:${implicant.covers.join(",")}`;

const bitKey = (value: ImplicantBit): string => {
  if (value === null) {
    return "-";
  }
  return value === 1 ? "1" : "0";
};

const compareWorkingImplicants = (
  a: WorkingImplicant,
  b: WorkingImplicant,
): number => compareImplicants(a, b);

const compareImplicants = (a: Implicant, b: Implicant): number => {
  const patternDelta = a.pattern
    .map(bitKey)
    .join("")
    .localeCompare(b.pattern.map(bitKey).join(""));
  if (patternDelta !== 0) {
    return patternDelta;
  }
  const coverDelta = (a.covers[0] ?? 0) - (b.covers[0] ?? 0);
  if (coverDelta !== 0) {
    return coverDelta;
  }
  return a.covers.length - b.covers.length;
};
