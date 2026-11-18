import { describe, expect, it } from 'vitest';

import { buildMemberRows, type MemberRowInput } from '@/lib/member-rows';

const members: MemberRowInput[] = [
  { userId: 'owner', label: 'You', role: 'owner', status: 'active' },
  { userId: 'admin', label: 'Ada', role: 'admin', status: 'active' },
  { userId: 'editor', label: 'Eve', role: 'editor', status: 'active' },
  { userId: 'viewer', label: 'Vic', role: 'viewer', status: 'suspended' },
];

function manageableIds(actor: Parameters<typeof buildMemberRows>[1]): string[] {
  return buildMemberRows(members, actor)
    .filter((row) => row.manageable)
    .map((row) => row.userId);
}

describe('buildMemberRows', () => {
  it('lets the owner change everyone except themselves', () => {
    expect(manageableIds({ role: 'owner', userId: 'owner' })).toEqual([
      'admin',
      'editor',
      'viewer',
    ]);
  });

  it('lets an admin change editors and below, not the owner, other admins or themselves', () => {
    expect(manageableIds({ role: 'admin', userId: 'admin' })).toEqual(['editor', 'viewer']);
  });

  it('gives editors, contributors and viewers no manageable rows', () => {
    for (const role of ['editor', 'contributor', 'viewer'] as const) {
      expect(manageableIds({ role, userId: 'someone-else' })).toEqual([]);
    }
  });

  it('keeps one row per member with role and status, and role options only when manageable', () => {
    const rows = buildMemberRows(members, { role: 'admin', userId: 'admin' });
    expect(rows).toHaveLength(members.length);
    expect(rows.find((row) => row.userId === 'viewer')).toMatchObject({
      role: 'viewer',
      status: 'suspended',
      roleOptions: ['viewer', 'contributor', 'editor'],
    });
    expect(rows.find((row) => row.userId === 'owner')?.roleOptions).toEqual([]);
  });

  it('never offers the owner role', () => {
    const rows = buildMemberRows(members, { role: 'owner', userId: 'owner' });
    for (const row of rows) {
      expect(row.roleOptions).not.toContain('owner');
    }
  });
});
