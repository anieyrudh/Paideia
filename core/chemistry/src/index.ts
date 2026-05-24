import { err, ok, type Brand, type KernelResult } from "@paideia/shared";

export type Moles = Brand<number, "Chemistry.Moles">;
export type Grams = Brand<number, "Chemistry.Grams">;
export type Litres = Brand<number, "Chemistry.Litres">;
export type Kelvins = Brand<number, "Chemistry.Kelvins">;
export type Atmospheres = Brand<number, "Chemistry.Atmospheres">;
export type Molarity = Brand<number, "Chemistry.Molarity">;
export type MolarMass = Brand<number, "Chemistry.MolarMass">;
export type Volts = Brand<number, "Chemistry.Volts">;

export interface ParsedFormula {
  readonly formula: string;
  readonly atoms: Readonly<Record<string, number>>;
}

export type AtomicMassTable = Readonly<Record<string, MolarMass>>;

export interface StoichiometricTerm {
  readonly species: string;
  readonly coefficient: number;
}

export interface Reaction {
  readonly reactants: readonly StoichiometricTerm[];
  readonly products: readonly StoichiometricTerm[];
}

export interface LimitingReagentInput {
  readonly species: string;
  readonly availableMoles: Moles;
}

export interface LimitingReagentResult {
  readonly limitingSpecies: string;
  readonly reactionExtent: Moles;
  readonly leftoverReactants: Readonly<Record<string, Moles>>;
}

export interface IdealGasInput {
  readonly pressureAtm?: Atmospheres;
  readonly volumeLitres?: Litres;
  readonly moles?: Moles;
  readonly temperatureKelvins?: Kelvins;
}

export interface IdealGasResult {
  readonly pressureAtm: Atmospheres;
  readonly volumeLitres: Litres;
  readonly moles: Moles;
  readonly temperatureKelvins: Kelvins;
}

export interface EquilibriumTerm {
  readonly species: string;
  readonly concentration: Molarity;
  readonly coefficient: number;
}

export interface EquilibriumQuotientInput {
  readonly products: readonly EquilibriumTerm[];
  readonly reactants: readonly EquilibriumTerm[];
}

export interface NernstInput {
  readonly standardPotentialVolts: Volts;
  readonly electronCount: number;
  readonly reactionQuotient: number;
  readonly temperatureKelvins?: Kelvins;
}

const gasConstantLitreAtmosphere = 0.082057;
const gasConstantJoules = 8.31446261815324;
const faradayConstant = 96485.33212;
const waterIonProduct25C = 1e-14;
const waterPKw25C = 14;
const defaultNernstTemperatureKelvins = 298.15;

export const moles = (value: number): KernelResult<Moles> =>
  nonNegativeFinite(value, "moles").ok
    ? ok(value as Moles)
    : err("out-of-domain", `moles must be finite and non-negative, got ${value}`);

export const grams = (value: number): KernelResult<Grams> =>
  nonNegativeFinite(value, "grams").ok
    ? ok(value as Grams)
    : err("out-of-domain", `grams must be finite and non-negative, got ${value}`);

export const litres = (value: number): KernelResult<Litres> =>
  positiveFinite(value, "litres").ok
    ? ok(value as Litres)
    : err("out-of-domain", `litres must be finite and positive, got ${value}`);

export const kelvins = (value: number): KernelResult<Kelvins> =>
  positiveFinite(value, "kelvins").ok
    ? ok(value as Kelvins)
    : err("out-of-domain", `kelvins must be finite and positive, got ${value}`);

export const atmospheres = (value: number): KernelResult<Atmospheres> =>
  positiveFinite(value, "atmospheres").ok
    ? ok(value as Atmospheres)
    : err("out-of-domain", `atmospheres must be finite and positive, got ${value}`);

export const molarity = (value: number): KernelResult<Molarity> =>
  positiveFinite(value, "molarity").ok
    ? ok(value as Molarity)
    : err("out-of-domain", `molarity must be finite and positive, got ${value}`);

export const molarMass = (value: number): KernelResult<MolarMass> =>
  positiveFinite(value, "molarMass").ok
    ? ok(value as MolarMass)
    : err("out-of-domain", `molarMass must be finite and positive, got ${value}`);

