import { useMemo, useState } from "react";
import type { TPredictSpec } from "@paideia/content-schema";
import { PredictionGate } from "@paideia/prediction-gate";

export const physicalQuantitiesPackageId = "physical-quantities-and-units";
export const unitClassificationSimId = "unit-classification-lab";

export const quantityUnitPredict: TPredictSpec = {
  prompt:
    "Before opening the unit lab, which kind of mistake do you think you are most likely to make when reading a measurement or equation?",
  commit_format: {
    kind: "multiple-choice",
    options: [
      "Trusting numbers before units",
      "Mixing up quantity and unit",
      "Treating a derived unit as magic",
      "Ignoring direction when it matters",
    ],
  },
  rationale_required: true,
};

type QuantityFamily = "base" | "derived";
type DirectionKind = "scalar" | "vector";

export interface QuantityCard {
  readonly id: string;
  readonly name: string;
  readonly example: string;
  readonly family: QuantityFamily;
  readonly directionKind: DirectionKind;
  readonly siUnit: string;
  readonly dimension: string;
  readonly reasoning: string;
  readonly check: string;
}

export interface EquationCard {
  readonly id: string;
  readonly statement: string;
  readonly leftDimension: string;
  readonly rightDimension: string;
  readonly verdict: "consistent" | "not-consistent";
  readonly reasoning: string;
}

export const quantityCards = [
  {
    id: "length",
    name: "Length",
    example: "desk width = 1.20 m",
    family: "base",
    directionKind: "scalar",
    siUnit: "m",
    dimension: "[L]",
    reasoning: "Length is one of the SI base quantities, so its unit is a starting unit rather than a unit built from other units.",
    check: "quantity = value × unit → width = 1.20 × m",
  },
  {
    id: "time",
    name: "Time interval",
    example: "fall time = 0.45 s",
    family: "base",
    directionKind: "scalar",
    siUnit: "s",
    dimension: "[T]",
    reasoning: "Time is an SI base quantity. A number such as 0.45 is incomplete until the second is attached.",
    check: "quantity = value × unit → interval = 0.45 × s",
  },
  {
    id: "speed",
    name: "Speed",
    example: "runner speed = 6.0 m s⁻¹",
    family: "derived",
    directionKind: "scalar",
    siUnit: "m s⁻¹",
    dimension: "[L T⁻¹]",
    reasoning: "Speed is distance divided by time. It has size but no direction, so it is scalar and its unit is derived.",
    check: "speed = distance ÷ time → m ÷ s = m s⁻¹",
  },
  {
    id: "acceleration",
    name: "Acceleration",
    example: "free-fall acceleration = 9.8 m s⁻² downward",
    family: "derived",
    directionKind: "vector",
    siUnit: "m s⁻²",
    dimension: "[L T⁻²]",
    reasoning: "Acceleration is change in velocity per unit time. Direction matters, so the quantity is a vector.",
    check: "acceleration = velocity change ÷ time → (m s⁻¹) ÷ s = m s⁻²",
  },
  {
    id: "force",
    name: "Force",
    example: "push = 12 N east",
    family: "derived",
    directionKind: "vector",
    siUnit: "N = kg m s⁻²",
    dimension: "[M L T⁻²]",
    reasoning: "Force is mass times acceleration. The newton is shorthand for base units kg m s⁻².",
    check: "force = mass × acceleration → kg × m s⁻² = kg m s⁻²",
  },
] as const satisfies readonly QuantityCard[];

export const equationCards = [
  {
    id: "distance-speed-time",
    statement: "distance = speed × time",
    leftDimension: "[L]",
    rightDimension: "[L T⁻¹] × [T] = [L]",
    verdict: "consistent",
    reasoning: "The time unit cancels one per-second factor, so both sides describe length.",
  },
  {
    id: "acceleration-speed-time",
    statement: "acceleration = speed × time",
    leftDimension: "[L T⁻²]",
    rightDimension: "[L T⁻¹] × [T] = [L]",
    verdict: "not-consistent",
    reasoning: "The right side becomes length, not acceleration. Units rule this equation out before any numbers are substituted.",
  },
  {
    id: "force-mass-acceleration",
    statement: "force = mass × acceleration",
    leftDimension: "[M L T⁻²]",
    rightDimension: "[M] × [L T⁻²] = [M L T⁻²]",
    verdict: "consistent",
    reasoning: "Both sides reduce to kg m s⁻², so the units allow the equation.",
  },
] as const satisfies readonly EquationCard[];

const defaultQuantity = quantityCards[2];
const defaultEquation = equationCards[0];

export const countByFamily = (family: QuantityFamily): number =>
  quantityCards.filter((card) => card.family === family).length;

