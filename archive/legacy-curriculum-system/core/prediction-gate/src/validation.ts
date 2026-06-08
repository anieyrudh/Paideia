import type { TPredictSpec } from "@paideia/content-schema";
import { err, ok, type KernelResult } from "@paideia/shared";
import type { PredictionCommit } from "./storage.js";

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null;

const optionsContain = (
  options: readonly string[],
  value: unknown,
): value is string => typeof value === "string" && options.includes(value);

export const validatePrediction = (
  predict: TPredictSpec,
  prediction: PredictionCommit,
): KernelResult<void> => {
  if (predict.rationale_required && (prediction.rationale?.trim() ?? "") === "") {
    return err("precondition-violated", "A rationale is required before reveal");
  }

  switch (predict.commit_format.kind) {
    case "value":
      return typeof prediction.value === "number" && Number.isFinite(prediction.value)
        ? ok(undefined)
        : err("out-of-domain", "Prediction value must be a finite number");

    case "ranking": {
      if (!Array.isArray(prediction.value)) {
        return err("out-of-domain", "Ranking prediction must be an array");
      }
      const values = prediction.value;
      const options = predict.commit_format.options;
      const unique = new Set(values);
      const sameLength = values.length === options.length && unique.size === options.length;
      const onlyListed = values.every((value) => optionsContain(options, value));
      return sameLength && onlyListed
        ? ok(undefined)
        : err("out-of-domain", "Ranking prediction must order each listed option exactly once");
    }

    case "multiple-choice":
      return optionsContain(predict.commit_format.options, prediction.value)
        ? ok(undefined)
        : err("out-of-domain", "Multiple-choice prediction must be one listed option");

    case "freetext": {
      if (typeof prediction.value !== "string") {
        return err("out-of-domain", "Freetext prediction must be a string");
      }
      const text = prediction.value.trim();
      return text.length > 0 && text.length <= predict.commit_format.max_length
        ? ok(undefined)
        : err("out-of-domain", "Freetext prediction is empty or too long");
    }

    case "sketch":
      return typeof prediction.value === "string" || isRecord(prediction.value)
        ? ok(undefined)
        : err("out-of-domain", "Sketch prediction must be a string or object payload");
  }
};
