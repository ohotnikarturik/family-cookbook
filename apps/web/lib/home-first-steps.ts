import { canManageInvitations } from '@family-cookbook/application';
import type { FamilyRole } from '@family-cookbook/contracts';
import { canCreateRecipe } from '@family-cookbook/permissions';

export type HomeFirstStep = Readonly<{
  id: 'addRecipe' | 'addPhoto' | 'invite';
  /** Where the step's button goes, relative to the family. No button when absent. */
  path?: string;
}>;

/**
 * First steps for an empty cookbook, only those the role can do. "Add a photo" has no button:
 * there is no recipe to add it to yet, and the recipe page offers "Add photos" right after saving.
 * This only decides what to show; the pages and the server still check every action.
 */
export function homeFirstSteps(role: FamilyRole): readonly HomeFirstStep[] {
  const steps: HomeFirstStep[] = [];
  if (canCreateRecipe(role)) {
    steps.push({ id: 'addRecipe', path: '/recipes/new' }, { id: 'addPhoto' });
  }
  if (canManageInvitations(role)) {
    steps.push({ id: 'invite', path: '/settings/invitations' });
  }
  return steps;
}
