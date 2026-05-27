# core/digital-logic - agent contract

## What this module is

Pure digital-logic kernels for teaching combinational and first sequential
circuits. It owns bit validation, logic-gate truth, binary-vector conversion,
adder arithmetic, truth-table generation, minimal sum-of-products implicants,
and a D flip-flop transition helper. It returns deterministic data only; circuit
schematics, timing diagrams, animations, and learner controls live elsewhere.

## Public interface

Exports from `@paideia/digital-logic`:

- `Bit = 0 | 1`
- `LogicVector = readonly Bit[]` - least-significant bit first for arithmetic.
- `BinaryStringOptions = { width?: number }`
- `GateKind = "not" | "and" | "or" | "xor" | "nand" | "nor" | "xnor"`
- `HalfAdderResult = { sum: Bit; carry: Bit }`
- `FullAdderResult = { sum: Bit; carryOut: Bit }`
- `RippleCarryAddResult = { sum: LogicVector; carryOut: Bit; unsignedValue: number }`
- `TruthTableRow = { inputs: Record<string, Bit>; output: Bit }`
- `TruthTable = { inputNames: readonly string[]; rows: readonly TruthTableRow[] }`
- `ImplicantBit = Bit | null`
- `Implicant = { pattern: readonly ImplicantBit[]; covers: readonly number[] }`
- `SumOfProductsResult = { inputNames: readonly string[]; implicants: readonly Implicant[]; expression: string }`
- `DFlipFlopInput = { d: Bit; previousQ: Bit; clockRisingEdge: boolean }`
- `DFlipFlopResult = { q: Bit; notQ: Bit }`
- `bit(value: boolean | number): KernelResult<Bit>`
- `bits(values: readonly (boolean | number)[]): KernelResult<LogicVector>`
- `binaryStringToBits(value: string): KernelResult<LogicVector>` - accepts strings such as `"1010"` and returns LSB-first bits.
- `bitsToBinaryString(values: LogicVector, opts?: BinaryStringOptions): KernelResult<string>` - renders MSB-first.
- `notBit(value: Bit): KernelResult<Bit>`
- `andGate(values: LogicVector): KernelResult<Bit>`
- `orGate(values: LogicVector): KernelResult<Bit>`
- `xorGate(values: LogicVector): KernelResult<Bit>`
- `nandGate(values: LogicVector): KernelResult<Bit>`
- `norGate(values: LogicVector): KernelResult<Bit>`
- `xnorGate(values: LogicVector): KernelResult<Bit>`
- `evaluateGate(kind: GateKind, values: LogicVector): KernelResult<Bit>`
- `halfAdder(a: Bit, b: Bit): KernelResult<HalfAdderResult>`
- `fullAdder(a: Bit, b: Bit, carryIn: Bit): KernelResult<FullAdderResult>`
- `rippleCarryAdd(a: LogicVector, b: LogicVector, carryIn?: Bit): KernelResult<RippleCarryAddResult>`
- `truthTable(inputNames: readonly string[], evaluator: (inputs: Readonly<Record<string, Bit>>) => Bit): KernelResult<TruthTable>`
- `sumOfProducts(inputNames: readonly string[], minterms: readonly number[], dontCareMinterms?: readonly number[]): KernelResult<SumOfProductsResult>`
- `dFlipFlop(input: DFlipFlopInput): KernelResult<DFlipFlopResult>`

## Invariants the caller must preserve

- Bits are exactly `0` or `1`; booleans may be converted with `bit`.
- Logic vectors are read-only and contain only bits.
- Multi-input gates require at least one input. `not` requires exactly one.
- Arithmetic vectors are least-significant bit first.
- Truth-table input names are unique non-empty identifiers.
- `truthTable` supports 1 to 10 variables.
- Truth-table evaluators must be deterministic and return a `Bit`.
- `sumOfProducts` supports 1 to 6 variables, with minterms and don't-cares in
  range `[0, 2^n - 1]` and no overlap.

Violations return `KernelResult.err("precondition-violated", ...)` or
`KernelResult.err("out-of-domain", ...)`.

## What this module does NOT do

- Does not render circuit diagrams, Karnaugh maps, timing diagrams, or waveforms.
- Does not simulate propagation delay, metastability, tri-state buses, analogue
  voltages, or hazards/glitches.
- Does not parse HDL, Verilog, VHDL, Logisim, or schematic formats.
- Does not maintain sequential-circuit state across calls.
- Does not optimize for hardware area, timing, or FPGA primitives.
- Does not import branch-specific content or flags.

## When to consider this module

Use `core/digital-logic` when a sim needs canonical answers for binary gates,
truth tables, half/full adders, ripple-carry addition, small sum-of-products
logic, or a single D flip-flop transition. If a sim is about to inline Boolean
logic or adder arithmetic, use this module instead.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current consumer.
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` for changes that alter bit order, simplification semantics,
   error behavior, or output expression format for existing valid inputs.

## Anti-patterns (will be rejected in PR review)

- Returning a bare `number` where the public contract says `Bit`.
- Mutating caller-owned input vectors.
- Hidden module-level circuit state or memoization caches.
- Non-deterministic truth-table or simplification ordering.
- Rendering UI from this package.
- Silently accepting invalid bits, duplicate labels, or out-of-range minterms.

## How the Anieyrudh Filter reads this module

The Filter probes that a visual circuit and formula panel agree with this
kernel's truth: gate outputs match Boolean algebra, adders carry correctly, and
truth-table rows cover every input combination exactly once. A simulator whose
animation teaches a different bit order or silently repairs bad inputs fails
review.
