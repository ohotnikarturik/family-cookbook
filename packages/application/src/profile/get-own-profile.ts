import {
  ownProfileSchema,
  type OwnProfile,
  updateProfileInputSchema,
  type UpdateProfileInput,
} from '@family-cookbook/contracts';
import {
  getOwnProfile as getOwnProfileRepo,
  updateOwnProfile as updateOwnProfileRepo,
  type AppSupabaseClient,
} from '@family-cookbook/data-access';

import { loadVerifiedAuthUser } from './ensure-profile-for-user.js';

export type GetOwnProfileResult =
  | { status: 'auth_required' }
  | { status: 'not_found' }
  | { status: 'query_failed' }
  | { status: 'ok'; profile: OwnProfile };

export async function getOwnProfile(client: AppSupabaseClient): Promise<GetOwnProfileResult> {
  const auth = await loadVerifiedAuthUser(client);
  if (auth.status !== 'ok') {
    return { status: 'auth_required' };
  }

  const loaded = await getOwnProfileRepo(client);
  if (!loaded.ok) {
    if (loaded.error === 'not_found') {
      return { status: 'not_found' };
    }
    return { status: 'query_failed' };
  }

  const parsed = ownProfileSchema.safeParse(loaded.profile);
  if (!parsed.success) {
    return { status: 'query_failed' };
  }

  return { status: 'ok', profile: parsed.data };
}

export type UpdateOwnProfileResult =
  | { status: 'auth_required' }
  | { status: 'validation_error' }
  | { status: 'not_found' }
  | { status: 'mutation_failed' }
  | { status: 'ok' };

export async function updateOwnProfile(
  client: AppSupabaseClient,
  rawInput: unknown,
): Promise<UpdateOwnProfileResult> {
  const auth = await loadVerifiedAuthUser(client);
  if (auth.status !== 'ok') {
    return { status: 'auth_required' };
  }

  const parsed = updateProfileInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: 'validation_error' };
  }

  const updated = await updateOwnProfileFields(client, auth.userId, parsed.data);
  return updated;
}

export async function updateOwnProfileFields(
  client: AppSupabaseClient,
  userId: string,
  input: UpdateProfileInput,
): Promise<UpdateOwnProfileResult> {
  const mutation = await updateOwnProfileRepo(client, userId, input);
  if (!mutation.ok) {
    if (mutation.error === 'not_found') {
      return { status: 'not_found' };
    }
    if (mutation.error === 'validation') {
      return { status: 'validation_error' };
    }
    return { status: 'mutation_failed' };
  }
  return { status: 'ok' };
}
