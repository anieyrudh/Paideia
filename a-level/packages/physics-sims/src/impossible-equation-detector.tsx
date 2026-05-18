import { useMemo, useState } from "react";
import type { TPredictSpec } from "@paideia/content-schema";
import { PredictionGate } from "@paideia/prediction-gate";
import { ControlGroup, Selector } from "@paideia/ui-sim";

export const physicalQuantitiesPackageId = "physical-quantities-and-units";
export const impossibleEquationSimId = "impossible-equation-detector";

export const impossibleEquationPredict: TPredictSpec = {
  prompt:
    "A student proposes s = ut + 1/2at for motion. Before the detector opens, predict whether the equation can be valid just by checking units.",
  commit_format: {
    kind: "multiple-choice",
    options: [
      "valid: both sides are length",
      "invalid: one right-hand term is velocity",
      "valid: all symbols are motion quantities",
      "invalid: units never decide equations",
    ],
    correct_index: 1,
  },
  rationale_required: true,
};

export type DimensionSymbol = "L" | "M" | "T" | "I" | "Theta" | "N" | "J";

export type DimensionVector = Readonly<Record<DimensionSymbol, number>>;

export interface QuantityDescriptor {
  readonly id: string;
  readonly label: string;
  readonly kind: "base-dimension" | "derived";
  readonly orientation: "scalar" | "vector";
  readonly unit: string;
  readonly dimension: DimensionVector;
  readonly studentHint: string;
}

export interface EquationCase {
  readonly id: string;
  readonly title: string;
  readonly scenario: string;
  readonly left: readonly string[];
  readonly right: readonly (readonly string[])[];
  readonly learnerQuestion: string;
}

export interface TermBreakdown {
  readonly term: string;
  readonly dimension: DimensionVector;
  readonly unit: string;
}

export interface EquationCheck {
  readonly valid: boolean;
  readonly left: TermBreakdown;
  readonly right: readonly TermBreakdown[];
  readonly mismatches: readonly string[];
  readonly verdict: string;
}

const symbols: readonly DimensionSymbol[] = ["M", "L", "T", "I", "Theta", "N", "J"];

const dimension = (
  partial: Partial<Record<DimensionSymbol, number>> = {},
): DimensionVector => ({
  M: partial.M ?? 0,
  L: partial.L ?? 0,
  T: partial.T ?? 0,
  I: partial.I ?? 0,
  Theta: partial.Theta ?? 0,
  N: partial.N ?? 0,
  J: partial.J ?? 0,
});

export const quantities: readonly QuantityDescriptor[] = [
  {
    id: "displacement",
    label: "displacement s",
    kind: "base-dimension",
    orientation: "vector",
    unit: "m",
    dimension: dimension({ L: 1 }),
    studentHint: "A length with direction; it can be positive, negative, or resolved into components.",
  },
  {
    id: "distance",
    label: "distance d",
    kind: "base-dimension",
    orientation: "scalar",
    unit: "m",
    dimension: dimension({ L: 1 }),
    studentHint: "A length without direction; useful for scalar path length.",
  },
  {
    id: "time",
    label: "time t",
    kind: "base-dimension",
    orientation: "scalar",
    unit: "s",
    dimension: dimension({ T: 1 }),
    studentHint: "The SI base quantity for duration.",
  },
  {
    id: "mass",
    label: "mass m",
    kind: "base-dimension",
    orientation: "scalar",
    unit: "kg",
    dimension: dimension({ M: 1 }),
    studentHint: "The SI base quantity for amount of matter/inertia.",
  },
  {
    id: "velocity",
    label: "velocity u or v",
    kind: "derived",
    orientation: "vector",
    unit: "m s^-1",
    dimension: dimension({ L: 1, T: -1 }),
    studentHint: "Displacement per unit time, so its unit contains length divided by time.",
  },
  {
    id: "speed",
    label: "speed v",
    kind: "derived",
    orientation: "scalar",
    unit: "m s^-1",
    dimension: dimension({ L: 1, T: -1 }),
    studentHint: "Distance per unit time; same dimensions as velocity but no direction.",
  },
  {
    id: "acceleration",
    label: "acceleration a",
    kind: "derived",
    orientation: "vector",
    unit: "m s^-2",
    dimension: dimension({ L: 1, T: -2 }),
    studentHint: "Change of velocity per unit time.",
  },
  {
    id: "force",
    label: "force F",
    kind: "derived",
    orientation: "vector",
    unit: "N = kg m s^-2",
    dimension: dimension({ M: 1, L: 1, T: -2 }),
    studentHint: "Mass times acceleration, so a newton expands to kg m s^-2.",
  },
  {
    id: "energy",
    label: "energy E",
    kind: "derived",
    orientation: "scalar",
    unit: "J = kg m^2 s^-2",
    dimension: dimension({ M: 1, L: 2, T: -2 }),
    studentHint: "Work done by a force over a distance.",
  },
];

