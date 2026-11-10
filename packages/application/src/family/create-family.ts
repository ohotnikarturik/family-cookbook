import {
  createFamilyInputSchema,
  type CreateFamilyInput,
  type ProfileBootstrapHints,
} from '@family-cookbook/contracts';
import {
  createFamilyBootstrap,
  ensureProfile,
  type AppSupabaseClient,
  updateLastSelectedFamilyId,
} from '@family-cookbook/data-access';
import { loadVerifiedAuthUser } from '../profile/ensure-profile-for-user.js';

export type CreateFamilyResult =
  | { status: 'auth_required' }
  | { status: 'validation_error' }
  | { status: 'bootstrap_failed' }
  | { status: 'ok'; familyId: string };

export async function createFamily(
  client: AppSupabaseClient,
  rawInput: CreateFamilyInput,
  hints: ProfileBootstrapHints = {},
): Promise<CreateFamilyResult> {
  const auth = await loadVerifiedAuthUser(client);
  if (auth.status !== 'ok') {
    return { status: 'auth_required' };
  }

  const parsed = createFamilyInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: 'validation_error' };
  }

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();
  if (userError || !user) {
    return { status: 'auth_required' };
  }

  try {
    await ensureProfile(client, user, hints);
  } catch {
    return { status: 'bootstrap_failed' };
  }

  const created = await createFamilyBootstrap(client, parsed.data);
  if (!created.ok) {
    return { status: 'bootstrap_failed' };
  }

  await updateLastSelectedFamilyId(client, auth.userId, created.familyId);

  return { status: 'ok', familyId: created.familyId };
}