export const volts = (value: number): KernelResult<Volts> => {
  if (!Number.isFinite(value)) {
    return err("out-of-domain", `volts must be finite, got ${value}`);
  }
  return ok(value as Volts);
};

export const parseFormula = (formula: string): KernelResult<ParsedFormula> => {
  if (formula.trim() !== formula || formula.length === 0) {
    return err("precondition-violated", "formula must be non-empty and unpadded");
  }
  const parsed = parseGroup(formula, 0, false);
  if (!parsed.ok) {
    return parsed;
  }
  if (parsed.value.index !== formula.length) {
    return err(
      "precondition-violated",
      `unexpected token at position ${parsed.value.index}`,
    );
  }
  return ok({ formula, atoms: Object.freeze({ ...parsed.value.atoms }) });
};

export const molarMassOf = (
  formula: string,
  masses: AtomicMassTable,
): KernelResult<MolarMass> => {
  const parsed = parseFormula(formula);
  if (!parsed.ok) {
    return parsed;
  }
  let total = 0;
  for (const element of Object.keys(parsed.value.atoms)) {
    const count = parsed.value.atoms[element];
    if (count === undefined) {
      return err("precondition-violated", `missing atom count for ${element}`);
    }
    const mass = masses[element];
    if (mass === undefined) {
      return err("precondition-violated", `missing atomic mass for ${element}`);
    }
    const valid = molarMass(mass);
    if (!valid.ok) {
      return valid;
    }
    total += valid.value * count;
  }
  return ok(total as MolarMass);
};

export const gramsToMoles = (
  mass: Grams,
  massPerMole: MolarMass,
): KernelResult<Moles> => {
  const validMass = grams(mass);
  if (!validMass.ok) {
    return validMass;
  }
  const validMolarMass = molarMass(massPerMole);
  if (!validMolarMass.ok) {
    return validMolarMass;
  }
  return ok((validMass.value / validMolarMass.value) as Moles);
};

export const molesToGrams = (
  amount: Moles,
  massPerMole: MolarMass,
): KernelResult<Grams> => {
  const validAmount = moles(amount);
  if (!validAmount.ok) {
    return validAmount;
  }
  const validMolarMass = molarMass(massPerMole);
  if (!validMolarMass.ok) {
    return validMolarMass;
  }
  return ok((validAmount.value * validMolarMass.value) as Grams);
};

export const reactionExtent = (
  reaction: Reaction,
  species: string,
  amount: Moles,
): KernelResult<Moles> => {
  const checked = validateReaction(reaction);
  if (!checked.ok) {
    return checked;
  }
  const term = [...checked.value.reactants, ...checked.value.products].find(
    (candidate) => candidate.species === species,
  );
  if (term === undefined) {
    return err("precondition-violated", `species ${species} is not in reaction`);
  }
  const validAmount = moles(amount);
  if (!validAmount.ok) {
    return validAmount;
  }
  return ok((validAmount.value / term.coefficient) as Moles);
};

export const limitingReagent = (
  reaction: Reaction,
  inputs: readonly LimitingReagentInput[],
): KernelResult<LimitingReagentResult> => {
  const checked = validateReaction(reaction);
  if (!checked.ok) {
    return checked;
  }
  const bySpecies = new Map<string, Moles>();
  const reactantSpecies = new Set(
    checked.value.reactants.map((reactant) => reactant.species),
  );
  for (const input of inputs) {
    if (!reactantSpecies.has(input.species)) {
      return err("precondition-violated", `extra non-reactant input ${input.species}`);
    }
    if (bySpecies.has(input.species)) {
      return err("precondition-violated", `duplicate input for ${input.species}`);
    }
    const valid = moles(input.availableMoles);
    if (!valid.ok) {
      return valid;
    }
    bySpecies.set(input.species, valid.value);
  }

  let limitingSpecies: string | null = null;
  let minExtent = Number.POSITIVE_INFINITY;
  for (const reactant of checked.value.reactants) {
    const available = bySpecies.get(reactant.species);
    if (available === undefined) {
      return err("precondition-violated", `missing reactant ${reactant.species}`);
    }
    const extent = available / reactant.coefficient;
    if (extent < minExtent || (extent === minExtent && compareAscii(reactant.species, limitingSpecies ?? reactant.species) < 0)) {
      minExtent = extent;
      limitingSpecies = reactant.species;
    }
  }

  if (limitingSpecies === null || !Number.isFinite(minExtent)) {
    return err("precondition-violated", "reaction has no limiting reagent");
  }

  const leftovers: Record<string, Moles> = {};
  for (const reactant of checked.value.reactants) {
    const available = bySpecies.get(reactant.species);
    if (available === undefined) {
      return err("precondition-violated", `missing reactant ${reactant.species}`);
    }
    leftovers[reactant.species] = Math.max(
      0,
      available - reactant.coefficient * minExtent,
    ) as Moles;
  }

  return ok({
    limitingSpecies,
    reactionExtent: minExtent as Moles,
    leftoverReactants: leftovers,
  });
};

