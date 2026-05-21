import {
  err,
  hertz,
  joules,
  metres,
  metresPerSecond,
  metresPerSecondSquared,
  ok,
  radians,
  radiansPerSecond,
  seconds,
  watts,
  type Hertz,
  type Joules,
  type KernelResult,
  type Kilograms,
  type Metres,
  type MetresPerSecond,
  type MetresPerSecondSquared,
  type Newtons,
  type NewtonsPerMetre,
  type Radians,
  type RadiansPerSecond,
  type Seconds,
  type Watts,
} from "@paideia/shared";

export const mechanicsTolerance = {
  default: 1e-9,
  tight: 1e-12,
  loose: 1e-6,
} as const;

export interface Vector2 {
  readonly x: number;
  readonly y: number;
}

export interface Kinematics1DInput {
  readonly initialPositionMetres: Metres;
  readonly initialVelocityMetresPerSecond: number;
  readonly accelerationMetresPerSecondSquared: number;
  readonly elapsedSeconds: Seconds;
}

export interface Kinematics1DState {
  readonly positionMetres: Metres;
  readonly displacementMetres: Metres;
  readonly velocityMetresPerSecond: number;
  readonly accelerationMetresPerSecondSquared: number;
  readonly elapsedSeconds: Seconds;
}

export interface ProjectileInput {
  readonly initialPositionMetres: Vector2;
  readonly initialVelocityMetresPerSecond: Vector2;
  readonly accelerationMetresPerSecondSquared: Vector2;
}

export interface ProjectileSample {
  readonly positionMetres: Vector2;
  readonly velocityMetresPerSecond: Vector2;
  readonly accelerationMetresPerSecondSquared: Vector2;
  readonly elapsedSeconds: Seconds;
}

export interface SimpleHarmonicMotionInput {
  readonly equilibriumMetres: Metres;
  readonly amplitudeMetres: Metres;
  readonly angularFrequencyRadiansPerSecond: RadiansPerSecond;
  readonly phaseRadians: Radians;
}

export interface SimpleHarmonicMotionSample {
  readonly positionMetres: Metres;
  readonly displacementFromEquilibriumMetres: Metres;
  readonly velocityMetresPerSecond: MetresPerSecond;
  readonly accelerationMetresPerSecondSquared: MetresPerSecondSquared;
  readonly elapsedSeconds: Seconds;
}

export interface SpringOscillatorInput {
  readonly massKilograms: Kilograms;
  readonly springConstantNewtonsPerMetre: NewtonsPerMetre;
  readonly amplitudeMetres: Metres;
  readonly phaseRadians: Radians;
}

export interface SpringOscillatorTracePoint {
  readonly timeSeconds: Seconds;
  readonly displacementMetres: Metres;
  readonly velocityMetresPerSecond: MetresPerSecond;
  readonly accelerationMetresPerSecondSquared: MetresPerSecondSquared;
  readonly kineticEnergyJoules: Joules;
  readonly potentialEnergyJoules: Joules;
}

export interface SpringOscillatorModel {
  readonly angularFrequencyRadiansPerSecond: RadiansPerSecond;
  readonly periodSeconds: Seconds;
  readonly frequencyHertz: Hertz;
  readonly displacementMetres: Metres;
  readonly velocityMetresPerSecond: MetresPerSecond;
  readonly accelerationMetresPerSecondSquared: MetresPerSecondSquared;
  readonly totalEnergyJoules: Joules;
  readonly kineticEnergyJoules: Joules;
  readonly potentialEnergyJoules: Joules;
  readonly trace: readonly SpringOscillatorTracePoint[];
}

export interface ElasticCollision1DInput {
  readonly mass1Kilograms: Kilograms;
  readonly mass2Kilograms: Kilograms;
  readonly velocity1MetresPerSecond: number;
  readonly velocity2MetresPerSecond: number;
}

export interface ElasticCollision1DResult {
  readonly finalVelocity1MetresPerSecond: number;
  readonly finalVelocity2MetresPerSecond: number;
  readonly totalMomentumBeforeKilogramMetresPerSecond: number;
  readonly totalMomentumAfterKilogramMetresPerSecond: number;
  readonly totalKineticEnergyBeforeJoules: Joules;
  readonly totalKineticEnergyAfterJoules: Joules;
}

