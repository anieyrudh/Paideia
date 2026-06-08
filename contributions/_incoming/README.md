# Incoming Contributions

This folder is a temporary landing zone.

If you are not sure which subject bucket to use, place your package here:

```text
contributions/_incoming/my-simulation/
  manifest.yaml
  lesson.md
  simulation.html
  sources.md
  license.md
```

Then run:

```bash
pnpm contribution:organize -- --write
pnpm contribution:validate
```

The organizer moves the package to `contributions/<subject>/<slug>/` based on
`manifest.yaml`.
