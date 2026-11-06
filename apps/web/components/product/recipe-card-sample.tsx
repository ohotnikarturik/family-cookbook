import { ChefHat, ChevronRight, Clock, Users } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Props = Readonly<{
  title: string;
  subtitle: string;
  timeLabel: string;
  servingsLabel: string;
  footerCtaLabel: string;
}>;

export function RecipeCardSample({
  title,
  subtitle,
  timeLabel,
  servingsLabel,
  footerCtaLabel,
}: Props) {
  return (
    <Card className="max-w-md overflow-hidden">
      <div className="h-28 bg-gradient-to-br from-primary/15 via-accent/10 to-muted" aria-hidden />
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
            <ChefHat className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 space-y-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{subtitle}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <MetaRow>
          <Clock className="size-4" aria-hidden />
          <span>{timeLabel}</span>
        </MetaRow>
        <MetaRow className="mt-2">
          <Users className="size-4" aria-hidden />
          <span>{servingsLabel}</span>
        </MetaRow>
      </CardContent>
      <CardFooter className="justify-end border-t border-border bg-muted/25">
        <Button type="button" variant="ghost" size="sm" className="gap-1 text-primary">
          {footerCtaLabel}
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </CardFooter>
    </Card>
  );
}

function MetaRow({ children, className }: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
      {children}
    </div>
  );
}
