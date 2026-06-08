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

  throw new Error("Unsupported prediction commit format.");
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

  throw new Error("Unsupported prediction commit format.");
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
        {predict.commit_format.options.map((option: string, index: number) => (
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

const checkpointStyle = {
  border: "1px solid color-mix(in srgb, currentColor 16%, transparent)",
  borderRadius: "0.75rem",
  display: "grid",
  gap: "0.75rem",
  marginBlockStart: "1rem",
  padding: "1rem",
} as const;

const checkpointHeaderStyle = {
  display: "grid",
  gap: "0.25rem",
} as const;

const checkpointKickerStyle = {
  fontSize: "0.78rem",
  fontWeight: 800,
  letterSpacing: "0.04em",
  margin: 0,
  textTransform: "uppercase",
} as const;

const fieldStackStyle = {
  display: "grid",
  gap: "0.65rem",
} as const;

const formatCommittedValue = (value: unknown): string => {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null) return "No value";
  return "Saved response";
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
    <>
      {children}
      {gate.committed && gate.prediction !== null ? (
        <section aria-label="Prediction checkpoint" style={checkpointStyle}>
          <div style={checkpointHeaderStyle}>
            <p style={checkpointKickerStyle}>Prediction checkpoint</p>
            <h2 style={{ margin: 0 }}>Saved prediction</h2>
          </div>
          <dl style={{ display: "grid", gap: "0.5rem", margin: 0 }}>
            <div>
              <dt>Prediction</dt>
              <dd>{formatCommittedValue(gate.prediction.value)}</dd>
            </div>
            <div>
              <dt>Rationale</dt>
              <dd>{gate.prediction.rationale}</dd>
            </div>
          </dl>
        </section>
      ) : (
        <form aria-label="Prediction checkpoint" onSubmit={submit} style={checkpointStyle}>
          <div style={checkpointHeaderStyle}>
            <p style={checkpointKickerStyle}>Prediction checkpoint</p>
            <h2 style={{ margin: 0 }}>Save your expectation</h2>
            <p style={{ margin: 0 }}>{predict.prompt}</p>
            <p style={{ margin: 0 }}>{formatHint(predict)}</p>
          </div>
          <div style={fieldStackStyle}>
            <CommitControl predict={predict} rawValue={rawValue} setRawValue={setRawValue} />
            <label>
              Rationale
              <textarea
                aria-required={predict.rationale_required}
                onChange={(event) => setRationale(event.currentTarget.value)}
                value={rationale}
              />
            </label>
          </div>
          {error === null ? null : <p role="alert">{error}</p>}
          <button type="submit">Commit prediction</button>
        </form>
      )}
    </>
  );
};
