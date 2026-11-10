export const MCP_ERROR_CODES = [
  'AUTH_REQUIRED',
  'FAMILY_ACCESS_DENIED',
  'NOT_FOUND',
  'VALIDATION_ERROR',
  'VERSION_CONFLICT',
  'RATE_LIMITED',
  'CONFIRMATION_REQUIRED',
  'FORBIDDEN',
  'MUTATION_FAILED',
  'QUERY_FAILED',
] as const;

export type McpErrorCode = (typeof MCP_ERROR_CODES)[number];

export type McpToolErrorPayload = {
  code: McpErrorCode;
  message: string;
  current_version?: number;
};

const DEFAULT_MESSAGES: Record<McpErrorCode, string> = {
  AUTH_REQUIRED: 'Authentication is required. Connect with OAuth and send a valid bearer token.',
  FAMILY_ACCESS_DENIED: 'You do not have access to this family.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'The tool input was invalid.',
  VERSION_CONFLICT: 'The recipe was modified by someone else. Refresh and retry with the current version.',
  RATE_LIMITED: 'Too many requests. Try again later.',
  CONFIRMATION_REQUIRED: 'This action requires explicit confirmation.',
  FORBIDDEN: 'You are not allowed to perform this action.',
  MUTATION_FAILED: 'The operation could not be completed.',
  QUERY_FAILED: 'The operation could not be completed.',
};

export function buildToolErrorPayload(
  code: McpErrorCode,
  message?: string,
  extra?: { currentVersion?: number },
): McpToolErrorPayload {
  const payload: McpToolErrorPayload = {
    code,
    message: message ?? DEFAULT_MESSAGES[code],
  };
  if (extra?.currentVersion !== undefined) {
    payload.current_version = extra.currentVersion;
  }
  return payload;
}
