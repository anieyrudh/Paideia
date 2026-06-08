import {
  type SolarEnergyAndBandTheoryEmbedApi,
  type SolarEnergyAndBandTheoryEmbedScore,
  type SolarEnergyAndBandTheoryEmbedState,
} from "./api";

const defaults: SolarEnergyAndBandTheoryEmbedState = {
  wavelengthNanometres: 650,
  bandGapElectronVolts: 1.1,
  irradianceWattsPerSquareMetre: 800,
  predictionCommitted: false,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const normalise = (
  state: Partial<SolarEnergyAndBandTheoryEmbedState> = {},
): SolarEnergyAndBandTheoryEmbedState => ({
  wavelengthNanometres: clamp(
    state.wavelengthNanometres ?? defaults.wavelengthNanometres,
    350,
    1100,
  ),
  bandGapElectronVolts: clamp(state.bandGapElectronVolts ?? defaults.bandGapElectronVolts, 0.8, 2.2),
  irradianceWattsPerSquareMetre: clamp(
    state.irradianceWattsPerSquareMetre ?? defaults.irradianceWattsPerSquareMetre,
    200,
    1000,
  ),
  predictionCommitted: state.predictionCommitted ?? defaults.predictionCommitted,
});

const photonEnergyElectronVolts = (wavelengthNanometres: number): number =>
  1239.841984 / wavelengthNanometres;

export const createSolarEnergyAndBandTheoryEmbed = (): SolarEnergyAndBandTheoryEmbedApi => {
  let current = defaults;

  const score = (): SolarEnergyAndBandTheoryEmbedScore => {
    const photonEnergy = photonEnergyElectronVolts(current.wavelengthNanometres);
    return {
      complete: current.predictionCommitted,
      absorbed: photonEnergy >= current.bandGapElectronVolts,
      photonEnergyElectronVolts: photonEnergy,
    };
  };

  return {
    load: (state) => {
      current = normalise(state);
      return current;
    },
    saveState: () => current,
    score,
    resume: (state) => {
      current = normalise({ ...current, ...state });
      return current;
    },
    syncTheme: () => undefined,
    destroy: () => undefined,
  };
};

export type {
  SolarEnergyAndBandTheoryEmbedApi,
  SolarEnergyAndBandTheoryEmbedScore,
  SolarEnergyAndBandTheoryEmbedState,
};
