export interface GraphNode {
  readonly id: string;
  readonly weight?: number;
}

export interface GraphLink {
  readonly source: string;
  readonly target: string;
  readonly strength?: number;
}

export interface Graph {
  readonly nodes: readonly GraphNode[];
  readonly links: readonly GraphLink[];
}

export interface LayoutNode2D {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

export interface LayoutNode3D {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface LayoutLink {
  readonly source: string;
  readonly target: string;
}

export interface LayoutResult2D {
  readonly nodes: readonly LayoutNode2D[];
  readonly links: readonly LayoutLink[];
}

export interface LayoutResult3D {
  readonly nodes: readonly LayoutNode3D[];
  readonly links: readonly LayoutLink[];
}

export interface TreeNode {
  readonly id: string;
  readonly children?: readonly TreeNode[];
}

export interface ForceDirected2DOptions {
  readonly iterations?: number;
  readonly seed?: number;
  readonly charge?: number;
  readonly linkDistance?: number;
}

export interface ForceDirected3DOptions {
  readonly iterations?: number;
  readonly seed?: number;
}

export interface TreeLayoutOptions {
  readonly orientation?: "vertical" | "horizontal";
  readonly nodeSpacing?: number;
}
