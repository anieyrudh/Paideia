import { approxEqual, metres, radians } from "@paideia/shared";
import { describe, expect, it } from "vitest";
import {
  lensRaySample,
  magnification,
  mirrorImage,
  opticsTolerance,
  refractiveIndex,
  snellRefraction,
  thinLensImage,
  type RefractiveIndex,
} from "./index.js";

const n = (value: number): RefractiveIndex => {
  const result = refractiveIndex(value);
  if (!result.ok) throw new Error(`invalid test refractive index ${value}`);
  return result.value;
};

describe("@paideia/optics", () => {
  it("computes Snell refraction from air into glass", () => {
    const result = snellRefraction({
      incidentRefractiveIndex: n(1),
      transmittedRefractiveIndex: n(1.5),
      incidentAngleRadians: radians(Math.PI / 6),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.totalInternalReflection).toBe(false);
      expect(result.value.refractedAngleRadians).toBeDefined();
      expect(result.value.refractedAngleRadians).toBeCloseTo(Math.asin(1 / 3));
      expect(result.value.criticalAngleRadians).toBeUndefined();
      expect(Object.isFrozen(result.value)).toBe(true);
    }
  });

  it("reports total internal reflection without emitting a refracted angle", () => {
    const result = snellRefraction({
      incidentRefractiveIndex: n(1.5),
      transmittedRefractiveIndex: n(1),
      incidentAngleRadians: radians(Math.PI / 3),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.totalInternalReflection).toBe(true);
      expect(result.value.refractedAngleRadians).toBeUndefined();
      expect(result.value.criticalAngleRadians).toBeCloseTo(Math.asin(1 / 1.5));
    }
  });

  it("computes real thin-lens images and magnification", () => {
    const result = thinLensImage({
      focalLengthMetres: metres(0.1),
      objectDistanceMetres: metres(0.3),
      objectHeightMetres: metres(0.02),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.imageDistanceMetres).toBeCloseTo(0.15);
      expect(result.value.magnification).toBeCloseTo(-0.5);
      expect(result.value.imageHeightMetres).toBeCloseTo(-0.01);
      expect(result.value.nature).toBe("real");
      expect(result.value.orientation).toBe("inverted");
    }
  });

  it("computes virtual diverging-lens images", () => {
    const result = thinLensImage({
      focalLengthMetres: metres(-0.1),
      objectDistanceMetres: metres(0.3),
      objectHeightMetres: metres(0.02),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.imageDistanceMetres).toBeCloseTo(-0.075);
      expect(result.value.magnification).toBeCloseTo(0.25);
      expect(result.value.nature).toBe("virtual");
      expect(result.value.orientation).toBe("upright");
    }
  });

  it("reports image at infinity when object sits at focal point", () => {
    const result = thinLensImage({
      focalLengthMetres: metres(0.2),
      objectDistanceMetres: metres(0.2),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.nature).toBe("at-infinity");
      expect(result.value.orientation).toBe("none");
      expect(result.value.imageDistanceMetres).toBeUndefined();
    }
  });

  it("computes mirror images with sign-convention checks", () => {
    const concave = mirrorImage({
      kind: "concave",
      focalLengthMetres: metres(0.1),
      objectDistanceMetres: metres(0.3),
    });
    expect(concave.ok).toBe(true);
    if (concave.ok) {
      expect(concave.value.mirrorKind).toBe("concave");
      expect(concave.value.nature).toBe("real");
    }

    const mismatched = mirrorImage({
      kind: "convex",
      focalLengthMetres: metres(0.1),
      objectDistanceMetres: metres(0.3),
    });
    expect(mismatched.ok).toBe(false);
    if (!mismatched.ok) expect(mismatched.error.code).toBe("precondition-violated");
  });

  it("computes magnification from object and image distances", () => {
    const result = magnification(metres(0.3), metres(0.15));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBeCloseTo(-0.5);
  });

  it("returns immutable paraxial lens ray samples", () => {
    const input = {
      lensKind: "converging" as const,
      focalLengthMetres: metres(0.1),
      objectDistanceMetres: metres(0.3),
      objectHeightMetres: metres(0.02),
      rayHeightMetres: metres(0.02),
      screenDistanceMetres: metres(0.2),
    };
    const before = JSON.stringify(input);

    const result = lensRaySample(input);

    expect(JSON.stringify(input)).toBe(before);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.segments).toHaveLength(4);
      expect(result.value.segments[0]?.label).toBe("parallel-to-axis");
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.segments)).toBe(true);
      expect(Object.isFrozen(result.value.segments[0])).toBe(true);
    }
  });

  it("returns out-of-domain for invalid numeric inputs", () => {
    expect(refractiveIndex(0).ok).toBe(false);
    expect(refractiveIndex(Number.POSITIVE_INFINITY).ok).toBe(false);

    const badDistance = thinLensImage({
      focalLengthMetres: metres(0.1),
      objectDistanceMetres: metres(0),
    });
    expect(badDistance.ok).toBe(false);
    if (!badDistance.ok) expect(badDistance.error.code).toBe("out-of-domain");
  });

  it("returns precondition errors for invalid optical components", () => {
    const zeroFocal = thinLensImage({
      focalLengthMetres: metres(0),
      objectDistanceMetres: metres(0.3),
    });
    expect(zeroFocal.ok).toBe(false);
    if (!zeroFocal.ok) expect(zeroFocal.error.code).toBe("precondition-violated");

    const wrongLensKind = lensRaySample({
      lensKind: "diverging",
      focalLengthMetres: metres(0.1),
      objectDistanceMetres: metres(0.3),
      rayHeightMetres: metres(0.02),
    });
    expect(wrongLensKind.ok).toBe(false);
    if (!wrongLensKind.ok) expect(wrongLensKind.error.code).toBe("precondition-violated");
  });

  it("keeps Snell refraction symmetric below critical angle", () => {
    const forward = snellRefraction({
      incidentRefractiveIndex: n(1),
      transmittedRefractiveIndex: n(1.5),
      incidentAngleRadians: radians(0.25),
    });
    expect(forward.ok).toBe(true);
    if (!forward.ok || forward.value.refractedAngleRadians === undefined) return;

    const backward = snellRefraction({
      incidentRefractiveIndex: n(1.5),
      transmittedRefractiveIndex: n(1),
      incidentAngleRadians: forward.value.refractedAngleRadians,
    });

    expect(backward.ok).toBe(true);
    if (backward.ok) {
      expect(backward.value.totalInternalReflection).toBe(false);
      expect(backward.value.refractedAngleRadians).toBeDefined();
      expect(
        approxEqual(
          backward.value.refractedAngleRadians ?? radians(0),
          0.25,
          opticsTolerance.tight,
        ),
      ).toBe(true);
    }
  });
});
