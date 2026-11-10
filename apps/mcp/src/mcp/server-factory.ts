import { McpServer } from '@modelcontextprotocol/server';

import { registerFamilyCookbookTools } from './register-tools.js';

export const MCP_SERVER_NAME = 'family-cookbook';
export const MCP_SERVER_VERSION = '0.1.0';

export function createMcpServerInstance(): McpServer {
  const server = new McpServer({
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
  });
  registerFamilyCookbookTools(server);
  return server;
}
