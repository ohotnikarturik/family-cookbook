/** Postgres `numeric` often arrives as a string. Invalid values stay distinguishable from null. */
export function readRecipeSummaryNumber(
  value: number | string | null,
  integer: boolean,
): number | null | 'invalid' {
  if (value === null) {
    return null;
  }
  let parsed: number;
  if (typeof value === 'number') {
    parsed = value;
  } else {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return 'invalid';
    }
    parsed = Number(trimmed);
  }
  if (!Number.isFinite(parsed)) {
    return 'invalid';
  }
  if (integer && !Number.isInteger(parsed)) {
    return 'invalid';
  }
  return parsed;
}
