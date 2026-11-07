import { describe, expect, it } from 'vitest';

import { parseRecipeMutationError } from './parse-mutation-error.js';

describe('parseRecipeMutationError', () => {
  it('reads the current version only from a version_conflict detail', () => {
    expect(
      parseRecipeMutationError({
        code: '23514',
        message: 'version_conflict',
        details: '3',
      }),
    ).toEqual({ ok: false, error: 'version_conflict', currentVersion: 3 });
  });

  it('does not treat check violations as version conflicts', () => {
    expect(
      parseRecipeMutationError({
        code: '23514',
        message: 'new row for relation "recipes" violates check constraint "recipes_title_len_ck"',
        details: 'Failing row contains (1).',
      }),
    ).toEqual({ ok: false, error: 'mutation_failed' });
  });

  it('distinguishes authentication from other permission failures', () => {
    expect(
      parseRecipeMutationError({
        code: '42501',
        message: 'authentication required',
      }),
    ).toEqual({ ok: false, error: 'auth_required' });
    expect(
      parseRecipeMutationError({
        code: '42501',
        message: 'recipe update forbidden',
      }),
    ).toEqual({ ok: false, error: 'forbidden' });
  });
});
