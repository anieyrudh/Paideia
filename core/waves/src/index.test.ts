import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { hertz, metres, radians, seconds } from "@paideia/shared";
import {
  beatsAt,
  interferenceIntensity,
  phaseDifference,
  photonEnergy,
  standingWaveAt,
  superposeAt,
  transverseWaveAt,
  transverseWaveTrace,
  waveKinematics,
  waveTolerance,
} from "./index.js";

const expectOk = <T>(
  result: { readonly ok: true; readonly value: T } | { readonly ok: false },
): T => {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Expected KernelResult.ok");
  return result.value;
};

const expectErrCode = (
  result:
    | { readonly ok: true }
    | { readonly ok: false; readonly error: { readonly code: string } },
  code: string,
) => {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("Expected KernelResult.err");
  expect(result.error.code).toBe(code);
};

describe("@paideia/waves kinematics", () => {
  it("computes speed, period, angular frequency, and wave number", () => {
    const kinematics = expectOk(
      waveKinematics({
        frequencyHertz: hertz(2),
        wavelengthMetres: metres(3),
      }),
    );

    expect(kinematics.speedMetresPerSecond).toBeCloseTo(6, 12);
    expect(kinematics.periodSeconds).toBeCloseTo(0.5, 12);
    expect(kinematics.angularFrequencyRadiansPerSecond).toBeCloseTo(4 * Math.PI, 12);
    expect(kinematics.waveNumberRadiansPerMetre).toBeCloseTo((2 * Math.PI) / 3, 12);
  });

  it("rejects invalid kinematic inputs", () => {
    expectErrCode(
      waveKinematics({
        frequencyHertz: hertz(0),
        wavelengthMetres: metres(3),
      }),
      "precondition-violated",
    );
    expectErrCode(
      waveKinematics({
        frequencyHertz: hertz(2),
        wavelengthMetres: metres(Number.NaN),
      }),
      "precondition-violated",
    );
  });

  it("satisfies v = f lambda for positive finite inputs", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1e-3, max: 1e3, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 1e-3, max: 1e3, noNaN: true, noDefaultInfinity: true }),
        (frequency, wavelength) => {
          const result = waveKinematics({
            frequencyHertz: hertz(frequency),
            wavelengthMetres: metres(wavelength),
          });
          expect(result.ok).toBe(true);
          if (!result.ok) return;
          expect(result.value.speedMetresPerSecond).toBeCloseTo(
            frequency * wavelength,
            8,
          );
        },
      ),
    );
  });

  it("computes photon energy from wavelength", () => {
    const energy = expectOk(photonEnergy({ wavelengthMetres: metres(500e-9) }));

    expect(energy.frequencyHertz).toBeCloseTo(5.99584916e14, 6);
    expect(energy.energyElectronVolts).toBeCloseTo(2.48, 2);
  });

  it("rejects invalid photon wavelengths", () => {
    expectErrCode(photonEnergy({ wavelengthMetres: metres(0) }), "precondition-violated");
  });
});

describe("@paideia/waves samples", () => {
  it("samples a transverse wave with direction-aware phase", () => {
    const forward = expectOk(
      transverseWaveAt({
        amplitudeMetres: metres(2),
        frequencyHertz: hertz(1),
        wavelengthMetres: metres(4),
        positionMetres: metres(1),
        timeSeconds: seconds(0),
      }),
    );
    expect(forward.displacementMetres).toBeCloseTo(2, 12);

    const delayed = expectOk(
      transverseWaveAt({
        amplitudeMetres: metres(2),
        frequencyHertz: hertz(1),
        wavelengthMetres: metres(4),
        positionMetres: metres(1),
        timeSeconds: seconds(0.25),
      }),
    );
    expect(delayed.displacementMetres).toBeCloseTo(0, 12);

    const backward = expectOk(
      transverseWaveAt({
        amplitudeMetres: metres(2),
        frequencyHertz: hertz(1),
        wavelengthMetres: metres(4),
        positionMetres: metres(1),
        timeSeconds: seconds(0.25),
        direction: "negative-x",
      }),
    );
    expect(backward.displacementMetres).toBeCloseTo(0, 12);
    expect(backward.phaseRadians).toBeCloseTo(Math.PI, 12);
  });

  it("returns a readonly trace without mutating inputs", () => {
    const trace = expectOk(
      transverseWaveTrace({
        amplitudeMetres: metres(1),
        frequencyHertz: hertz(1),
        wavelengthMetres: metres(2),
        startMetres: metres(0),
        endMetres: metres(2),
        timeSeconds: seconds(0),
        sampleCount: 5,
      }),
    );

    expect(trace).toHaveLength(5);
    expect(trace[0]?.positionMetres).toBeCloseTo(0, 12);
    expect(trace[4]?.positionMetres).toBeCloseTo(2, 12);
    expect(Object.isFrozen(trace)).toBe(true);
  });

  it("rejects invalid sample counts and negative time", () => {
    expectErrCode(
      transverseWaveTrace({
        amplitudeMetres: metres(1),
        frequencyHertz: hertz(1),
        wavelengthMetres: metres(2),
        startMetres: metres(0),
        endMetres: metres(2),
        timeSeconds: seconds(0),
        sampleCount: 1,
      }),
      "precondition-violated",
    );
    expectErrCode(
      transverseWaveAt({
        amplitudeMetres: metres(1),
        frequencyHertz: hertz(1),
        wavelengthMetres: metres(2),
        positionMetres: metres(0),
        timeSeconds: seconds(-1),
      }),
      "precondition-violated",
    );
  });
});

