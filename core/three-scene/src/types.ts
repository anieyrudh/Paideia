export type Vector3Tuple = readonly [number, number, number];

export type CameraControls = "orbit" | "trackball" | "none";

export interface CameraSpec {
  readonly position?: Vector3Tuple;
  readonly target?: Vector3Tuple;
  readonly fov?: number;
  readonly near?: number;
  readonly far?: number;
}

export interface Atom {
  readonly id: string;
  readonly element: string;
  readonly position: Vector3Tuple;
  readonly radius?: number;
  readonly colour?: string;
  readonly label?: string;
}

export interface Bond {
  readonly from: string;
  readonly to: string;
  readonly order?: 1 | 2 | 3;
  readonly radius?: number;
  readonly colour?: string;
}

export interface Point3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface SurfacePoint extends Point3D {
  readonly row: number;
  readonly column: number;
  readonly colour: string;
}

export interface CurvePoint extends Point3D {
  readonly t: number;
}

export interface VectorSample3D extends Point3D {
  readonly vx: number;
  readonly vy: number;
  readonly vz: number;
}

export interface RenderedBond {
  readonly from: Atom;
  readonly to: Atom;
  readonly order: 1 | 2 | 3;
  readonly radius: number;
  readonly colour: string;
}
