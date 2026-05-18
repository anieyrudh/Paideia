import { useMemo, useState } from "react";
import type { TPredictSpec } from "@paideia/content-schema";
import { PredictionGate } from "@paideia/prediction-gate";
import { ControlGroup, Selector } from "@paideia/ui-sim";

export const physicalQuantitiesPackageId = "physical-quantities-and-units";
export const physicalQuantitiesSimId = "unit-classification-lab";

export const unitClassificationPredict: TPredictSpec = {
  prompt:
    "A lab note says an acceleration is 9.8 m s^-1. Before opening the lab, what kind of mistake do you expect to find?",
  commit_format: {
    kind: "multiple-choice",
    options: [
      "The number is too large for an acceleration.",
      "The unit describes speed, not acceleration.",
      "The unit is acceptable because it contains metres and seconds.",
      "The issue is only the missing direction.",
    ],
    correct_index: 1,
  },
  rationale_required: true,
};

export type QuantityKind = "base" | "derived";
export type DirectionKind = "scalar" | "vector";

export interface QuantityCard {
  readonly id: string;
  readonly name: string;
  readonly symbol: string;
  readonly unit: string;
  readonly dimension: string;
  readonly kind: QuantityKind;
  readonly direction: DirectionKind;
  readonly reason: string;
}

export interface EquationCheck {
  readonly id: string;
  readonly label: string;
  readonly leftUnit: string;
  readonly rightUnit: string;
  readonly verdict: "consistent" | "inconsistent";
  readonly reasoning: string;
}

const quantityCards = [
  {
    id: "length",
    name: "Length",
    symbol: "l",
    unit: "m",
    dimension: "L",
    kind: "base",
    direction: "scalar",
    reason: "Length uses the metre as an SI base unit. It does not need direction unless the situation asks for displacement.",
  },
  {
    id: "time",
    name: "Time interval",
    symbol: "t",
    unit: "s",
    dimension: "T",
    kind: "base",
    direction: "scalar",
    reason: "Time is one of the SI base quantities, so its unit is not built from other physics units.",
  },
  {
    id: "velocity",
    name: "Velocity",
    symbol: "v",
    unit: "m s^-1",
    dimension: "L T^-1",
    kind: "derived",
    direction: "vector",
    reason: "Velocity is displacement divided by time, so its unit is derived and direction remains part of the quantity.",
  },
  {
    id: "acceleration",
    name: "Acceleration",
    symbol: "a",
    unit: "m s^-2",
    dimension: "L T^-2",
    kind: "derived",
    direction: "vector",
    reason: "Acceleration is change in velocity per unit time, so one more factor of per second is needed.",
  },
  {
    id: "mass",
    name: "Mass",
    symbol: "m",
    unit: "kg",
    dimension: "M",
    kind: "base",
    direction: "scalar",
    reason: "Mass uses the kilogram base unit and has no direction attached to it.",
  },
  {
    id: "force",
    name: "Force",
    symbol: "F",
    unit: "N = kg m s^-2",
    dimension: "M L T^-2",
    kind: "derived",
    direction: "vector",
    reason: "Force is derived from mass times acceleration, and its direction changes the effect on motion.",
  },
] as const satisfies readonly QuantityCard[];

const equationChecks = [
  {
    id: "speed",
    label: "speed = distance / time",
    leftUnit: "m s^-1",
    rightUnit: "m / s = m s^-1",
    verdict: "consistent",
    reasoning: "Both sides reduce to length per time, so the units allow the equation.",
  },
  {
    id: "acceleration",
    label: "acceleration = velocity / time",
    leftUnit: "m s^-2",
    rightUnit: "(m s^-1) / s = m s^-2",
    verdict: "consistent",
    reasoning: "Dividing velocity by another second gives acceleration units.",
  },
  {
    id: "bad-acceleration-note",
    label: "acceleration = 9.8 m s^-1",
    leftUnit: "m s^-2",
    rightUnit: "m s^-1",
    verdict: "inconsistent",
    reasoning: "The right side has only one factor of per second, so it describes speed units, not acceleration units.",
  },
  {
    id: "bad-sum",
    label: "distance = speed + time",
    leftUnit: "m",
    rightUnit: "m s^-1 + s",
    verdict: "inconsistent",
    reasoning: "A sum is only meaningful when every term has the same dimension; speed and time cannot be added.",
  },
] as const satisfies readonly EquationCheck[];