export const equationCases: readonly EquationCase[] = [
  {
    id: "missing-time-factor",
    title: "Missing a time factor",
    scenario: "A motion note claims s = ut + 1/2at.",
    left: ["displacement"],
    right: [["velocity", "time"], ["acceleration", "time"]],
    learnerQuestion: "Can the two right-hand terms both be added to produce displacement?",
  },
  {
    id: "valid-suvat",
    title: "Classic constant-acceleration equation",
    scenario: "A corrected motion note claims s = ut + 1/2at^2.",
    left: ["displacement"],
    right: [["velocity", "time"], ["acceleration", "time", "time"]],
    learnerQuestion: "Do all terms reduce to metres?",
  },
  {
    id: "force-speed-confusion",
    title: "Force confused with speed",
    scenario: "A dynamics note claims F = mv.",
    left: ["force"],
    right: [["mass", "velocity"]],
    learnerQuestion: "Does mass times velocity have the same unit as force?",
  },
  {
    id: "valid-newton-two",
    title: "Newton's second law",
    scenario: "A dynamics note claims F = ma.",
    left: ["force"],
    right: [["mass", "acceleration"]],
    learnerQuestion: "Does the derived unit newton expand the same way as kg times acceleration?",
  },
  {
    id: "energy-from-speed",
    title: "Kinetic energy without the square",
    scenario: "A work-energy note claims E = 1/2mv.",
    left: ["energy"],
    right: [["mass", "velocity"]],
    learnerQuestion: "Can an energy term have only one power of metres per second?",
  },
  {
    id: "valid-kinetic-energy",
    title: "Kinetic energy with speed squared",
    scenario: "A work-energy note claims E = 1/2mv^2.",
    left: ["energy"],
    right: [["mass", "speed", "speed"]],
    learnerQuestion: "Does speed squared supply the extra length and time powers?",
  },
];

const byId = (id: string): QuantityDescriptor => {
  const found = quantities.find((quantity) => quantity.id === id);
  if (found === undefined) throw new Error(`Unknown quantity ${id}`);
  return found;
};

const equationById = (id: string): EquationCase => {
  const found = equationCases.find((equation) => equation.id === id);
  if (found === undefined) throw new Error(`Unknown equation ${id}`);
  return found;
};

const multiplyDimensions = (ids: readonly string[]): DimensionVector =>
  ids.reduce<DimensionVector>((current, id) => {
    const next = byId(id).dimension;
    return dimension(
      Object.fromEntries(symbols.map((symbol) => [symbol, current[symbol] + next[symbol]])),
    );
  }, dimension());

const sameDimension = (a: DimensionVector, b: DimensionVector): boolean =>
  symbols.every((symbol) => a[symbol] === b[symbol]);

export const formatDimension = (value: DimensionVector): string => {
  const parts = symbols
    .filter((symbol) => value[symbol] !== 0)
    .map((symbol) => `${symbol}${value[symbol] === 1 ? "" : superscript(value[symbol])}`);
  return parts.length === 0 ? "1" : parts.join(" ");
};

const superscriptDigits: Readonly<Record<string, string>> = {
  "-": "⁻",
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};

function superscript(value: number): string {
  return String(value)
    .split("")
    .map((character) => superscriptDigits[character] ?? character)
    .join("");
}

const describeTerm = (ids: readonly string[]): TermBreakdown => {
  const termQuantities = ids.map(byId);
  return {
    term: termQuantities.map((quantity) => quantity.label).join(" × "),
    dimension: multiplyDimensions(ids),
    unit: termQuantities.map((quantity) => quantity.unit).join(" × "),
  };
};

