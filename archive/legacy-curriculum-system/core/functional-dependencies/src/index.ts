import { err, ok, type Brand, type KernelResult } from "@paideia/shared";

export type AttributeName = Brand<string, "FunctionalDependencies.AttributeName">;
export type AttributeSet = readonly AttributeName[];

export interface FunctionalDependency {
  readonly determinant: AttributeSet;
  readonly dependent: AttributeSet;
}

export interface RelationSchema {
  readonly attributes: AttributeSet;
  readonly dependencies: readonly FunctionalDependency[];
}

export type NormalForm = "1NF" | "2NF" | "3NF" | "BCNF";

export interface NormalFormReport {
  readonly highestNormalForm: NormalForm;
  readonly violations: readonly string[];
  readonly candidateKeys: readonly AttributeSet[];
}

const MAX_ATTRIBUTES = 12;

export const attributeName = (value: string): KernelResult<AttributeName> => {
  if (value.trim() !== value || value.length === 0) {
    return err("precondition-violated", "attributeName must be non-empty and unpadded");
  }
  return ok(value as AttributeName);
};

export const attributeSet = (values: readonly string[]): KernelResult<AttributeSet> => {
  const attributes: AttributeName[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const checked = attributeName(value);
    if (!checked.ok) {
      return checked;
    }
    if (seen.has(checked.value)) {
      return err("precondition-violated", `attribute ${checked.value} appears more than once`);
    }
    seen.add(checked.value);
    attributes.push(checked.value);
  }
  return ok(canonical(attributes));
};

export const functionalDependency = (
  determinant: AttributeSet,
  dependent: AttributeSet,
): KernelResult<FunctionalDependency> => {
  const checkedDeterminant = validateAttributeSet(determinant, "determinant");
  if (!checkedDeterminant.ok) {
    return checkedDeterminant;
  }
  const checkedDependent = validateAttributeSet(dependent, "dependent");
  if (!checkedDependent.ok) {
    return checkedDependent;
  }
  if (checkedDeterminant.value.length === 0) {
    return err("precondition-violated", "functional dependency determinant must be non-empty");
  }
  if (checkedDependent.value.length === 0) {
    return err("precondition-violated", "functional dependency dependent must be non-empty");
  }
  return ok({
    determinant: checkedDeterminant.value,
    dependent: checkedDependent.value,
  });
};

export const relationSchema = (
  attributes: AttributeSet,
  dependencies: readonly FunctionalDependency[],
): KernelResult<RelationSchema> => {
  const checkedAttributes = validateAttributeSet(attributes, "schema attributes");
  if (!checkedAttributes.ok) {
    return checkedAttributes;
  }
  if (checkedAttributes.value.length > MAX_ATTRIBUTES) {
    return err("out-of-domain", `relation schemas are limited to ${MAX_ATTRIBUTES} attributes`);
  }
  const schemaAttributes = new Set(checkedAttributes.value);
  const checkedDependencies: FunctionalDependency[] = [];
  for (const dependency of dependencies) {
    const checkedDependency = functionalDependency(dependency.determinant, dependency.dependent);
    if (!checkedDependency.ok) {
      return checkedDependency;
    }
    for (const attribute of [
      ...checkedDependency.value.determinant,
      ...checkedDependency.value.dependent,
    ]) {
      if (!schemaAttributes.has(attribute)) {
        return err("precondition-violated", `dependency attribute ${attribute} is not in schema`);
      }
    }
    checkedDependencies.push(checkedDependency.value);
  }
  return ok({ attributes: checkedAttributes.value, dependencies: checkedDependencies });
};

