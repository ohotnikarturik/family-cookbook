import { serve } from '@hono/node-server';
import { Hono } from 'hono';

/** Ensures the MCP app links the shared application layer at build time (T0.1 wiring check). */
import '@family-cookbook/application';

const defaultPort = 8787;

const app = new Hono();

app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

const port = Number(process.env['MCP_PORT'] ?? defaultPort);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.info(`MCP placeholder listening on http://localhost:${info.port}`);
  },
);
