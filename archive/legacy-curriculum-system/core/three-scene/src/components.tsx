import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls, TrackballControls } from "@react-three/drei";
import { Color, DoubleSide } from "three";
import type { ReactNode } from "react";
import type { Box3, Function3D, ParametricCurve3D, Rect, VectorField3D } from "@paideia/shared";
import { colourMapViridis } from "./colours.js";
import {
  renderableAtoms,
  renderableBonds,
  sampleParametricCurve3D,
  sampleSurface,
  sampleVectorField3D,
} from "./sampling.js";
import type { Atom, Bond, CameraControls, CameraSpec, SurfacePoint, Vector3Tuple } from "./types.js";

type ThreeSceneProps = Readonly<{
  camera?: CameraSpec;
  controls?: CameraControls;
  background?: string;
  children: ReactNode;
}>;

type Surface3DProps = Readonly<{
  z: Function3D;
  region: Rect;
  samples?: number;
  colourMap?: (z: number) => string;
}>;

type ParametricCurve3DViewProps = Readonly<{
  curve: ParametricCurve3D;
  t: { readonly min: number; readonly max: number };
  samples?: number;
}>;

type VectorField3DViewProps = Readonly<{
  field: VectorField3D;
  region: Box3;
  density?: number;
}>;

type Molecule3DProps = Readonly<{
  atoms: readonly Atom[];
  bonds: readonly Bond[];
  style?: "ball-and-stick" | "space-filling" | "stick";
}>;

type Axes3DProps = Readonly<{
  box: Box3;
  labels?: readonly [string, string, string];
}>;

interface SurfaceMeshData {
  readonly positions: Float32Array;
  readonly colours: Float32Array;
  readonly triangleCount: number;
}

const defaultCamera: {
  readonly position: Vector3Tuple;
  readonly target: Vector3Tuple;
  readonly fov: number;
  readonly near: number;
  readonly far: number;
} = {
  position: [4, 3, 5],
  target: [0, 0, 0],
  fov: 45,
  near: 0.1,
  far: 1_000,
};

const defaultSurfaceBox: Box3 = {
  x: { min: -1, max: 1 },
  y: { min: -1, max: 1 },
  z: { min: -1, max: 1 },
};

const tuple3 = (point: Vector3Tuple | undefined, fallback: Vector3Tuple): [number, number, number] =>
  point === undefined ? [fallback[0], fallback[1], fallback[2]] : [point[0], point[1], point[2]];

const finiteColour = (colour: string): [number, number, number] => {
  try {
    const parsed = new Color(colour);
    return [parsed.r, parsed.g, parsed.b];
  } catch {
    return [1, 1, 1];
  }
};

const inferBox = (points: readonly { readonly x: number; readonly y: number; readonly z: number }[]): Box3 => {
  if (points.length === 0) return defaultSurfaceBox;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const zs = points.map((point) => point.z);
  const expand = (min: number, max: number) => (min === max ? { min: min - 1, max: max + 1 } : { min, max });
  return {
    x: expand(Math.min(...xs), Math.max(...xs)),
    y: expand(Math.min(...ys), Math.max(...ys)),
    z: expand(Math.min(...zs), Math.max(...zs)),
  };
};

const surfaceMeshData = (points: readonly SurfacePoint[], samples: number): SurfaceMeshData => {
  const byCell = new Map(points.map((point) => [`${point.row}:${point.column}`, point]));
  const positions: number[] = [];
  const colours: number[] = [];

  const pushPoint = (point: SurfacePoint) => {
    positions.push(point.x, point.y, point.z);
    colours.push(...finiteColour(point.colour));
  };

  for (let row = 0; row < samples - 1; row += 1) {
    for (let column = 0; column < samples - 1; column += 1) {
      const p00 = byCell.get(`${row}:${column}`);
      const p10 = byCell.get(`${row}:${column + 1}`);
      const p01 = byCell.get(`${row + 1}:${column}`);
      const p11 = byCell.get(`${row + 1}:${column + 1}`);
      if (p00 === undefined || p10 === undefined || p01 === undefined || p11 === undefined) continue;
      pushPoint(p00);
      pushPoint(p10);
      pushPoint(p11);
      pushPoint(p00);
      pushPoint(p11);
      pushPoint(p01);
    }
  }

  return {
    positions: Float32Array.from(positions),
    colours: Float32Array.from(colours),
    triangleCount: positions.length / 9,
  };
};

const pointCloudData = (points: readonly SurfacePoint[]): SurfaceMeshData => {
  const positions: number[] = [];
  const colours: number[] = [];
  for (const point of points) {
    positions.push(point.x, point.y, point.z);
    colours.push(...finiteColour(point.colour));
  }
  return {
    positions: Float32Array.from(positions),
    colours: Float32Array.from(colours),
    triangleCount: 0,
  };
};

const linePositions = (from: Vector3Tuple, to: Vector3Tuple): Float32Array =>
  Float32Array.from([from[0], from[1], from[2], to[0], to[1], to[2]]);

const Line3D = ({
  colour,
  from,
  to,
}: Readonly<{
  colour: string;
  from: Vector3Tuple;
  to: Vector3Tuple;
}>) => (
  <line>
    <bufferGeometry>
      <bufferAttribute attach="attributes-position" args={[linePositions(from, to), 3]} />
    </bufferGeometry>
    <lineBasicMaterial color={colour} />
  </line>
);