export const attributeClosure = (
  seed: AttributeSet,
  dependencies: readonly FunctionalDependency[],
): KernelResult<AttributeSet> => {
  const checkedSeed = validateAttributeSet(seed, "closure seed");
  if (!checkedSeed.ok) {
    return checkedSeed;
  }
  const checkedDependencies = validateDependencies(dependencies);
  if (!checkedDependencies.ok) {
    return checkedDependencies;
  }
  const universe = canonical([...checkedSeed.value, ...dependencyUniverse(checkedDependencies.value)]);
  if (universe.length > MAX_ATTRIBUTES) {
    return err("out-of-domain", `closure is limited to ${MAX_ATTRIBUTES} attributes`);
  }
  return ok(closureUnchecked(checkedSeed.value, checkedDependencies.value));
};

export const isSuperkey = (
  schema: RelationSchema,
  attributes: AttributeSet,
): KernelResult<boolean> => {
  const checkedSchema = relationSchema(schema.attributes, schema.dependencies);
  if (!checkedSchema.ok) {
    return checkedSchema;
  }
  const checkedAttributes = validateSubset(checkedSchema.value, attributes, "superkey attributes");
  if (!checkedAttributes.ok) {
    return checkedAttributes;
  }
  const closure = closureUnchecked(checkedAttributes.value, checkedSchema.value.dependencies);
  return ok(isSubset(checkedSchema.value.attributes, closure));
};

export const candidateKeys = (
  schema: RelationSchema,
): KernelResult<readonly AttributeSet[]> => {
  const checkedSchema = relationSchema(schema.attributes, schema.dependencies);
  if (!checkedSchema.ok) {
    return checkedSchema;
  }
  const attributes = checkedSchema.value.attributes;
  const keys: AttributeSet[] = [];
  const subsets = attributeSubsets(attributes);
  for (const subset of subsets) {
    if (keys.some((key) => isSubset(key, subset))) {
      continue;
    }
    const closure = closureUnchecked(subset, checkedSchema.value.dependencies);
    if (isSubset(attributes, closure)) {
      keys.push(subset);
    }
  }
  return ok(keys);
};

export const minimalCover = (
  dependencies: readonly FunctionalDependency[],
): KernelResult<readonly FunctionalDependency[]> => {
  const checkedDependencies = validateDependencies(dependencies);
  if (!checkedDependencies.ok) {
    return checkedDependencies;
  }
  const universe = dependencyUniverse(checkedDependencies.value);
  if (universe.length > MAX_ATTRIBUTES) {
    return err("out-of-domain", `minimal cover is limited to ${MAX_ATTRIBUTES} attributes`);
  }
  let cover = splitDependentAttributes(checkedDependencies.value);

  cover = cover.map((dependency, dependencyIndex) => {
    let determinant = [...dependency.determinant];
    for (const attribute of dependency.determinant) {
      if (determinant.length === 1) {
        break;
      }
      const reduced = determinant.filter((candidate) => candidate !== attribute);
      const dependent = dependency.dependent[0];
      if (
        dependent !== undefined &&
        includesAttribute(closureUnchecked(canonical(reduced), cover), dependent)
      ) {
        determinant = reduced;
      }
    }
    return { determinant: canonical(determinant), dependent: dependency.dependent };
  });

  cover = [...deduplicateDependencies(cover)];

  const minimized: FunctionalDependency[] = [];
  for (let index = 0; index < cover.length; index += 1) {
    const dependency = cover[index];
    if (dependency === undefined) {
      return err("precondition-violated", "dependency was missing");
    }
    const rest = [...cover.slice(0, index), ...cover.slice(index + 1)];
    const dependent = dependency.dependent[0];
    if (
      dependent !== undefined &&
      includesAttribute(closureUnchecked(dependency.determinant, rest), dependent)
    ) {
      continue;
    }
    minimized.push(dependency);
  }
  return ok(deduplicateDependencies(minimized));
};

