export {
  ResultantMagnitudeSim,
  ResultantVectorDiagram,
  perpendicularPredict,
  resultantComponents,
  resultantMagnitude,
} from "./resultant-magnitude.js";
export {
  ResolutionDiagram,
  ResolvingVectorsSim,
  componentPredict,
  resolveVectorComponents,
} from "./resolving-vectors.js";
export type {
  MetreVector2,
  ResultantVectorModel,
  ResultantVectorDiagramProps,
  VectorState,
} from "./resultant-magnitude.js";
export type {
  ResolutionDiagramProps,
  ResolutionState,
} from "./resolving-vectors.js";

export {
  ImpossibleEquationDetector,
  checkEquation,
  equationCases,
  formatDimension,
  impossibleEquationPredict,
  impossibleEquationSimId,
  physicalQuantitiesPackageId,
  quantities,
} from "./impossible-equation-detector.js";
export type {
  DimensionSymbol,
  DimensionVector,
  EquationCase,
  EquationCheck,
  QuantityDescriptor,
  TermBreakdown,
} from "./impossible-equation-detector.js";
