import { PACKAGE_VERSION as contractsVersion } from '@family-cookbook/contracts';
import { PACKAGE_VERSION as domainVersion } from '@family-cookbook/domain';
import { PACKAGE_VERSION as permissionsVersion } from '@family-cookbook/permissions';

export const PACKAGE_VERSION = '0.0.0';

export const applicationBootstrapMarker = {
  contracts: contractsVersion,
  domain: domainVersion,
  permissions: permissionsVersion,
};

export {
  ensureProfileForCurrentUser,
  loadVerifiedAuthUser,
  type EnsureProfileForUserResult,
} from './profile/ensure-profile-for-user.js';
