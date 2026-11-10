import type { CallToolResult } from '@modelcontextprotocol/server';

import { buildToolErrorPayload, type McpErrorCode } from './errors.js';

export function toolSuccessJson(data: unknown): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data),
      },
    ],
  };
}

export function toolError(
  code: McpErrorCode,
  message?: string,
  extra?: { currentVersion?: number },
): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(buildToolErrorPayload(code, message, extra)),
      },
    ],
    isError: true,
  };
}
