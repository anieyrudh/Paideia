import {
  err,
  ok,
  type ConceptId,
  type KernelResult,
  type Probability,
} from "@paideia/shared";
import {
  boundedEstimate,
  clampProbability,
  probabilityConstant,
  toProbability,
  EPSILON,
} from "./probability.js";

export interface BKTParameters {
  readonly pInit: Probability;
  readonly pLearn: Probability;
  readonly pSlip: Probability;
  readonly pGuess: Probability;
}

export interface MasteryState {
  readonly conceptId: ConceptId;
  readonly pMastery: Probability;
  readonly evidenceCount: number;
  readonly lastUpdated: Date;
}

export interface Evidence {
  readonly conceptId: ConceptId;
  readonly correct: boolean;
  readonly observedAt: Date;
  readonly itemId?: string;
}

export const defaultParameters: BKTParameters = {
  pInit: probabilityConstant(0.3),
  pLearn: probabilityConstant(0.15),
  pSlip: probabilityConstant(0.1),
  pGuess: probabilityConstant(0.2),
};

const asNumber = (p: Probability): number => p;

const validateDate = (date: Date, label: string): KernelResult<void> =>
  Number.isFinite(date.getTime())
    ? ok(undefined)
    : err("precondition-violated", `${label} must be a valid Date`);

const validateParameters = (
  params: BKTParameters,
): KernelResult<BKTParameters> => {
  const entries = [
    ["pInit", params.pInit],
    ["pLearn", params.pLearn],
    ["pSlip", params.pSlip],
    ["pGuess", params.pGuess],
  ] as const;

  for (const [label, value] of entries) {
    const result = toProbability(value, label);
    if (!result.ok) return result;
  }

  return ok(params);
};

const observationLikelihood = (
  mastered: boolean,
  correct: boolean,
  params: BKTParameters,
): number => {
  if (mastered) {
    return correct ? 1 - asNumber(params.pSlip) : asNumber(params.pSlip);
  }

  return correct ? asNumber(params.pGuess) : 1 - asNumber(params.pGuess);
};

const posteriorAfterObservation = (
  priorMastery: number,
  correct: boolean,
  params: BKTParameters,
): KernelResult<number> => {
  const masteredLikelihood = observationLikelihood(true, correct, params);
  const unmasteredLikelihood = observationLikelihood(false, correct, params);
  const numerator = priorMastery * masteredLikelihood;
  const denominator =
    numerator + (1 - priorMastery) * unmasteredLikelihood;

  if (denominator <= 0) {
    return err(
      "numerical-instability",
      "BKT update has zero observation likelihood denominator",
    );
  }

  return ok(numerator / denominator);
};

export const updateMastery = (
  prior: MasteryState,
  evidence: Evidence,
  params: BKTParameters = defaultParameters,
): KernelResult<MasteryState> => {
  if (prior.conceptId !== evidence.conceptId) {
    return err(
      "precondition-violated",
      "Evidence conceptId must match the prior mastery conceptId",
    );
  }

  if (!Number.isInteger(prior.evidenceCount) || prior.evidenceCount < 0) {
    return err(
      "precondition-violated",
      `evidenceCount must be a non-negative integer, got ${prior.evidenceCount}`,
    );
  }

  const priorProbability = toProbability(prior.pMastery, "prior.pMastery");
  if (!priorProbability.ok) return priorProbability;

  const priorDate = validateDate(prior.lastUpdated, "prior.lastUpdated");
  if (!priorDate.ok) return priorDate;

  const evidenceDate = validateDate(evidence.observedAt, "evidence.observedAt");
  if (!evidenceDate.ok) return evidenceDate;

  const validParams = validateParameters(params);
  if (!validParams.ok) return validParams;

  const observedPosterior = posteriorAfterObservation(
    prior.pMastery,
    evidence.correct,
    params,
  );
  if (!observedPosterior.ok) return observedPosterior;

  const learned =
    observedPosterior.value +
    (1 - observedPosterior.value) * asNumber(params.pLearn);
  const pMastery = toProbability(learned, "posterior mastery");
  if (!pMastery.ok) return pMastery;

  return ok({
    conceptId: prior.conceptId,
    pMastery: pMastery.value,
    evidenceCount: prior.evidenceCount + 1,
    lastUpdated: new Date(evidence.observedAt.getTime()),
  });
};