export const solveIdealGas = (
  input: IdealGasInput,
): KernelResult<IdealGasResult> => {
  const present = [
    input.pressureAtm !== undefined,
    input.volumeLitres !== undefined,
    input.moles !== undefined,
    input.temperatureKelvins !== undefined,
  ].filter(Boolean).length;
  if (present !== 3) {
    return err("precondition-violated", "solveIdealGas requires exactly one omitted field");
  }

  const p = input.pressureAtm === undefined ? null : atmospheres(input.pressureAtm);
  const v = input.volumeLitres === undefined ? null : litres(input.volumeLitres);
  const n = input.moles === undefined ? null : positiveMoles(input.moles);
  const t =
    input.temperatureKelvins === undefined ? null : kelvins(input.temperatureKelvins);

  for (const candidate of [p, v, n, t]) {
    if (candidate !== null && !candidate.ok) {
      return candidate;
    }
  }

  if (p === null && v?.ok === true && n?.ok === true && t?.ok === true) {
    return idealGasResult({
      pressureAtm: (n.value * gasConstantLitreAtmosphere * t.value) / v.value,
      volumeLitres: v.value,
      moles: n.value,
      temperatureKelvins: t.value,
    });
  }
  if (v === null && p?.ok === true && n?.ok === true && t?.ok === true) {
    return idealGasResult({
      pressureAtm: p.value,
      volumeLitres: (n.value * gasConstantLitreAtmosphere * t.value) / p.value,
      moles: n.value,
      temperatureKelvins: t.value,
    });
  }
  if (n === null && p?.ok === true && v?.ok === true && t?.ok === true) {
    return idealGasResult({
      pressureAtm: p.value,
      volumeLitres: v.value,
      moles: (p.value * v.value) / (gasConstantLitreAtmosphere * t.value),
      temperatureKelvins: t.value,
    });
  }
  if (t === null && p?.ok === true && v?.ok === true && n?.ok === true) {
    return idealGasResult({
      pressureAtm: p.value,
      volumeLitres: v.value,
      moles: n.value,
      temperatureKelvins: (p.value * v.value) /
        (n.value * gasConstantLitreAtmosphere),
    });
  }

  return err("precondition-violated", "solveIdealGas could not identify the omitted field");
};

export const strongAcidPH = (
  concentration: Molarity,
  protonCount = 1,
): KernelResult<number> => {
  const c = molarity(concentration);
  if (!c.ok) {
    return c;
  }
  const count = positiveInteger(protonCount, "protonCount");
  if (!count.ok) {
    return count;
  }
  const acidEquivalentConcentration = c.value * count.value;
  const hydronium =
    (acidEquivalentConcentration +
      Math.sqrt(acidEquivalentConcentration ** 2 + 4 * waterIonProduct25C)) /
    2;
  return finiteNumber(-Math.log10(hydronium), "pH");
};

export const strongBasePH = (
  concentration: Molarity,
  hydroxideCount = 1,
): KernelResult<number> => {
  const c = molarity(concentration);
  if (!c.ok) {
    return c;
  }
  const count = positiveInteger(hydroxideCount, "hydroxideCount");
  if (!count.ok) {
    return count;
  }
  const hydroxideEquivalentConcentration = c.value * count.value;
  const hydroxide =
    (hydroxideEquivalentConcentration +
      Math.sqrt(hydroxideEquivalentConcentration ** 2 + 4 * waterIonProduct25C)) /
    2;
  const poh = -Math.log10(hydroxide);
  return finiteNumber(waterPKw25C - poh, "pH");
};

