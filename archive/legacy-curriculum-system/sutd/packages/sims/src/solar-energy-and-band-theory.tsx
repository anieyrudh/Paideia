import type { TSimulationSpec } from "@paideia/content-schema";
import { err, metres, ok, type ConceptPackageId, type KernelResult } from "@paideia/shared";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import { ControlGroup, Slider } from "@paideia/ui-sim";
import { photonEnergy } from "@paideia/waves";

type SolarBandState = {
  readonly wavelengthNanometres: number;
  readonly bandGapElectronVolts: number;
  readonly irradianceWattsPerSquareMetre: number;
};

type SolarBandEvidence = {
  readonly photonEnergyElectronVolts: number;
  readonly photonFrequencyHertz: number;
  readonly absorbed: boolean;
  readonly excessElectronVolts: number;
  readonly usableFraction: number;
  readonly thermalisedFraction: number;
  readonly estimatedUsablePowerWattsPerSquareMetre: number;
};

export const solarEnergyAndBandTheoryPackageId =
  "sutd/10-016-science-for-a-sustainable-world/solar-energy-and-band-theory" as ConceptPackageId;

export const solarEnergyAndBandTheorySpec: TSimulationSpec = {
  id: "solar-energy-and-band-theory",
  title: "Photon Energy and Band Gap",
  interaction_type: "comparative-matrix",
  kernel_deps: ["core/sim-runtime", "core/prediction-gate", "core/waves", "core/ui-sim"],
  manipulate: {
    controls: [
      {
        id: "wavelength-nanometres",
        label: "Photon wavelength",
        kind: "slider",
        kernel_binding: "state.wavelengthNanometres",
        bounds: { min: 350, max: 1100, step: 10 },
      },
      {
        id: "band-gap-electron-volts",
        label: "Semiconductor band gap",
        kind: "slider",
        kernel_binding: "state.bandGapElectronVolts",
        bounds: { min: 0.8, max: 2.2, step: 0.05 },
      },
      {
        id: "irradiance-watts-per-square-metre",
        label: "Irradiance",
        kind: "slider",
        kernel_binding: "state.irradianceWattsPerSquareMetre",
        bounds: { min: 200, max: 1000, step: 50 },
      },
    ],
  },
  predict: {
    prompt:
      "A photon has less energy than a semiconductor band gap. What happens in the simple band model?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "It is absorbed efficiently",
        "It cannot excite an electron across the gap",
        "It creates two electrons",
        "It makes voltage independent of material",
      ],
      correct_index: 1,
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "solar-band-readout",
        module: "@paideia/sutd-sims/solar-energy-and-band-theory",
        symbol: "SolarEnergyAndBandTheory",
        props_binding:
          "Show photon energy, band gap threshold, absorbed/not absorbed verdict, and thermalisation losses.",
      },
    ],
  },
  explain: {
    prompt:
      "Explain why a solar cell material has to balance absorbing enough photons against losing excess photon energy as heat.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Higher-energy photons always make proportionally more electrical energy",
      "Any light colour can excite any semiconductor",
    ],
  },
};

