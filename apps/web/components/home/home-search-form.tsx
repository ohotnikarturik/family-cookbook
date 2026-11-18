import { Search } from 'lucide-react';
import Form from 'next/form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = Readonly<{
  /** Locale-prefixed Recipes address, e.g. `/en/f/{id}/recipes`. */
  action: string;
  label: string;
  placeholder: string;
  submitLabel: string;
}>;

/**
 * Search from Home: a plain GET form that opens Recipes with `?query=`, which the browse page
 * already understands. `next/form` navigates on the client and still works without JavaScript.
 */
export function HomeSearchForm({ action, label, placeholder, submitLabel }: Props) {
  return (
    <Form action={action} role="search" className="space-y-2">
      <Label htmlFor="home-search" className="text-sm font-medium text-foreground">
        {label}
      </Label>
      <div className="flex flex-col gap-2 min-[400px]:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="home-search"
            name="query"
            type="search"
            maxLength={200}
            autoComplete="off"
            enterKeyHint="search"
            placeholder={placeholder}
            className="min-h-11 pl-9"
          />
        </div>
        <Button type="submit" variant="secondary" className="min-h-11">
          {submitLabel}
        </Button>
      </div>
    </Form>
  );
}
