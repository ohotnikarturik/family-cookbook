export const LOCAL_DEV_PASSWORD = 'LocalDev-Only-1';

export const FAMILY_A_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export const FAMILY_B_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
/** Has no recipes on purpose (empty Home). Members: Owner C and Viewer C. */
export const FAMILY_C_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

export const RECIPE_ACTIVE_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101';
export const RECIPE_ARCHIVED_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0103';
/** Ukrainian borscht; gets a dish photo from `pnpm supabase:seed-photos`. */
export const RECIPE_WITH_PHOTO_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0104';

export const TEST_USERS = {
  ownerA: 'owner-a@family-cookbook.test',
  editorA: 'editor-a@family-cookbook.test',
  viewerA: 'viewer-a@family-cookbook.test',
  multi: 'multi@family-cookbook.test',
  ownerC: 'owner-c@family-cookbook.test',
  viewerC: 'viewer-c@family-cookbook.test',
} as const;
