# @paideia/chemistry

Pure first-year chemistry helpers for Paideia simulations.

Use this package when a container needs a reference answer for molar mass,
stoichiometry, ideal gases, strong-acid/base pH, buffer pH, equilibrium
quotients, or Nernst potentials. Chemical data belongs in containers with
citations; this package does not ship an atomic-mass table or electrochemical
series.

```ts
import {
  grams,
  gramsToMoles,
  molarMass,
  molarMassOf,
} from "@paideia/chemistry";

const masses = {
  H: molarMass(1.008),
  O: molarMass(15.999),
};

if (masses.H.ok && masses.O.ok) {
  const waterMass = molarMassOf("H2O", {
    H: masses.H.value,
    O: masses.O.value,
  });
  const sample = grams(18.015);
  if (waterMass.ok && sample.ok) {
    const amount = gramsToMoles(sample.value, waterMass.value);
    console.log(amount);
  }
}
```

## Assumptions

- Formulas use element symbols, integer counts, and parentheses.
- `solveIdealGas` uses `PV = nRT` with `R = 0.082057 L atm mol^-1 K^-1`.
- Strong acid/base pH assumes complete dissociation plus water
  autoionization at 25 C with `Kw = 1e-14` and `pKw = 14`.
- Henderson-Hasselbalch is a buffer approximation, not a full equilibrium
  solver.
- Nernst uses `E = E0 - RT/(nF) ln Q`.

## Constants

- `R = 8.31446261815324 J mol^-1 K^-1`, `F = 96485.33212 C mol^-1`,
  and the default Nernst temperature `298.15 K` follow the NIST CODATA
  constants database: https://physics.nist.gov/cuu/Constants/
- `Kw = 1e-14` and `pKw = 14` are the teaching-standard 25 C water
  autoionization approximation used by this first-year helper:
  https://chem.libretexts.org/Courses/can/CHEM_220%3A_General_Chemistry_II_-_Chemical_Dynamics/04%3A_Acid-Base_Equilibrium/4.03%3A_The_Autoionization_of_Water_and_pH

## Data Ownership

Containers own cited chemistry data. This package validates caller-supplied
tables and inputs, then applies the shared reference formulas.