export const hendersonHasselbalch = (
  pKa: number,
  baseConcentration: Molarity,
  acidConcentration: Molarity,
): KernelResult<number> => {
  if (!Number.isFinite(pKa)) {
    return err("out-of-domain", `pKa must be finite, got ${pKa}`);
  }
  const base = molarity(baseConcentration);
  if (!base.ok) {
    return base;
  }
  const acid = molarity(acidConcentration);
  if (!acid.ok) {
    return acid;
  }
  return finiteNumber(pKa + Math.log10(base.value / acid.value), "pH");
};

export const equilibriumQuotient = (
  input: EquilibriumQuotientInput,
): KernelResult<number> => {
  const numerator = concentrationProduct(input.products, "products");
  if (!numerator.ok) {
    return numerator;
  }
  const denominator = concentrationProduct(input.reactants, "reactants");
  if (!denominator.ok) {
    return denominator;
  }
  return finiteNumber(numerator.value / denominator.value, "equilibrium quotient");
};

export const nernstPotential = (input: NernstInput): KernelResult<Volts> => {
  const e0 = volts(input.standardPotentialVolts);
  if (!e0.ok) {
    return e0;
  }
  const electrons = positiveInteger(input.electronCount, "electronCount");
  if (!electrons.ok) {
    return electrons;
  }
  const q = positiveFinite(input.reactionQuotient, "reactionQuotient");
  if (!q.ok) {
    return q;
  }
  const temperature =
    input.temperatureKelvins === undefined
      ? ok(defaultNernstTemperatureKelvins as Kelvins)
      : kelvins(input.temperatureKelvins);
  if (!temperature.ok) {
    return temperature;
  }
  return volts(
    e0.value -
      ((gasConstantJoules * temperature.value) /
        (electrons.value * faradayConstant)) *
        Math.log(q.value),
  );
};

type ParseState = {
  readonly atoms: Record<string, number>;
  readonly index: number;
};

const parseGroup = (
  formula: string,
  start: number,
  insideParens: boolean,
): KernelResult<ParseState> => {
  const atoms: Record<string, number> = {};
  let index = start;
  let sawToken = false;

  while (index < formula.length) {
    const char = formula[index];
    if (char === undefined) {
      break;
    }
    if (char === ")") {
      if (!insideParens) {
        return err("precondition-violated", `unmatched ')' at position ${index}`);
      }
      if (!sawToken) {
        return err("precondition-violated", "formula group must contain atoms");
      }
      return ok({ atoms, index: index + 1 });
    }
    if (char === "(") {
      const nested = parseGroup(formula, index + 1, true);
      if (!nested.ok) {
        return nested;
      }
      const multiplier = parseCount(formula, nested.value.index);
      if (!multiplier.ok) {
        return multiplier;
      }
      multiplyAdd(atoms, nested.value.atoms, multiplier.value.count);
      index = multiplier.value.index;
      sawToken = true;
      continue;
    }
    if (!/[A-Z]/.test(char)) {
      return err("precondition-violated", `expected element at position ${index}`);
    }
    const symbol = parseElement(formula, index);
    const count = parseCount(formula, symbol.index);
    if (!count.ok) {
      return count;
    }
    atoms[symbol.symbol] = (atoms[symbol.symbol] ?? 0) + count.value.count;
    index = count.value.index;
    sawToken = true;
  }

  if (insideParens) {
    return err("precondition-violated", "unclosed '(' in formula");
  }
  if (!sawToken) {
    return err("precondition-violated", "formula group must contain atoms");
  }
  return ok({ atoms, index });
};

const parseElement = (
  formula: string,
  start: number,
): { readonly symbol: string; readonly index: number } => {
  let index = start + 1;
  if (index < formula.length && /[a-z]/.test(formula[index] ?? "")) {
    index += 1;
  }
  return { symbol: formula.slice(start, index), index };
};

