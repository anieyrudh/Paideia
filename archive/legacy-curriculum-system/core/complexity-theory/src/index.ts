import {
  err,
  ok,
  type Brand,
  type KernelResult,
} from "@paideia/shared";

export const complexityTolerance = {
  default: 1e-9,
  tight: 1e-12,
  loose: 1e-6,
} as const;

export type FiniteWord = Brand<string, "FiniteWord">;
export type LanguageDecision = "accept" | "reject";

export interface FiniteLanguageMembershipInput {
  readonly word: FiniteWord;
  readonly acceptedWords: readonly FiniteWord[];
}

export interface FiniteLanguageMembershipResult {
  readonly word: FiniteWord;
  readonly decision: LanguageDecision;
}

export interface FiniteVerifierPair {
  readonly instance: FiniteWord;
  readonly certificate: FiniteWord;
}

export interface FiniteVerifierInput {
  readonly instance: FiniteWord;
  readonly certificate: FiniteWord;
  readonly acceptingPairs: readonly FiniteVerifierPair[];
}

export interface FiniteVerifierResult {
  readonly instance: FiniteWord;
  readonly certificate: FiniteWord;
  readonly decision: LanguageDecision;
}

export interface FiniteReductionSample {
  readonly sourceWord: FiniteWord;
  readonly targetWord: FiniteWord;
  readonly sourceDecision: LanguageDecision;
  readonly targetDecision: LanguageDecision;
}

export interface ReductionCounterexample {
  readonly sourceWord: FiniteWord;
  readonly targetWord: FiniteWord;
  readonly sourceDecision: LanguageDecision;
  readonly targetDecision: LanguageDecision;
}

export interface FiniteReductionEvidenceInput {
  readonly reductionName: string;
  readonly samples: readonly FiniteReductionSample[];
}

export interface FiniteReductionEvidenceResult {
  readonly reductionName: string;
  readonly sampleCount: number;
  readonly preservesMembership: boolean;
  readonly counterexamples: readonly ReductionCounterexample[];
}

export const finiteWord = (value: string): KernelResult<FiniteWord> => {
  if (typeof value !== "string") {
    return err("precondition-violated", "finiteWord value must be a string");
  }
  return value.length > 0
    ? ok(value as FiniteWord)
    : err("precondition-violated", "finiteWord value must not be empty");
};

const finiteString = (value: string, label: string): KernelResult<void> =>
  value.length > 0
    ? ok(undefined)
    : err("precondition-violated", `${label} must not be empty`);

const validDecision = (value: LanguageDecision, label: string): KernelResult<void> =>
  value === "accept" || value === "reject"
    ? ok(undefined)
    : err("precondition-violated", `${label} must be accept or reject`);

const wordKey = (word: FiniteWord): string => word;

export const decideFiniteLanguageMembership = (
  input: FiniteLanguageMembershipInput,
): KernelResult<FiniteLanguageMembershipResult> => {
  const word = finiteString(input.word, "word");
  if (!word.ok) return word;
  const accepted = new Set<string>();
  for (const [index, acceptedWord] of input.acceptedWords.entries()) {
    const valid = finiteString(acceptedWord, `acceptedWords[${index}]`);
    if (!valid.ok) return valid;
    accepted.add(wordKey(acceptedWord));
  }

  return ok(Object.freeze({
    word: input.word,
    decision: accepted.has(wordKey(input.word)) ? "accept" : "reject",
  }));
};

export const verifyFiniteCertificate = (
  input: FiniteVerifierInput,
): KernelResult<FiniteVerifierResult> => {
  const instance = finiteString(input.instance, "instance");
  if (!instance.ok) return instance;
  const certificate = finiteString(input.certificate, "certificate");
  if (!certificate.ok) return certificate;

  let accepts = false;
  for (const [index, pair] of input.acceptingPairs.entries()) {
    const pairInstance = finiteString(pair.instance, `acceptingPairs[${index}].instance`);
    if (!pairInstance.ok) return pairInstance;
    const pairCertificate = finiteString(
      pair.certificate,
      `acceptingPairs[${index}].certificate`,
    );
    if (!pairCertificate.ok) return pairCertificate;
    accepts =
      accepts ||
      (pair.instance === input.instance && pair.certificate === input.certificate);
  }

  return ok(Object.freeze({
    instance: input.instance,
    certificate: input.certificate,
    decision: accepts ? "accept" : "reject",
  }));
};

export const checkFiniteManyOneReductionEvidence = (
  input: FiniteReductionEvidenceInput,
): KernelResult<FiniteReductionEvidenceResult> => {
  if (input.reductionName.trim().length === 0) {
    return err("precondition-violated", "reductionName must not be blank");
  }
  if (input.samples.length === 0) {
    return err("precondition-violated", "samples must not be empty");
  }

  const counterexamples: ReductionCounterexample[] = [];
  for (const [index, sample] of input.samples.entries()) {
    const source = finiteString(sample.sourceWord, `samples[${index}].sourceWord`);
    if (!source.ok) return source;
    const target = finiteString(sample.targetWord, `samples[${index}].targetWord`);
    if (!target.ok) return target;
    const sourceDecision = validDecision(sample.sourceDecision, `samples[${index}].sourceDecision`);
    if (!sourceDecision.ok) return sourceDecision;
    const targetDecision = validDecision(sample.targetDecision, `samples[${index}].targetDecision`);
    if (!targetDecision.ok) return targetDecision;
    if (sample.sourceDecision !== sample.targetDecision) {
      counterexamples.push(Object.freeze({
        sourceWord: sample.sourceWord,
        targetWord: sample.targetWord,
        sourceDecision: sample.sourceDecision,
        targetDecision: sample.targetDecision,
      }));
    }
  }

  return ok(Object.freeze({
    reductionName: input.reductionName,
    sampleCount: input.samples.length,
    preservesMembership: counterexamples.length === 0,
    counterexamples: Object.freeze([...counterexamples]),
  }));
};
