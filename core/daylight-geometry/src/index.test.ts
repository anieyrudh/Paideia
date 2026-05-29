import { approxEqual, metres, radians } from "@paideia/shared";
import { describe, expect, it } from "vitest";
import {
  dayOfYear,
  daylightGeometryTolerance,
  shadowLength,
  solarDeclination,
  solarPosition,
  solarTimeHours,
  windowSunPath,
  type DayOfYear,
  type SolarTimeHours,
} from "./index.js";

const day = (value: number): DayOfYear => {
  const result = dayOfYear(value);
  if (!result.ok) throw new Error(`invalid test day ${value}`);
  return result.value;
};

const hour = (value: number): SolarTimeHours => {
  const result = solarTimeHours(value);
  if (!result.ok) throw new Error(`invalid test hour ${value}`);
  return result.value;
};

describe("@paideia/daylight-geometry", () => {
  it("computes near-overhead equinox noon sun at the equator", () => {
    const result = solarPosition({
      latitudeRadians: radians(0),
      dayOfYear: day(81),
      solarTimeHours: hour(12),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.altitudeRadians).toBeCloseTo(Math.PI / 2, 3);
      expect(result.value.daylight).toBe(true);
      expect(Object.isFrozen(result.value)).toBe(true);
    }
  });

  it("computes positive summer declination and negative winter declination", () => {
    const june = solarDeclination(day(172));
    const december = solarDeclination(day(355));

    expect(june.ok).toBe(true);
    if (june.ok) expect(june.value).toBeGreaterThan(0.4);
    expect(december.ok).toBe(true);
    if (december.ok) expect(december.value).toBeLessThan(-0.4);
  });

  it("computes shadow length and opposite azimuth direction", () => {
    const result = shadowLength({
      latitudeRadians: radians(0),
      dayOfYear: day(81),
      solarTimeHours: hour(9),
      objectHeightMetres: metres(2),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.daylight).toBe(true);
      expect(result.value.lengthMetres).toBeCloseTo(2);
      expect(result.value.directionAzimuthRadians).toBeGreaterThanOrEqual(0);
      expect(result.value.directionAzimuthRadians).toBeLessThan(2 * Math.PI);
    }
  });

  it("omits shadow length when the sun is below the horizon", () => {
    const result = shadowLength({
      latitudeRadians: radians(0),
      dayOfYear: day(81),
      solarTimeHours: hour(0),
      objectHeightMetres: metres(2),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.daylight).toBe(false);
      expect(result.value.lengthMetres).toBeUndefined();
    }
  });

  it("samples immutable vertical-window sun path incidence", () => {
    const input = {
      latitudeRadians: radians(0),
      dayOfYear: day(81),
      windowAzimuthRadians: radians(Math.PI / 2),
      startSolarTimeHours: hour(8),
      endSolarTimeHours: hour(10),
      sampleCount: 3,
    };
    const before = JSON.stringify(input);

    const result = windowSunPath(input);

    expect(JSON.stringify(input)).toBe(before);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(3);
      expect(result.value[0]?.solarTimeHours).toBe(8);
      expect(result.value[2]?.solarTimeHours).toBe(10);
      expect(result.value[0]?.sunInFrontOfWindow).toBe(true);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value[0])).toBe(true);
    }
  });

  it("returns out-of-domain for invalid date, time, latitude, and height", () => {
    expect(dayOfYear(0).ok).toBe(false);
    expect(solarTimeHours(25).ok).toBe(false);

    const badLatitude = solarPosition({
      latitudeRadians: radians(Math.PI),
      dayOfYear: day(81),
      solarTimeHours: hour(12),
    });
    expect(badLatitude.ok).toBe(false);
    if (!badLatitude.ok) expect(badLatitude.error.code).toBe("out-of-domain");

    const badHeight = shadowLength({
      latitudeRadians: radians(0),
      dayOfYear: day(81),
      solarTimeHours: hour(12),
      objectHeightMetres: metres(-1),
    });
    expect(badHeight.ok).toBe(false);
    if (!badHeight.ok) expect(badHeight.error.code).toBe("out-of-domain");
  });

  it("returns precondition errors for invalid sample ranges", () => {
    const reversed = windowSunPath({
      latitudeRadians: radians(0),
      dayOfYear: day(81),
      windowAzimuthRadians: radians(0),
      startSolarTimeHours: hour(18),
      endSolarTimeHours: hour(6),
      sampleCount: 3,
    });
    expect(reversed.ok).toBe(false);
    if (!reversed.ok) expect(reversed.error.code).toBe("precondition-violated");

    const oneSample = windowSunPath({
      latitudeRadians: radians(0),
      dayOfYear: day(81),
      windowAzimuthRadians: radians(0),
      startSolarTimeHours: hour(8),
      endSolarTimeHours: hour(10),
      sampleCount: 1,
    });
    expect(oneSample.ok).toBe(false);
    if (!oneSample.ok) expect(oneSample.error.code).toBe("precondition-violated");
  });

  it("keeps noon altitude symmetric around the equator at equinox", () => {
    const north = solarPosition({
      latitudeRadians: radians(0.4),
      dayOfYear: day(81),
      solarTimeHours: hour(12),
    });
    const south = solarPosition({
      latitudeRadians: radians(-0.4),
      dayOfYear: day(81),
      solarTimeHours: hour(12),
    });

    expect(north.ok).toBe(true);
    expect(south.ok).toBe(true);
    if (north.ok && south.ok) {
      expect(
        approxEqual(
          north.value.altitudeRadians,
          south.value.altitudeRadians,
          daylightGeometryTolerance.loose,
        ),
      ).toBe(true);
    }
  });
});
