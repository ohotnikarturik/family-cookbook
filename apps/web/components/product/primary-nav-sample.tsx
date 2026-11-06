import { BookOpen, Home, UserRound } from 'lucide-react';

import { cn } from '@/lib/utils';

type NavItem = Readonly<{
  id: string;
  label: string;
  icon: 'recipes' | 'family' | 'account';
}>;

const iconMap = {
  recipes: BookOpen,
  family: Home,
  account: UserRound,
} as const;

type Props = Readonly<{
  items: NavItem[];
  label: string;
}>;

export function PrimaryNavSample({ items, label }: Props) {
  return (
    <nav
      aria-label={label}
      className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-sm"
    >
      {items.map((item) => {
        const Icon = iconMap[item.icon];
        return (
          <a
            key={item.id}
            href="#sample-nav"
            className={cn(
              'inline-flex min-h-11 min-w-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors duration-[var(--transition-normal)] hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[length:var(--ring-width)] focus-visible:ring-ring focus-visible:ring-offset-[length:var(--ring-offset)] focus-visible:ring-offset-background',
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span>{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
