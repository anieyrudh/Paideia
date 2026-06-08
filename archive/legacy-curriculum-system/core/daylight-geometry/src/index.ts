import {
  err,
  metres,
  ok,
  radians,
  type Brand,
  type KernelResult,
  type Metres,
  type Radians,
} from "@paideia/shared";

export const daylightGeometryTolerance = {
  default: 1e-9,
  tight: 1e-12,
  loose: 1e-6,
} as const;

export type DayOfYear = Brand<number, "DaylightGeometry.DayOfYear">;
export type SolarTimeHours = Brand<number, "DaylightGeometry.SolarTimeHours">;

export interface SolarPositionInput {
  readonly latitudeRadians: Radians;
  readonly dayOfYear: DayOfYear;
  readonly solarTimeHours: SolarTimeHours;
}

export interface SolarPosition {
  readonly altitudeRadians: Radians;
  readonly azimuthRadians: Radians;
  readonly declinationRadians: Radians;
  readonly hourAngleRadians: Radians;
  readonly daylight: boolean;
}

export interface ShadowInput extends SolarPositionInput {
  readonly objectHeightMetres: Metres;
}

export interface ShadowResult {
  readonly lengthMetres?: Metres;
  readonly directionAzimuthRadians: Radians;
  readonly daylight: boolean;
}

export interface WindowSunPathInput {
  readonly latitudeRadians: Radians;
  readonly dayOfYear: DayOfYear;
  readonly windowAzimuthRadians: Radians;
  readonly startSolarTimeHours: SolarTimeHours;
  readonly endSolarTimeHours: SolarTimeHours;
  readonly sampleCount: number;
}

export interface WindowSunPathSample extends SolarPosition {
  readonly solarTimeHours: SolarTimeHours;
  readonly incidenceCosine: number;
  readonly sunInFrontOfWindow: boolean;
}

const twoPi = 2 * Math.PI;
const axialTiltRadians = (23.44 * Math.PI) / 180;

export const dayOfYear = (value: number): KernelResult<DayOfYear> => {
  if (!Number.isInteger(value) || value < 1 || value > 366) {
    return err("out-of-domain", `dayOfYear must be an integer from 1 to 366, got ${value}`);
  }
  return ok(value as DayOfYear);
};

export const solarTimeHours = (value: number): KernelResult<SolarTimeHours> => {
  if (!Number.isFinite(value) || value < 0 || value > 24) {
    return err("out-of-domain", `solarTimeHours must be finite in [0, 24], got ${value}`);
  }
  return ok(value as SolarTimeHours);
};

export const solarDeclination = (day: DayOfYear): KernelResult<Radians> => {
  const validDay = dayOfYear(day);
  if (!validDay.ok) return validDay;
  const value = axialTiltRadians * Math.sin((twoPi * (validDay.value - 81)) / 365);
  const valid = finiteDerived(value, "declinationRadians");
  if (!valid.ok) return valid;
  return ok(radians(value));
};

export const solarPosition = (
  input: SolarPositionInput,
): KernelResult<SolarPosition> => {
  const validLatitude = validateLatitude(input.latitudeRadians);
  if (!validLatitude.ok) return validLatitude;
  const validTime = solarTimeHours(input.solarTimeHours);
  if (!validTime.ok) return validTime;
  const declination = solarDeclination(input.dayOfYear);
  if (!declination.ok) return declination;

  const hourAngleValue = ((validTime.value - 12) * Math.PI) / 12;
  const latitude = input.latitudeRadians;
  const altitudeValue = Math.asin(
    clamp(
      Math.sin(latitude) * Math.sin(declination.value) +
        Math.cos(latitude) * Math.cos(declination.value) * Math.cos(hourAngleValue),
      -1,
      1,
    ),
  );
  const rawAzimuth =
    Math.atan2(
      Math.sin(hourAngleValue),
      Math.cos(hourAngleValue) * Math.sin(latitude) -
        Math.tan(declination.value) * Math.cos(latitude),
    ) + Math.PI;
  const azimuthValue = normalizeRadians(rawAzimuth);

  for (const [label, value] of [
    ["hourAngleRadians", hourAngleValue],
    ["altitudeRadians", altitudeValue],
    ["azimuthRadians", azimuthValue],
  ] as const) {
    const valid = finiteDerived(value, label);
    if (!valid.ok) return valid;
  }

  return ok(
    Object.freeze({
      altitudeRadians: radians(altitudeValue),
      azimuthRadians: radians(azimuthValue),
      declinationRadians: declination.value,
      hourAngleRadians: radians(hourAngleValue),
      daylight: altitudeValue > 0,
    }),
  );
};

