import type { User } from '@supabase/supabase-js';

const MAX_DISPLAY_NAME = 80;

export function defaultProfileDisplayName(user: User): string {
  const rawMeta = user.user_metadata['full_name'];
  if (typeof rawMeta === 'string') {
    const trimmed = rawMeta.trim();
    if (trimmed.length >= 1) {
      return trimmed.slice(0, MAX_DISPLAY_NAME);
    }
  }
  const email = user.email;
  if (email) {
    const local = email.split('@')[0]?.trim() ?? '';
    if (local.length >= 1) {
      return local.slice(0, MAX_DISPLAY_NAME);
    }
  }
  return 'Cookbook member';
}