export const classifyNormalForm = (
  schema: RelationSchema,
): KernelResult<NormalFormReport> => {
  const checkedSchema = relationSchema(schema.attributes, schema.dependencies);
  if (!checkedSchema.ok) {
    return checkedSchema;
  }
  const keys = candidateKeys(checkedSchema.value);
  if (!keys.ok) {
    return keys;
  }
  const primeAttributes = new Set(keys.value.flat());
  const violations: string[] = [];
  let satisfiesSecond = true;
  let satisfiesThird = true;
  let satisfiesBcnf = true;

  for (const dependency of splitDependentAttributes(checkedSchema.value.dependencies)) {
    const dependent = dependency.dependent[0];
    if (dependent === undefined || includesAttribute(dependency.determinant, dependent)) {
      continue;
    }
    const determinantSuperkey = isSubset(
      checkedSchema.value.attributes,
      closureUnchecked(dependency.determinant, checkedSchema.value.dependencies),
    );
    const partialDependency = keys.value.some(
      (key) =>
        isProperSubset(dependency.determinant, key) && !primeAttributes.has(dependent),
    );
    if (partialDependency) {
      satisfiesSecond = false;
      violations.push(
        `${formatSet(dependency.determinant)} -> ${dependent} is a partial dependency on a non-prime attribute`,
      );
    }
    if (!determinantSuperkey && !primeAttributes.has(dependent)) {
      satisfiesThird = false;
      violations.push(
        `${formatSet(dependency.determinant)} -> ${dependent} violates 3NF`,
      );
    }
    if (!determinantSuperkey) {
      satisfiesBcnf = false;
      violations.push(
        `${formatSet(dependency.determinant)} -> ${dependent} violates BCNF because the determinant is not a superkey`,
      );
    }
  }

  const highestNormalForm: NormalForm = satisfiesBcnf
    ? "BCNF"
    : satisfiesThird
      ? "3NF"
      : satisfiesSecond
        ? "2NF"
        : "1NF";

  return ok({
    highestNormalForm,
    violations: uniqueStrings(violations),
    candidateKeys: keys.value,
  });
};

export const isLosslessBinaryDecomposition = (
  schema: RelationSchema,
  left: AttributeSet,
  right: AttributeSet,
): KernelResult<boolean> => {
  const checkedSchema = relationSchema(schema.attributes, schema.dependencies);
  if (!checkedSchema.ok) {
    return checkedSchema;
  }
  const checkedLeft = validateSubset(checkedSchema.value, left, "left decomposition");
  if (!checkedLeft.ok) {
    return checkedLeft;
  }
  const checkedRight = validateSubset(checkedSchema.value, right, "right decomposition");
  if (!checkedRight.ok) {
    return checkedRight;
  }
  const union = canonical([...checkedLeft.value, ...checkedRight.value]);
  if (!sameSet(union, checkedSchema.value.attributes)) {
    return err("precondition-violated", "binary decomposition must cover the full schema");
  }
  const shared = intersection(checkedLeft.value, checkedRight.value);
  if (shared.length === 0) {
    return ok(false);
  }
  const sharedClosure = closureUnchecked(shared, checkedSchema.value.dependencies);
  return ok(
    isSubset(checkedLeft.value, sharedClosure) || isSubset(checkedRight.value, sharedClosure),
  );
};

const validateAttributeSet = (
  values: AttributeSet,
  label: string,
): KernelResult<AttributeSet> => {
  const attributes: AttributeName[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const checked = attributeName(value);
    if (!checked.ok) {
      return err(checked.error.code, `${label}: ${checked.error.message}`);
    }
    if (seen.has(checked.value)) {
      return err("precondition-violated", `${label}: attribute ${checked.value} is duplicated`);
    }
    seen.add(checked.value);
    attributes.push(checked.value);
  }
  return ok(canonical(attributes));
};

const validateDependencies = (
  dependencies: readonly FunctionalDependency[],
): KernelResult<readonly FunctionalDependency[]> => {
  const checked: FunctionalDependency[] = [];
  for (const dependency of dependencies) {
    const checkedDependency = functionalDependency(
      dependency.determinant,
      dependency.dependent,
    );
    if (!checkedDependency.ok) {
      return checkedDependency;
    }
    checked.push(checkedDependency.value);
  }
  return ok(checked);
};

