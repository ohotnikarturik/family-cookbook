import { describe, expect, it } from 'vitest';

import { homeFirstSteps } from '@/lib/home-first-steps';

describe('homeFirstSteps', () => {
  it('gives owners and admins all three steps', () => {
    for (const role of ['owner', 'admin'] as const) {
      expect(homeFirstSteps(role)).toEqual([
        { id: 'addRecipe', path: '/recipes/new' },
        { id: 'addPhoto' },
        { id: 'invite', path: '/settings/invitations' },
      ]);
    }
  });

  it('gives editors and contributors the recipe steps but not invite', () => {
    for (const role of ['editor', 'contributor'] as const) {
      expect(homeFirstSteps(role).map((step) => step.id)).toEqual(['addRecipe', 'addPhoto']);
    }
  });

  it('gives viewers no steps', () => {
    expect(homeFirstSteps('viewer')).toEqual([]);
  });
});
