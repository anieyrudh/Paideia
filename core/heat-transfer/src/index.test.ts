import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { kelvins, metres, seconds, watts, type KernelResult } from "@paideia/shared";
import {
  conductionHeatRate,
  convectionHeatRate,
  emissivity,
  heatTransferTolerance,
  metresSquaredKelvinsPerWatt,
  netHeatBalance,
  radiationHeatRate,
  seriesThermalResistance,
  shadedFraction,
  solarHeatGain,
  solarHeatGainCoefficient,
  squareMetres,
  uValue,
  wattsPerMetreKelvin,
  wattsPerSquareMetre,
  wattsPerSquareMetreKelvin,
} from "./index.js";

const expectOk = <T>(result: KernelResult<T>): T => {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Expected KernelResult.ok");
  return result.value;
};

const expectErrCode = (result: KernelResult<unknown>, code: string) => {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("Expected KernelResult.err");
  expect(result.error.code).toBe(code);
};

const expectErrMessage = (result: KernelResult<unknown>, text: string) => {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("Expected KernelResult.err");
  expect(result.error.message).toContain(text);
};

describe("@paideia/heat-transfer rate helpers", () => {
  it("computes conduction, convection, and radiation rates", () => {
    expect(expectOk(conductionHeatRate({
      thermalConductivityWattsPerMetreKelvin: wattsPerMetreKelvin(0.8),
      areaSquareMetres: squareMetres(10),
      thicknessMetres: metres(0.2),
      hotTemperatureKelvins: kelvins(303),
      coldTemperatureKelvins: kelvins(293),
    }))).toBeCloseTo(400, 12);

    expect(expectOk(convectionHeatRate({
      heatTransferCoefficientWattsPerSquareMetreKelvin: wattsPerSquareMetreKelvin(12),
      areaSquareMetres: squareMetres(2),
      surfaceTemperatureKelvins: kelvins(310),
      fluidTemperatureKelvins: kelvins(300),
    }))).toBeCloseTo(240, 12);

    const radiation = expectOk(radiationHeatRate({
      emissivity: expectOk(emissivity(0.9)),
      areaSquareMetres: squareMetres(2),
      hotTemperatureKelvins: kelvins(310),
      coldTemperatureKelvins: kelvins(300),
    }));
    expect(radiation).toBeGreaterThan(0);
  });

  it("rejects invalid inputs instead of returning non-finite values", () => {
    expectErrCode(conductionHeatRate({
      thermalConductivityWattsPerMetreKelvin: wattsPerMetreKelvin(1),
      areaSquareMetres: squareMetres(1),
      thicknessMetres: metres(0),
      hotTemperatureKelvins: kelvins(300),
      coldTemperatureKelvins: kelvins(290),
    }), "precondition-violated");

    expectErrCode(radiationHeatRate({
      emissivity: expectOk(emissivity(0.9)),
      areaSquareMetres: squareMetres(Number.MAX_VALUE),
      hotTemperatureKelvins: kelvins(Number.MAX_VALUE),
      coldTemperatureKelvins: kelvins(0),
    }), "numerical-instability");

    expectErrMessage(convectionHeatRate({
      heatTransferCoefficientWattsPerSquareMetreKelvin: wattsPerSquareMetreKelvin(12),
      areaSquareMetres: squareMetres(2),
      surfaceTemperatureKelvins: kelvins(Number.NaN),
      fluidTemperatureKelvins: kelvins(300),
    }), "surfaceTemperatureKelvins");
  });
});

describe("@paideia/heat-transfer envelope helpers", () => {
  it("computes series resistance and U-value", () => {
    const layers = [
      {
        thicknessMetres: metres(0.1),
        thermalConductivityWattsPerMetreKelvin: wattsPerMetreKelvin(0.5),
      },
      {
        thicknessMetres: metres(0.08),
        thermalConductivityWattsPerMetreKelvin: wattsPerMetreKelvin(0.04),
      },
    ] as const;
    const resistance = expectOk(seriesThermalResistance(layers));
    expect(resistance.totalResistanceMetresSquaredKelvinsPerWatt).toBeCloseTo(2.2, 12);
    expect(Object.isFrozen(resistance.layerResistancesMetresSquaredKelvinsPerWatt)).toBe(true);
    expect(expectOk(uValue({
      resistancesMetresSquaredKelvinsPerWatt: [
        resistance.totalResistanceMetresSquaredKelvinsPerWatt,
      ],
    }))).toBeCloseTo(1 / 2.2, 12);
  });

  it("rejects empty or impossible resistance inputs", () => {
    expectErrCode(seriesThermalResistance([]), "precondition-violated");
    expectErrCode(uValue({ resistancesMetresSquaredKelvinsPerWatt: [] }), "precondition-violated");
    expectErrCode(uValue({
      resistancesMetresSquaredKelvinsPerWatt: [metresSquaredKelvinsPerWatt(0)],
    }), "precondition-violated");
  });
});

describe("@paideia/heat-transfer solar and balance helpers", () => {
  it("computes direct solar heat gain and net heat balance", () => {
    const gain = expectOk(solarHeatGain({
      areaSquareMetres: squareMetres(8),
      irradianceWattsPerSquareMetre: wattsPerSquareMetre(700),
      solarHeatGainCoefficient: expectOk(solarHeatGainCoefficient(0.45)),
      exposureFactor: 0.9,
      shadedFraction: expectOk(shadedFraction(0.25)),
    }));
    expect(gain).toBeCloseTo(1701, 12);

    const balance = expectOk(netHeatBalance({
      gainsWatts: [gain, watts(200)],
      lossesWatts: [watts(1200)],
      durationSeconds: seconds(60),
    }));
    expect(balance.netHeatRateWatts).toBeCloseTo(701, 12);
    expect(balance.netEnergyJoules).toBeCloseTo(42060, 12);
    expect(balance.direction).toBe("net-gain");
  });

  it("rejects dimensionless fractions outside [0, 1]", () => {
    expectErrCode(emissivity(1.2), "out-of-domain");
    expectErrCode(solarHeatGainCoefficient(-0.1), "out-of-domain");
    expectErrCode(shadedFraction(Number.NaN), "precondition-violated");
  });

  it("solar gain decreases monotonically as shaded fraction increases", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 100, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 1, max: 1200, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 3, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
        (area, irradiance, coefficient, exposure, shadeA, shadeB) => {
          const lowerShade = Math.min(shadeA, shadeB);
          const higherShade = Math.max(shadeA, shadeB);
          const lower = expectOk(solarHeatGain({
            areaSquareMetres: squareMetres(area),
            irradianceWattsPerSquareMetre: wattsPerSquareMetre(irradiance),
            solarHeatGainCoefficient: expectOk(solarHeatGainCoefficient(coefficient)),
            exposureFactor: exposure,
            shadedFraction: expectOk(shadedFraction(lowerShade)),
          }));
          const higher = expectOk(solarHeatGain({
            areaSquareMetres: squareMetres(area),
            irradianceWattsPerSquareMetre: wattsPerSquareMetre(irradiance),
            solarHeatGainCoefficient: expectOk(solarHeatGainCoefficient(coefficient)),
            exposureFactor: exposure,
            shadedFraction: expectOk(shadedFraction(higherShade)),
          }));
          expect(higher).toBeLessThanOrEqual(lower + heatTransferTolerance.loose);
        },
      ),
    );
  });
});