const validateSubset = (
  schema: RelationSchema,
  values: AttributeSet,
  label: string,
): KernelResult<AttributeSet> => {
  const checked = validateAttributeSet(values, label);
  if (!checked.ok) {
    return checked;
  }
  const schemaAttributes = new Set(schema.attributes);
  for (const attribute of checked.value) {
    if (!schemaAttributes.has(attribute)) {
      return err("precondition-violated", `${label}: ${attribute} is not in schema`);
    }
  }
  return checked;
};

const closureUnchecked = (
  seed: AttributeSet,
  dependencies: readonly FunctionalDependency[],
): AttributeSet => {
  const closure = new Set<AttributeName>(seed);
  let changed = true;
  while (changed) {
    changed = false;
    for (const dependency of dependencies) {
      if (!dependency.determinant.every((attribute) => closure.has(attribute))) {
        continue;
      }
      for (const attribute of dependency.dependent) {
        if (!closure.has(attribute)) {
          closure.add(attribute);
          changed = true;
        }
      }
    }
  }
  return canonical([...closure]);
};

const attributeSubsets = (attributes: AttributeSet): AttributeSet[] => {
  const subsets: AttributeSet[] = [];
  const total = 2 ** attributes.length;
  for (let mask = 1; mask < total; mask += 1) {
    const subset = attributes.filter((_, index) => (mask & (1 << index)) !== 0);
    subsets.push(canonical(subset));
  }
  subsets.sort((left, right) => left.length - right.length || formatSet(left).localeCompare(formatSet(right)));
  return subsets;
};

const splitDependentAttributes = (
  dependencies: readonly FunctionalDependency[],
): FunctionalDependency[] =>
  dependencies.flatMap((dependency) =>
    dependency.dependent.map((dependent) => ({
      determinant: dependency.determinant,
      dependent: [dependent],
    })),
  );

const dependencyUniverse = (
  dependencies: readonly FunctionalDependency[],
): AttributeSet =>
  canonical(
    dependencies.flatMap((dependency) => [
      ...dependency.determinant,
      ...dependency.dependent,
    ]),
  );

const deduplicateDependencies = (
  dependencies: readonly FunctionalDependency[],
): readonly FunctionalDependency[] => {
  const seen = new Set<string>();
  const output: FunctionalDependency[] = [];
  for (const dependency of dependencies) {
    const key = `${formatSet(dependency.determinant)}->${formatSet(dependency.dependent)}`;
    if (!seen.has(key)) {
      seen.add(key);
      output.push(dependency);
    }
  }
  output.sort((left, right) => {
    const determinantOrder = formatSet(left.determinant).localeCompare(formatSet(right.determinant));
    return determinantOrder === 0
      ? formatSet(left.dependent).localeCompare(formatSet(right.dependent))
      : determinantOrder;
  });
  return output;
};

const canonical = (values: readonly AttributeName[]): AttributeSet =>
  [...new Set(values)].sort((left, right) => left.localeCompare(right));

const intersection = (left: AttributeSet, right: AttributeSet): AttributeSet =>
  canonical(left.filter((attribute) => right.includes(attribute)));

const isSubset = (left: AttributeSet, right: AttributeSet): boolean =>
  left.every((attribute) => right.includes(attribute));

const isProperSubset = (left: AttributeSet, right: AttributeSet): boolean =>
  left.length < right.length && isSubset(left, right);

const sameSet = (left: AttributeSet, right: AttributeSet): boolean =>
  left.length === right.length && isSubset(left, right);

const includesAttribute = (attributes: AttributeSet, attribute: AttributeName): boolean =>
  attributes.includes(attribute);

const formatSet = (attributes: AttributeSet): string => `{${attributes.join(",")}}`;

const uniqueStrings = (values: readonly string[]): readonly string[] => [...new Set(values)];
