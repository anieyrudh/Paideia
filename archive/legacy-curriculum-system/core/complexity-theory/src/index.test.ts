import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { type KernelResult } from "@paideia/shared";
import {
  checkFiniteManyOneReductionEvidence,
  decideFiniteLanguageMembership,
  finiteWord,
  verifyFiniteCertificate,
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

const word = (value: string) => expectOk(finiteWord(value));

describe("@paideia/complexity-theory finite languages", () => {
  it("decides membership in an explicit finite language", () => {
    const accepted = [word("00"), word("11")];
    const yes = expectOk(decideFiniteLanguageMembership({
      word: word("00"),
      acceptedWords: accepted,
    }));
    expect(yes.decision).toBe("accept");
    expect(Object.isFrozen(yes)).toBe(true);

    const no = expectOk(decideFiniteLanguageMembership({
      word: word("01"),
      acceptedWords: accepted,
    }));
    expect(no.decision).toBe("reject");
  });

  it("rejects empty words in finite language helpers", () => {
    expectErrCode(finiteWord(""), "precondition-violated");
    expectErrCode(decideFiniteLanguageMembership({
      word: "" as never,
      acceptedWords: [word("1")],
    }), "precondition-violated");
  });

  it("agrees with Set membership for generated samples", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string({ minLength: 1, maxLength: 4 }), { maxLength: 8 }),
        fc.string({ minLength: 1, maxLength: 4 }),
        (acceptedRaw, queryRaw) => {
          const accepted = acceptedRaw.map(word);
          const result = expectOk(decideFiniteLanguageMembership({
            word: word(queryRaw),
            acceptedWords: accepted,
          }));
          expect(result.decision).toBe(
            new Set(acceptedRaw).has(queryRaw) ? "accept" : "reject",
          );
        },
      ),
    );
  });
});

describe("@paideia/complexity-theory verifier and reduction evidence", () => {
  it("verifies certificate membership from finite accepting pairs", () => {
    const result = expectOk(verifyFiniteCertificate({
      instance: word("graph-a"),
      certificate: word("cycle-1"),
      acceptingPairs: [
        { instance: word("graph-a"), certificate: word("cycle-1") },
        { instance: word("graph-b"), certificate: word("cycle-3") },
      ],
    }));

    expect(result.decision).toBe("accept");
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("reports finite many-one reduction counterexamples", () => {
    const evidence = expectOk(checkFiniteManyOneReductionEvidence({
      reductionName: "toy-reduction",
      samples: [
        {
          sourceWord: word("a"),
          targetWord: word("f(a)"),
          sourceDecision: "accept",
          targetDecision: "accept",
        },
        {
          sourceWord: word("b"),
          targetWord: word("f(b)"),
          sourceDecision: "reject",
          targetDecision: "accept",
        },
      ],
    }));

    expect(evidence.preservesMembership).toBe(false);
    expect(evidence.counterexamples).toHaveLength(1);
    expect(evidence.counterexamples[0]?.sourceWord).toBe("b");
    expect(Object.isFrozen(evidence)).toBe(true);
    expect(Object.isFrozen(evidence.counterexamples)).toBe(true);
  });

  it("rejects invalid verifier or reduction evidence inputs", () => {
    expectErrCode(verifyFiniteCertificate({
      instance: word("x"),
      certificate: word("c"),
      acceptingPairs: [{ instance: "" as never, certificate: word("c") }],
    }), "precondition-violated");
    expectErrCode(checkFiniteManyOneReductionEvidence({
      reductionName: " ",
      samples: [{
        sourceWord: word("a"),
        targetWord: word("b"),
        sourceDecision: "accept",
        targetDecision: "accept",
      }],
    }), "precondition-violated");
    expectErrCode(checkFiniteManyOneReductionEvidence({
      reductionName: "empty",
      samples: [],
    }), "precondition-violated");
  });
});
