import { createMcpHandler } from '@modelcontextprotocol/server';

import { createMcpServerInstance } from './server-factory.js';

export function createFamilyCookbookMcpHandler() {
  const options =
    process.env['NODE_ENV'] === 'test' ? ({ responseMode: 'json' as const } satisfies Parameters<typeof createMcpHandler>[1]) : undefined;
  return createMcpHandler(() => createMcpServerInstance(), options);
}

let cachedHandler: ReturnType<typeof createFamilyCookbookMcpHandler> | null = null;

export function getMcpHttpHandler() {
  if (!cachedHandler) {
    cachedHandler = createFamilyCookbookMcpHandler();
  }
  return cachedHandler;
}
