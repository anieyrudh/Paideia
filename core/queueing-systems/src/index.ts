import { err, ok, type Brand, type KernelResult } from "@paideia/shared";

export type ArrivalRate = Brand<number, "Queueing.ArrivalRate">;
export type ServiceRate = Brand<number, "Queueing.ServiceRate">;
export type Duration = Brand<number, "Queueing.Duration">;
export type CustomerCount = Brand<number, "Queueing.CustomerCount">;
export type Utilization = Brand<number, "Queueing.Utilization">;
export type ServerCount = Brand<number, "Queueing.ServerCount">;
export type DurationSquared = Brand<number, "Queueing.DurationSquared">;

export interface LittleLawFromArrivalWaitInput {
  readonly arrivalRate: ArrivalRate;
  readonly averageTimeInSystem: Duration;
}

export interface LittleLawFromArrivalCountInput {
  readonly arrivalRate: ArrivalRate;
  readonly averageNumberInSystem: CustomerCount;
}

export interface LittleLawFromCountWaitInput {
  readonly averageNumberInSystem: CustomerCount;
  readonly averageTimeInSystem: Duration;
}

export interface UtilizationInput {
  readonly arrivalRate: ArrivalRate;
  readonly serviceRate: ServiceRate;
  readonly servers?: ServerCount;
}

export interface MM1Input {
  readonly arrivalRate: ArrivalRate;
  readonly serviceRate: ServiceRate;
}

export interface MM1Metrics {
  readonly utilization: Utilization;
  readonly averageNumberInSystem: CustomerCount;
  readonly averageNumberInQueue: CustomerCount;
  readonly averageTimeInSystem: Duration;
  readonly averageTimeInQueue: Duration;
}

export interface MMCInput {
  readonly arrivalRate: ArrivalRate;
  readonly serviceRate: ServiceRate;
  readonly servers: ServerCount;
}

export interface MMCMetrics extends MM1Metrics {
  readonly servers: ServerCount;
  readonly probabilitySystemEmpty: number;
  readonly erlangC: number;
}

export interface MG1Input {
  readonly arrivalRate: ArrivalRate;
  readonly meanServiceTime: Duration;
  readonly serviceTimeVariance: DurationSquared;
}

export interface MG1Metrics extends MM1Metrics {
  readonly meanServiceTime: Duration;
  readonly serviceTimeVariance: DurationSquared;
}

export const arrivalRate = (value: number): KernelResult<ArrivalRate> =>
  nonNegativeFinite(value, "arrivalRate").ok
    ? ok(value as ArrivalRate)
    : err("out-of-domain", `arrivalRate must be finite and non-negative, got ${value}`);

export const serviceRate = (value: number): KernelResult<ServiceRate> =>
  positiveFinite(value, "serviceRate").ok
    ? ok(value as ServiceRate)
    : err("out-of-domain", `serviceRate must be finite and positive, got ${value}`);

export const duration = (value: number): KernelResult<Duration> =>
  nonNegativeFinite(value, "duration").ok
    ? ok(value as Duration)
    : err("out-of-domain", `duration must be finite and non-negative, got ${value}`);

export const customerCount = (value: number): KernelResult<CustomerCount> =>
  nonNegativeFinite(value, "customerCount").ok
    ? ok(value as CustomerCount)
    : err("out-of-domain", `customerCount must be finite and non-negative, got ${value}`);

export const serverCount = (value: number): KernelResult<ServerCount> => {
  if (!Number.isSafeInteger(value) || value <= 0) {
    return err(
      "precondition-violated",
      `serverCount must be a positive safe integer, got ${value}`,
    );
  }
  return ok(value as ServerCount);
};

export const utilization = (value: number): KernelResult<Utilization> =>
  nonNegativeFinite(value, "utilization").ok
    ? ok(value as Utilization)
    : err("out-of-domain", `utilization must be finite and non-negative, got ${value}`);

export const durationSquared = (value: number): KernelResult<DurationSquared> =>
  nonNegativeFinite(value, "durationSquared").ok
    ? ok(value as DurationSquared)
    : err(
        "out-of-domain",
        `durationSquared must be finite and non-negative, got ${value}`,
      );

export const littleLawAverageNumber = (
  input: LittleLawFromArrivalWaitInput,
): KernelResult<CustomerCount> => {
  const lambda = arrivalRate(input.arrivalRate);
  if (!lambda.ok) {
    return lambda;
  }
  const wait = duration(input.averageTimeInSystem);
  if (!wait.ok) {
    return wait;
  }
  return checkedCustomerCount(lambda.value * wait.value, "averageNumberInSystem");
};