export const shadowLength = (input: ShadowInput): KernelResult<ShadowResult> => {
  const height = nonNegativeFinite(input.objectHeightMetres, "objectHeightMetres");
  if (!height.ok) return height;
  const position = solarPosition(input);
  if (!position.ok) return position;
  const direction = radians(normalizeRadians(position.value.azimuthRadians + Math.PI));
  if (!position.value.daylight || position.value.altitudeRadians <= 0) {
    return ok(Object.freeze({ directionAzimuthRadians: direction, daylight: false }));
  }
  const length = input.objectHeightMetres / Math.tan(position.value.altitudeRadians);
  const validLength = finiteDerived(length, "lengthMetres");
  if (!validLength.ok) return validLength;
  return ok(
    Object.freeze({
      lengthMetres: metres(Math.max(0, length)),
      directionAzimuthRadians: direction,
      daylight: true,
    }),
  );
};

export const windowSunPath = (
  input: WindowSunPathInput,
): KernelResult<readonly WindowSunPathSample[]> => {
  const validLatitude = validateLatitude(input.latitudeRadians);
  if (!validLatitude.ok) return validLatitude;
  const validDay = dayOfYear(input.dayOfYear);
  if (!validDay.ok) return validDay;
  const validWindow = finite(input.windowAzimuthRadians, "windowAzimuthRadians");
  if (!validWindow.ok) return validWindow;
  const start = solarTimeHours(input.startSolarTimeHours);
  if (!start.ok) return start;
  const end = solarTimeHours(input.endSolarTimeHours);
  if (!end.ok) return end;
  if (start.value > end.value) {
    return err("precondition-violated", "startSolarTimeHours must be <= endSolarTimeHours");
  }
  if (!Number.isInteger(input.sampleCount) || input.sampleCount < 2) {
    return err("precondition-violated", `sampleCount must be an integer >= 2, got ${input.sampleCount}`);
  }

  const samples: WindowSunPathSample[] = [];
  const span = end.value - start.value;
  for (let index = 0; index < input.sampleCount; index += 1) {
    const time = start.value + (span * index) / (input.sampleCount - 1);
    const position = solarPosition({
      latitudeRadians: input.latitudeRadians,
      dayOfYear: input.dayOfYear,
      solarTimeHours: time as SolarTimeHours,
    });
    if (!position.ok) return position;
    const incidence = verticalWindowIncidence(
      position.value.altitudeRadians,
      position.value.azimuthRadians,
      input.windowAzimuthRadians,
    );
    samples.push(
      Object.freeze({
        ...position.value,
        solarTimeHours: time as SolarTimeHours,
        incidenceCosine: incidence,
        sunInFrontOfWindow: position.value.daylight && incidence > 0,
      }),
    );
  }
  return ok(Object.freeze(samples));
};

const validateLatitude = (value: Radians): KernelResult<void> => {
  const valid = finite(value, "latitudeRadians");
  if (!valid.ok) return valid;
  return value >= -Math.PI / 2 && value <= Math.PI / 2
    ? ok(undefined)
    : err("out-of-domain", `latitudeRadians must be in [-pi/2, pi/2], got ${value}`);
};

const verticalWindowIncidence = (
  altitudeRadians: Radians,
  sunAzimuthRadians: Radians,
  windowAzimuthRadians: Radians,
): number => {
  const sunEast = Math.cos(altitudeRadians) * Math.sin(sunAzimuthRadians);
  const sunNorth = Math.cos(altitudeRadians) * Math.cos(sunAzimuthRadians);
  const normalEast = Math.sin(windowAzimuthRadians);
  const normalNorth = Math.cos(windowAzimuthRadians);
  return Math.max(0, sunEast * normalEast + sunNorth * normalNorth);
};

const finite = (value: number, label: string): KernelResult<void> =>
  Number.isFinite(value)
    ? ok(undefined)
    : err("out-of-domain", `${label} must be finite, got ${value}`);

const nonNegativeFinite = (value: number, label: string): KernelResult<void> => {
  const valid = finite(value, label);
  if (!valid.ok) return valid;
  return value >= 0
    ? ok(undefined)
    : err("out-of-domain", `${label} must be finite and non-negative, got ${value}`);
};

const finiteDerived = <T extends number>(value: T, label: string): KernelResult<T> =>
  Number.isFinite(value)
    ? ok(value)
    : err("numerical-instability", `${label} overflowed the finite-number model`);

const normalizeRadians = (value: number): number => {
  const wrapped = value % twoPi;
  return wrapped < 0 ? wrapped + twoPi : wrapped;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));
