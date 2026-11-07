import {
  isPendingInvitationExpired,
  inviteMemberInputSchema,
  type InviteMemberInput,
} from '@family-cookbook/contracts';
import {
  findPendingInvitationByEmail,
  getFamilyWorkspaceForMember,
  insertFamilyInvitation,
  revokeFamilyInvitation,
  type AppSupabaseClient,
} from '@family-cookbook/data-access';

import { loadVerifiedAuthUser } from '../profile/ensure-profile-for-user.js';
import type { InvitationEmailContent } from './build-invitation-email.js';
import { canAssignInviteRole, canManageInvitations } from './can-invite.js';
import type { InvitationEmailSender } from './email-sender.js';
import { generateInvitationToken } from './generate-token.js';

export type CreateInvitationResult =
  | { status: 'auth_required' }
  | { status: 'validation_error' }
  | { status: 'forbidden' }
  | { status: 'duplicate_pending' }
  | { status: 'insert_failed' }
  | { status: 'email_failed' }
  | { status: 'email_failed_kept' }
  | { status: 'ok'; invitationId: string };

export type InvitationEmailRenderInput = {
  to: string;
  acceptUrl: string;
  familyName: string;
};

export type CreateInvitationContext = {
  acceptUrlForToken: (rawToken: string) => string;
  emailSender: InvitationEmailSender;
  renderEmail: (input: InvitationEmailRenderInput) => InvitationEmailContent;
};

export async function createInvitation(
  client: AppSupabaseClient,
  rawInput: InviteMemberInput,
  context: CreateInvitationContext,
): Promise<CreateInvitationResult> {
  const auth = await loadVerifiedAuthUser(client);
  if (auth.status !== 'ok') {
    return { status: 'auth_required' };
  }

  const parsed = inviteMemberInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: 'validation_error' };
  }

  const workspace = await getFamilyWorkspaceForMember(client, parsed.data.familyId);
  if (!workspace.ok) {
    return { status: 'forbidden' };
  }

  if (!canManageInvitations(workspace.workspace.role)) {
    return { status: 'forbidden' };
  }

  if (!canAssignInviteRole(workspace.workspace.role, parsed.data.role)) {
    return { status: 'forbidden' };
  }

  const inserted = await insertOrReplaceExpired(client, auth.userId, parsed.data);
  if (!inserted.ok) {
    return inserted;
  }

  const mailed = await context.emailSender.sendInvite({
    to: parsed.data.email,
    ...context.renderEmail({
      to: parsed.data.email,
      acceptUrl: context.acceptUrlForToken(inserted.rawToken),
      familyName: workspace.workspace.name,
    }),
  });

  if (!mailed.ok) {
    const revoked = await revokeFamilyInvitation(
      client,
      inserted.invitationId,
      parsed.data.familyId,
    );
    if (!revoked.ok && revoked.error === 'revoke_failed') {
      return { status: 'email_failed_kept' };
    }
    return { status: 'email_failed' };
  }

  return { status: 'ok', invitationId: inserted.invitationId };
}

async function insertOrReplaceExpired(
  client: AppSupabaseClient,
  invitedByUserId: string,
  input: InviteMemberInput,
): Promise<
  | { ok: true; invitationId: string; rawToken: string }
  | { ok: false; status: 'duplicate_pending' | 'insert_failed' }
> {
  const firstToken = generateInvitationToken();
  const first = await insertFamilyInvitation(client, invitedByUserId, input, firstToken);
  if (first.ok) {
    return { ok: true, invitationId: first.invitationId, rawToken: firstToken };
  }
  if (first.error !== 'duplicate_pending') {
    return { ok: false, status: 'insert_failed' };
  }

  const existing = await findPendingInvitationByEmail(client, input.familyId, input.email);
  if (
    !existing.ok ||
    !existing.invitation ||
    !isPendingInvitationExpired(existing.invitation.expiresAt, new Date())
  ) {
    return { ok: false, status: 'duplicate_pending' };
  }

  const revoked = await revokeFamilyInvitation(client, existing.invitation.id, input.familyId);
  if (!revoked.ok) {
    return { ok: false, status: 'duplicate_pending' };
  }

  const retryToken = generateInvitationToken();
  const retry = await insertFamilyInvitation(client, invitedByUserId, input, retryToken);
  if (!retry.ok) {
    return {
      ok: false,
      status: retry.error === 'duplicate_pending' ? 'duplicate_pending' : 'insert_failed',
    };
  }

  return { ok: true, invitationId: retry.invitationId, rawToken: retryToken };
}
