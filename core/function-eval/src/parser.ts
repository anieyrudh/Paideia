import { err, ok, type KernelResult } from "@paideia/shared";
import type { AstNode } from "./ast.js";
import { functionArity, isAllowedFunction } from "./functions.js";

type Token =
  | { readonly kind: "number"; readonly value: number; readonly lexeme: string }
  | { readonly kind: "identifier"; readonly lexeme: string }
  | { readonly kind: "operator"; readonly lexeme: "+" | "-" | "*" | "/" | "^" }
  | { readonly kind: "leftParen"; readonly lexeme: "(" }
  | { readonly kind: "rightParen"; readonly lexeme: ")" }
  | { readonly kind: "comma"; readonly lexeme: "," }
  | { readonly kind: "eof"; readonly lexeme: "" };

const isDigit = (char: string): boolean => char >= "0" && char <= "9";
const isIdentifierStart = (char: string): boolean =>
  (char >= "A" && char <= "Z") || (char >= "a" && char <= "z") || char === "_";
const isIdentifierPart = (char: string): boolean =>
  isIdentifierStart(char) || isDigit(char);

const lex = (input: string): KernelResult<readonly Token[]> => {
  const tokens: Token[] = [];
  let index = 0;

  while (index < input.length) {
    const char = input[index] as string;

    if (/\s/u.test(char)) {
      index += 1;
      continue;
    }

    if (isDigit(char) || (char === "." && isDigit(input[index + 1] ?? ""))) {
      const start = index;
      if (char === ".") {
        index += 1;
      }
      while (isDigit(input[index] ?? "")) index += 1;
      if (input[index] === ".") {
        index += 1;
        while (isDigit(input[index] ?? "")) index += 1;
      }
      if (input[index] === "e" || input[index] === "E") {
        const exponentStart = index;
        index += 1;
        if (input[index] === "+" || input[index] === "-") index += 1;
        const digitStart = index;
        while (isDigit(input[index] ?? "")) index += 1;
        if (digitStart === index) {
          return err(
            "precondition-violated",
            `Malformed exponent near '${input.slice(exponentStart)}'`,
          );
        }
      }
      const lexeme = input.slice(start, index);
      const value = Number(lexeme);
      if (!Number.isFinite(value)) {
        return err("precondition-violated", `Number literal is not finite: ${lexeme}`);
      }
      tokens.push({ kind: "number", value, lexeme });
      continue;
    }

    if (isIdentifierStart(char)) {
      const start = index;
      index += 1;
      while (isIdentifierPart(input[index] ?? "")) index += 1;
      tokens.push({ kind: "identifier", lexeme: input.slice(start, index) });
      continue;
    }

    if (char === "+" || char === "-" || char === "*" || char === "/" || char === "^") {
      tokens.push({ kind: "operator", lexeme: char });
      index += 1;
      continue;
    }

    if (char === "(") {
      tokens.push({ kind: "leftParen", lexeme: char });
      index += 1;
      continue;
    }

    if (char === ")") {
      tokens.push({ kind: "rightParen", lexeme: char });
      index += 1;
      continue;
    }

    if (char === ",") {
      tokens.push({ kind: "comma", lexeme: char });
      index += 1;
      continue;
    }

    return err("precondition-violated", `Unsupported character '${char}' in expression`);
  }

  tokens.push({ kind: "eof", lexeme: "" });
  return ok(tokens);
};

class Parser {
  private index = 0;

  public constructor(private readonly tokens: readonly Token[]) {}

  public parse(): KernelResult<AstNode> {
    const expression = this.parseExpression();
    if (!expression.ok) return expression;
    const next = this.peek();
    if (next.kind !== "eof") {
      return this.fail(`Unexpected token '${next.lexeme}'`);
    }
    return expression;
  }

  private parseExpression(): KernelResult<AstNode> {
    return this.parseAdditive();
  }

  private parseAdditive(): KernelResult<AstNode> {
    const first = this.parseMultiplicative();
    if (!first.ok) return first;
    let left = first.value;

    while (this.matchesOperator("+") || this.matchesOperator("-")) {
      const operator = this.previous().lexeme as "+" | "-";
      const right = this.parseMultiplicative();
      if (!right.ok) return right;
      left = { kind: "binary", operator, left, right: right.value };
    }

    return ok(left);
  }