export const ThreeScene = ({
  camera,
  controls = "orbit",
  background = "transparent",
  children,
}: ThreeSceneProps) => {
  const resolved = {
    position: tuple3(camera?.position, defaultCamera.position),
    target: tuple3(camera?.target, defaultCamera.target),
    fov: camera?.fov ?? defaultCamera.fov,
    near: camera?.near ?? defaultCamera.near,
    far: camera?.far ?? defaultCamera.far,
  };

  return (
    <Canvas
      aria-label="3D scene"
      camera={{
        far: resolved.far,
        fov: resolved.fov,
        near: resolved.near,
        position: resolved.position,
      }}
      role="img"
      style={{
        background,
        height: "100%",
        minHeight: "var(--three-scene-min-height, 24rem)",
        width: "100%",
      }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight intensity={0.9} position={[4, 6, 5]} />
      {controls === "orbit" ? <OrbitControls makeDefault target={resolved.target} /> : null}
      {controls === "trackball" ? <TrackballControls makeDefault target={resolved.target} /> : null}
      {children}
    </Canvas>
  );
};

export const Surface3D = ({
  z,
  region,
  samples = 32,
  colourMap = colourMapViridis,
}: Surface3DProps) => {
  const sampled = sampleSurface(z, region, samples, colourMap);
  const mesh = surfaceMeshData(sampled.points, sampled.samples);
  const fallbackPoints = mesh.triangleCount === 0 ? pointCloudData(sampled.points) : null;

  return (
    <group data-role="surface" data-samples={sampled.samples}>
      {mesh.triangleCount > 0 ? (
        <mesh data-role="surface-mesh">
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[mesh.positions, 3]} />
            <bufferAttribute attach="attributes-color" args={[mesh.colours, 3]} />
          </bufferGeometry>
          <meshStandardMaterial side={DoubleSide} vertexColors />
        </mesh>
      ) : null}
      {fallbackPoints === null ? null : (
        <points data-role="surface-points">
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[fallbackPoints.positions, 3]} />
            <bufferAttribute attach="attributes-color" args={[fallbackPoints.colours, 3]} />
          </bufferGeometry>
          <pointsMaterial size={0.04} vertexColors />
        </points>
      )}
    </group>
  );
};

export const ParametricCurve3DView = ({
  curve,
  t,
  samples = 160,
}: ParametricCurve3DViewProps) => {
  const sampled = sampleParametricCurve3D(curve, t, samples);

  return (
    <group data-role="parametric-curve" data-samples={samples}>
      {sampled.segments.map((segment, index) => (
        <line data-points={segment.length} data-role="curve-segment" key={`segment-${index}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[Float32Array.from(segment.flatMap((point) => [point.x, point.y, point.z])), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#1f5f8b" />
        </line>
      ))}
    </group>
  );
};

export const VectorField3DView = ({
  field,
  region,
  density = 6,
}: VectorField3DViewProps) => {
  const vectors = sampleVectorField3D(field, region, density);

  return (
    <group data-density={Math.max(2, Math.floor(density))} data-role="vector-field">
      {vectors.map((vector) => (
        <Line3D
          colour="#175cd3"
          from={[vector.x, vector.y, vector.z]}
          key={`${vector.x}:${vector.y}:${vector.z}`}
          to={[
            vector.x + vector.vx * 0.12,
            vector.y + vector.vy * 0.12,
            vector.z + vector.vz * 0.12,
          ]}
        />
      ))}
    </group>
  );
};

export const Molecule3D = ({
  atoms,
  bonds,
  style = "ball-and-stick",
}: Molecule3DProps) => {
  const visibleAtoms = renderableAtoms(atoms);
  const visibleBonds = renderableBonds(visibleAtoms, bonds);
  const atomScale = style === "space-filling" ? 1.15 : style === "stick" ? 0.18 : 0.42;

  return (
    <group data-role="molecule" data-style={style}>
      {visibleBonds.map((bond, index) => (
        <Line3D
          colour={bond.colour}
          from={bond.from.position}
          key={`${bond.from.id}:${bond.to.id}:${index}`}
          to={bond.to.position}
        />
      ))}
      {visibleAtoms.map((atom) => (
        <mesh data-atom-id={atom.id} data-element={atom.element} data-role="atom" key={atom.id} position={tuple3(atom.position, defaultCamera.target)}>
          <sphereGeometry args={[style === "stick" ? atomScale : Math.max(0.08, (atom.radius ?? 0.32) * atomScale), 24, 16]} />
          <meshStandardMaterial color={atom.colour ?? "#d0d5dd"} />
        </mesh>
      ))}
    </group>
  );
};

export const Axes3D = ({ box, labels = ["x", "y", "z"] }: Axes3DProps) => {
  const origin: Vector3Tuple = [box.x.min, box.y.min, box.z.min];
  const xEnd: Vector3Tuple = [box.x.max, box.y.min, box.z.min];
  const yEnd: Vector3Tuple = [box.x.min, box.y.max, box.z.min];
  const zEnd: Vector3Tuple = [box.x.min, box.y.min, box.z.max];
  const axes = [
    { label: labels[0], end: xEnd, colour: "#b42318" },
    { label: labels[1], end: yEnd, colour: "#027a48" },
    { label: labels[2], end: zEnd, colour: "#175cd3" },
  ] as const;
  return (
    <group data-role="axes">
      {axes.map((axis) => (
        <group data-axis={axis.label} key={axis.label}>
          <Line3D colour={axis.colour} from={origin} to={axis.end} />
          <Html position={tuple3(axis.end, origin)}>
            <span>{axis.label}</span>
          </Html>
        </group>
      ))}
    </group>
  );
};