export const countByDirectionKind = (directionKind: DirectionKind): number =>
  quantityCards.filter((card) => card.directionKind === directionKind).length;

const findQuantity = (id: string): QuantityCard =>
  quantityCards.find((card) => card.id === id) ?? defaultQuantity;

const findEquation = (id: string): EquationCard =>
  equationCards.find((card) => card.id === id) ?? defaultEquation;

const verdictText = (verdict: EquationCard["verdict"]): string =>
  verdict === "consistent" ? "Dimensionally consistent" : "Not dimensionally consistent";

export const UnitClassificationLab = () => {
  const [quantityId, setQuantityId] = useState<string>(defaultQuantity.id);
  const [equationId, setEquationId] = useState<string>(defaultEquation.id);
  const activeQuantity = useMemo(() => findQuantity(quantityId), [quantityId]);
  const activeEquation = useMemo(() => findEquation(equationId), [equationId]);

  return (
    <PredictionGate
      packageId={physicalQuantitiesPackageId}
      predict={quantityUnitPredict}
      simId={unitClassificationSimId}
    >
      <section aria-label="Observation unlocked" className="unit-lab">
        <div className="unit-lab-hero">
          <p className="lab-kicker">Unit classification lab</p>
          <h3>Build the measurement before you trust the number.</h3>
          <p>
            Choose a quantity card, inspect whether it is base or derived, then test whether an equation can be true by comparing units on both sides.
          </p>
        </div>

        <section aria-labelledby="quantity-cards-title" className="quantity-card-grid">
          <div>
            <p className="lab-kicker">Quantity map</p>
            <h3 id="quantity-cards-title">Pick a quantity</h3>
          </div>
          <div className="quantity-card-buttons" role="list">
            {quantityCards.map((card) => (
              <button
                aria-pressed={activeQuantity.id === card.id}
                className="quantity-chip"
                key={card.id}
                onClick={() => setQuantityId(card.id)}
                type="button"
              >
                <span>{card.name}</span>
                <small>{card.siUnit}</small>
              </button>
            ))}
          </div>
        </section>

        <section aria-labelledby="passport-title" className="quantity-passport">
          <div>
            <p className="lab-kicker">Quantity passport</p>
            <h3 id="passport-title">{activeQuantity.name}</h3>
            <p>{activeQuantity.example}</p>
          </div>
          <dl className="passport-grid">
            <div>
              <dt>Base or derived?</dt>
              <dd>{activeQuantity.family}</dd>
            </div>
            <div>
              <dt>Scalar or vector?</dt>
              <dd>{activeQuantity.directionKind}</dd>
            </div>
            <div>
              <dt>SI unit</dt>
              <dd>{activeQuantity.siUnit}</dd>
            </div>
            <div>
              <dt>Dimension</dt>
              <dd>{activeQuantity.dimension}</dd>
            </div>
          </dl>
          <p>{activeQuantity.reasoning}</p>
          <section aria-label="Formula used" className="unit-formula-strip">
            <h4>Formula used</h4>
            <p>{activeQuantity.check}</p>
          </section>
        </section>

        <section aria-labelledby="sort-summary-title" className="sort-summary">
          <h3 id="sort-summary-title">What the deck contains</h3>
          <div className="sort-summary-grid">
            <p><strong>{countByFamily("base")}</strong> base quantities</p>
            <p><strong>{countByFamily("derived")}</strong> derived quantities</p>
            <p><strong>{countByDirectionKind("scalar")}</strong> scalar quantities</p>
            <p><strong>{countByDirectionKind("vector")}</strong> vector quantities</p>
          </div>
        </section>

        <section aria-labelledby="equation-title" className="equation-detector">
          <div>
            <p className="lab-kicker">Impossible-equation detector</p>
            <h3 id="equation-title">Do the units allow this equation?</h3>
          </div>
          <div className="equation-buttons" role="list">
            {equationCards.map((equation) => (
              <button
                aria-pressed={activeEquation.id === equation.id}
                className="equation-chip"
                key={equation.id}
                onClick={() => setEquationId(equation.id)}
                type="button"
              >
                {equation.statement}
              </button>
            ))}
          </div>
          <div className={`equation-verdict equation-verdict--${activeEquation.verdict}`}>
            <strong>{verdictText(activeEquation.verdict)}</strong>
            <p>Left side: {activeEquation.leftDimension}</p>
            <p>Right side: {activeEquation.rightDimension}</p>
            <p>{activeEquation.reasoning}</p>
          </div>
        </section>
      </section>
    </PredictionGate>
  );
};

export default UnitClassificationLab;
