# Technical Notes

## Architecture

This container is intentionally content-only. It has no simulation declaration,
so the shell should render it as a concept surface with graph, media, embed, and
problem-solving assets.

## Validation Notes

- `container.yaml` validates against `ContainerSpec`.
- `concept-map/concept-map.yaml` validates against `ConceptMapSpec`.
- The embed API exposes `load`, `saveState`, `score`, `resume`, `syncTheme`, and `destroy`.
- No prediction gate is required because `predict_at: none`.

## Anieyrudh Filter pass