export const checkEquation = (equation: EquationCase): EquationCheck => {
  const left = describeTerm(equation.left);
  const right = equation.right.map(describeTerm);
  const mismatches = right
    .filter((term) => !sameDimension(term.dimension, left.dimension))
    .map(
      (term) =>
        `${term.term} gives ${formatDimension(term.dimension)}, not ${formatDimension(left.dimension)}`,
    );
  const valid = mismatches.length === 0;

  return {
    valid,
    left,
    right,
    mismatches,
    verdict: valid
      ? "Dimensionally possible: every added or compared term has the same dimensions."
      : "Impossible as written: at least one term has different dimensions, so the equation cannot be valid.",
  };
};

const formatQuantityPills = (ids: readonly string[]) =>
  ids.map((id) => byId(id).label).join(" × ");

export const ImpossibleEquationDetector = () => {
  const [caseId, setCaseId] = useState("missing-time-factor");
  const selectedCase = useMemo(() => equationById(caseId), [caseId]);
  const check = useMemo(() => checkEquation(selectedCase), [selectedCase]);

  return (
    <PredictionGate
      packageId={physicalQuantitiesPackageId}
      predict={impossibleEquationPredict}
      simId={impossibleEquationSimId}
    >
      <section aria-label="Impossible-equation detector" className="unit-detective-lab">
        <header className="lab-hero">
          <p className="eyebrow">Impossible-equation detector</p>
          <h2>Use units as a lie detector</h2>
          <p>
            Choose a proposed equation. The detector expands each physical quantity into
            base dimensions, then checks whether the terms are allowed to be added or compared.
          </p>
        </header>

        <ControlGroup legend="Equation to test">
          <Selector<string>
            label="Proposed equation"
            onChange={(nextCaseId) => setCaseId(nextCaseId)}
            options={equationCases.map((equation) => ({
              label: equation.title,
              value: equation.id,
            }))}
            value={selectedCase.id}
          />
        </ControlGroup>

        <article className="equation-card" aria-label="Selected equation">
          <p className="scenario">{selectedCase.scenario}</p>
          <p className="prompt">{selectedCase.learnerQuestion}</p>
          <div className="equation-strip" aria-label="Equation structure">
            <span>{formatQuantityPills(selectedCase.left)}</span>
            <strong>=</strong>
            <span>{selectedCase.right.map(formatQuantityPills).join(" + ")}</span>
          </div>
        </article>

        <section aria-label="Observation unlocked" className="verdict-panel">
          <strong className={check.valid ? "valid-verdict" : "invalid-verdict"}>
            {check.valid ? "Possible by units" : "Impossible as written"}
          </strong>
          <p>{check.verdict}</p>
        </section>

        <section className="reasoning-grid" aria-label="Unit reasoning">
          <article>
            <h3>Left side</h3>
            <p>{check.left.term}</p>
            <p className="unit-line">unit: {check.left.unit}</p>
            <p className="dimension-line">dimensions: {formatDimension(check.left.dimension)}</p>
          </article>
          {check.right.map((term) => (
            <article key={term.term}>
              <h3>Right-side term</h3>
              <p>{term.term}</p>
              <p className="unit-line">unit: {term.unit}</p>
              <p className="dimension-line">dimensions: {formatDimension(term.dimension)}</p>
            </article>
          ))}
        </section>

        <section className="quantity-map" aria-label="Quantity map">
          <h3>Quantity map</h3>
          <div className="quantity-pills">
            {quantities.map((quantity) => (
              <article key={quantity.id}>
                <strong>{quantity.label}</strong>
                <span>{quantity.kind === "base-dimension" ? "base dimension" : "derived quantity"}</span>
                <span>{quantity.orientation}</span>
                <span>{quantity.unit}</span>
                <small>{quantity.studentHint}</small>
              </article>
            ))}
          </div>
        </section>

        {check.mismatches.length === 0 ? (
          <p className="coach-note">
            Unit agreement does not prove the equation is true, but disagreement proves it is false.
          </p>
        ) : (
          <section className="coach-note" aria-label="Mismatch explanation">
            <h3>Why the detector rejected it</h3>
            <ul>
              {check.mismatches.map((mismatch) => (
                <li key={mismatch}>{mismatch}</li>
              ))}
            </ul>
          </section>
        )}
      </section>
    </PredictionGate>
  );
};

export default ImpossibleEquationDetector;
