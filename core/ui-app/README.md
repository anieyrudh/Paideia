# @paideia/ui-app

Branch-neutral app-shell helpers for Paideia curriculum pages.

Use this package for reusable search, module navigation, status badges, mastery
toggles, and readiness helpers. It does not own branch routing, generated graph
loading, storage, final layout, or visual brand decisions.

## Example

```tsx
import {
  CurriculumSearch,
  ModuleTabs,
  filterContainers,
  searchResultSummary,
} from "@paideia/ui-app";

const visible = filterContainers(containers, query, selectedModule);

<CurriculumSearch
  label="Search curriculum"
  onChange={setQuery}
  resultSummary={searchResultSummary(visible.ok ? visible.value.length : 0, containers.length)}
  value={query}
/>;

<ModuleTabs
  label="Subject modules"
  modules={["Mechanics", "Statistics"]}
  onChange={setSelectedModule}
  selectedModule={selectedModule}
/>;
```

## Scope

- Controlled components only. The branch app owns state.
- Semantic markup and accessible names are provided by default.
- CSS is intentionally not bundled; branch shells style the emitted elements and
  optional `className`s.
- Search helpers are case-insensitive and diacritic-insensitive.
- Mastery helpers are local-first but storage-agnostic.
