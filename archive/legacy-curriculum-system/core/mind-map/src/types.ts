export interface MindMapNode {
  readonly id: string;
  readonly label: string;
  readonly children?: readonly MindMapNode[];
  readonly note?: string;
  readonly collapsed?: boolean;
}
