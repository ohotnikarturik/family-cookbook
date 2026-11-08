export function trimToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseOptionalPositiveNumber(raw: string): number | null | 'invalid' {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }
  // fi, ru, and uk keyboards use a comma as the decimal separator.
  const normalized = /^\d+,\d+$/.test(trimmed) ? trimmed.replace(',', '.') : trimmed;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 'invalid';
  }
  return parsed;
}

export function parseOptionalNonNegativeInt(raw: string): number | null | 'invalid' {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isInteger(parsed) || parsed < 0 || String(parsed) !== trimmed) {
    return 'invalid';
  }
  return parsed;
}

export function formatOptionalNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}