export const littleLawAverageTime = (
  input: LittleLawFromArrivalCountInput,
): KernelResult<Duration> => {
  const lambda = positiveArrivalRate(input.arrivalRate);
  if (!lambda.ok) {
    return lambda;
  }
  const count = customerCount(input.averageNumberInSystem);
  if (!count.ok) {
    return count;
  }
  return checkedDuration(count.value / lambda.value, "averageTimeInSystem");
};

export const littleLawArrivalRate = (
  input: LittleLawFromCountWaitInput,
): KernelResult<ArrivalRate> => {
  const count = customerCount(input.averageNumberInSystem);
  if (!count.ok) {
    return count;
  }
  const wait = positiveDuration(input.averageTimeInSystem);
  if (!wait.ok) {
    return wait;
  }
  return checkedArrivalRate(count.value / wait.value, "arrivalRate");
};

export const serverUtilization = (
  input: UtilizationInput,
): KernelResult<Utilization> => {
  const lambda = arrivalRate(input.arrivalRate);
  if (!lambda.ok) {
    return lambda;
  }
  const mu = serviceRate(input.serviceRate);
  if (!mu.ok) {
    return mu;
  }
  const servers =
    input.servers === undefined ? ok(1 as ServerCount) : serverCount(input.servers);
  if (!servers.ok) {
    return servers;
  }
  return utilization(lambda.value / (servers.value * mu.value));
};

export const mm1Metrics = (input: MM1Input): KernelResult<MM1Metrics> => {
  const lambda = arrivalRate(input.arrivalRate);
  if (!lambda.ok) {
    return lambda;
  }
  const mu = serviceRate(input.serviceRate);
  if (!mu.ok) {
    return mu;
  }
  const rho = stableUtilization(lambda.value / mu.value);
  if (!rho.ok) {
    return rho;
  }
  const l = checkedCustomerCount(rho.value / (1 - rho.value), "averageNumberInSystem");
  if (!l.ok) {
    return l;
  }
  const lq = checkedCustomerCount(
    (rho.value * rho.value) / (1 - rho.value),
    "averageNumberInQueue",
  );
  if (!lq.ok) {
    return lq;
  }
  const w = checkedDuration(1 / (mu.value - lambda.value), "averageTimeInSystem");
  if (!w.ok) {
    return w;
  }
  const wq = checkedDuration(
    lambda.value / (mu.value * (mu.value - lambda.value)),
    "averageTimeInQueue",
  );
  if (!wq.ok) {
    return wq;
  }
  return ok({
    utilization: rho.value,
    averageNumberInSystem: l.value,
    averageNumberInQueue: lq.value,
    averageTimeInSystem: w.value,
    averageTimeInQueue: wq.value,
  });
};

export const mmcMetrics = (input: MMCInput): KernelResult<MMCMetrics> => {
  const lambda = arrivalRate(input.arrivalRate);
  if (!lambda.ok) {
    return lambda;
  }
  const mu = serviceRate(input.serviceRate);
  if (!mu.ok) {
    return mu;
  }
  const servers = serverCount(input.servers);
  if (!servers.ok) {
    return servers;
  }
  const c = servers.value;
  if (lambda.value === 0) {
    return ok({
      servers: servers.value,
      utilization: 0 as Utilization,
      probabilitySystemEmpty: 1,
      erlangC: 0,
      averageNumberInSystem: 0 as CustomerCount,
      averageNumberInQueue: 0 as CustomerCount,
      averageTimeInSystem: (1 / mu.value) as Duration,
      averageTimeInQueue: 0 as Duration,
    });
  }
  const offeredLoad = lambda.value / mu.value;
  const rho = stableUtilization(offeredLoad / c);
  if (!rho.ok) {
    return rho;
  }

  let term = 1;
  let sum = term;
  for (let n = 1; n < c; n += 1) {
    term *= offeredLoad / n;
    if (!Number.isFinite(term)) {
      return err("out-of-domain", "M/M/c normalisation term is non-finite");
    }
    sum += term;
    if (!Number.isFinite(sum)) {
      return err("out-of-domain", "M/M/c normalisation sum is non-finite");
    }
  }
  const termAtServers = term * (offeredLoad / c);
  if (!Number.isFinite(termAtServers)) {
    return err("out-of-domain", "M/M/c server term is non-finite");
  }
  const tail = termAtServers / (1 - rho.value);
  if (!Number.isFinite(tail)) {
    return err("out-of-domain", "M/M/c tail term is non-finite");
  }
  const p0 = checkedProbabilityLike(1 / (sum + tail), "probabilitySystemEmpty");
  if (!p0.ok) {
    return p0;
  }
  const erlangC = checkedProbabilityLike(tail * p0.value, "erlangC");
  if (!erlangC.ok) {
    return erlangC;
  }
  const lq = checkedCustomerCount(
    (erlangC.value * rho.value) / (1 - rho.value),
    "averageNumberInQueue",
  );
  if (!lq.ok) {
    return lq;
  }
  const wq = checkedDuration(lq.value / lambda.value, "averageTimeInQueue");
  if (!wq.ok) {
    return wq;
  }
  const w = checkedDuration(wq.value + 1 / mu.value, "averageTimeInSystem");
  if (!w.ok) {
    return w;
  }
  const l = checkedCustomerCount(lambda.value * w.value, "averageNumberInSystem");
  if (!l.ok) {
    return l;
  }

  return ok({
    servers: servers.value,
    utilization: rho.value,
    probabilitySystemEmpty: p0.value,
    erlangC: erlangC.value,
    averageNumberInSystem: l.value,
    averageNumberInQueue: lq.value,
    averageTimeInSystem: w.value,
    averageTimeInQueue: wq.value,
  });
};

