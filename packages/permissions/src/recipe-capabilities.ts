import type { FamilyRole } from '@family-cookbook/contracts';

const EDITOR_AND_ABOVE: FamilyRole[] = ['owner', 'admin', 'editor'];

function isEditorOrAbove(role: FamilyRole): boolean {
  return EDITOR_AND_ABOVE.includes(role);
}

export function canViewRecipes(role: FamilyRole): boolean {
  void role;
  return true;
}

export function canViewRecipeAsset(role: FamilyRole): boolean {
  return canViewRecipes(role);
}

export function canCreateRecipe(role: FamilyRole): boolean {
  return role !== 'viewer';
}

export function canEditRecipe(role: FamilyRole, actorUserId: string, createdBy: string): boolean {
  if (isEditorOrAbove(role)) {
    return true;
  }
  if (role === 'contributor') {
    return actorUserId === createdBy;
  }
  return false;
}

export function canAttachRecipeAsset(
  role: FamilyRole,
  actorUserId: string,
  createdBy: string,
): boolean {
  return canEditRecipe(role, actorUserId, createdBy);
}

export function canArchiveRecipe(
  role: FamilyRole,
  actorUserId: string,
  createdBy: string,
): boolean {
  return canEditRecipe(role, actorUserId, createdBy);
}

export function canRestoreRecipe(
  role: FamilyRole,
  actorUserId: string,
  createdBy: string,
): boolean {
  return canEditRecipe(role, actorUserId, createdBy);
}

export function canManageRecipeTags(role: FamilyRole): boolean {
  return isEditorOrAbove(role);
}

export function canViewAuditEvents(role: FamilyRole): boolean {
  return isEditorOrAbove(role);
}

export function canViewRecipeHistory(
  role: FamilyRole,
  actorUserId: string,
  createdBy: string,
): boolean {
  if (role === 'viewer') {
    return false;
  }
  if (isEditorOrAbove(role)) {
    return true;
  }
  if (role === 'contributor') {
    return actorUserId === createdBy;
  }
  return false;
}
