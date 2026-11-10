import { toolError } from '../tool-result.js';

export function stubUntilAuth(): ReturnType<typeof toolError> {
  return toolError('AUTH_REQUIRED');
}
