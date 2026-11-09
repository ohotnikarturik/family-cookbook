import { describe, expect, it } from 'vitest';

import { resolveMemberDisplayLabel } from './member-display-name.js';

describe('resolveMemberDisplayLabel', () => {
  const base = {
    actorUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001',
    youLabel: 'You',
    neutralLabel: 'Family member',
  };

  it('prefers you label for the actor', () => {
    expect(
      resolveMemberDisplayLabel({
        ...base,
        memberUserId: base.actorUserId,
        displayName: 'Ada',
      }),
    ).toBe('You');
  });

  it('uses display name when present', () => {
    expect(
      resolveMemberDisplayLabel({
        ...base,
        memberUserId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001',
        displayName: 'Mika',
      }),
    ).toBe('Mika');
  });

  it('falls back when display name is missing', () => {
    expect(
      resolveMemberDisplayLabel({
        ...base,
        memberUserId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001',
        displayName: null,
      }),
    ).toBe('Family member');
  });

  it('falls back when display name is blank', () => {
    expect(
      resolveMemberDisplayLabel({
        ...base,
        memberUserId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001',
        displayName: '   ',
      }),
    ).toBe('Family member');
  });
});
