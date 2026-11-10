# MCP completion roadmap

Durable checklist for finishing MCP (§19.2–§19.3). Session notes live in [`MCP_HANDOFF.md`](MCP_HANDOFF.md); connection guide in [`MCP.md`](MCP.md).

## EPIC 4 exit criteria (§19.2 MCP gate)

| Gate | Criterion | Status |
|------|-----------|--------|
| G1 | Local MCP client: `initialize` + `tools/list` (8 tools) | [ ] |
| G2 | Staging OAuth: PKCE + consent + token; beta limits documented | [ ] |
| G3 | Invalid tokens rejected; user-scoped Supabase only | [ ] |
| G4 | Read tools pass role/isolation integration tests | [ ] |
| G5 | Write tools: permissions, `expected_version`, archive `confirm` | [ ] |
| G6 | External client (Cursor/Claude) read (+ write if shipped) smoke | [ ] |
| Spec §17.3 (9) | Forged/expired/wrong-issuer MCP token rejected | [ ] |
| Spec §17.3 (10) | MCP `family_id` tampering cannot cross tenants | [ ] |

## EPIC 4 — easy to miss

- [ ] Local `supabase/config.toml` OAuth 2.1 enabled; asymmetric signing for OAuth
- [ ] Consent UI at `/oauth/consent` (all UI locales)
- [ ] CI: `pnpm --filter @family-cookbook/mcp test` (+ optional Supabase job)
- [ ] `audit_events.client_id` from OAuth (optional migration; deferred unless required)

## EPIC 5 — MCP-relevant hardening

- [ ] MCP rate limits (T5.1)
- [ ] `MCP_ALLOWED_ORIGINS`, secure headers, HSTS on MCP host
- [ ] §17.3 full security suite including MCP
- [ ] Independent MCP deploy, secrets, MCP smoke (T5.3–T5.4)

## Product deferred from EPIC 4

- [ ] `/{locale}/account/security` — revoke connected MCP clients (when APIs exist)
- [ ] Viewer `get_recipe_history` (spec optional)
- [ ] MCP resource templates / prompts (post-MVP)
- [ ] Upload tools via MCP (out of MVP unless requested)

## Operations

- [ ] Client compatibility matrix (Cursor, Claude, last-tested versions)
- [ ] Runbook: token revocation, compromised OAuth client, JWT key rotation
- [ ] Backup/restore with OAuth client re-registration

## Provider forks

- [ ] If Supabase OAuth beta insufficient: alternate OIDC adapter (no security downgrade)
- [ ] Multi-instance: confirm stateless transport; document if session store required

## Decisions

See [`DECISIONS.md`](DECISIONS.md) (EPIC 4 section, added during implementation).