  private parseMultiplicative(): KernelResult<AstNode> {
    const first = this.parseUnary();
    if (!first.ok) return first;
    let left = first.value;

    while (this.matchesOperator("*") || this.matchesOperator("/")) {
      const operator = this.previous().lexeme as "*" | "/";
      const right = this.parseUnary();
      if (!right.ok) return right;
      left = { kind: "binary", operator, left, right: right.value };
    }

    return ok(left);
  }

  private parseUnary(): KernelResult<AstNode> {
    if (this.matchesOperator("+") || this.matchesOperator("-")) {
      const operator = this.previous().lexeme as "+" | "-";
      const argument = this.parseUnary();
      if (!argument.ok) return argument;
      return ok({ kind: "unary", operator, argument: argument.value });
    }

    return this.parsePower();
  }

  private parsePower(): KernelResult<AstNode> {
    const left = this.parsePrimary();
    if (!left.ok) return left;

    if (this.matchesOperator("^")) {
      const right = this.parseUnary();
      if (!right.ok) return right;
      return ok({ kind: "binary", operator: "^", left: left.value, right: right.value });
    }

    return left;
  }

  private parsePrimary(): KernelResult<AstNode> {
    if (this.matches("number")) {
      const token = this.previous();
      if (token.kind !== "number") return this.fail("Internal parser state error");
      return ok({ kind: "number", value: token.value });
    }

    if (this.matches("identifier")) {
      const name = this.previous().lexeme;
      if (this.matches("leftParen")) {
        return this.parseCall(name);
      }
      if (name === "pi") return ok({ kind: "constant", name, value: Math.PI });
      if (name === "e") return ok({ kind: "constant", name, value: Math.E });
      return ok({ kind: "variable", name });
    }

    if (this.matches("leftParen")) {
      const expression = this.parseExpression();
      if (!expression.ok) return expression;
      if (!this.matches("rightParen")) {
        return this.fail("Expected ')' after grouped expression");
      }
      return expression;
    }

    return this.fail(`Expected expression, got '${this.peek().lexeme}'`);
  }

  private parseCall(name: string): KernelResult<AstNode> {
    if (!isAllowedFunction(name)) {
      return this.fail(`Function '${name}' is not allowed`);
    }

    const args: AstNode[] = [];
    if (!this.check("rightParen")) {
      do {
        const expression = this.parseExpression();
        if (!expression.ok) return expression;
        args.push(expression.value);
      } while (this.matches("comma"));
    }

    if (!this.matches("rightParen")) {
      return this.fail(`Expected ')' after arguments to '${name}'`);
    }

    const arity = functionArity(name);
    if (args.length < arity.min || args.length > arity.max) {
      const expected =
        arity.min === arity.max ? `${arity.min}` : `${arity.min} or more`;
      return this.fail(`Function '${name}' expects ${expected} arguments`);
    }

    return ok({ kind: "call", name, args });
  }

  private matches(kind: Token["kind"]): boolean {
    if (!this.check(kind)) return false;
    this.index += 1;
    return true;
  }

  private matchesOperator(operator: "+" | "-" | "*" | "/" | "^"): boolean {
    const token = this.peek();
    if (token.kind !== "operator" || token.lexeme !== operator) return false;
    this.index += 1;
    return true;
  }

  private check(kind: Token["kind"]): boolean {
    return this.peek().kind === kind;
  }

  private peek(): Token {
    return this.tokens[this.index] ?? { kind: "eof", lexeme: "" };
  }

  private previous(): Token {
    return this.tokens[this.index - 1] ?? { kind: "eof", lexeme: "" };
  }

  private fail(message: string): KernelResult<never> {
    return err("precondition-violated", message);
  }
}

export const parseExpressionSource = (input: string): KernelResult<AstNode> => {
  if (input.trim().length === 0) {
    return err("precondition-violated", "Expression must not be empty");
  }

  const tokens = lex(input);
  if (!tokens.ok) return tokens;
  return new Parser(tokens.value).parse();
};
