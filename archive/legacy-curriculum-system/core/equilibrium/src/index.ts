import { err, ok, type Brand, type KernelResult } from "@paideia/shared";

export type ConcentrationMolar = Brand<number, "Equilibrium.ConcentrationMolar">;
export type EquilibriumConstant = Brand<number, "Equilibrium.EquilibriumConstant">;
export type ReactionQuotient = Brand<number, "Equilibrium.ReactionQuotient">;

export type EquilibriumDirection =
  | "toward-products"
  | "toward-reactants"
  | "at-equilibrium";

export type EquilibriumSide = "reactant" | "product";

export interface EquilibriumTerm {
  readonly species: string;
  readonly concentration: ConcentrationMolar;
  readonly coefficient: number;
}

export interface EquilibriumExpression {
  readonly products: readonly EquilibriumTerm[];
  readonly reactants: readonly EquilibriumTerm[];
}

export interface QuotientComparisonInput {
  readonly reactionQuotient: ReactionQuotient;
  readonly equilibriumConstant: EquilibriumConstant;
  readonly relativeTolerance?: number;
}

export interface QuotientComparison {
  readonly reactionQuotient: ReactionQuotient;
  readonly equilibriumConstant: EquilibriumConstant;
  readonly ratio: number;
  readonly direction: EquilibriumDirection;
}

export interface IceTableTerm {
  readonly species: string;
  readonly side: EquilibriumSide;
  readonly coefficient: number;
  readonly initialConcentration: ConcentrationMolar;
}

export interface IceTableInput {
  readonly terms: readonly IceTableTerm[];
  readonly extent: ConcentrationMolar;
}

export interface IceTableRow {
  readonly species: string;
  readonly side: EquilibriumSide;
  readonly coefficient: number;
  readonly initialConcentration: ConcentrationMolar;
  readonly change: number;
  readonly equilibriumConcentration: ConcentrationMolar;
}

const defaultRelativeTolerance = 1e-9;

export const concentrationMolar = (
  value: number,
): KernelResult<ConcentrationMolar> => {
  if (!Number.isFinite(value) || value < 0) {
    return err(
      "out-of-domain",
      `concentrationMolar must be finite and non-negative, got ${value}`,
    );
  }
  return ok(value as ConcentrationMolar);
};

export const equilibriumConstant = (
  value: number,
): KernelResult<EquilibriumConstant> => {
  if (!Number.isFinite(value) || value <= 0) {
    return err(
      "out-of-domain",
      `equilibriumConstant must be finite and positive, got ${value}`,
    );
  }
  return ok(value as EquilibriumConstant);
};

export const reactionQuotientValue = (
  value: number,
): KernelResult<ReactionQuotient> => {
  if (!Number.isFinite(value) || value < 0) {
    return err(
      "out-of-domain",
      `reactionQuotient must be finite and non-negative, got ${value}`,
    );
  }
  return ok(value as ReactionQuotient);
};

export const reactionQuotient = (
  expression: EquilibriumExpression,
): KernelResult<ReactionQuotient> => {
  const validExpression = validateExpression(expression);
  if (!validExpression.ok) {
    return validExpression;
  }

  const numerator = concentrationProduct(expression.products, "products", false);
  if (!numerator.ok) {
    return numerator;
  }
  const denominator = concentrationProduct(expression.reactants, "reactants", true);
  if (!denominator.ok) {
    return denominator;
  }

  const quotient = numerator.value / denominator.value;
  if (!Number.isFinite(quotient)) {
    return err(
      "numerical-instability",
      "reaction quotient overflowed the finite-number model",
    );
  }
  return ok(quotient as ReactionQuotient);
};

export const compareReactionQuotient = (
  input: QuotientComparisonInput,
): KernelResult<QuotientComparison> => {
  const q = reactionQuotientValue(input.reactionQuotient);
  if (!q.ok) {
    return q;
  }
  const k = equilibriumConstant(input.equilibriumConstant);
  if (!k.ok) {
    return k;
  }
  const tolerance = input.relativeTolerance ?? defaultRelativeTolerance;
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    return err(
      "out-of-domain",
      `relativeTolerance must be finite and non-negative, got ${tolerance}`,
    );
  }

  const ratio = q.value / k.value;
  if (!Number.isFinite(ratio)) {
    return err("numerical-instability", "Q/K ratio overflowed the finite-number model");
  }
  const direction =
    Math.abs(ratio - 1) <= tolerance
      ? "at-equilibrium"
      : ratio < 1
        ? "toward-products"
        : "toward-reactants";

  return ok(
    Object.freeze({
      reactionQuotient: q.value,
      equilibriumConstant: k.value,
      ratio,
      direction,
    }),
  );
};

