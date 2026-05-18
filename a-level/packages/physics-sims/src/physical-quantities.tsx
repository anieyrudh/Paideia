import { useMemo, useState } from "react";
import type { TPredictSpec } from "@paideia/content-schema";
import { PredictionGate } from "@paideia/prediction-gate";
import { ControlGroup, Selector } from "@paideia/ui-sim";

export const physicalQuantitiesPackageId = "physical-quantities-and-units";
export const dimensionalCheckerSimId = "dimensional-consistency-checker";

export const dimensionalPredict: TPredictSpec = {
  prompt:
    "A learner proposes three equations: v = s/t, F = ma, and s = vt + 1/2 at. Before opening the checker, which one do you think the units will reject?",
  commit_format: {
    kind: "multiple-choice",
    options: ["v = s/t", "F = ma", "s = vt + 1/2 at", "All three are consistent"],
    correct_index: 2,
  },
  rationale_required: true,
};

export type BaseDimensionKey = "M" | "L" | "T" | "I" | "Theta" | "N" | "J";

export type DimensionVector = Readonly<Record<BaseDimensionKey, number>>;

export interface QuantityCard {
  readonly id: string;
  readonly label: string;
  readonly symbol: string;
  readonly unit: string;
  readonly dimension: DimensionVector;
  readonly quantityKind: "base" | "derived";
  readonly directionKind: "scalar" | "vector";
  readonly studentMeaning: string;
}

export interface TermModel {
  readonly label: string;
  readonly expression: string;
  readonly dimension: DimensionVector;
}

export interface EquationChallenge {
  readonly id: string;
  readonly title: string;
  readonly equation: string;
  readonly left: TermModel;
  readonly rightTerms: readonly TermModel[];
  readonly unitQuestion: string;
  readonly fixHint: string;
}

export interface EquationCheck {
  readonly challenge: EquationChallenge;
  readonly consistent: boolean;
  readonly leftExpanded: string;
  readonly rightExpanded: string;
  readonly verdict: string;
  readonly reasoning: readonly string[];
}

const ZERO_DIMENSION: DimensionVector = {
  M: 0,
  L: 0,
  T: 0,
  I: 0,
  Theta: 0,
  N: 0,
  J: 0,
};

const dimension = (overrides: Partial<DimensionVector>): DimensionVector => ({
  ...ZERO_DIMENSION,
  ...overrides,
});

const quantityCards: readonly QuantityCard[] = [
  {
    id: "length",
    label: "Length / displacement",
    symbol: "s",
    unit: "m",
    dimension: dimension({ L: 1 }),
    quantityKind: "base",
    directionKind: "vector",
    studentMeaning: "A metre compares a position change with the SI base standard for length.",
  },
  {
    id: "time",
    label: "Time interval",
    symbol: "t",
    unit: "s",
    dimension: dimension({ T: 1 }),
    quantityKind: "base",
    directionKind: "scalar",
    studentMeaning: "A second is a base unit; it does not need a direction.",
  },
  {
    id: "velocity",
    label: "Velocity",
    symbol: "v",
    unit: "m s^-1",
    dimension: dimension({ L: 1, T: -1 }),
    quantityKind: "derived",
    directionKind: "vector",
    studentMeaning: "Velocity is displacement per unit time, so the unit carries length divided by time.",
  },
  {
    id: "acceleration",
    label: "Acceleration",
    symbol: "a",
    unit: "m s^-2",
    dimension: dimension({ L: 1, T: -2 }),
    quantityKind: "derived",
    directionKind: "vector",
    studentMeaning: "Acceleration is change in velocity per unit time, adding another division by seconds.",
  },
  {
    id: "force",
    label: "Force",
    symbol: "F",
    unit: "N = kg m s^-2",
    dimension: dimension({ M: 1, L: 1, T: -2 }),
    quantityKind: "derived",
    directionKind: "vector",
    studentMeaning: "A newton is derived from mass times acceleration.",
  },
  {
    id: "mass",
    label: "Mass",
    symbol: "m",
    unit: "kg",
    dimension: dimension({ M: 1 }),
    quantityKind: "base",
    directionKind: "scalar",
    studentMeaning: "Mass is an SI base quantity and has no direction.",
  },
];

