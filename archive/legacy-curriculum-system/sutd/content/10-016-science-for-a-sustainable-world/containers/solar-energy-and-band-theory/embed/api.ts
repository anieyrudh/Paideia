export type SolarEnergyAndBandTheoryEmbedState = {
  readonly wavelengthNanometres: number;
  readonly bandGapElectronVolts: number;
  readonly irradianceWattsPerSquareMetre: number;
  readonly predictionCommitted: boolean;
};

export type SolarEnergyAndBandTheoryEmbedScore = {
  readonly complete: boolean;
  readonly absorbed: boolean;
  readonly photonEnergyElectronVolts: number;
};

export type SolarEnergyAndBandTheoryEmbedApi = {
  readonly load: (state?: Partial<SolarEnergyAndBandTheoryEmbedState>) => SolarEnergyAndBandTheoryEmbedState;
  readonly saveState: () => SolarEnergyAndBandTheoryEmbedState;
  readonly score: () => SolarEnergyAndBandTheoryEmbedScore;
  readonly resume: (state: Partial<SolarEnergyAndBandTheoryEmbedState>) => SolarEnergyAndBandTheoryEmbedState;
  readonly syncTheme: (theme: "light" | "dark") => void;
  readonly destroy: () => void;
};
