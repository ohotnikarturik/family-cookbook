import type { CallToolResult } from '@modelcontextprotocol/server';

import { toolError, toolSuccessJson } from '../tool-result.js';

type StatusMapping<T extends { status: string }> = {
  ok: (value: Extract<T, { status: 'ok' }>) => unknown;
};

export function useCaseToToolResult<T extends { status: string }>(
  result: T,
  mapping: StatusMapping<T>,
): CallToolResult {
  if (result.status === 'ok') {
    return toolSuccessJson(mapping.ok(result as Extract<T, { status: 'ok' }>));
  }
  switch (result.status) {
    case 'auth_required':
      return toolError('AUTH_REQUIRED');
    case 'validation_error':
      return toolError('VALIDATION_ERROR');
    case 'forbidden':
      return toolError('FORBIDDEN');
    case 'not_found':
      return toolError('NOT_FOUND');
    case 'version_conflict': {
      const current =
        'currentVersion' in result && typeof result.currentVersion === 'number'
          ? result.currentVersion
          : undefined;
      return toolError(
        'VERSION_CONFLICT',
        undefined,
        current !== undefined ? { currentVersion: current } : undefined,
      );
    }
    case 'query_failed':
    case 'mutation_failed':
      return toolError('QUERY_FAILED');
    default:
      return toolError('QUERY_FAILED');
  }
}