const parseCount = (
  formula: string,
  start: number,
): KernelResult<{ readonly count: number; readonly index: number }> => {
  let index = start;
  while (index < formula.length && /[0-9]/.test(formula[index] ?? "")) {
    index += 1;
  }
  if (index === start) {
    return ok({ count: 1, index });
  }
  const text = formula.slice(start, index);
  if (text.length > 1 && text.startsWith("0")) {
    return err("precondition-violated", `invalid count ${text} at position ${start}`);
  }
  const count = Number(text);
  if (!Number.isSafeInteger(count) || count <= 0) {
    return err("precondition-violated", `invalid count ${text} at position ${start}`);
  }
  return ok({ count, index });
};

const multiplyAdd = (
  target: Record<string, number>,
  source: Readonly<Record<string, number>>,
  multiplier: number,
): void => {
  for (const [symbol, count] of Object.entries(source)) {
    target[symbol] = (target[symbol] ?? 0) + count * multiplier;
  }
};

const validateReaction = (reaction: Reaction): KernelResult<Reaction> => {
  if (reaction.reactants.length === 0 || reaction.products.length === 0) {
    return err("precondition-violated", "reaction needs reactants and products");
  }
  const seen = new Set<string>();
  for (const term of [...reaction.reactants, ...reaction.products]) {
    if (term.species.trim().length === 0) {
      return err("precondition-violated", "reaction species must be non-empty");
    }
    if (seen.has(term.species)) {
      return err("precondition-violated", `duplicate species ${term.species}`);
    }
    seen.add(term.species);
    const coefficient = positiveFinite(term.coefficient, `${term.species} coefficient`);
    if (!coefficient.ok) {
      return coefficient;
    }
  }
  return ok({
    reactants: [...reaction.reactants],
    products: [...reaction.products],
  });
};

const concentrationProduct = (
  terms: readonly EquilibriumTerm[],
  label: string,
): KernelResult<number> => {
  if (terms.length === 0) {
    return err("precondition-violated", `${label} must not be empty`);
  }
  let product = 1;
  const seen = new Set<string>();
  for (const term of terms) {
    if (term.species.trim().length === 0) {
      return err("precondition-violated", "equilibrium species must be non-empty");
    }
    if (seen.has(term.species)) {
      return err("precondition-violated", `duplicate equilibrium species ${term.species}`);
    }
    seen.add(term.species);
    const concentration = molarity(term.concentration);
    if (!concentration.ok) {
      return concentration;
    }
    const coefficient = positiveFinite(term.coefficient, `${term.species} coefficient`);
    if (!coefficient.ok) {
      return coefficient;
    }
    const factor = concentration.value ** coefficient.value;
    if (!Number.isFinite(factor)) {
      return err(
        "out-of-domain",
        `${term.species} concentration term produced a non-finite value`,
      );
    }
    product *= factor;
    if (!Number.isFinite(product)) {
      return err("out-of-domain", `${label} product produced a non-finite value`);
    }
  }
  return ok(product);
};

const idealGasResult = (input: {
  readonly pressureAtm: number;
  readonly volumeLitres: number;
  readonly moles: number;
  readonly temperatureKelvins: number;
}): KernelResult<IdealGasResult> => {
  const pressure = atmospheres(input.pressureAtm);
  if (!pressure.ok) {
    return pressure;
  }
  const volume = litres(input.volumeLitres);
  if (!volume.ok) {
    return volume;
  }
  const amount = positiveMoles(input.moles);
  if (!amount.ok) {
    return amount;
  }
  const temperature = kelvins(input.temperatureKelvins);
  if (!temperature.ok) {
    return temperature;
  }
  return ok({
    pressureAtm: pressure.value,
    volumeLitres: volume.value,
    moles: amount.value,
    temperatureKelvins: temperature.value,
  });
};

const finiteNumber = (value: number, label: string): KernelResult<number> => {
  if (!Number.isFinite(value)) {
    return err("out-of-domain", `${label} must be finite, got ${value}`);
  }
  return ok(value);
};

const positiveInteger = (
  value: number,
  label: string,
): KernelResult<number> => {
  if (!Number.isInteger(value) || value <= 0) {
    return err("precondition-violated", `${label} must be a positive integer, got ${value}`);
  }
  return ok(value);
};

const positiveMoles = (value: number): KernelResult<Moles> => {
  const result = positiveFinite(value, "moles");
  return result.ok ? ok(value as Moles) : result;
};

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
