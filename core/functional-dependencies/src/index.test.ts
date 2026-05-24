import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { KernelResult } from "@paideia/shared";

import {
  attributeClosure,
  attributeName,
  attributeSet,
  candidateKeys,
  classifyNormalForm,
  functionalDependency,
  isLosslessBinaryDecomposition,
  isSuperkey,
  minimalCover,
  relationSchema,
  type AttributeName,
  type AttributeSet,
  type FunctionalDependency,
  type RelationSchema,
} from "./index.js";

const unwrap = <T>(result: KernelResult<T>): T => {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("expected ok result");
  }
  return result.value;
};

const attr = (value: string): AttributeName => unwrap(attributeName(value));
const attrs = (...values: string[]): AttributeSet => unwrap(attributeSet(values));
const fd = (left: AttributeSet, right: AttributeSet): FunctionalDependency =>
  unwrap(functionalDependency(left, right));
const schema = (
  attributes: AttributeSet,
  dependencies: readonly FunctionalDependency[],
): RelationSchema => unwrap(relationSchema(attributes, dependencies));

describe("validation", () => {
  it("constructs canonical attributes and rejects empty, padded, or duplicate names", () => {
    expect(attr("student_id")).toBe("student_id");
    expect(attributeName("").ok).toBe(false);
    expect(attributeName(" A").ok).toBe(false);
    expect(unwrap(attributeSet(["B", "A"]))).toEqual(attrs("A", "B"));
    expect(attributeSet(["A", "A"]).ok).toBe(false);
  });

  it("rejects invalid dependencies and dependencies outside the schema", () => {
    expect(functionalDependency(attrs(), attrs("A")).ok).toBe(false);
    expect(functionalDependency(attrs("A"), attrs()).ok).toBe(false);
    expect(relationSchema(attrs("A"), [fd(attrs("A"), attrs("B"))]).ok).toBe(false);
  });

  it("bounds exhaustive key search to small teaching schemas", () => {
    const thirteen = attrs("A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M");
    expect(relationSchema(thirteen, []).ok).toBe(false);
    const dependencies = [
      fd(attrs("A"), attrs("B")),
      fd(attrs("B"), attrs("C")),
      fd(attrs("C"), attrs("D")),
      fd(attrs("D"), attrs("E")),
      fd(attrs("E"), attrs("F")),
      fd(attrs("F"), attrs("G")),
      fd(attrs("G"), attrs("H")),
      fd(attrs("H"), attrs("I")),
      fd(attrs("I"), attrs("J")),
      fd(attrs("J"), attrs("K")),
      fd(attrs("K"), attrs("L")),
      fd(attrs("L"), attrs("M")),
    ];
    expect(attributeClosure(attrs("A"), dependencies).ok).toBe(false);
    expect(minimalCover(dependencies).ok).toBe(false);
  });
});

describe("closure and keys", () => {
  const studentSchema = schema(
    attrs("course", "instructor", "room", "student"),
    [
      fd(attrs("course"), attrs("instructor", "room")),
      fd(attrs("student", "course"), attrs("room")),
    ],
  );

  it("computes attribute closure by repeatedly applying dependencies", () => {
    expect(
      unwrap(attributeClosure(attrs("course"), studentSchema.dependencies)),
    ).toEqual(attrs("course", "instructor", "room"));
  });

  it("identifies superkeys and minimal candidate keys", () => {
    expect(unwrap(isSuperkey(studentSchema, attrs("student", "course")))).toBe(true);
    expect(unwrap(isSuperkey(studentSchema, attrs("course")))).toBe(false);
    expect(unwrap(candidateKeys(studentSchema))).toEqual([attrs("course", "student")]);
  });

  it("does not mutate caller-owned attributes or dependencies", () => {
    const seed = attrs("course");
    const dependencies = [...studentSchema.dependencies];
    const before = JSON.stringify({ seed, dependencies });
    unwrap(attributeClosure(seed, dependencies));
    expect(JSON.stringify({ seed, dependencies })).toBe(before);
  });

  it("closure is extensive and idempotent for simple dependency sets", () => {
    fc.assert(
      fc.property(fc.uniqueArray(fc.constantFrom("A", "B", "C", "D"), { minLength: 1 }), (rawSeed) => {
        const seed = unwrap(attributeSet(rawSeed));
        const dependencies = [
          fd(attrs("A"), attrs("B")),
          fd(attrs("B"), attrs("C")),
          fd(attrs("C"), attrs("D")),
        ];
        const first = unwrap(attributeClosure(seed, dependencies));
        const second = unwrap(attributeClosure(first, dependencies));
        expect(first).toEqual(second);
        for (const attribute of seed) {
          expect(first).toContain(attribute);
        }
      }),
    );
  });
});

describe("minimal cover", () => {
  it("splits dependent attributes and removes redundant dependencies", () => {
    const cover = unwrap(
      minimalCover([
        fd(attrs("A"), attrs("B", "C")),
        fd(attrs("B"), attrs("C")),
        fd(attrs("A"), attrs("B")),
      ]),
    );
    expect(cover).toEqual([
      fd(attrs("A"), attrs("B")),
      fd(attrs("B"), attrs("C")),
    ]);
  });

  it("removes extraneous determinant attributes when closure proves redundancy", () => {
    const cover = unwrap(
      minimalCover([
        fd(attrs("A"), attrs("B")),
        fd(attrs("A", "B"), attrs("C")),
      ]),
    );
    expect(cover).toContainEqual(fd(attrs("A"), attrs("C")));
    expect(cover.every((dependency) => dependency.determinant.length > 0)).toBe(true);
  });
});

describe("normal forms and decomposition", () => {
  it("classifies BCNF when every non-trivial determinant is a superkey", () => {
    const bcnf = schema(attrs("A", "B"), [fd(attrs("A"), attrs("B"))]);
    const report = unwrap(classifyNormalForm(bcnf));
    expect(report.highestNormalForm).toBe("BCNF");
    expect(report.candidateKeys).toEqual([attrs("A")]);
  });

  it("classifies 3NF when dependent attributes are prime but determinants are not superkeys", () => {
    const third = schema(
      attrs("A", "B", "C"),
      [fd(attrs("A", "B"), attrs("C")), fd(attrs("C"), attrs("B"))],
    );
    const report = unwrap(classifyNormalForm(third));
    expect(report.highestNormalForm).toBe("3NF");
    expect(report.violations.some((violation) => violation.includes("BCNF"))).toBe(true);
  });

  it("detects partial dependencies as 1NF only for the teaching schema", () => {
    const partial = schema(
      attrs("student", "course", "instructor"),
      [fd(attrs("student", "course"), attrs("instructor")), fd(attrs("course"), attrs("instructor"))],
    );
    const report = unwrap(classifyNormalForm(partial));
    expect(report.highestNormalForm).toBe("1NF");
    expect(report.violations.some((violation) => violation.includes("partial dependency"))).toBe(true);
  });

  it("checks binary lossless decompositions by shared-attribute closure", () => {
    const base = schema(attrs("A", "B", "C"), [fd(attrs("A"), attrs("B"))]);
    expect(unwrap(isLosslessBinaryDecomposition(base, attrs("A", "B"), attrs("A", "C")))).toBe(true);
    expect(unwrap(isLosslessBinaryDecomposition(base, attrs("A", "C"), attrs("B", "C")))).toBe(false);
    expect(isLosslessBinaryDecomposition(base, attrs("A", "B"), attrs("A")).ok).toBe(false);
  });
});
