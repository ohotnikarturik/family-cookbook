import { PACKAGE_VERSION as contractsVersion } from '@family-cookbook/contracts';

export const PACKAGE_VERSION = '0.0.0';

export const dataAccessBootstrapMarker = contractsVersion;

export {
  AUTH_REQUIRED_CODE,
  AuthRequiredError,
  getSessionUser,
  requireSessionUser,
} from './auth/session.js';
export type { SessionUser } from './auth/session.js';
export { sanitizeAuthRedirect } from './auth/redirect.js';
export { ensureProfile } from './profile/ensure-profile.js';
export type { EnsureProfileResult } from './profile/ensure-profile.js';
export { defaultProfileDisplayName } from './profile/display-name.js';
export {
  buildAuthCallbackUrl,
  getAppUrl,
  getPublicSupabaseEnv,
  getSupabaseAuthCookieOptions,
  resolveAuthAppOrigin,
} from './supabase/env.js';
export { createBrowserSupabaseClient } from './supabase/browser.js';
export { copySessionCookies, updateSession } from './supabase/middleware.js';
export { createServerSupabaseClient } from './supabase/server.js';
export type { AppSupabaseClient } from './supabase/server.js';
export { createFamilyBootstrap } from './family/create-family-bootstrap.js';
export { getFamilyWorkspaceForMember } from './family/get-family-workspace.js';
export {
  getLastSelectedFamilyId,
  updateLastSelectedFamilyId,
} from './family/last-selected-family.js';
export { listMyActiveFamilies } from './family/list-my-families.js';
