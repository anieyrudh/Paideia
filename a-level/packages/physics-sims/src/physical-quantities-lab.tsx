import { useMemo, useState } from "react";
import type { TPredictSpec } from "@paideia/content-schema";
import { PredictionGate } from "@paideia/prediction-gate";

export const physicalQuantitiesPackageId = "physical-quantities-and-units";
export const unitClassificationSimId = "unit-classification-lab";

export const unitClassificationPredict: TPredictSpec = {
  prompt:
    "A lab note says acceleration = 9.8 m s^-2. Before checking the card wall, which statement is safest?",
  commit_format: {
    kind: "multiple-choice",
    options: [
      "The unit alone makes it a base quantity.",
      "It is likely derived because the unit combines metre and second.",
      "It is unitless because 9.8 is a number.",
      "It must be scalar because no arrow is drawn.",
    ],
    correct_index: 1,
  },
  rationale_required: true,
};

type Classification = "base" | "derived" | "unit" | "number";
type DirectionKind = "scalar" | "vector" | "not-applicable";

interface QuantityCard {
  readonly id: string;
  readonly label: string;
  readonly record: string;
  readonly classification: Classification;
  readonly directionKind: DirectionKind;
  readonly dimension: string;
  readonly reasoning: string;
  readonly formula: string;
}

interface EquationCheck {
  readonly id: string;
  readonly statement: string;
  readonly leftUnit: string;
  readonly rightUnit: string;
  readonly verdict: "consistent" | "inconsistent";
  readonly reasoning: string;
}

interface LearnerChoice {
  readonly classification?: Classification;
  readonly directionKind?: DirectionKind;
}

const classificationLabels = {
  base: "Base quantity",
  derived: "Derived quantity",
  unit: "Unit only",
  number: "Number only",
} satisfies Record<Classification, string>;

const directionLabels = {
  scalar: "Scalar",
  vector: "Vector",
  "not-applicable": "Not a quantity yet",
} satisfies Record<DirectionKind, string>;

const cards: readonly [QuantityCard, ...QuantityCard[]] = [
  {
    id: "length",
    label: "Length",
    record: "2.0 m",
    classification: "base",
    directionKind: "scalar",
    dimension: "L",
    formula: "quantity = numerical value × unit",
    reasoning: "Length is one of the SI base quantities. The unit metre tells what standard the number 2.0 is compared with.",
  },
  {
    id: "time",
    label: "Time interval",
    record: "4.0 s",
    classification: "base",
    directionKind: "scalar",
    dimension: "T",
    formula: "quantity = numerical value × unit",
    reasoning: "Time is an SI base quantity. Seconds measure duration; there is no direction attached to the record.",
  },
  {
    id: "speed",
    label: "Speed",
    record: "12 m s^-1",
    classification: "derived",
    directionKind: "scalar",
    dimension: "L T^-1",
    formula: "speed = distance ÷ time, so unit = m ÷ s = m s^-1",
    reasoning: "Speed is built from length and time. It has magnitude but no direction, so it is scalar.",
  },
  {
    id: "acceleration",
    label: "Acceleration",
    record: "9.8 m s^-2 downward",
    classification: "derived",
    directionKind: "vector",
    dimension: "L T^-2",
    formula: "acceleration = change in velocity ÷ time, so unit = (m s^-1) ÷ s = m s^-2",
    reasoning: "Acceleration is derived from velocity and time. In mechanics it needs direction, so the downward part matters.",
  },
  {
    id: "force",
    label: "Force",
    record: "6.0 N to the right",
    classification: "derived",
    directionKind: "vector",
    dimension: "M L T^-2",
    formula: "force = mass × acceleration, so unit = kg × m s^-2 = kg m s^-2 = N",
    reasoning: "Force is not a base quantity. It is derived from mass and acceleration, and direction changes the physical effect.",
  },
  {
    id: "metre-unit",
    label: "metre symbol",
    record: "m",
    classification: "unit",
    directionKind: "not-applicable",
    dimension: "unit for L",
    formula: "measurement needs quantity + value + unit",
    reasoning: "The symbol m is a unit, not a physical quantity by itself. It becomes part of a measurement only with a quantity and value.",
  },
  {
    id: "bare-number",
    label: "Bare number",
    record: "9.8",
    classification: "number",
    directionKind: "not-applicable",
    dimension: "none stated",
    formula: "number alone is not a measurement",
    reasoning: "The number may be useful, but without a quantity and unit it does not say whether the record is length, acceleration, or something else.",
  },
];

const equationChecks: readonly EquationCheck[] = [
  {
    id: "distance-speed-time",
    statement: "distance = speed × time",
    leftUnit: "m",
    rightUnit: "(m s^-1)(s) = m",
    verdict: "consistent",
    reasoning: "Both sides reduce to length, so the equation passes the unit check.",
  },
  {
    id: "acceleration-speed-time",
    statement: "acceleration = speed × time",
    leftUnit: "m s^-2",
    rightUnit: "(m s^-1)(s) = m",
    verdict: "inconsistent",
    reasoning: "The left side is acceleration but the right side reduces to length, so the equation cannot be generally correct.",
  },
] as const;

const optionButtonClass = (isSelected: boolean, isCorrect: boolean | null): string => {
  if (isCorrect === null) return isSelected ? "unit-choice unit-choice--selected" : "unit-choice";
  if (!isSelected) return "unit-choice";
  return isCorrect ? "unit-choice unit-choice--correct" : "unit-choice unit-choice--wrong";
};