const challenges = [
  {
    id: "speed-from-distance-time",
    title: "Speed from distance and time",
    equation: "v = s / t",
    left: {
      label: "velocity",
      expression: "v",
      dimension: dimension({ L: 1, T: -1 }),
    },
    rightTerms: [
      {
        label: "displacement divided by time",
        expression: "s / t",
        dimension: dimension({ L: 1, T: -1 }),
      },
    ],
    unitQuestion: "Can metres divided by seconds produce a velocity unit?",
    fixHint: "This equation passes because both sides reduce to m s^-1.",
  },
  {
    id: "newton-second-law",
    title: "Force from mass and acceleration",
    equation: "F = ma",
    left: {
      label: "force",
      expression: "F",
      dimension: dimension({ M: 1, L: 1, T: -2 }),
    },
    rightTerms: [
      {
        label: "mass times acceleration",
        expression: "ma",
        dimension: dimension({ M: 1, L: 1, T: -2 }),
      },
    ],
    unitQuestion: "Does kg times m s^-2 match the newton?",
    fixHint: "This equation passes because N expands to kg m s^-2.",
  },
  {
    id: "kinematics-missing-time",
    title: "Impossible displacement expression",
    equation: "s = vt + 1/2 at",
    left: {
      label: "displacement",
      expression: "s",
      dimension: dimension({ L: 1 }),
    },
    rightTerms: [
      {
        label: "velocity times time",
        expression: "vt",
        dimension: dimension({ L: 1 }),
      },
      {
        label: "half acceleration times time",
        expression: "1/2 at",
        dimension: dimension({ L: 1, T: -1 }),
      },
    ],
    unitQuestion: "Can a length term be added to a velocity term?",
    fixHint: "The second term needs another factor of time: s = vt + 1/2 at².",
  },
] as const satisfies readonly [EquationChallenge, ...EquationChallenge[]];

const defaultChallenge = challenges[0];

const baseOrder: readonly BaseDimensionKey[] = ["M", "L", "T", "I", "Theta", "N", "J"];
const baseLabels: Record<BaseDimensionKey, string> = {
  M: "M",
  L: "L",
  T: "T",
  I: "I",
  Theta: "Θ",
  N: "N",
  J: "J",
};

const sameDimension = (left: DimensionVector, right: DimensionVector): boolean =>
  baseOrder.every((key) => left[key] === right[key]);

const addDimensions = (left: DimensionVector, right: DimensionVector): DimensionVector =>
  dimension(
    Object.fromEntries(baseOrder.map((key) => [key, left[key] + right[key]])) as Partial<DimensionVector>,
  );

