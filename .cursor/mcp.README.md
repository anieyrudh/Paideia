# Cursor MCP — Setup

`mcp.json` declares three MCP servers. They are **disabled by default** (keys prefixed with `_`) because they require tokens.

## Enable

1. Open `.cursor/mcp.json`.
2. For each server you want, drop the leading `_` from its key (`_github` → `github`).
3. Set the corresponding token (see below).
4. Restart Cursor.

## Tokens

| Server | Env var | Where to get it |
|---|---|---|
| `context7` | `CONTEXT7_API_KEY` | https://context7.com (free tier) |
| `github` | `GITHUB_PERSONAL_ACCESS_TOKEN` | GitHub → Settings → Developer settings → PATs. Scopes: `repo`, `read:org` |
| `playwright` | — (no token) | Installs Playwright browsers on first run |

The `${{ secrets.* }}` form in `mcp.json` is a placeholder. Replace with the literal token, or wire through your secrets manager. **Do not commit real tokens.**

## Why these three

- **context7** — resolves up-to-date library docs into the model context window. Prevents API hallucinations (wrong Zod methods, stale React hooks).
- **github** — read issues, PRs, diffs from inside Cursor without leaving the editor.
- **playwright** — autonomous a11y and end-to-end testing, including axe scans against the dev server.