export const iceTable = (
  input: IceTableInput,
): KernelResult<readonly IceTableRow[]> => {
  const validExtent = concentrationMolar(input.extent);
  if (!validExtent.ok) {
    return validExtent;
  }
  const validTerms = validateIceTerms(input.terms);
  if (!validTerms.ok) {
    return validTerms;
  }

  const rows: IceTableRow[] = [];
  for (const term of input.terms) {
    const sign = term.side === "reactant" ? -1 : 1;
    const change = sign * term.coefficient * validExtent.value;
    const equilibrium = Number(term.initialConcentration) + change;
    if (!Number.isFinite(equilibrium)) {
      return err(
        "numerical-instability",
        `${term.species} equilibrium concentration overflowed the finite-number model`,
      );
    }
    if (equilibrium < -defaultRelativeTolerance) {
      return err(
        "out-of-domain",
        `${term.species} equilibrium concentration would be negative`,
      );
    }
    const clippedEquilibrium = Math.max(0, equilibrium);
    const concentration = concentrationMolar(clippedEquilibrium);
    if (!concentration.ok) {
      return concentration;
    }
    rows.push(
      Object.freeze({
        species: term.species,
        side: term.side,
        coefficient: term.coefficient,
        initialConcentration: term.initialConcentration,
        change,
        equilibriumConcentration: concentration.value,
      }),
    );
  }

  return ok(Object.freeze(rows));
};

export const quotientFromIceTable = (
  rows: readonly IceTableRow[],
): KernelResult<ReactionQuotient> => {
  if (rows.length === 0) {
    return err("precondition-violated", "rows must not be empty");
  }

  const reactants: EquilibriumTerm[] = [];
  const products: EquilibriumTerm[] = [];
  for (const row of rows) {
    const concentration = concentrationMolar(row.equilibriumConcentration);
    if (!concentration.ok) {
      return concentration;
    }
    const term = {
      species: row.species,
      concentration: concentration.value,
      coefficient: row.coefficient,
    } satisfies EquilibriumTerm;
    if (row.side === "reactant") {
      reactants.push(term);
    } else if (row.side === "product") {
      products.push(term);
    } else {
      return err("precondition-violated", `invalid side ${String(row.side)}`);
    }
  }

  return reactionQuotient({
    products: Object.freeze(products),
    reactants: Object.freeze(reactants),
  });
};

const validateExpression = (
  expression: EquilibriumExpression,
): KernelResult<true> => {
  if (expression.products.length === 0 || expression.reactants.length === 0) {
    return err(
      "precondition-violated",
      "products and reactants must both contain at least one term",
    );
  }
  return validateUniqueTerms([...expression.products, ...expression.reactants]);
};

const validateIceTerms = (
  terms: readonly IceTableTerm[],
): KernelResult<true> => {
  if (terms.length < 2) {
    return err("precondition-violated", "ICE table requires at least two terms");
  }
  let reactants = 0;
  let products = 0;
  const seen = new Set<string>();
  for (const term of terms) {
    if (seen.has(term.species)) {
      return err("precondition-violated", `duplicate species ${term.species}`);
    }
    seen.add(term.species);
    const validSpecies = validateSpecies(term.species);
    if (!validSpecies.ok) {
      return validSpecies;
    }
    const validCoefficient = positiveFinite(term.coefficient, `${term.species} coefficient`);
    if (!validCoefficient.ok) {
      return validCoefficient;
    }
    const validConcentration = concentrationMolar(term.initialConcentration);
    if (!validConcentration.ok) {
      return validConcentration;
    }
    if (term.side === "reactant") {
      reactants += 1;
    } else if (term.side === "product") {
      products += 1;
    } else {
      return err("precondition-violated", `invalid side ${String(term.side)}`);
    }
  }
  if (reactants === 0 || products === 0) {
    return err(
      "precondition-violated",
      "ICE table requires at least one reactant and one product",
    );
  }
  return ok(true);
};

const validateUniqueTerms = (
  terms: readonly EquilibriumTerm[],
): KernelResult<true> => {
  const seen = new Set<string>();
  for (const term of terms) {
    if (seen.has(term.species)) {
      return err("precondition-violated", `duplicate species ${term.species}`);
    }
    seen.add(term.species);
    const validSpecies = validateSpecies(term.species);
    if (!validSpecies.ok) {
      return validSpecies;
    }
    const validConcentration = concentrationMolar(term.concentration);
    if (!validConcentration.ok) {
      return validConcentration;
    }
    const validCoefficient = positiveFinite(term.coefficient, `${term.species} coefficient`);
    if (!validCoefficient.ok) {
      return validCoefficient;
    }
  }
  return ok(true);
};

const concentrationProduct = (
  terms: readonly EquilibriumTerm[],
  label: string,
  requirePositive: boolean,
): KernelResult<number> => {
  let product = 1;
  for (const term of terms) {
    if (requirePositive && Number(term.concentration) <= 0) {
      return err(
        "out-of-domain",
        `${label} concentration for ${term.species} must be positive`,
      );
    }
    const factor = Number(term.concentration) ** term.coefficient;
    if (!Number.isFinite(factor)) {
      return err(
        "numerical-instability",
        `${term.species} concentration term overflowed the finite-number model`,
      );
    }
    product *= factor;
    if (!Number.isFinite(product)) {
      return err(
        "numerical-instability",
        `${label} product overflowed the finite-number model`,
      );
    }
  }
  return ok(product);
};

const validateSpecies = (species: string): KernelResult<true> => {
  if (species.trim().length === 0) {
    return err("precondition-violated", "species must be non-empty");
  }
  return ok(true);
};

const positiveFinite = (value: number, label: string): KernelResult<number> => {
  if (!Number.isFinite(value) || value <= 0) {
    return err("out-of-domain", `${label} must be finite and positive, got ${value}`);
  }
  return ok(value);
};
