import { err, metres, ok, radians, type Brand, type KernelResult, type Metres, type Radians } from "@paideia/shared";

export const opticsTolerance = {
  default: 1e-9,
  tight: 1e-12,
  loose: 1e-6,
} as const;

export type RefractiveIndex = Brand<number, "Optics.RefractiveIndex">;
export type LensKind = "converging" | "diverging";
export type MirrorKind = "concave" | "convex";
export type ImageNature = "real" | "virtual" | "at-infinity";
export type Orientation = "upright" | "inverted" | "none";

export interface RayPoint {
  readonly xMetres: Metres;
  readonly yMetres: Metres;
}

export interface RaySegment {
  readonly start: RayPoint;
  readonly end: RayPoint;
  readonly label: string;
}

export interface SnellInput {
  readonly incidentRefractiveIndex: RefractiveIndex;
  readonly transmittedRefractiveIndex: RefractiveIndex;
  readonly incidentAngleRadians: Radians;
}

export interface SnellResult {
  readonly incidentAngleRadians: Radians;
  readonly refractedAngleRadians?: Radians;
  readonly criticalAngleRadians?: Radians;
  readonly totalInternalReflection: boolean;
}

export interface ThinLensInput {
  readonly focalLengthMetres: Metres;
  readonly objectDistanceMetres: Metres;
  readonly objectHeightMetres?: Metres;
}

export interface ThinLensImage {
  readonly imageDistanceMetres?: Metres;
  readonly magnification?: number;
  readonly imageHeightMetres?: Metres;
  readonly nature: ImageNature;
  readonly orientation: Orientation;
}

export interface MirrorInput {
  readonly focalLengthMetres: Metres;
  readonly objectDistanceMetres: Metres;
  readonly objectHeightMetres?: Metres;
  readonly kind: MirrorKind;
}

export interface MirrorImage extends ThinLensImage {
  readonly mirrorKind: MirrorKind;
}

export interface LensRaySampleInput extends ThinLensInput {
  readonly lensKind: LensKind;
  readonly rayHeightMetres: Metres;
  readonly screenDistanceMetres?: Metres;
}

export interface LensRaySample {
  readonly lensKind: LensKind;
  readonly image: ThinLensImage;
  readonly segments: readonly RaySegment[];
}

export const refractiveIndex = (value: number): KernelResult<RefractiveIndex> => {
  if (!Number.isFinite(value) || value <= 0) {
    return err("out-of-domain", `refractiveIndex must be finite and positive, got ${value}`);
  }
  return ok(value as RefractiveIndex);
};

export const snellRefraction = (input: SnellInput): KernelResult<SnellResult> => {
  const n1 = refractiveIndex(input.incidentRefractiveIndex);
  if (!n1.ok) return n1;
  const n2 = refractiveIndex(input.transmittedRefractiveIndex);
  if (!n2.ok) return n2;
  const angle = finite(input.incidentAngleRadians, "incidentAngleRadians");
  if (!angle.ok) return angle;

  const criticalAngle =
    n1.value > n2.value ? radians(Math.asin(n2.value / n1.value)) : undefined;
  const sinRefracted = (n1.value / n2.value) * Math.sin(input.incidentAngleRadians);
  if (Math.abs(sinRefracted) > 1 + opticsTolerance.default) {
    return ok(
      Object.freeze({
        incidentAngleRadians: input.incidentAngleRadians,
        ...(criticalAngle !== undefined && { criticalAngleRadians: criticalAngle }),
        totalInternalReflection: true,
      }),
    );
  }
  const refracted = Math.asin(clamp(sinRefracted, -1, 1));
  return ok(
    Object.freeze({
      incidentAngleRadians: input.incidentAngleRadians,
      refractedAngleRadians: radians(refracted),
      ...(criticalAngle !== undefined && { criticalAngleRadians: criticalAngle }),
      totalInternalReflection: false,
    }),
  );
};

export const thinLensImage = (input: ThinLensInput): KernelResult<ThinLensImage> => {
  const valid = validateLensInput(input);
  if (!valid.ok) return valid;
  const f = input.focalLengthMetres;
  const u = input.objectDistanceMetres;
  const inverseImage = 1 / f - 1 / u;
  if (Math.abs(inverseImage) <= opticsTolerance.tight) {
    return ok(Object.freeze({ nature: "at-infinity", orientation: "none" }));
  }
  const v = 1 / inverseImage;
  const m = -v / u;
  return imageFromDistance(v, m, input.objectHeightMetres);
};

export const mirrorImage = (input: MirrorInput): KernelResult<MirrorImage> => {
  const side = input.kind === "concave" || input.kind === "convex"
    ? ok(undefined)
    : err("precondition-violated", `mirror kind must be concave or convex, got ${String(input.kind)}`);
  if (!side.ok) return side;
  if (input.kind === "concave" && input.focalLengthMetres <= 0) {
    return err("precondition-violated", "concave mirrors require positive focalLengthMetres");
  }
  if (input.kind === "convex" && input.focalLengthMetres >= 0) {
    return err("precondition-violated", "convex mirrors require negative focalLengthMetres");
  }
  const image = thinLensImage(input);
  if (!image.ok) return image;
  return ok(Object.freeze({ ...image.value, mirrorKind: input.kind }));
};