export interface WorkEnergyTransferResult {
  readonly finalKineticEnergyJoules: Joules;
  readonly kineticEnergyChangeJoules: Joules;
}

const finite = (value: number, label: string): KernelResult<void> =>
  Number.isFinite(value)
    ? ok(undefined)
    : err("precondition-violated", `${label} must be finite; got ${value}`);

const finiteDerived = (value: number, label: string): KernelResult<void> =>
  Number.isFinite(value)
    ? ok(undefined)
    : err("numerical-instability", `${label} must be finite after computation; got ${value}`);

const finiteVector = (vector: Vector2, label: string): KernelResult<void> => {
  const x = finite(vector.x, `${label}.x`);
  if (!x.ok) return x;
  return finite(vector.y, `${label}.y`);
};

const finiteDerivedVector = (vector: Vector2, label: string): KernelResult<void> => {
  const x = finiteDerived(vector.x, `${label}.x`);
  if (!x.ok) return x;
  return finiteDerived(vector.y, `${label}.y`);
};

const nonNegative = (value: number, label: string): KernelResult<void> => {
  const valid = finite(value, label);
  if (!valid.ok) return valid;
  return value >= 0
    ? ok(undefined)
    : err("precondition-violated", `${label} must be non-negative; got ${value}`);
};

const positive = (value: number, label: string): KernelResult<void> => {
  const valid = finite(value, label);
  if (!valid.ok) return valid;
  return value > 0
    ? ok(undefined)
    : err("precondition-violated", `${label} must be positive; got ${value}`);
};

const add = (a: Vector2, b: Vector2): Vector2 => ({
  x: a.x + b.x,
  y: a.y + b.y,
});

const scale = (vector: Vector2, scalar: number): Vector2 => ({
  x: vector.x * scalar,
  y: vector.y * scalar,
});

const kineticEnergyValue = (massKilograms: number, speedMetresPerSecond: number): number =>
  0.5 * massKilograms * speedMetresPerSecond * speedMetresPerSecond;

export const kinematics1D = (input: Kinematics1DInput): KernelResult<Kinematics1DState> => {
  const t = input.elapsedSeconds;
  const time = nonNegative(t, "elapsedSeconds");
  if (!time.ok) return time;

  const position = finite(input.initialPositionMetres, "initialPositionMetres");
  if (!position.ok) return position;
  const velocity = finite(input.initialVelocityMetresPerSecond, "initialVelocityMetresPerSecond");
  if (!velocity.ok) return velocity;
  const acceleration = finite(
    input.accelerationMetresPerSecondSquared,
    "accelerationMetresPerSecondSquared",
  );
  if (!acceleration.ok) return acceleration;

  const displacement =
    input.initialVelocityMetresPerSecond * t +
    0.5 * input.accelerationMetresPerSecondSquared * t * t;
  const positionMetres = input.initialPositionMetres + displacement;
  const velocityMetresPerSecond =
    input.initialVelocityMetresPerSecond + input.accelerationMetresPerSecondSquared * t;

  const computedDisplacement = finiteDerived(displacement, "displacementMetres");
  if (!computedDisplacement.ok) return computedDisplacement;
  const computedPosition = finiteDerived(positionMetres, "positionMetres");
  if (!computedPosition.ok) return computedPosition;
  const computedVelocity = finiteDerived(velocityMetresPerSecond, "velocityMetresPerSecond");
  if (!computedVelocity.ok) return computedVelocity;

  return ok({
    positionMetres: metres(positionMetres),
    displacementMetres: metres(displacement),
    velocityMetresPerSecond,
    accelerationMetresPerSecondSquared: input.accelerationMetresPerSecondSquared,
    elapsedSeconds: input.elapsedSeconds,
  });
};