describe("@paideia/waves composition", () => {
  it("superposes component displacements without mutating components", () => {
    const components = [
      {
        amplitudeMetres: metres(1),
        frequencyHertz: hertz(1),
        wavelengthMetres: metres(4),
      },
      {
        amplitudeMetres: metres(1),
        frequencyHertz: hertz(1),
        wavelengthMetres: metres(4),
        phaseRadians: radians(Math.PI),
      },
    ] as const;
    const result = expectOk(
      superposeAt({
        components,
        positionMetres: metres(1),
        timeSeconds: seconds(0),
      }),
    );

    expect(result.displacementMetres).toBeCloseTo(0, 12);
    expect("phaseRadians" in result).toBe(false);
    expect(components[0]?.amplitudeMetres).toBe(1);
  });

  it("models a standing wave node at the boundary", () => {
    const node = expectOk(
      standingWaveAt({
        amplitudeMetres: metres(3),
        frequencyHertz: hertz(2),
        wavelengthMetres: metres(4),
        positionMetres: metres(0),
        timeSeconds: seconds(0),
      }),
    );
    const antinode = expectOk(
      standingWaveAt({
        amplitudeMetres: metres(3),
        frequencyHertz: hertz(2),
        wavelengthMetres: metres(4),
        positionMetres: metres(1),
        timeSeconds: seconds(0),
      }),
    );

    expect(node.displacementMetres).toBeCloseTo(0, 12);
    expect(antinode.displacementMetres).toBeCloseTo(6, 12);
  });

  it("samples beats with zero displacement at the first envelope node", () => {
    const sample = expectOk(
      beatsAt({
        amplitudeMetres: metres(1),
        carrierFrequencyHertz: hertz(10),
        beatFrequencyHertz: hertz(2),
        timeSeconds: seconds(0.25),
      }),
    );

    expect(sample.displacementMetres).toBeCloseTo(0, 12);
  });

  it("computes phase difference and two-source intensity", () => {
    const phase = expectOk(phaseDifference(metres(0.5), metres(2)));
    expect(phase).toBeCloseTo(Math.PI / 2, 12);

    expect(expectOk(interferenceIntensity(metres(1), metres(1), radians(0)))).toBeCloseTo(4, 12);
    expect(expectOk(interferenceIntensity(metres(1), metres(1), radians(Math.PI)))).toBeCloseTo(0, 12);
    expectErrCode(interferenceIntensity(metres(1), metres(Number.NaN), radians(0)), "precondition-violated");
  });

  it("keeps identical-wave superposition equivalent to doubled amplitude", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 1e-3, max: 20, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 1e-3, max: 20, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 10, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 10, noNaN: true, noDefaultInfinity: true }),
        (amplitude, frequency, wavelength, position, time) => {
          const single = expectOk(
            transverseWaveAt({
              amplitudeMetres: metres(amplitude),
              frequencyHertz: hertz(frequency),
              wavelengthMetres: metres(wavelength),
              positionMetres: metres(position),
              timeSeconds: seconds(time),
            }),
          );
          const doubled = expectOk(
            superposeAt({
              components: [
                {
                  amplitudeMetres: metres(amplitude),
                  frequencyHertz: hertz(frequency),
                  wavelengthMetres: metres(wavelength),
                },
                {
                  amplitudeMetres: metres(amplitude),
                  frequencyHertz: hertz(frequency),
                  wavelengthMetres: metres(wavelength),
                },
              ],
              positionMetres: metres(position),
              timeSeconds: seconds(time),
            }),
          );

          expect(doubled.displacementMetres).toBeCloseTo(
            2 * single.displacementMetres,
            Math.ceil(-Math.log10(waveTolerance.loose)),
          );
        },
      ),
    );
  });
});
