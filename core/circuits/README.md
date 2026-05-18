# @paideia/circuits

Pure DC-circuit kernel for Paideia simulations. It provides Ohm's law, series/parallel equivalent resistance, voltage dividers, and a small modified-nodal-analysis solver for ideal resistors, independent current sources, and independent voltage sources.

The package does not render diagrams or parse schematic text. Callers pass a read-only netlist and receive signed SI-unit values.

## Usage

```ts
import { elementId, nodeId, solveDcCircuit } from "@paideia/circuits";

const gnd = nodeId("gnd");
const n1 = nodeId("n1");
const source = elementId("v1");
const load = elementId("r1");

if (gnd.ok && n1.ok && source.ok && load.ok) {
  const result = solveDcCircuit({
    referenceNode: gnd.value,
    elements: [
      {
        kind: "voltage-source",
        id: source.value,
        positive: n1.value,
        negative: gnd.value,
        voltageVolts: 10,
      },
      {
        kind: "resistor",
        id: load.value,
        from: n1.value,
        to: gnd.value,
        resistanceOhms: 5,
      },
    ],
  });

  // Node n1 is 10 V, resistor current is +2 A from n1 to gnd,
  // and the source current is -2 A by passive sign convention.
  console.log(result);
}
```

## Sign Conventions

- Resistor current is positive from `from` to `to`.
- Current-source current is positive from `from` to `to`.
- Voltage-source current is positive from `positive` to `negative`.
- Positive element power means absorbed power. Negative power means delivered power.

Invalid inputs and singular circuits return `KernelResult.err(...)`; expected circuit failures are not thrown exceptions.
