'use client';

import { ArrowDown, ArrowUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';

export type EditorRowControlLabels = Readonly<{
  moveUp: string;
  moveDown: string;
  /** Visible text of the remove button ("Remove"). */
  remove: string;
  /** Accessible name of the remove button; starts with the visible text ("Remove flour"). */
  removeName: string;
  /** "Ingredient 2" or "Step 2", appended to the arrow buttons' names. */
  rowLabel: string;
}>;

type Props = Readonly<{
  /** Element id prefix; the buttons get `-up`, `-down` and `-remove`. */
  idPrefix: string;
  index: number;
  count: number;
  disabled?: boolean | undefined;
  labels: EditorRowControlLabels;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}>;

/** Move up / move down arrows and a Remove button for one row of a list editor. */
export function EditorRowControls({
  idPrefix,
  index,
  count,
  disabled,
  labels,
  onMove,
  onRemove,
}: Props) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        id={`${idPrefix}-up`}
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled || index === 0}
        aria-label={`${labels.moveUp}, ${labels.rowLabel}`}
        onClick={() => onMove(-1)}
      >
        <ArrowUp aria-hidden />
      </Button>
      <Button
        id={`${idPrefix}-down`}
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled || index === count - 1}
        aria-label={`${labels.moveDown}, ${labels.rowLabel}`}
        onClick={() => onMove(1)}
      >
        <ArrowDown aria-hidden />
      </Button>
      <Button
        id={`${idPrefix}-remove`}
        type="button"
        variant="ghost"
        className="px-3 text-muted-foreground hover:text-foreground"
        disabled={disabled}
        aria-label={labels.removeName}
        onClick={onRemove}
      >
        {labels.remove}
      </Button>
    </div>
  );
}

/** Swaps a row with its neighbour; returns null when the move would leave the list. */
export function moveListItem<T>(items: readonly T[], index: number, delta: -1 | 1): T[] | null {
  const target = index + delta;
  const current = items[index];
  const swap = items[target];
  if (current === undefined || swap === undefined) {
    return null;
  }
  const next = [...items];
  next[index] = swap;
  next[target] = current;
  return next;
}

/** Focus an element by id after the next render (rows are added, moved or removed). */
export function useFocusAfterRender() {
  const pending = useRef<readonly string[] | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const ids = pending.current;
    if (!ids) {
      return;
    }
    pending.current = null;
    for (const id of ids) {
      const element = document.getElementById(id);
      if (element instanceof HTMLElement && !element.hasAttribute('disabled')) {
        element.focus();
        return;
      }
    }
  }, [tick]);

  /** The first id that exists and is enabled gets focus. */
  return function focusLater(...ids: string[]) {
    pending.current = ids;
    setTick((value) => value + 1);
  };
}

/** Text for a polite live region; repeating the same message still re-announces it. */
export function useAnnouncement() {
  const [message, setMessage] = useState('');
  return {
    message,
    announce(text: string) {
      setMessage((current) => (current === text ? `${text} ` : text));
    },
  };
}
