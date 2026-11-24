import { useState } from 'react';

/**
 * Helpers for "Save is available only when there is something to save".
 *
 * This is a usability aid. The server still validates and authorizes every request.
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => deepEqual(item, b[index]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a);
    if (keysA.length !== Object.keys(b).length) return false;
    return keysA.every((key) => Object.hasOwn(b, key) && deepEqual(a[key], b[key]));
  }
  return false;
}

/** True when the current values differ from the snapshot taken when the form loaded or was saved. */
export function isFormDirty(baseline: unknown, current: unknown): boolean {
  return !deepEqual(baseline, current);
}

export type BaselineState<T> = Readonly<{ baseline: T; seenSignal: object | null }>;

/**
 * Pure step behind `useFormBaseline`: when a new save-success signal arrives, the current values
 * become the new baseline. The same signal seen again changes nothing.
 */
export function advanceBaseline<T>(
  state: BaselineState<T>,
  current: T,
  savedSignal: object | null,
): BaselineState<T> {
  if (savedSignal === state.seenSignal) return state;
  return {
    baseline: savedSignal === null ? state.baseline : current,
    seenSignal: savedSignal,
  };
}

/**
 * Tracks the snapshot a form is compared against. Pass the action state when it reports success
 * (otherwise `null`); the new baseline is the values at that moment.
 */
export function useFormBaseline<T>(initial: T, current: T, savedSignal: object | null) {
  const [state, setState] = useState<BaselineState<T>>({ baseline: initial, seenSignal: null });
  const next = advanceBaseline(state, current, savedSignal);
  if (next !== state) {
    setState(next);
  }
  return { baseline: next.baseline, dirty: isFormDirty(next.baseline, current) };
}
