function hasControlChar(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127) {
      return true;
    }
  }
  return false;
}

export function sanitizeAuthRedirect(
  next: string | null | undefined,
  fallbackPath: string,
): string {
  if (next === null || next === undefined || next === '') {
    return fallbackPath;
  }
  if (
    !next.startsWith('/') ||
    next.startsWith('//') ||
    next.includes('\\') ||
    hasControlChar(next)
  ) {
    return fallbackPath;
  }
  return next;
}
