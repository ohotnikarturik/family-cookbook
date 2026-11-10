import { serve } from '@hono/node-server';

import { ensureSupabaseServerEnv } from './config/supabase-server-env.js';
import { createMcpApp } from './app.js';

ensureSupabaseServerEnv();
import { getMcpHonoAppOptions, getMcpPort } from './config/env.js';

const app = createMcpApp();
const port = getMcpPort();
const { host } = getMcpHonoAppOptions();

serve(
  {
    fetch: app.fetch,
    port,
    hostname: host,
  },
  (info) => {
    console.info(`MCP listening on http://${info.address}:${info.port} (health: /health, mcp: /mcp)`);
  },
);