const formatPower = (power: number): string => {
  if (power === 1) return "";
  const superscripts: Record<string, string> = {
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
  return String(power)
    .split("")
    .map((character) => superscripts[character] ?? character)
    .join("");
};

export const formatDimension = (vector: DimensionVector): string => {
  const parts = baseOrder
    .filter((key) => vector[key] !== 0)
    .map((key) => `${baseLabels[key]}${formatPower(vector[key])}`);
  return parts.length === 0 ? "dimensionless" : parts.join(" ");
};

export const evaluateEquation = (challengeId: string): EquationCheck => {
  const challenge = challenges.find((candidate) => candidate.id === challengeId) ?? defaultChallenge;
  const referenceRight = challenge.rightTerms[0]?.dimension ?? ZERO_DIMENSION;
  const rightTermsAgree = challenge.rightTerms.every((term) => sameDimension(term.dimension, referenceRight));
  const leftMatchesRight = sameDimension(challenge.left.dimension, referenceRight);
  const consistent = rightTermsAgree && leftMatchesRight;
  const rightExpanded = challenge.rightTerms
    .map((term) => `${term.expression}: ${formatDimension(term.dimension)}`)
    .join("; ");
  const mismatchTerm = challenge.rightTerms.find((term) => !sameDimension(term.dimension, challenge.left.dimension));

  return {
    challenge,
    consistent,
    leftExpanded: `${challenge.left.expression}: ${formatDimension(challenge.left.dimension)}`,
    rightExpanded,
    verdict: consistent ? "Dimensionally consistent" : "Units reject this equation",
    reasoning: [
      `Left side ${challenge.left.expression} is ${formatDimension(challenge.left.dimension)}.`,
      ...challenge.rightTerms.map(
        (term) => `${term.expression} is ${formatDimension(term.dimension)} (${term.label}).`,
      ),
      consistent
        ? "Every addable term has the same dimensions, so the equation survives the unit check."
        : `${mismatchTerm?.expression ?? "One term"} has different dimensions, so it cannot be added as the same physical quantity.`,
    ],
  };
};

export const combinedDimensionDemo = (): string =>
  formatDimension(addDimensions(dimension({ M: 1 }), dimension({ L: 1, T: -2 })));

const challengeOptions = challenges.map((challenge) => ({
  value: challenge.id,
  label: challenge.title,
}));

export interface DimensionBarProps {
  readonly label: string;
  readonly dimension: DimensionVector;
  readonly highlight?: boolean;
}

export const DimensionBar = ({ label, dimension: dimensionVector, highlight = false }: DimensionBarProps) => (
  <div className={highlight ? "dimension-bar dimension-bar--highlight" : "dimension-bar"}>
    <span>{label}</span>
    <strong>{formatDimension(dimensionVector)}</strong>
  </div>
);

export const PhysicalQuantitiesSim = () => {
  const [challengeId, setChallengeId] = useState("kinematics-missing-time");
  const check = useMemo(() => evaluateEquation(challengeId), [challengeId]);

  return (
    <PredictionGate
      packageId={physicalQuantitiesPackageId}
      predict={dimensionalPredict}
      simId={dimensionalCheckerSimId}
    >
      <section aria-label="Dimensional consistency checker" className="vector-lab vector-lab--product unit-lab">
        <div className="vector-controls vector-controls--product unit-lab__controls">
          <p className="lab-kicker">Dimensional consistency checker</p>
          <h3>Choose an equation to audit</h3>
          <ControlGroup legend="Equation set">
            <Selector
              label="Equation"
              onChange={setChallengeId}
              options={challengeOptions}
              value={challengeId}
            />
          </ControlGroup>

          <section aria-label="Quantity cards" className="quantity-card-grid">
            {quantityCards.map((card) => (
              <article className="quantity-card" key={card.id}>
                <p className="lab-kicker">{card.quantityKind} · {card.directionKind}</p>
                <h4>{card.label}</h4>
                <p><strong>{card.symbol}</strong> in {card.unit}</p>
                <p>{formatDimension(card.dimension)}</p>
                <small>{card.studentMeaning}</small>
              </article>
            ))}
          </section>
        </div>

        <div className="vector-stage vector-stage--product unit-lab__stage">
          <section aria-label="Observation unlocked" className="equation-audit-card">
            <p className="lab-kicker">Observe</p>
            <h3>{check.challenge.equation}</h3>
            <p>{check.challenge.unitQuestion}</p>
            <div className={check.consistent ? "verdict verdict--pass" : "verdict verdict--fail"}>
              {check.verdict}
            </div>
            <DimensionBar dimension={check.challenge.left.dimension} highlight label="Left side" />
            {check.challenge.rightTerms.map((term) => (
              <DimensionBar dimension={term.dimension} key={term.expression} label={term.expression} />
            ))}
          </section>

          <dl aria-label="Unit reasoning summary" className="result-readout result-readout--cards">
            <div>
              <dt>Left side</dt>
              <dd>{check.leftExpanded}</dd>
            </div>
            <div>
              <dt>Right side</dt>
              <dd>{check.rightExpanded}</dd>
            </div>
            <div>
              <dt>Rule</dt>
              <dd>Only like dimensions can be added or equated.</dd>
            </div>
          </dl>
        </div>

        <section className="formula-panel formula-panel--product" aria-label="Formula used">
          <div>
            <p className="lab-kicker">Explain</p>
            <h3>Why units constrain equations</h3>
          </div>
          <p className="formula">{check.challenge.equation}</p>
          {check.reasoning.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <p className="formula-note">Fix: {check.challenge.fixHint}</p>
        </section>
      </section>
    </PredictionGate>
  );
};

export default PhysicalQuantitiesSim;
