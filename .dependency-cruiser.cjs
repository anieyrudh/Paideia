/**
 * dependency-cruiser configuration for the Paideia monorepo.
 *
 * Rules enforce the branch boundary contract from docs/architecture.md:
 *   - core/* MUST NOT import from a-level/ or sutd/
 *   - a-level/ MUST NOT import from sutd/
 *   - sutd/ MUST NOT import from a-level/
 *   - a-level/packages MUST NOT import sutd/packages and vice versa
 *
 * Invoked by .github/workflows/boundary-check.yml:
 *   pnpm dlx dependency-cruiser --config .dependency-cruiser.cjs core a-level sutd
 */
module.exports = {
  forbidden: [
    {
      name: "core-no-branch-imports",
      severity: "error",
      comment:
        "Anything under core/** is shared infrastructure and must not depend on a specific branch.",
      from: { path: "^core/" },
      to: { path: "^(a-level|sutd)/" }
    },
    {
      name: "no-cross-branch-imports-1",
      severity: "error",
      comment: "a-level/ MUST NOT import from sutd/. Use core/* for shared code.",
      from: { path: "^a-level/" },
      to: { path: "^sutd/" }
    },
    {
      name: "no-cross-branch-imports-2",
      severity: "error",
      comment: "sutd/ MUST NOT import from a-level/. Use core/* for shared code.",
      from: { path: "^sutd/" },
      to: { path: "^a-level/" }
    },
    {
      name: "branch-no-shared-package-cross",
      severity: "error",
      comment:
        "Branch-specific packages (a-level/packages/** and sutd/packages/**) must not cross-import. Promote shared logic to core/* instead.",
      from: { path: "^a-level/packages/" },
      to: { path: "^sutd/packages/" }
    },
    {
      name: "branch-no-shared-package-cross-reverse",
      severity: "error",
      comment:
        "Branch-specific packages (sutd/packages/** and a-level/packages/**) must not cross-import. Promote shared logic to core/* instead.",
      from: { path: "^sutd/packages/" },
      to: { path: "^a-level/packages/" }
    }
  ],
  options: {
    doNotFollow: {
      path: "node_modules"
    },
    tsConfig: {
      fileName: "tsconfig.base.json"
    },
    tsPreCompilationDeps: true,
    includeOnly: "^(core|a-level|sutd)/",
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"]
    },
    reporterOptions: {
      text: {
        highlightFocused: true
      }
    }
  }
};
