import { Canvas } from "@react-three/fiber";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { Molecule3D, Surface3D, ThreeScene } from "./components.js";

const collectElements = (node: ReactNode, type: string): ReactNode[] => {
  if (Array.isArray(node)) return node.flatMap((child) => collectElements(child, type));
  if (!isValidElement(node)) return [];
  const children = "children" in node.props ? (node.props.children as ReactNode) : undefined;
  return [
    ...(node.type === type ? [node] : []),
    ...collectElements(children, type),
  ];
};

const collectNamedComponents = (node: ReactNode, name: string): ReactNode[] => {
  if (Array.isArray(node)) return node.flatMap((child) => collectNamedComponents(child, name));
  if (!isValidElement(node)) return [];
  const children = "children" in node.props ? (node.props.children as ReactNode) : undefined;
  const typeName = typeof node.type === "function" ? node.type.name : "";
  return [
    ...(typeName === name ? [node] : []),
    ...collectNamedComponents(children, name),
  ];
};

const elementProps = (node: ReactNode): Record<string, unknown> =>
  isValidElement(node) ? (node as ReactElement<Record<string, unknown>>).props : {};

const collectByProp = (node: ReactNode, prop: string): ReactNode[] => {
  if (Array.isArray(node)) return node.flatMap((child) => collectByProp(child, prop));
  if (!isValidElement(node)) return [];
  const props = elementProps(node);
  const children = "children" in props ? (props.children as ReactNode) : undefined;
  return [
    ...(prop in props ? [node] : []),
    ...collectByProp(children, prop),
  ];
};

describe("three-scene R3F components", () => {
  it("sets up a Canvas renderer with lights and controls", () => {
    const scene = ThreeScene({
      background: "#ffffff",
      camera: { position: [2, 3, 4], target: [0, 0, 0] },
      children: <group data-role="child" />,
    });

    expect(isValidElement(scene) ? scene.type : undefined).toBe(Canvas);
    const props = elementProps(scene);
    expect(props.role).toBe("img");
    expect((props.camera as { readonly position: readonly number[] }).position).toEqual([2, 3, 4]);
    expect(collectElements(scene, "ambientLight")).toHaveLength(1);
    expect(collectElements(scene, "directionalLight")).toHaveLength(1);
    expect(collectByProp(scene, "makeDefault")).toHaveLength(1);
  });

  it("renders a finite sampled surface as a 3D mesh and leaves domain holes absent", () => {
    const surface = Surface3D({
      z: (x, y) => (x === 0 && y === 0 ? Number.NaN : x + y),
      region: { x: { min: -1, max: 1 }, y: { min: -1, max: 1 } },
      samples: 3,
    });

    const groups = collectElements(surface, "group");
    const meshes = collectElements(surface, "mesh");
    const bufferAttributes = collectElements(surface, "bufferAttribute");
    expect(elementProps(groups[0])["data-samples"]).toBe(3);
    expect(meshes).toHaveLength(0);
    expect(bufferAttributes).toHaveLength(2);
  });

  it("renders complete finite surfaces as mesh triangles", () => {
    const surface = Surface3D({
      z: (x, y) => x + y,
      region: { x: { min: -1, max: 1 }, y: { min: -1, max: 1 } },
      samples: 3,
    });

    const meshes = collectElements(surface, "mesh");
    const points = collectElements(surface, "points");
    expect(meshes).toHaveLength(1);
    expect(points).toHaveLength(0);
  });

  it("renders molecule atoms and valid bonds as R3F objects", () => {
    const molecule = Molecule3D({
      atoms: [
        { id: "o", element: "O", position: [0, 0, 0], colour: "#cc0000" },
        { id: "h1", element: "H", position: [1, 0, 0] },
        { id: "bad", element: "H", position: [Number.NaN, 0, 0] },
      ],
      bonds: [
        { from: "o", to: "h1" },
        { from: "o", to: "bad" },
      ],
    });

    const atoms = collectElements(molecule, "mesh");
    const bonds = collectNamedComponents(molecule, "Line3D");
    expect(atoms).toHaveLength(2);
    expect(bonds).toHaveLength(1);
    expect(atoms.map((atom) => elementProps(atom)["data-element"])).toEqual(["O", "H"]);
  });
});
