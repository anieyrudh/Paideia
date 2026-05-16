declare module "d3-force" {
  export interface SimulationNodeDatum {
    index?: number;
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
    fx?: number | null;
    fy?: number | null;
  }

  export interface SimulationLinkDatum<NodeDatum extends SimulationNodeDatum> {
    index?: number;
    source: string | NodeDatum;
    target: string | NodeDatum;
  }

  export interface Force<NodeDatum extends SimulationNodeDatum> {
    (alpha: number): void;
    initialize?: (nodes: NodeDatum[], random: () => number) => void;
  }

  export interface ForceLink<NodeDatum extends SimulationNodeDatum, LinkDatum extends SimulationLinkDatum<NodeDatum>>
    extends Force<NodeDatum> {
    id(id: (node: NodeDatum) => string): this;
    distance(distance: number | ((link: LinkDatum) => number)): this;
    strength(strength: number | ((link: LinkDatum) => number)): this;
  }

  export interface ForceManyBody<NodeDatum extends SimulationNodeDatum> extends Force<NodeDatum> {
    strength(strength: number | ((node: NodeDatum) => number)): this;
  }

  export interface Simulation<NodeDatum extends SimulationNodeDatum> {
    force(name: string, force: Force<NodeDatum> | null): this;
    randomSource(source: () => number): this;
    stop(): this;
    tick(iterations?: number): this;
  }

  export function forceCenter<NodeDatum extends SimulationNodeDatum>(x?: number, y?: number): Force<NodeDatum>;
  export function forceLink<NodeDatum extends SimulationNodeDatum, LinkDatum extends SimulationLinkDatum<NodeDatum>>(
    links: LinkDatum[],
  ): ForceLink<NodeDatum, LinkDatum>;
  export function forceManyBody<NodeDatum extends SimulationNodeDatum>(): ForceManyBody<NodeDatum>;
  export function forceSimulation<NodeDatum extends SimulationNodeDatum>(
    nodes: NodeDatum[],
  ): Simulation<NodeDatum>;
}

declare module "d3-force-3d" {
  export interface SimulationNodeDatum {
    index?: number;
    x?: number;
    y?: number;
    z?: number;
    vx?: number;
    vy?: number;
    vz?: number;
    fx?: number | null;
    fy?: number | null;
    fz?: number | null;
  }

  export interface SimulationLinkDatum<NodeDatum extends SimulationNodeDatum> {
    index?: number;
    source: string | NodeDatum;
    target: string | NodeDatum;
  }

  export interface Force<NodeDatum extends SimulationNodeDatum> {
    (alpha: number): void;
    initialize?: (nodes: NodeDatum[], random: () => number) => void;
  }

  export interface ForceLink<NodeDatum extends SimulationNodeDatum, LinkDatum extends SimulationLinkDatum<NodeDatum>>
    extends Force<NodeDatum> {
    id(id: (node: NodeDatum) => string): this;
    distance(distance: number | ((link: LinkDatum) => number)): this;
    strength(strength: number | ((link: LinkDatum) => number)): this;
  }

  export interface ForceManyBody<NodeDatum extends SimulationNodeDatum> extends Force<NodeDatum> {
    strength(strength: number | ((node: NodeDatum) => number)): this;
  }

  export interface Simulation<NodeDatum extends SimulationNodeDatum> {
    force(name: string, force: Force<NodeDatum> | null): this;
    randomSource(source: () => number): this;
    stop(): this;
    tick(iterations?: number): this;
  }

  export function forceCenter<NodeDatum extends SimulationNodeDatum>(x?: number, y?: number, z?: number): Force<NodeDatum>;
  export function forceLink<NodeDatum extends SimulationNodeDatum, LinkDatum extends SimulationLinkDatum<NodeDatum>>(
    links: LinkDatum[],
  ): ForceLink<NodeDatum, LinkDatum>;
  export function forceManyBody<NodeDatum extends SimulationNodeDatum>(): ForceManyBody<NodeDatum>;
  export function forceSimulation<NodeDatum extends SimulationNodeDatum>(
    nodes: NodeDatum[],
    numDimensions?: number,
  ): Simulation<NodeDatum>;
}