export const projectileAt = (
  input: ProjectileInput,
  elapsedSeconds: Seconds,
): KernelResult<ProjectileSample> => {
  const time = nonNegative(elapsedSeconds, "elapsedSeconds");
  if (!time.ok) return time;
  const initialPosition = finiteVector(input.initialPositionMetres, "initialPositionMetres");
  if (!initialPosition.ok) return initialPosition;
  const initialVelocity = finiteVector(
    input.initialVelocityMetresPerSecond,
    "initialVelocityMetresPerSecond",
  );
  if (!initialVelocity.ok) return initialVelocity;
  const acceleration = finiteVector(
    input.accelerationMetresPerSecondSquared,
    "accelerationMetresPerSecondSquared",
  );
  if (!acceleration.ok) return acceleration;

  const velocity = add(
    input.initialVelocityMetresPerSecond,
    scale(input.accelerationMetresPerSecondSquared, elapsedSeconds),
  );
  const position = add(
    input.initialPositionMetres,
    add(
      scale(input.initialVelocityMetresPerSecond, elapsedSeconds),
      scale(input.accelerationMetresPerSecondSquared, 0.5 * elapsedSeconds * elapsedSeconds),
    ),
  );

  const computedPosition = finiteDerivedVector(position, "positionMetres");
  if (!computedPosition.ok) return computedPosition;
  const computedVelocity = finiteDerivedVector(velocity, "velocityMetresPerSecond");
  if (!computedVelocity.ok) return computedVelocity;

  return ok({
    positionMetres: position,
    velocityMetresPerSecond: velocity,
    accelerationMetresPerSecondSquared: { ...input.accelerationMetresPerSecondSquared },
    elapsedSeconds,
  });
};

export const netForce = (forces: readonly Vector2[]): KernelResult<Vector2> => {
  let total: Vector2 = { x: 0, y: 0 };
  for (const force of forces) {
    const valid = finiteVector(force, "force");
    if (!valid.ok) return valid;
    total = add(total, force);
  }
  const computedTotal = finiteDerivedVector(total, "netForce");
  if (!computedTotal.ok) return computedTotal;
  return ok(total);
};

export const accelerationFromForce = (
  forceNewtons: Vector2,
  massKilograms: Kilograms,
): KernelResult<Vector2> => {
  const force = finiteVector(forceNewtons, "forceNewtons");
  if (!force.ok) return force;
  const mass = positive(massKilograms, "massKilograms");
  if (!mass.ok) return mass;

  const acceleration = scale(forceNewtons, 1 / massKilograms);
  const computedAcceleration = finiteDerivedVector(acceleration, "accelerationMetresPerSecondSquared");
  if (!computedAcceleration.ok) return computedAcceleration;
  return ok(acceleration);
};

export const workDone = (
  forceNewtons: Newtons,
  displacementMetres: Metres,
  angleRadians: Radians = radians(0),
): KernelResult<Joules> => {
  const force = nonNegative(forceNewtons, "forceNewtons");
  if (!force.ok) return force;
  const displacement = nonNegative(displacementMetres, "displacementMetres");
  if (!displacement.ok) return displacement;
  const angle = finite(angleRadians, "angleRadians");
  if (!angle.ok) return angle;

  const workJoules = forceNewtons * displacementMetres * Math.cos(angleRadians);
  const computedWork = finiteDerived(workJoules, "workJoules");
  if (!computedWork.ok) return computedWork;
  return ok(joules(workJoules));
};

export const kineticEnergy = (
  massKilograms: Kilograms,
  speedMetresPerSecond: MetresPerSecond,
): KernelResult<Joules> => {
  const mass = positive(massKilograms, "massKilograms");
  if (!mass.ok) return mass;
  const speed = nonNegative(speedMetresPerSecond, "speedMetresPerSecond");
  if (!speed.ok) return speed;

  const energyJoules = kineticEnergyValue(massKilograms, speedMetresPerSecond);
  const computedEnergy = finiteDerived(energyJoules, "kineticEnergyJoules");
  if (!computedEnergy.ok) return computedEnergy;
  return ok(joules(energyJoules));
};

export const workEnergyTransfer = (
  initialKineticEnergyJoules: Joules,
  workJoules: Joules,
): KernelResult<WorkEnergyTransferResult> => {
  const initialEnergy = nonNegative(initialKineticEnergyJoules, "initialKineticEnergyJoules");
  if (!initialEnergy.ok) return initialEnergy;
  const work = finite(workJoules, "workJoules");
  if (!work.ok) return work;

  const finalEnergy = Math.max(0, initialKineticEnergyJoules + workJoules);
  const energyChange = finalEnergy - initialKineticEnergyJoules;
  const computedFinalEnergy = finiteDerived(finalEnergy, "finalKineticEnergyJoules");
  if (!computedFinalEnergy.ok) return computedFinalEnergy;
  const computedEnergyChange = finiteDerived(energyChange, "kineticEnergyChangeJoules");
  if (!computedEnergyChange.ok) return computedEnergyChange;

  return ok({
    finalKineticEnergyJoules: joules(finalEnergy),
    kineticEnergyChangeJoules: joules(energyChange),
  });
};

