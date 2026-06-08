import { useId, type ChangeEvent } from "react";

import type {
  MasteryStatus,
  SearchResultSummary,
} from "./logic.js";

export interface HomeLinkProps {
  readonly href: string;
  readonly label: string;
  readonly currentLabel?: string;
  readonly className?: string;
}

export interface StatusBadgeProps {
  readonly label: string;
  readonly tone?: "neutral" | "ready" | "practice" | "blocked";
  readonly className?: string;
}

export interface CurriculumSearchProps {
  readonly value: string;
  readonly label: string;
  readonly placeholder?: string;
  readonly resultSummary: SearchResultSummary;
  readonly onChange: (value: string) => void;
  readonly className?: string;
}

export interface ModuleTabsProps {
  readonly modules: readonly string[];
  readonly selectedModule: string;
  readonly allLabel?: string;
  readonly label: string;
  readonly onChange: (module: string) => void;
  readonly className?: string;
}

export interface MasteryStatusToggleProps {
  readonly containerId: string;
  readonly label: string;
  readonly value: MasteryStatus;
  readonly onChange: (containerId: string, value: MasteryStatus) => void;
  readonly className?: string;
}

export const HomeLink = ({
  href,
  label,
  currentLabel,
  className,
}: HomeLinkProps) => (
  <a
    aria-label={currentLabel === undefined ? label : `${label}: ${currentLabel}`}
    className={className}
    href={href}
  >
    {label}
  </a>
);

export const StatusBadge = ({
  label,
  tone = "neutral",
  className,
}: StatusBadgeProps) => (
  <span className={className} data-tone={tone}>
    {label}
  </span>
);

export const CurriculumSearch = ({
  value,
  label,
  placeholder,
  resultSummary,
  onChange,
  className,
}: CurriculumSearchProps) => {
  const summaryId = useId();
  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.currentTarget.value);
  };

  return (
    <label className={className}>
      <span>{label}</span>
      <input
        aria-label={label}
        aria-describedby={summaryId}
        onChange={onInputChange}
        placeholder={placeholder}
        type="search"
        value={value}
      />
      <span id={summaryId} role="status">
        {resultSummary.label}
      </span>
    </label>
  );
};

export const ModuleTabs = ({
  modules,
  selectedModule,
  allLabel = "All modules",
  label,
  onChange,
  className,
}: ModuleTabsProps) => (
  <nav aria-label={label} className={className}>
    <button
      aria-pressed={selectedModule === "all"}
      type="button"
      onClick={() => onChange("all")}
    >
      {allLabel}
    </button>
    {modules.map((module) => (
      <button
        aria-pressed={selectedModule === module}
        key={module}
        type="button"
        onClick={() => onChange(module)}
      >
        {module}
      </button>
    ))}
  </nav>
);

export const MasteryStatusToggle = ({
  containerId,
  label,
  value,
  onChange,
  className,
}: MasteryStatusToggleProps) => (
  <fieldset className={className}>
    <legend>{label}</legend>
    {masteryToggleOptions.map((option) => (
      <button
        aria-pressed={value === option.value}
        key={option.value}
        type="button"
        onClick={() => onChange(containerId, option.value)}
      >
        {option.label}
      </button>
    ))}
  </fieldset>
);

const masteryToggleOptions: readonly {
  readonly value: MasteryStatus;
  readonly label: string;
}[] = [
  { value: "not-started", label: "Not started" },
  { value: "practicing", label: "Practice" },
  { value: "mastered", label: "Mastered" },
];
