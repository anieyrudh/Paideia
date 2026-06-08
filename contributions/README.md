# Contributions

This folder is for lightweight academic simulation and lesson packages.

Copy `_template/` into a subject folder, rename it, and fill in the files:

```text
contributions/
  physics/
    projectile-motion-lab/
      manifest.yaml
      lesson.md
      simulation.html
      preview.png
      sources.md
      teacher-notes.md
      license.md
```

If you are unsure where the package belongs, copy `_template/` into
`_incoming/` first:

```text
contributions/
  _incoming/
    projectile-motion-lab/
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

Read [docs/public/contribution-packages.md](../docs/public/contribution-packages.md)
before opening a pull request.
