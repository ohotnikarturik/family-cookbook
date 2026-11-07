import { invitationTokenSchema } from '@family-cookbook/contracts';
import { redeemFamilyInvitation, type AppSupabaseClient } from '@family-cookbook/data-access';

import { loadVerifiedAuthUser } from '../profile/ensure-profile-for-user.js';
import { setActiveFamilyPreference } from '../family/set-active-family-preference.js';

export type AcceptInvitationResult =
  | { status: 'auth_required' }
  | { status: 'validation_error' }
  | { status: 'not_found' }
  | { status: 'revoked' }
  | { status: 'expired' }
  | { status: 'already_accepted' }
  | { status: 'email_mismatch' }
  | { status: 'already_member' }
  | { status: 'email_unverified' }
  | { status: 'redeem_failed' }
  | { status: 'ok'; familyId: string };

export async function acceptInvitation(
  client: AppSupabaseClient,
  rawToken: string,
): Promise<AcceptInvitationResult> {
  const auth = await loadVerifiedAuthUser(client);
  if (auth.status !== 'ok') {
    return { status: 'auth_required' };
  }

  const parsedToken = invitationTokenSchema.safeParse(rawToken);
  if (!parsedToken.success) {
    return { status: 'validation_error' };
  }

  const redeemed = await redeemFamilyInvitation(client, parsedToken.data);
  if (!redeemed.ok) {
    switch (redeemed.error) {
      case 'not_found':
      case 'invalid_token':
        return { status: 'not_found' };
      case 'revoked':
        return { status: 'revoked' };
      case 'expired':
        return { status: 'expired' };
      case 'already_accepted':
        return { status: 'already_accepted' };
      case 'email_mismatch':
        return { status: 'email_mismatch' };
      case 'email_unverified':
        return { status: 'email_unverified' };
      case 'auth_required':
        return { status: 'auth_required' };
      case 'already_member':
        return { status: 'already_member' };
      default:
        return { status: 'redeem_failed' };
    }
  }

  // Preference is a UI hint. Membership is already committed, so a failed write still joins the family.
  await setActiveFamilyPreference(client, redeemed.familyId);
  return { status: 'ok', familyId: redeemed.familyId };
}
