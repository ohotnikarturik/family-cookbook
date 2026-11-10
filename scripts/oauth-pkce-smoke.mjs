#!/usr/bin/env node
/**
 * Staging OAuth PKCE smoke checklist (Gate 2).
 *
 * This script does not embed secrets. Configure:
 * - Staging Supabase project with OAuth 2.1 + asymmetric JWT keys
 * - MCP_PUBLIC_URL reachable from the machine running the MCP client
 * - Web Site URL + /oauth/consent
 *
 * Manual: connect Cursor/Claude using docs/MCP.md, or run an OAuth test client
 * against the discovery document at:
 *   GET {MCP_PUBLIC_URL}/mcp/oauth-protected-resource
 */
const mcpUrl = process.env.MCP_PUBLIC_URL ?? 'http://127.0.0.1:8787';
const metadataUrl = `${mcpUrl.replace(/\/$/, '')}/mcp/oauth-protected-resource`;

console.info('OAuth PKCE staging smoke — manual verification');
console.info(`1. Fetch metadata: GET ${metadataUrl}`);
console.info('2. Complete authorization code + PKCE in a supported MCP client');
console.info('3. Call list_my_families with the issued access token');
console.info('4. Revoke or deny and confirm MCP returns 401');

try {
  const res = await fetch(metadataUrl, { signal: AbortSignal.timeout(5_000) });
  console.info(`Metadata probe: ${res.status} ${res.statusText}`);
  if (res.ok) {
    const body = await res.json();
    console.info('authorization_servers:', body.authorization_servers);
  }
} catch (error) {
  console.warn('Metadata probe failed (is MCP running?):', error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
