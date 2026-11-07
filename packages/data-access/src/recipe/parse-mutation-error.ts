export type RecipeMutationError =
  | 'auth_required'
  | 'forbidden'
  | 'not_found'
  | 'invalid_payload'
  | 'version_conflict'
  | 'mutation_failed';

export type RecipeMutationFailure = {
  ok: false;
  error: RecipeMutationError;
  currentVersion?: number;
};

export function parseRecipeMutationError(error: {
  code?: string;
  message?: string;
  details?: string;
}): RecipeMutationFailure {
  const message = error.message ?? '';

  if (message.includes('authentication required')) {
    return { ok: false, error: 'auth_required' };
  }

  if (message.includes('version_conflict')) {
    const detail = error.details?.trim() ?? '';
    const parsedVersion = /^\d+$/.test(detail) ? Number.parseInt(detail, 10) : Number.NaN;
    return {
      ok: false,
      error: 'version_conflict',
      ...(Number.isInteger(parsedVersion) ? { currentVersion: parsedVersion } : {}),
    };
  }

  if (error.code === 'P0002' || message.includes('recipe not found')) {
    return { ok: false, error: 'not_found' };
  }

  if (error.code === '42501') {
    return { ok: false, error: 'forbidden' };
  }

  if (error.code === '22023') {
    return { ok: false, error: 'invalid_payload' };
  }

  return { ok: false, error: 'mutation_failed' };
}