export const averagePower = (workJoules: Joules, elapsedSeconds: Seconds): KernelResult<Watts> => {
  const work = finite(workJoules, "workJoules");
  if (!work.ok) return work;
  const elapsed = positive(elapsedSeconds, "elapsedSeconds");
  if (!elapsed.ok) return elapsed;

  const powerWatts = workJoules / elapsedSeconds;
  const computedPower = finiteDerived(powerWatts, "averagePowerWatts");
  if (!computedPower.ok) return computedPower;
  return ok(watts(powerWatts));
};

export const momentum1D = (
  massKilograms: Kilograms,
  velocityMetresPerSecond: number,
): KernelResult<number> => {
  const mass = positive(massKilograms, "massKilograms");
  if (!mass.ok) return mass;
  const velocity = finite(velocityMetresPerSecond, "velocityMetresPerSecond");
  if (!velocity.ok) return velocity;

  const momentum = massKilograms * velocityMetresPerSecond;
  const computedMomentum = finiteDerived(momentum, "momentumKilogramMetresPerSecond");
  if (!computedMomentum.ok) return computedMomentum;
  return ok(momentum);
};

export const elasticCollision1D = (
  input: ElasticCollision1DInput,
): KernelResult<ElasticCollision1DResult> => {
  const mass1 = positive(input.mass1Kilograms, "mass1Kilograms");
  if (!mass1.ok) return mass1;
  const mass2 = positive(input.mass2Kilograms, "mass2Kilograms");
  if (!mass2.ok) return mass2;
  const velocity1 = finite(input.velocity1MetresPerSecond, "velocity1MetresPerSecond");
  if (!velocity1.ok) return velocity1;
  const velocity2 = finite(input.velocity2MetresPerSecond, "velocity2MetresPerSecond");
  if (!velocity2.ok) return velocity2;

  const totalMass = input.mass1Kilograms + input.mass2Kilograms;
  const computedTotalMass = finiteDerived(totalMass, "totalMassKilograms");
  if (!computedTotalMass.ok) return computedTotalMass;

  const finalVelocity1 =
    ((input.mass1Kilograms - input.mass2Kilograms) / totalMass) *
      input.velocity1MetresPerSecond +
    ((2 * input.mass2Kilograms) / totalMass) * input.velocity2MetresPerSecond;
  const finalVelocity2 =
    ((2 * input.mass1Kilograms) / totalMass) * input.velocity1MetresPerSecond +
    ((input.mass2Kilograms - input.mass1Kilograms) / totalMass) *
      input.velocity2MetresPerSecond;
  const totalMomentumBefore =
    input.mass1Kilograms * input.velocity1MetresPerSecond +
    input.mass2Kilograms * input.velocity2MetresPerSecond;
  const totalMomentumAfter =
    input.mass1Kilograms * finalVelocity1 + input.mass2Kilograms * finalVelocity2;
  const totalKineticEnergyBefore =
    kineticEnergyValue(input.mass1Kilograms, input.velocity1MetresPerSecond) +
    kineticEnergyValue(input.mass2Kilograms, input.velocity2MetresPerSecond);
  const totalKineticEnergyAfter =
    kineticEnergyValue(input.mass1Kilograms, finalVelocity1) +
    kineticEnergyValue(input.mass2Kilograms, finalVelocity2);

  const computedFinalVelocity1 = finiteDerived(finalVelocity1, "finalVelocity1MetresPerSecond");
  if (!computedFinalVelocity1.ok) return computedFinalVelocity1;
  const computedFinalVelocity2 = finiteDerived(finalVelocity2, "finalVelocity2MetresPerSecond");
  if (!computedFinalVelocity2.ok) return computedFinalVelocity2;
  const computedMomentumBefore = finiteDerived(
    totalMomentumBefore,
    "totalMomentumBeforeKilogramMetresPerSecond",
  );
  if (!computedMomentumBefore.ok) return computedMomentumBefore;
  const computedMomentumAfter = finiteDerived(
    totalMomentumAfter,
    "totalMomentumAfterKilogramMetresPerSecond",
  );
  if (!computedMomentumAfter.ok) return computedMomentumAfter;
  const computedEnergyBefore = finiteDerived(totalKineticEnergyBefore, "totalKineticEnergyBeforeJoules");
  if (!computedEnergyBefore.ok) return computedEnergyBefore;
  const computedEnergyAfter = finiteDerived(totalKineticEnergyAfter, "totalKineticEnergyAfterJoules");
  if (!computedEnergyAfter.ok) return computedEnergyAfter;

  return ok({
    finalVelocity1MetresPerSecond: finalVelocity1,
    finalVelocity2MetresPerSecond: finalVelocity2,
    totalMomentumBeforeKilogramMetresPerSecond: totalMomentumBefore,
    totalMomentumAfterKilogramMetresPerSecond: totalMomentumAfter,
    totalKineticEnergyBeforeJoules: joules(totalKineticEnergyBefore),
    totalKineticEnergyAfterJoules: joules(totalKineticEnergyAfter),
  });
};