export const predictMastery = (
  state: MasteryState,
  params: BKTParameters = defaultParameters,
): Probability =>
  clampProbability(
    asNumber(state.pMastery) * (1 - asNumber(params.pSlip)) +
      (1 - asNumber(state.pMastery)) * asNumber(params.pGuess),
  );

interface ForwardBackward {
  readonly gammaMastered: readonly number[];
  readonly gammaUnmastered: readonly number[];
  readonly xiUnmasteredToMastered: readonly number[];
  readonly xiUnmastered: readonly number[];
}

const sortEvidence = (history: readonly Evidence[]): readonly Evidence[] =>
  [...history].sort((a, b) => {
    const byTime = a.observedAt.getTime() - b.observedAt.getTime();
    if (byTime !== 0) return byTime;

    const byConcept = String(a.conceptId).localeCompare(String(b.conceptId));
    if (byConcept !== 0) return byConcept;

    return (a.itemId ?? "").localeCompare(b.itemId ?? "");
  });

const forwardBackward = (
  observations: readonly boolean[],
  params: BKTParameters,
): KernelResult<ForwardBackward> => {
  const n = observations.length;
  const alphaU = new Array<number>(n);
  const alphaM = new Array<number>(n);
  const betaU = new Array<number>(n).fill(1);
  const betaM = new Array<number>(n).fill(1);
  const scale = new Array<number>(n);

  const initialU = 1 - asNumber(params.pInit);
  const initialM = asNumber(params.pInit);
  const firstCorrect = observations[0];
  if (firstCorrect === undefined) {
    return err("precondition-violated", "BKT fit requires observations");
  }

  alphaU[0] = initialU * observationLikelihood(false, firstCorrect, params);
  alphaM[0] = initialM * observationLikelihood(true, firstCorrect, params);
  scale[0] = (alphaU[0] ?? 0) + (alphaM[0] ?? 0);
  if ((scale[0] ?? 0) <= 0) {
    return err("numerical-instability", "BKT fit has zero initial likelihood");
  }
  alphaU[0] = (alphaU[0] ?? 0) / (scale[0] ?? 1);
  alphaM[0] = (alphaM[0] ?? 0) / (scale[0] ?? 1);

  for (let t = 1; t < n; t += 1) {
    const correct = observations[t];
    if (correct === undefined) {
      return err("precondition-violated", "Observation index missing");
    }

    const fromUToU = (alphaU[t - 1] ?? 0) * (1 - asNumber(params.pLearn));
    const fromUToM = (alphaU[t - 1] ?? 0) * asNumber(params.pLearn);
    const fromMToM = alphaM[t - 1] ?? 0;
    alphaU[t] = fromUToU * observationLikelihood(false, correct, params);
    alphaM[t] =
      (fromUToM + fromMToM) * observationLikelihood(true, correct, params);
    scale[t] = (alphaU[t] ?? 0) + (alphaM[t] ?? 0);
    if ((scale[t] ?? 0) <= 0) {
      return err("numerical-instability", "BKT fit has zero likelihood");
    }
    alphaU[t] = (alphaU[t] ?? 0) / (scale[t] ?? 1);
    alphaM[t] = (alphaM[t] ?? 0) / (scale[t] ?? 1);
  }

  for (let t = n - 2; t >= 0; t -= 1) {
    const nextCorrect = observations[t + 1];
    if (nextCorrect === undefined) {
      return err("precondition-violated", "Next observation index missing");
    }

    const nextScale = scale[t + 1] ?? 1;
    betaU[t] =
      ((1 - asNumber(params.pLearn)) *
        observationLikelihood(false, nextCorrect, params) *
        (betaU[t + 1] ?? 1) +
        asNumber(params.pLearn) *
          observationLikelihood(true, nextCorrect, params) *
          (betaM[t + 1] ?? 1)) /
      nextScale;
    betaM[t] =
      (observationLikelihood(true, nextCorrect, params) *
        (betaM[t + 1] ?? 1)) /
      nextScale;
  }

  const gammaMastered = new Array<number>(n);
  const gammaUnmastered = new Array<number>(n);
  for (let t = 0; t < n; t += 1) {
    const unmastered = (alphaU[t] ?? 0) * (betaU[t] ?? 1);
    const mastered = (alphaM[t] ?? 0) * (betaM[t] ?? 1);
    const total = unmastered + mastered;
    if (total <= 0) {
      return err("numerical-instability", "BKT fit has zero posterior mass");
    }
    gammaUnmastered[t] = unmastered / total;
    gammaMastered[t] = mastered / total;
  }

  const xiUnmasteredToMastered = new Array<number>(Math.max(0, n - 1));
  const xiUnmastered = new Array<number>(Math.max(0, n - 1));
  for (let t = 0; t < n - 1; t += 1) {
    const nextCorrect = observations[t + 1];
    if (nextCorrect === undefined) {
      return err("precondition-violated", "Next observation index missing");
    }

    const uu =
      (alphaU[t] ?? 0) *
      (1 - asNumber(params.pLearn)) *
      observationLikelihood(false, nextCorrect, params) *
      (betaU[t + 1] ?? 1);
    const um =
      (alphaU[t] ?? 0) *
      asNumber(params.pLearn) *
      observationLikelihood(true, nextCorrect, params) *
      (betaM[t + 1] ?? 1);
    const mm =
      (alphaM[t] ?? 0) *
      observationLikelihood(true, nextCorrect, params) *
      (betaM[t + 1] ?? 1);
    const total = uu + um + mm;
    if (total <= 0) {
      return err("numerical-instability", "BKT fit has zero transition mass");
    }
    xiUnmasteredToMastered[t] = um / total;
    xiUnmastered[t] = (uu + um) / total;
  }

  return ok({
    gammaMastered,
    gammaUnmastered,
    xiUnmasteredToMastered,
    xiUnmastered,
  });
};

