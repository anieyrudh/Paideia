import { approxEqual, kelvins, seconds } from "@paideia/shared";
import { describe, expect, it } from "vitest";
import {
  activationEnergyJoulesPerMole,
  arrheniusRateRatio,
  concentrationAtTime,
  concentrationMolar,
  halfLife,
  rateConstant,
  sampleConcentrationSeries,
  type ConcentrationMolar,
  type RateConstant,
  type ReactionOrder,
} from "./index.js";

const c = (value: number): ConcentrationMolar => {
  const result = concentrationMolar(value);
  if (!result.ok) throw new Error(`invalid test concentration ${value}`);
  return result.value;
};

const k = (value: number): RateConstant => {
  const result = rateConstant(value);
  if (!result.ok) throw new Error(`invalid test rate constant ${value}`);
  return result.value;
};

describe("@paideia/reaction-kinetics", () => {
  it("computes zero-order concentration with depletion clipping", () => {
    const beforeDepletion = concentrationAtTime({
      order: 0,
      initialConcentration: c(0.8),
      rateConstant: k(0.02),
      elapsedSeconds: seconds(10),
    });
    expect(beforeDepletion.ok).toBe(true);
    if (beforeDepletion.ok) {
      expect(beforeDepletion.value).toBeCloseTo(0.6);
    }

    const afterDepletion = concentrationAtTime({
      order: 0,
      initialConcentration: c(0.8),
      rateConstant: k(0.02),
      elapsedSeconds: seconds(100),
    });
    expect(afterDepletion.ok).toBe(true);
    if (afterDepletion.ok) {
      expect(afterDepletion.value).toBe(0);
    }
  });

  it("computes first-order and second-order concentration laws", () => {
    const first = concentrationAtTime({
      order: 1,
      initialConcentration: c(1.2),
      rateConstant: k(0.3),
      elapsedSeconds: seconds(2),
    });
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.value).toBeCloseTo(1.2 * Math.exp(-0.6));
    }

    const second = concentrationAtTime({
      order: 2,
      initialConcentration: c(0.5),
      rateConstant: k(0.4),
      elapsedSeconds: seconds(10),
    });
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.value).toBeCloseTo(0.5 / (1 + 0.4 * 0.5 * 10));
    }
  });

  it("computes half-lives for all supported orders", () => {
    const zero = halfLife({
      order: 0,
      initialConcentration: c(0.8),
      rateConstant: k(0.02),
    });
    const first = halfLife({
      order: 1,
      initialConcentration: c(0.8),
      rateConstant: k(0.02),
    });
    const second = halfLife({
      order: 2,
      initialConcentration: c(0.8),
      rateConstant: k(0.02),
    });

    expect(zero.ok).toBe(true);
    if (zero.ok) expect(zero.value).toBeCloseTo(20);
    expect(first.ok).toBe(true);
    if (first.ok) expect(first.value).toBeCloseTo(Math.LN2 / 0.02);
    expect(second.ok).toBe(true);
    if (second.ok) expect(second.value).toBeCloseTo(1 / (0.02 * 0.8));
  });

  it("samples an immutable concentration series over caller bounds", () => {
    const input = {
      order: 1 as const,
      initialConcentration: c(1),
      rateConstant: k(0.1),
      startSeconds: seconds(5),
      endSeconds: seconds(15),
      sampleCount: 3,
    };
    const before = JSON.stringify(input);

    const result = sampleConcentrationSeries(input);

    expect(JSON.stringify(input)).toBe(before);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(3);
      expect(result.value[0]?.timeSeconds).toBe(5);
      expect(result.value[1]?.timeSeconds).toBe(10);
      expect(result.value[2]?.timeSeconds).toBe(15);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value[0])).toBe(true);
    }
  });

  it("computes Arrhenius rate ratios from Kelvin temperatures", () => {
    const energy = activationEnergyJoulesPerMole(50_000);
    expect(energy.ok).toBe(true);
    if (!energy.ok) return;

    const result = arrheniusRateRatio({
      activationEnergyJoulesPerMole: energy.value,
      initialTemperatureKelvins: kelvins(298.15),
      finalTemperatureKelvins: kelvins(308.15),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const expected = Math.exp(
        (50_000 / 8.31446261815324) * (1 / 298.15 - 1 / 308.15),
      );
      expect(result.value).toBeCloseTo(expected);
      expect(result.value).toBeGreaterThan(1);
    }
  });

  it("returns out-of-domain errors for invalid numeric boundaries", () => {
    expect(concentrationMolar(-1).ok).toBe(false);
    expect(rateConstant(Number.POSITIVE_INFINITY).ok).toBe(false);
    expect(activationEnergyJoulesPerMole(Number.NaN).ok).toBe(false);

    const negativeTime = concentrationAtTime({
      order: 1,
      initialConcentration: c(1),
      rateConstant: k(0.1),
      elapsedSeconds: seconds(-1),
    });
    expect(negativeTime.ok).toBe(false);
    if (!negativeTime.ok) expect(negativeTime.error.code).toBe("out-of-domain");
  });

  it("returns precondition errors for unsupported order and invalid sampling", () => {
    const unsupportedOrder = concentrationAtTime({
      order: 3 as ReactionOrder,
      initialConcentration: c(1),
      rateConstant: k(0.1),
      elapsedSeconds: seconds(1),
    });
    expect(unsupportedOrder.ok).toBe(false);
    if (!unsupportedOrder.ok) {
      expect(unsupportedOrder.error.code).toBe("precondition-violated");
    }

    const oneSample = sampleConcentrationSeries({
      order: 1,
      initialConcentration: c(1),
      rateConstant: k(0.1),
      endSeconds: seconds(10),
      sampleCount: 1,
    });
    expect(oneSample.ok).toBe(false);
    if (!oneSample.ok) expect(oneSample.error.code).toBe("precondition-violated");

    const reversed = sampleConcentrationSeries({
      order: 1,
      initialConcentration: c(1),
      rateConstant: k(0.1),
      startSeconds: seconds(20),
      endSeconds: seconds(10),
      sampleCount: 2,
    });
    expect(reversed.ok).toBe(false);
    if (!reversed.ok) expect(reversed.error.code).toBe("precondition-violated");
  });

  it("returns precondition errors for half-life when no half-life exists", () => {
    const noInitial = halfLife({
      order: 1,
      initialConcentration: c(0),
      rateConstant: k(0.1),
    });
    expect(noInitial.ok).toBe(false);
    if (!noInitial.ok) expect(noInitial.error.code).toBe("precondition-violated");

    const noRate = halfLife({
      order: 1,
      initialConcentration: c(1),
      rateConstant: k(0),
    });
    expect(noRate.ok).toBe(false);
    if (!noRate.ok) expect(noRate.error.code).toBe("precondition-violated");
  });

  it("reports numerical instability when Arrhenius exponent overflows", () => {
    const energy = activationEnergyJoulesPerMole(Number.MAX_VALUE);
    expect(energy.ok).toBe(true);
    if (!energy.ok) return;

    const result = arrheniusRateRatio({
      activationEnergyJoulesPerMole: energy.value,
      initialTemperatureKelvins: kelvins(1),
      finalTemperatureKelvins: kelvins(1_000_000),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("numerical-instability");
  });

  it("keeps concentration samples monotone non-increasing for supported orders", () => {
    for (const order of [0, 1, 2] as const) {
      const result = sampleConcentrationSeries({
        order,
        initialConcentration: c(2),
        rateConstant: k(0.05),
        endSeconds: seconds(100),
        sampleCount: 21,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        for (let index = 1; index < result.value.length; index += 1) {
          const previous = result.value[index - 1];
          const current = result.value[index];
          expect(previous).toBeDefined();
          expect(current).toBeDefined();
          if (previous !== undefined && current !== undefined) {
            expect(current.concentration).toBeLessThanOrEqual(previous.concentration);
            expect(current.concentration).toBeGreaterThanOrEqual(0);
          }
        }
      }
    }
  });

  it("matches half-life to concentration-at-time for each order", () => {
    for (const order of [0, 1, 2] as const) {
      const life = halfLife({
        order,
        initialConcentration: c(1.4),
        rateConstant: k(0.2),
      });
      expect(life.ok).toBe(true);
      if (!life.ok) continue;

      const concentration = concentrationAtTime({
        order,
        initialConcentration: c(1.4),
        rateConstant: k(0.2),
        elapsedSeconds: life.value,
      });
      expect(concentration.ok).toBe(true);
      if (concentration.ok) {
        expect(approxEqual(concentration.value, 0.7, 1e-10)).toBe(true);
      }
    }
  });
});