export const simpleHarmonicMotion = (
  input: SimpleHarmonicMotionInput,
  elapsedSeconds: Seconds,
): KernelResult<SimpleHarmonicMotionSample> => {
  const time = nonNegative(elapsedSeconds, "elapsedSeconds");
  if (!time.ok) return time;
  const equilibrium = finite(input.equilibriumMetres, "equilibriumMetres");
  if (!equilibrium.ok) return equilibrium;
  const amplitude = nonNegative(input.amplitudeMetres, "amplitudeMetres");
  if (!amplitude.ok) return amplitude;
  const angularFrequency = positive(
    input.angularFrequencyRadiansPerSecond,
    "angularFrequencyRadiansPerSecond",
  );
  if (!angularFrequency.ok) return angularFrequency;
  const phase = finite(input.phaseRadians, "phaseRadians");
  if (!phase.ok) return phase;

  const angle = input.angularFrequencyRadiansPerSecond * elapsedSeconds + input.phaseRadians;
  const computedAngle = finiteDerived(angle, "oscillationAngleRadians");
  if (!computedAngle.ok) return computedAngle;

  const displacement = input.amplitudeMetres * Math.cos(angle);
  const position = input.equilibriumMetres + displacement;
  const velocityMetresPerSecond =
    -input.amplitudeMetres * input.angularFrequencyRadiansPerSecond * Math.sin(angle);
  const accelerationMetresPerSecondSquared =
    -input.angularFrequencyRadiansPerSecond * input.angularFrequencyRadiansPerSecond * displacement;

  const computedDisplacement = finiteDerived(displacement, "displacementFromEquilibriumMetres");
  if (!computedDisplacement.ok) return computedDisplacement;
  const computedPosition = finiteDerived(position, "positionMetres");
  if (!computedPosition.ok) return computedPosition;
  const computedVelocity = finiteDerived(velocityMetresPerSecond, "velocityMetresPerSecond");
  if (!computedVelocity.ok) return computedVelocity;
  const computedAcceleration = finiteDerived(
    accelerationMetresPerSecondSquared,
    "accelerationMetresPerSecondSquared",
  );
  if (!computedAcceleration.ok) return computedAcceleration;

  return ok({
    positionMetres: metres(position),
    displacementFromEquilibriumMetres: metres(displacement),
    velocityMetresPerSecond: metresPerSecond(velocityMetresPerSecond),
    accelerationMetresPerSecondSquared: metresPerSecondSquared(accelerationMetresPerSecondSquared),
    elapsedSeconds,
  });
};