export const fitParameters = (
  history: readonly Evidence[],
): KernelResult<BKTParameters> => {
  if (history.length < 2) {
    return err(
      "precondition-violated",
      "BKT parameter fitting requires at least two evidence events",
    );
  }

  for (const evidence of history) {
    const validDate = validateDate(evidence.observedAt, "evidence.observedAt");
    if (!validDate.ok) return validDate;
  }

  const observations = sortEvidence(history).map((evidence) => evidence.correct);
  let params = defaultParameters;

  for (let iteration = 0; iteration < 25; iteration += 1) {
    const fb = forwardBackward(observations, params);
    if (!fb.ok) return fb;

    const initialMastered = fb.value.gammaMastered[0] ?? asNumber(params.pInit);
    const unmasteredMass = fb.value.gammaUnmastered.reduce(
      (sum, value) => sum + value,
      0,
    );
    const masteredMass = fb.value.gammaMastered.reduce(
      (sum, value) => sum + value,
      0,
    );
    const correctUnmasteredMass = observations.reduce(
      (sum, correct, index) =>
        sum + (correct ? (fb.value.gammaUnmastered[index] ?? 0) : 0),
      0,
    );
    const incorrectMasteredMass = observations.reduce(
      (sum, correct, index) =>
        sum + (!correct ? (fb.value.gammaMastered[index] ?? 0) : 0),
      0,
    );
    const transitionFromUnmasteredMass = fb.value.xiUnmastered.reduce(
      (sum, value) => sum + value,
      0,
    );
    const transitionLearnMass = fb.value.xiUnmasteredToMastered.reduce(
      (sum, value) => sum + value,
      0,
    );

    params = {
      pInit: boundedEstimate(initialMastered),
      pLearn: boundedEstimate(
        transitionFromUnmasteredMass > EPSILON
          ? transitionLearnMass / transitionFromUnmasteredMass
          : asNumber(params.pLearn),
      ),
      pSlip: boundedEstimate(
        masteredMass > EPSILON
          ? incorrectMasteredMass / masteredMass
          : asNumber(params.pSlip),
      ),
      pGuess: boundedEstimate(
        unmasteredMass > EPSILON
          ? correctUnmasteredMass / unmasteredMass
          : asNumber(params.pGuess),
      ),
    };
  }

  return ok(params);
};
