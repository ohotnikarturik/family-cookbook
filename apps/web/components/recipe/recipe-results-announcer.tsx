'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

const AnnounceContext = createContext<(message: string) => void>(() => {});

/**
 * One polite live region that reads out the new result count after a search. It sits in a layout,
 * above the results page, because a region inserted together with a new page is not reliably read.
 * Used by Recipes and by Home, whose results both change while the search box keeps focus.
 */
export function ResultsAnnouncer({ children }: Readonly<{ children: ReactNode }>) {
  const [announcement, setAnnouncement] = useState('');
  const firstMessage = useRef<string | null>(null);
  const searched = useRef(false);
  const announce = useCallback((message: string) => {
    // The count on first load is on screen already; only read out what a search changed. (Effects
    // can run twice in development, so the first message is skipped by value, not by count.)
    if (firstMessage.current === null) {
      firstMessage.current = message;
      return;
    }
    if (!searched.current && message === firstMessage.current) {
      return;
    }
    searched.current = true;
    // A zero-width space makes an identical message count as new, so it is read again.
    setAnnouncement((current) => (current === message ? `${message}​` : message));
  }, []);

  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </AnnounceContext.Provider>
  );
}

/** Rendered by a results page: hands its result count to the live region in the layout. */
export function AnnounceRecipeResults({ message }: Readonly<{ message: string }>) {
  const announce = useContext(AnnounceContext);
  useEffect(() => {
    announce(message);
  }, [announce, message]);
  return null;
}
