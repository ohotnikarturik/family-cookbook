# MCP implementation handoff

Living log for agents and developers. Update after each EPIC 4 session.

## Current status

| Task | State | Notes |
|------|-------|-------|
| T4.1 | In progress | MCP transport + tool stubs |
| T4.2 | Not started | |
| T4.3 | Not started | |
| T4.4 | Not started | |
| T4.5 | Not started | |

## Local commands

```bash
pnpm --filter @family-cookbook/mcp dev      # default http://127.0.0.1:8787
pnpm --filter @family-cookbook/mcp test
curl -s http://127.0.0.1:8787/health
```

## Staging OAuth checklist (Gate 2)

User/dashboard actions (not automated):

1. Hosted project → Authentication → OAuth Server → Enable
2. Asymmetric JWT signing key (RS256/ES256)
3. Site URL = `NEXT_PUBLIC_APP_URL`; authorization path `/oauth/consent`
4. Register OAuth clients (exact redirect URIs) or enable dynamic registration (policy TBD)
5. Set `MCP_PUBLIC_URL` to public MCP origin; verify `GET {MCP_PUBLIC_URL}/mcp/oauth-protected-resource`

## Blockers

None.

## Beta / known issues

(To be filled during T4.2.)
