export type AstNode =
  | NumberNode
  | VariableNode
  | ConstantNode
  | UnaryNode
  | BinaryNode
  | CallNode;

export interface NumberNode {
  readonly kind: "number";
  readonly value: number;
}

export interface VariableNode {
  readonly kind: "variable";
  readonly name: string;
}

export interface ConstantNode {
  readonly kind: "constant";
  readonly name: "pi" | "e";
  readonly value: number;
}

export interface UnaryNode {
  readonly kind: "unary";
  readonly operator: "+" | "-";
  readonly argument: AstNode;
}

export interface BinaryNode {
  readonly kind: "binary";
  readonly operator: "+" | "-" | "*" | "/" | "^";
  readonly left: AstNode;
  readonly right: AstNode;
}

export interface CallNode {
  readonly kind: "call";
  readonly name: string;
  readonly args: readonly AstNode[];
}
