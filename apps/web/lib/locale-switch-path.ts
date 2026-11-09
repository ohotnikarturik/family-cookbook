import type { ReadonlyURLSearchParams } from 'next/navigation';

/** Keeps the current path and query when switching UI locale via next-intl navigation. */
export function localeSwitchTargetPath(
  pathname: string,
  searchParams: Pick<ReadonlyURLSearchParams, 'toString'>,
): string {
  const query = searchParams.toString();
  if (query === '') {
    return pathname;
  }
  return `${pathname}?${query}`;
}