const scoreChoices = (choices: Readonly<Record<string, LearnerChoice>>): number =>
  cards.reduce((total, card) => {
    const choice = choices[card.id];
    const classificationPoint = choice?.classification === card.classification ? 1 : 0;
    const directionPoint = choice?.directionKind === card.directionKind ? 1 : 0;
    return total + classificationPoint + directionPoint;
  }, 0);

const isComplete = (choices: Readonly<Record<string, LearnerChoice>>): boolean =>
  cards.every((card) => choices[card.id]?.classification !== undefined && choices[card.id]?.directionKind !== undefined);

export const classifyQuantityCard = (
  cardId: string,
  classification: Classification,
  directionKind: DirectionKind,
): boolean => {
  const card = cards.find((candidate) => candidate.id === cardId);
  return card?.classification === classification && card.directionKind === directionKind;
};

export const UnitClassificationLab = () => {
  const [choices, setChoices] = useState<Readonly<Record<string, LearnerChoice>>>({});
  const [activeCardId, setActiveCardId] = useState("acceleration");
  const activeCard = cards.find((card) => card.id === activeCardId) ?? cards[0];
  const score = useMemo(() => scoreChoices(choices), [choices]);
  const complete = useMemo(() => isComplete(choices), [choices]);
  const total = cards.length * 2;

  const chooseClassification = (cardId: string, classification: Classification) => {
    setChoices((current) => ({
      ...current,
      [cardId]: { ...current[cardId], classification },
    }));
  };

  const chooseDirection = (cardId: string, directionKind: DirectionKind) => {
    setChoices((current) => ({
      ...current,
      [cardId]: { ...current[cardId], directionKind },
    }));
  };

  return (
    <PredictionGate
      packageId={physicalQuantitiesPackageId}
      predict={unitClassificationPredict}
      simId={unitClassificationSimId}
    >
      <section aria-label="Unit classification lab" className="unit-lab">
        <div className="unit-lab__intro">
          <p className="meta-line">card wall</p>
          <h3>Sort the record, then check the unit logic</h3>
          <p>
            A measurement is not just a number. Classify each record by the kind of quantity it names and whether direction is part of its meaning.
          </p>
        </div>

        <div className="unit-card-grid" aria-label="Quantity cards">
          {cards.map((card) => {
            const choice = choices[card.id];
            const cardComplete = choice?.classification !== undefined && choice.directionKind !== undefined;
            const cardCorrect = cardComplete && choice.classification === card.classification && choice.directionKind === card.directionKind;
            return (
              <button
                aria-pressed={card.id === activeCard.id}
                className={card.id === activeCard.id ? "unit-card unit-card--active" : "unit-card"}
                key={card.id}
                onClick={() => setActiveCardId(card.id)}
                type="button"
              >
                <span>{card.label}</span>
                <strong>{card.record}</strong>
                <small>{cardComplete ? (cardCorrect ? "ready" : "revise") : "unsorted"}</small>
              </button>
            );
          })}
        </div>

        <section aria-label="Observation unlocked" className="unit-workbench">
          <div className="unit-workbench__card">
            <p className="meta-line">active record</p>
            <h3>{activeCard.label}</h3>
            <p className="unit-record">{activeCard.record}</p>
            <p>{activeCard.reasoning}</p>
          </div>

          <div className="unit-choice-panel" aria-label="Classification choices">
            <h4>1. What kind of record is it?</h4>
            <div className="unit-choice-row">
              {(Object.keys(classificationLabels) as readonly Classification[]).map((classification) => {
                const selected = choices[activeCard.id]?.classification === classification;
                const revealed = choices[activeCard.id]?.classification !== undefined;
                const correct = revealed && selected ? classification === activeCard.classification : null;
                return (
                  <button
                    className={optionButtonClass(selected, correct)}
                    key={classification}
                    onClick={() => chooseClassification(activeCard.id, classification)}
                    type="button"
                  >
                    {classificationLabels[classification]}
                  </button>
                );
              })}
            </div>

            <h4>2. Does direction belong to the quantity?</h4>
            <div className="unit-choice-row">
              {(Object.keys(directionLabels) as readonly DirectionKind[]).map((directionKind) => {
                const selected = choices[activeCard.id]?.directionKind === directionKind;
                const revealed = choices[activeCard.id]?.directionKind !== undefined;
                const correct = revealed && selected ? directionKind === activeCard.directionKind : null;
                return (
                  <button
                    className={optionButtonClass(selected, correct)}
                    key={directionKind}
                    onClick={() => chooseDirection(activeCard.id, directionKind)}
                    type="button"
                  >
                    {directionLabels[directionKind]}
                  </button>
                );
              })}
            </div>
          </div>

          <section className="formula-panel unit-formula" aria-label="Formula used">
            <h3>Formula or unit reasoning</h3>
            <p className="formula">{activeCard.formula}</p>
            <p>
              Dimension check: <strong>{activeCard.dimension}</strong>
            </p>
          </section>

          <section className="unit-equation-panel" aria-label="Equation checks">
            <h3>Impossible-equation detector</h3>
            <div className="unit-equation-grid">
              {equationChecks.map((check) => (
                <article className="unit-equation" data-verdict={check.verdict} key={check.id}>
                  <h4>{check.statement}</h4>
                  <p>
                    Left: {check.leftUnit}; right: {check.rightUnit}
                  </p>
                  <strong>{check.verdict === "consistent" ? "Unit-consistent" : "Unit mismatch"}</strong>
                  <p>{check.reasoning}</p>
                </article>
              ))}
            </div>
          </section>

          <aside className="unit-score" aria-label="Lab score">
            <strong>{score}/{total}</strong>
            <span>{complete ? "All cards attempted" : "Keep sorting the card wall"}</span>
          </aside>
        </section>
      </section>
    </PredictionGate>
  );
};

export default UnitClassificationLab;