export const mg1Metrics = (input: MG1Input): KernelResult<MG1Metrics> => {
  const lambda = arrivalRate(input.arrivalRate);
  if (!lambda.ok) {
    return lambda;
  }
  const serviceTime = positiveDuration(input.meanServiceTime);
  if (!serviceTime.ok) {
    return serviceTime;
  }
  const variance = durationSquared(input.serviceTimeVariance);
  if (!variance.ok) {
    return variance;
  }
  const rho = stableUtilization(lambda.value * serviceTime.value);
  if (!rho.ok) {
    return rho;
  }
  const secondMoment = variance.value + serviceTime.value ** 2;
  if (!Number.isFinite(secondMoment)) {
    return err("out-of-domain", "service-time second moment is non-finite");
  }
  const wq = checkedDuration(
    (lambda.value * secondMoment) / (2 * (1 - rho.value)),
    "averageTimeInQueue",
  );
  if (!wq.ok) {
    return wq;
  }
  const w = checkedDuration(wq.value + serviceTime.value, "averageTimeInSystem");
  if (!w.ok) {
    return w;
  }
  const lq = checkedCustomerCount(lambda.value * wq.value, "averageNumberInQueue");
  if (!lq.ok) {
    return lq;
  }
  const l = checkedCustomerCount(lambda.value * w.value, "averageNumberInSystem");
  if (!l.ok) {
    return l;
  }
  return ok({
    utilization: rho.value,
    averageNumberInSystem: l.value,
    averageNumberInQueue: lq.value,
    averageTimeInSystem: w.value,
    averageTimeInQueue: wq.value,
    meanServiceTime: serviceTime.value,
    serviceTimeVariance: variance.value,
  });
};

const positiveArrivalRate = (value: number): KernelResult<ArrivalRate> =>
  positiveFinite(value, "arrivalRate").ok
    ? ok(value as ArrivalRate)
    : err("out-of-domain", `arrivalRate must be finite and positive, got ${value}`);

const positiveDuration = (value: number): KernelResult<Duration> =>
  positiveFinite(value, "duration").ok
    ? ok(value as Duration)
    : err("out-of-domain", `duration must be finite and positive, got ${value}`);

const checkedArrivalRate = (
  value: number,
  label: string,
): KernelResult<ArrivalRate> => {
  const checked = arrivalRate(value);
  return checked.ok ? checked : err("out-of-domain", `${label} is non-finite`);
};

const checkedDuration = (value: number, label: string): KernelResult<Duration> => {
  const checked = duration(value);
  return checked.ok ? checked : err("out-of-domain", `${label} is non-finite`);
};

const checkedCustomerCount = (
  value: number,
  label: string,
): KernelResult<CustomerCount> => {
  const checked = customerCount(value);
  return checked.ok ? checked : err("out-of-domain", `${label} is non-finite`);
};

const stableUtilization = (value: number): KernelResult<Utilization> => {
  const checked = utilization(value);
  if (!checked.ok) {
    return checked;
  }
  if (checked.value >= 1) {
    return err(
      "precondition-violated",
      `queue must be stable with utilization < 1, got ${checked.value}`,
    );
  }
  return checked;
};

const checkedProbabilityLike = (
  value: number,
  label: string,
): KernelResult<number> => {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    return err("out-of-domain", `${label} must be finite and in [0, 1], got ${value}`);
  }
  return ok(value);
};

const positiveFinite = (value: number, label: string): KernelResult<number> => {
  if (!Number.isFinite(value) || value <= 0) {
    return err("out-of-domain", `${label} must be finite and positive, got ${value}`);
  }
  return ok(value);
};

const nonNegativeFinite = (
  value: number,
  label: string,
): KernelResult<number> => {
  if (!Number.isFinite(value) || value < 0) {
    return err(
      "out-of-domain",
      `${label} must be finite and non-negative, got ${value}`,
    );
  }
  return ok(value);
};
