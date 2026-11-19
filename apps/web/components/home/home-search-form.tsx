'use client';

import { Search } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState, useTransition } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from '@/i18n/navigation';
import { SEARCH_DEBOUNCE_MS, searchTrigger } from '@/lib/search-as-you-type';

type Props = Readonly<{
  familyId: string;
  label: string;
  placeholder: string;
  hint: string;
}>;

/**
 * Search from Home, with the same rule as Recipes and no confirm button: 300 ms after typing stops
 * (2 or more characters) the address gets `?query=` and Home shows the matches in place of the
 * recent recipes; empty text brings the recent recipes back; Enter searches at once, even for one
 * character. The form lives in the Home layout, so it keeps focus while the results change.
 * Without JavaScript the plain GET form still works: Enter opens Home with the same address.
 *
 * It does not reuse `RecipeSearchForm`: that one also owns the filters and their address fields.
 */
export function HomeSearchForm({ familyId, label, placeholder, hint }: Props) {
  const locale = useLocale();
  const router = useRouter();
  const hintId = useId();
  const inputId = useId();
  const [pending, startTransition] = useTransition();

  const urlQuery = useSearchParams().get('query') ?? '';
  const [text, setText] = useState(urlQuery);
  const [composing, setComposing] = useState(false);
  // What this form last put into the address, and the addresses it asked for that have not shown
  // up yet. An older one can arrive after a newer one was asked for; it is ours, so it must not
  // reset the text. Any other address came from elsewhere (Back, a link) and the text follows it.
  const applied = useRef(urlQuery.trim());
  const inFlight = useRef<string[]>([]);

  useEffect(() => {
    const current = urlQuery.trim();
    const ours = inFlight.current.indexOf(current);
    if (ours !== -1) {
      inFlight.current = inFlight.current.slice(ours + 1);
      return;
    }
    if (current === applied.current) {
      return;
    }
    inFlight.current = [];
    applied.current = current;
    setText(urlQuery);
  }, [urlQuery]);

  const navigate = useCallback(
    (query: string) => {
      if (query === applied.current) {
        return;
      }
      applied.current = query;
      inFlight.current = [...inFlight.current, query].slice(-10);
      const params = new URLSearchParams();
      if (query) {
        params.set('query', query);
      }
      const search = params.toString();
      startTransition(() => {
        router.replace(`/f/${familyId}${search ? `?${search}` : ''}`);
      });
    },
    [familyId, router],
  );

  useEffect(() => {
    if (composing) {
      return;
    }
    const trigger = searchTrigger(text);
    if (trigger === 'wait') {
      // One character is too short to search by typing: leave the shown results as they are.
      return;
    }
    const timer = setTimeout(
      () => navigate(trigger === 'search' ? text.trim() : ''),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [text, composing, navigate]);

  return (
    <form
      method="get"
      action={`/${locale}/f/${familyId}`}
      role="search"
      aria-busy={pending}
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        navigate(text.trim());
      }}
    >
      <Label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id={inputId}
          name="query"
          type="search"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
          aria-describedby={hintId}
          maxLength={200}
          autoComplete="off"
          enterKeyHint="search"
          placeholder={placeholder}
          className="min-h-12 pl-10 text-base"
        />
      </div>
      <p id={hintId} className="text-sm text-muted-foreground">
        {hint}
      </p>
    </form>
  );
}