export const magnification = (
  objectDistanceMetres: Metres,
  imageDistanceMetres: Metres,
): KernelResult<number> => {
  const object = positiveFinite(objectDistanceMetres, "objectDistanceMetres");
  if (!object.ok) return object;
  const image = finite(imageDistanceMetres, "imageDistanceMetres");
  if (!image.ok) return image;
  const value = -imageDistanceMetres / objectDistanceMetres;
  return finiteDerived(value, "magnification");
};

export const lensRaySample = (
  input: LensRaySampleInput,
): KernelResult<LensRaySample> => {
  const image = thinLensImage(input);
  if (!image.ok) return image;
  const kindValid =
    input.lensKind === "converging" || input.lensKind === "diverging"
      ? ok(undefined)
      : err("precondition-violated", `lensKind must be converging or diverging, got ${String(input.lensKind)}`);
  if (!kindValid.ok) return kindValid;
  if (input.lensKind === "converging" && input.focalLengthMetres <= 0) {
    return err("precondition-violated", "converging lenses require positive focalLengthMetres");
  }
  if (input.lensKind === "diverging" && input.focalLengthMetres >= 0) {
    return err("precondition-violated", "diverging lenses require negative focalLengthMetres");
  }
  const rayHeight = finite(input.rayHeightMetres, "rayHeightMetres");
  if (!rayHeight.ok) return rayHeight;
  const screen =
    input.screenDistanceMetres ??
    image.value.imageDistanceMetres ??
    metres(Math.abs(input.focalLengthMetres) * 2);
  const validScreen = positiveFinite(screen, "screenDistanceMetres");
  if (!validScreen.ok) return validScreen;

  const objectX = metres(-input.objectDistanceMetres);
  const lens = point(0, 0);
  const objectTop = point(-input.objectDistanceMetres, input.objectHeightMetres ?? input.rayHeightMetres);
  const parallelAtLens = point(0, input.rayHeightMetres);
  const focusX = input.focalLengthMetres;
  const slopeThroughFocus = (0 - input.rayHeightMetres) / focusX;
  const screenPoint = point(screen, input.rayHeightMetres + slopeThroughFocus * screen);
  const centerEnd = point(screen, -((input.objectHeightMetres ?? input.rayHeightMetres) / input.objectDistanceMetres) * screen);

  const segments = Object.freeze([
    segment(point(objectX, input.rayHeightMetres), parallelAtLens, "parallel-to-axis"),
    segment(parallelAtLens, screenPoint, "through-focal-point"),
    segment(objectTop, lens, "through-optical-centre"),
    segment(lens, centerEnd, "undeviated-centre-ray"),
  ]);

  return ok(Object.freeze({ lensKind: input.lensKind, image: image.value, segments }));
};

const validateLensInput = (input: ThinLensInput): KernelResult<void> => {
  const focal = finite(input.focalLengthMetres, "focalLengthMetres");
  if (!focal.ok) return focal;
  if (Math.abs(input.focalLengthMetres) <= opticsTolerance.tight) {
    return err("precondition-violated", "focalLengthMetres must be non-zero");
  }
  const object = positiveFinite(input.objectDistanceMetres, "objectDistanceMetres");
  if (!object.ok) return object;
  if (input.objectHeightMetres !== undefined) {
    const height = finite(input.objectHeightMetres, "objectHeightMetres");
    if (!height.ok) return height;
  }
  return ok(undefined);
};

const imageFromDistance = (
  imageDistance: number,
  magnificationValue: number,
  objectHeight?: Metres,
): KernelResult<ThinLensImage> => {
  const image = finiteDerived(imageDistance, "imageDistanceMetres");
  if (!image.ok) return image;
  const mag = finiteDerived(magnificationValue, "magnification");
  if (!mag.ok) return mag;
  const nature = imageDistance > 0 ? "real" : "virtual";
  const orientation = magnificationValue < 0 ? "inverted" : "upright";
  const imageHeightValue = objectHeight === undefined ? undefined : objectHeight * magnificationValue;
  if (imageHeightValue !== undefined) {
    const height = finiteDerived(imageHeightValue, "imageHeightMetres");
    if (!height.ok) return height;
  }
  return ok(
    Object.freeze({
      imageDistanceMetres: metres(imageDistance),
      magnification: magnificationValue,
      ...(imageHeightValue !== undefined && { imageHeightMetres: metres(imageHeightValue) }),
      nature,
      orientation,
    }),
  );
};

const finite = (value: number, label: string): KernelResult<void> =>
  Number.isFinite(value)
    ? ok(undefined)
    : err("out-of-domain", `${label} must be finite, got ${value}`);

const positiveFinite = (value: number, label: string): KernelResult<void> => {
  const valid = finite(value, label);
  if (!valid.ok) return valid;
  return value > 0
    ? ok(undefined)
    : err("out-of-domain", `${label} must be finite and positive, got ${value}`);
};

const finiteDerived = <T extends number>(value: T, label: string): KernelResult<T> =>
  Number.isFinite(value)
    ? ok(value)
    : err("numerical-instability", `${label} overflowed the finite-number model`);

const point = (xMetres: number, yMetres: number): RayPoint =>
  Object.freeze({ xMetres: metres(xMetres), yMetres: metres(yMetres) });

const segment = (start: RayPoint, end: RayPoint, label: string): RaySegment =>
  Object.freeze({ start, end, label });

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));