const defaults: SolarBandState = {
  wavelengthNanometres: 650,
  bandGapElectronVolts: 1.1,
  irradianceWattsPerSquareMetre: 800,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const currentState = (state: Partial<SolarBandState>): SolarBandState => ({
  wavelengthNanometres: clamp(state.wavelengthNanometres ?? defaults.wavelengthNanometres, 350, 1100),
  bandGapElectronVolts: clamp(state.bandGapElectronVolts ?? defaults.bandGapElectronVolts, 0.8, 2.2),
  irradianceWattsPerSquareMetre: clamp(
    state.irradianceWattsPerSquareMetre ?? defaults.irradianceWattsPerSquareMetre,
    200,
    1000,
  ),
});

const fmt = (value: number, digits = 2): string => {
  const rounded = Number(value.toFixed(digits));
  return Object.is(rounded, -0) ? "0" : rounded.toString();
};

const finiteRange = (
  value: number,
  label: string,
  min: number,
  max: number,
): KernelResult<number> => {
  if (!Number.isFinite(value) || value < min || value > max) {
    return err(
      "out-of-domain",
      `${label} must be finite and in [${min}, ${max}], got ${value}`,
    );
  }
  return ok(value);
};

export const solarEvidence = (state: SolarBandState): KernelResult<SolarBandEvidence> => {
  const wavelengthNanometres = finiteRange(
    state.wavelengthNanometres,
    "wavelengthNanometres",
    350,
    1100,
  );
  if (!wavelengthNanometres.ok) return wavelengthNanometres;
  const bandGapElectronVolts = finiteRange(
    state.bandGapElectronVolts,
    "bandGapElectronVolts",
    0.8,
    2.2,
  );
  if (!bandGapElectronVolts.ok) return bandGapElectronVolts;
  const irradianceWattsPerSquareMetre = finiteRange(
    state.irradianceWattsPerSquareMetre,
    "irradianceWattsPerSquareMetre",
    200,
    1000,
  );
  if (!irradianceWattsPerSquareMetre.ok) return irradianceWattsPerSquareMetre;

  const photon = photonEnergy({
    wavelengthMetres: metres(wavelengthNanometres.value * 1e-9),
  });
  if (!photon.ok) return photon;

  const photonEnergyElectronVolts = photon.value.energyElectronVolts;
  const absorbed = photonEnergyElectronVolts >= bandGapElectronVolts.value;
  const excessElectronVolts = absorbed ? photonEnergyElectronVolts - bandGapElectronVolts.value : 0;
  const usableFraction = absorbed ? bandGapElectronVolts.value / photonEnergyElectronVolts : 0;
  const thermalisedFraction = absorbed ? excessElectronVolts / photonEnergyElectronVolts : 1;

  return ok({
    photonEnergyElectronVolts,
    photonFrequencyHertz: photon.value.frequencyHertz,
    absorbed,
    excessElectronVolts,
    usableFraction,
    thermalisedFraction,
    estimatedUsablePowerWattsPerSquareMetre:
      irradianceWattsPerSquareMetre.value * Math.min(1, usableFraction),
  });
};

const BandDiagram = ({
  state,
  evidence,
}: {
  readonly state: SolarBandState;
  readonly evidence: SolarBandEvidence;
}) => {
  const photonHeight = 190 - Math.min(110, evidence.photonEnergyElectronVolts * 46);
  const gapHeight = 190 - Math.min(110, state.bandGapElectronVolts * 46);
  const arrowColor = evidence.absorbed ? "#1b7f5f" : "#b45309";

  return (
    <svg
      viewBox="0 0 520 260"
      role="img"
      aria-label="Band diagram comparing photon energy with semiconductor band gap"
      className="solar-band-diagram"
    >
      <rect x="24" y="24" width="472" height="212" rx="10" fill="#f8fafc" stroke="#d8dee9" />
      <line x1="86" y1="190" x2="446" y2="190" stroke="#395b82" strokeWidth="5" />
      <line x1="86" y1={gapHeight} x2="446" y2={gapHeight} stroke="#88419d" strokeWidth="5" />
      <text x="92" y="214" fill="#24415f" fontSize="15">
        Valence band
      </text>
      <text x="92" y={gapHeight - 12} fill="#5e2d72" fontSize="15">
        Conduction band
      </text>
      <line x1="242" y1="190" x2="242" y2={gapHeight} stroke="#88419d" strokeWidth="3" />
      <text x="256" y={(190 + gapHeight) / 2 + 4} fill="#5e2d72" fontSize="15">
        E_g = {fmt(state.bandGapElectronVolts)} eV
      </text>
      <line x1="380" y1="210" x2="380" y2={photonHeight} stroke={arrowColor} strokeWidth="4" />
      <polygon
        points={`380,${photonHeight - 10} 371,${photonHeight + 8} 389,${photonHeight + 8}`}
        fill={arrowColor}
      />
      <text x="300" y="228" fill={arrowColor} fontSize="15">
        photon {fmt(evidence.photonEnergyElectronVolts)} eV
      </text>
      <circle cx="242" cy={evidence.absorbed ? gapHeight : 190} r="8" fill={arrowColor} />
      <text x="64" y="54" fill="#2f3a48" fontSize="17" fontWeight="600">
        {evidence.absorbed ? "Absorbed: electron crosses the gap" : "Not absorbed: photon is below the gap"}
      </text>
    </svg>
  );
};

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<SolarBandState>();
  const simState = currentState(state);

  return (
    <section aria-label="Solar band controls" role="region" className="paideia-sim paideia-sim--solar-band">
      <header>
        <p className="eyebrow">SUTD 10.016 · Science for a Sustainable World</p>
        <h2>Photon Energy and Band Gap</h2>
        <p>
          Compare a photon wavelength against a semiconductor band gap to decide whether the
          photon can create an electron-hole pair and how much energy is lost as heat.
        </p>
      </header>

      <ControlGroup legend="Manipulate light and material">
        <Slider
          label="Photon wavelength"
          min={350}
          max={1100}
          step={10}
          value={simState.wavelengthNanometres}
          unit="nm"
          onChange={(wavelengthNanometres) => set("wavelengthNanometres", wavelengthNanometres)}
        />
        <Slider
          label="Semiconductor band gap"
          min={0.8}
          max={2.2}
          step={0.05}
          value={simState.bandGapElectronVolts}
          unit="eV"
          onChange={(bandGapElectronVolts) => set("bandGapElectronVolts", bandGapElectronVolts)}
        />
        <Slider
          label="Irradiance"
          min={200}
          max={1000}
          step={50}
          value={simState.irradianceWattsPerSquareMetre}
          unit="W/m^2"
          onChange={(irradianceWattsPerSquareMetre) =>
            set("irradianceWattsPerSquareMetre", irradianceWattsPerSquareMetre)
          }
        />
      </ControlGroup>

      <div className="sim-actions" role="group" aria-label="Solar band workflow">
        <button type="button" onClick={() => stage.advance()}>
          Reveal band-gap evidence
        </button>
      </div>
    </section>
  );
};

