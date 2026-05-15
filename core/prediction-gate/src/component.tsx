import { useState, type FormEvent, type ReactNode } from "react";
import type { TPredictSpec } from "@paideia/content-schema";
import type { KernelResult } from "@paideia/shared";
import type { PredictionCommit, PredictionScope } from "./storage.js";
import { validatePrediction } from "./validation.js";
import { usePredictionGate } from "./usePredictionGate.js";

export interface PredictionGateProps {
  readonly predict: TPredictSpec;
  readonly packageId: string;
  readonly simId: PredictionScope;
  readonly onCommit?: (prediction: PredictionCommit) => void;
  readonly children: ReactNode;
}

const parseValue = (predict: TPredictSpec, raw: string): unknown => {
  switch (predict.commit_format.kind) {
    case "value":
      return Number(raw);
    case "ranking":
      return raw
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
    case "multiple-choice":
    case "freetext":
    case "sketch":
      return raw;
  }
};

const formatHint = (predict: TPredictSpec): string => {
  switch (predict.commit_format.kind) {
    case "value":
      return predict.commit_format.unit
        ? `Enter a finite number in ${predict.commit_format.unit}.`
        : "Enter a finite number.";
    case "ranking":
      return `Enter each option once, comma-separated: ${predict.commit_format.options.join(", ")}`;
    case "multiple-choice":
      return "Choose one option.";
    case "freetext":
      return `Write up to ${predict.commit_format.max_length} characters.`;
    case "sketch":
      return predict.commit_format.canvas_hint ?? "Describe or encode your sketch.";
  }
};

const CommitControl = ({
  predict,
  rawValue,
  setRawValue,
}: {
  readonly predict: TPredictSpec;
  readonly rawValue: string;
  readonly setRawValue: (value: string) => void;
}) => {
  if (predict.commit_format.kind === "multiple-choice") {
    return (
      <fieldset>
        <legend>Prediction</legend>
        {predict.commit_format.options.map((option) => (
          <label key={option}>
            <input
              checked={rawValue === option}
              name="prediction-choice"
              onChange={() => setRawValue(option)}
              type="radio"
              value={option}
            />
            {option}
          </label>
        ))}
      </fieldset>
    );
  }

  if (predict.commit_format.kind === "freetext" || predict.commit_format.kind === "sketch") {
    return (
      <label>
        Prediction
        <textarea
          onChange={(event) => setRawValue(event.currentTarget.value)}
          value={rawValue}
        />
      </label>
    );
  }

  return (
    <label>
      Prediction
      <input
        onChange={(event) => setRawValue(event.currentTarget.value)}
        type={predict.commit_format.kind === "value" ? "number" : "text"}
        value={rawValue}
      />
    </label>
  );
};

export const PredictionGate = ({
  predict,
  packageId,
  simId,
  onCommit,
  children,
}: PredictionGateProps) => {
  const gate = usePredictionGate(packageId, simId);
  const [rawValue, setRawValue] = useState("");
  const [rationale, setRationale] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (gate.revealed) return <>{children}</>;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const prediction: PredictionCommit = {
      value: parseValue(predict, rawValue),
      rationale,
    };

    const valid = validatePrediction(predict, prediction);
    if (!valid.ok) {
      setError(valid.error.message);
      return;
    }

    const committed: KernelResult<void> = gate.commit(prediction);
    if (!committed.ok) {
      setError(committed.error.message);
      return;
    }

    setError(null);
    onCommit?.(prediction);
  };

  return (
    <form aria-label="Prediction gate" onSubmit={submit}>
      <p>{predict.prompt}</p>
      <p>{formatHint(predict)}</p>
      <CommitControl predict={predict} rawValue={rawValue} setRawValue={setRawValue} />
      <label>
        Rationale
        <textarea
          aria-required={predict.rationale_required}
          onChange={(event) => setRationale(event.currentTarget.value)}
          value={rationale}
        />
      </label>
      {error === null ? null : <p role="alert">{error}</p>}
      <button type="submit">Commit prediction</button>
    </form>
  );
};