export const springOscillator = (
  input: SpringOscillatorInput,
  elapsedSeconds: Seconds,
  sampleCount = 48,
): KernelResult<SpringOscillatorModel> => {
  const mass = positive(input.massKilograms, "massKilograms");
  if (!mass.ok) return mass;
  const stiffness = positive(input.springConstantNewtonsPerMetre, "springConstantNewtonsPerMetre");
  if (!stiffness.ok) return stiffness;
  const amplitude = nonNegative(input.amplitudeMetres, "amplitudeMetres");
  if (!amplitude.ok) return amplitude;
  const phase = finite(input.phaseRadians, "phaseRadians");
  if (!phase.ok) return phase;
  const samples = positive(sampleCount, "sampleCount");
  if (!samples.ok) return samples;

  const omegaValue = Math.sqrt(input.springConstantNewtonsPerMetre / input.massKilograms);
  const computedOmega = finiteDerived(omegaValue, "angularFrequencyRadiansPerSecond");
  if (!computedOmega.ok) return computedOmega;
  const periodValue = (2 * Math.PI) / omegaValue;
  const computedPeriod = finiteDerived(periodValue, "periodSeconds");
  if (!computedPeriod.ok) return computedPeriod;
  const frequencyValue = 1 / periodValue;
  const computedFrequency = finiteDerived(frequencyValue, "frequencyHertz");
  if (!computedFrequency.ok) return computedFrequency;

  const omega = radiansPerSecond(omegaValue);
  const period = seconds(periodValue);
  const current = simpleHarmonicMotion(
    {
      equilibriumMetres: metres(0),
      amplitudeMetres: input.amplitudeMetres,
      angularFrequencyRadiansPerSecond: omega,
      phaseRadians: input.phaseRadians,
    },
    elapsedSeconds,
  );
  if (!current.ok) return current;

  const totalEnergyValue = 0.5 * input.springConstantNewtonsPerMetre * input.amplitudeMetres ** 2;
  const potentialEnergyValue =
    0.5 *
    input.springConstantNewtonsPerMetre *
    current.value.displacementFromEquilibriumMetres ** 2;
  const computedTotalEnergy = finiteDerived(totalEnergyValue, "totalEnergyJoules");
  if (!computedTotalEnergy.ok) return computedTotalEnergy;
  const computedPotentialEnergy = finiteDerived(potentialEnergyValue, "potentialEnergyJoules");
  if (!computedPotentialEnergy.ok) return computedPotentialEnergy;
  const kinetic = kineticEnergy(
    input.massKilograms,
    metresPerSecond(Math.abs(current.value.velocityMetresPerSecond)),
  );
  if (!kinetic.ok) return kinetic;

  const count = Math.max(1, Math.floor(sampleCount));
  const traceDuration = Math.min(8, periodValue * 2);
  const trace: SpringOscillatorTracePoint[] = [];
  for (let index = 0; index <= count; index += 1) {
    const time = seconds((index / count) * traceDuration);
    const sample = simpleHarmonicMotion(
      {
        equilibriumMetres: metres(0),
        amplitudeMetres: input.amplitudeMetres,
        angularFrequencyRadiansPerSecond: omega,
        phaseRadians: input.phaseRadians,
      },
      time,
    );
    if (!sample.ok) return sample;
    const potentialValue =
      0.5 *
      input.springConstantNewtonsPerMetre *
      sample.value.displacementFromEquilibriumMetres ** 2;
    const computedPotential = finiteDerived(potentialValue, "tracePotentialEnergyJoules");
    if (!computedPotential.ok) return computedPotential;
    const kineticSample = kineticEnergy(
      input.massKilograms,
      metresPerSecond(Math.abs(sample.value.velocityMetresPerSecond)),
    );
    if (!kineticSample.ok) return kineticSample;
    trace.push({
      timeSeconds: time,
      displacementMetres: sample.value.displacementFromEquilibriumMetres,
      velocityMetresPerSecond: metresPerSecond(sample.value.velocityMetresPerSecond),
      accelerationMetresPerSecondSquared: metresPerSecondSquared(
        sample.value.accelerationMetresPerSecondSquared,
      ),
      kineticEnergyJoules: kineticSample.value,
      potentialEnergyJoules: joules(Math.max(0, potentialValue)),
    });
  }

  return ok({
    angularFrequencyRadiansPerSecond: omega,
    periodSeconds: period,
    frequencyHertz: hertz(frequencyValue),
    displacementMetres: current.value.displacementFromEquilibriumMetres,
    velocityMetresPerSecond: metresPerSecond(current.value.velocityMetresPerSecond),
    accelerationMetresPerSecondSquared: metresPerSecondSquared(
      current.value.accelerationMetresPerSecondSquared,
    ),
    totalEnergyJoules: joules(Math.max(0, totalEnergyValue)),
    kineticEnergyJoules: kinetic.value,
    potentialEnergyJoules: joules(Math.max(0, potentialEnergyValue)),
    trace,
  });
};