const ObserveStage = () => {
  const simState = currentState(useSimState<Partial<SolarBandState>>());
  const evidence = solarEvidence(simState);

  if (!evidence.ok) {
    return <p role="alert">This photon and band-gap selection cannot be evaluated.</p>;
  }

  return (
    <section aria-label="Observation unlocked" role="region" className="observation-panel">
      <h3>Band-gap evidence</h3>
      <BandDiagram state={simState} evidence={evidence.value} />
      <dl className="readout-grid">
        <div>
          <dt>Photon energy</dt>
          <dd>{fmt(evidence.value.photonEnergyElectronVolts)} eV</dd>
        </div>
        <div>
          <dt>Band gap</dt>
          <dd>{fmt(simState.bandGapElectronVolts)} eV</dd>
        </div>
        <div>
          <dt>Verdict</dt>
          <dd>{evidence.value.absorbed ? "absorbed" : "below band gap"}</dd>
        </div>
        <div>
          <dt>Usable power estimate</dt>
          <dd>{fmt(evidence.value.estimatedUsablePowerWattsPerSquareMetre)} W/m^2</dd>
        </div>
      </dl>

      <section aria-label="Formula panel" className="formula-panel">
        <h3>Formula panel</h3>
        <p aria-label="LaTeX formula source">
          {"E_{photon}=\\frac{hc}{\\lambda}; absorption requires E_{photon}\\ge E_g"}
        </p>
        <p aria-label="Formula legend">
          h is Planck's constant, c is light speed, lambda is wavelength, and E_g is the
          band gap.
        </p>
        <p aria-label="Formula substitution">
          {"lambda = "}
          {fmt(simState.wavelengthNanometres, 0)} nm gives E_photon ={" "}
          {fmt(evidence.value.photonEnergyElectronVolts)} eV; E_g ={" "}
          {fmt(simState.bandGapElectronVolts)} eV.
        </p>
        <p>
          {evidence.value.absorbed
            ? `Interpretation: the photon crosses the gap; ${fmt(
                evidence.value.excessElectronVolts,
              )} eV is thermalised in this one-photon model.`
            : "Interpretation: the photon is below the gap, so it does not create an electron-hole pair."}
        </p>
      </section>
    </section>
  );
};

const StageSurface = () => {
  const stage = useStage();
  if (stage.current === "manipulate") return <ManipulateStage />;
  if (stage.current === "observe") return <ObserveStage />;
  if (stage.current === "explain") {
    return (
      <section aria-label="Transfer prompt" role="region" className="paideia-sim paideia-sim--solar-band">
        <h2>Explain the material trade-off</h2>
        <p>
          Use the formula panel to explain why too small a band gap wastes voltage while too large a
          band gap rejects more sunlight.
        </p>
        <button type="button" onClick={() => stage.reset()}>
          Try another wavelength
        </button>
      </section>
    );
  }

  return (
    <section aria-label="Prediction setup" role="region" className="paideia-sim paideia-sim--solar-band">
        <header>
          <p className="eyebrow">SUTD 10.016 · Science for a Sustainable World</p>
          <h2>Photon Energy and Band Gap</h2>
          <p>
            Compare a photon wavelength against a semiconductor band gap to decide whether the
            photon can create an electron-hole pair and how much energy is lost as heat.
          </p>
        </header>

        <div className="sim-actions" role="group" aria-label="Solar band workflow">
          <button type="button" onClick={() => stage.advance()}>
            Set up band-gap check
          </button>
        </div>
      </section>
  );
};

const SolarEnergyAndBandTheory = () => (
  <SimRuntime packageId={solarEnergyAndBandTheoryPackageId} spec={solarEnergyAndBandTheorySpec}>
    <StageSurface />
  </SimRuntime>
);

export default SolarEnergyAndBandTheory;