export const getQuantityCards = (): readonly QuantityCard[] => quantityCards;
export const getEquationChecks = (): readonly EquationCheck[] => equationChecks;

export const isCorrectClassification = (
  card: QuantityCard,
  kind: QuantityKind,
  direction: DirectionKind,
): boolean => card.kind === kind && card.direction === direction;

const quantityOptions = quantityCards.map((card) => ({ label: card.name, value: card }));
const equationOptions = equationChecks.map((check) => ({ label: check.label, value: check }));

const kindOptions = [
  { label: "Base quantity", value: "base" as const },
  { label: "Derived quantity", value: "derived" as const },
];

const directionOptions = [
  { label: "Scalar", value: "scalar" as const },
  { label: "Vector", value: "vector" as const },
];

const verdictLabel = (verdict: EquationCheck["verdict"]): string =>
  verdict === "consistent" ? "units agree" : "units clash";

export const UnitClassificationLab = () => {
  const [card, setCard] = useState<QuantityCard>(quantityCards[3]);
  const [kindGuess, setKindGuess] = useState<QuantityKind>("derived");
  const [directionGuess, setDirectionGuess] = useState<DirectionKind>("vector");
  const [equation, setEquation] = useState<EquationCheck>(equationChecks[2]);

  const classificationCorrect = useMemo(
    () => isCorrectClassification(card, kindGuess, directionGuess),
    [card, directionGuess, kindGuess],
  );

  return (
    <PredictionGate
      packageId={physicalQuantitiesPackageId}
      predict={unitClassificationPredict}
      simId={physicalQuantitiesSimId}
    >
      <section aria-label="Unit classification lab" className="unit-lab">
        <div className="unit-lab__control-card" aria-label="Choose a quantity">
          <p className="lab-kicker">Sort the measurement</p>
          <ControlGroup legend="Choose and classify">
            <Selector label="Quantity card" onChange={setCard} options={quantityOptions} value={card} />
            <Selector label="Quantity family" onChange={setKindGuess} options={kindOptions} value={kindGuess} />
            <Selector
              label="Direction needed?"
              onChange={setDirectionGuess}
              options={directionOptions}
              value={directionGuess}
            />
          </ControlGroup>
          <p className="unit-lab__hint">
            Ask whether the unit is fundamental, whether it is built from other units, and whether
            direction is part of the physical meaning.
          </p>
        </div>

        <div className="unit-lab__quantity-card" aria-label="Observation unlocked">
          <div>
            <p className="lab-kicker">Quantity card</p>
            <h3>{card.name}</h3>
            <p className="unit-lab__symbol">{card.symbol}</p>
          </div>
          <dl className="unit-lab__facts">
            <div>
              <dt>Unit</dt>
              <dd>{card.unit}</dd>
            </div>
            <div>
              <dt>Dimension</dt>
              <dd>{card.dimension}</dd>
            </div>
            <div>
              <dt>Classification</dt>
              <dd>
                {card.kind} · {card.direction}
              </dd>
            </div>
          </dl>
          <div className={classificationCorrect ? "unit-lab__badge good" : "unit-lab__badge check"}>
            {classificationCorrect ? "classification matches" : "try the other shelf"}
          </div>
          <p>{card.reason}</p>
        </div>

        <section className="unit-lab__equation" aria-label="Formula used">
          <div>
            <p className="lab-kicker">Equation check</p>
            <h3>Do the units allow it?</h3>
          </div>
          <Selector label="Equation to test" onChange={setEquation} options={equationOptions} value={equation} />
          <div className="unit-lab__balance" aria-label="Unit balance">
            <span>{equation.leftUnit}</span>
            <strong>{equation.verdict === "consistent" ? "=" : "≠"}</strong>
            <span>{equation.rightUnit}</span>
          </div>
          <p className={`unit-lab__verdict ${equation.verdict}`}>{verdictLabel(equation.verdict)}</p>
          <p>{equation.reasoning}</p>
        </section>
      </section>
    </PredictionGate>
  );
};

export default UnitClassificationLab;
