import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type Tone = 'neutral' | 'success' | 'warning' | 'destructive' | 'info';

type Props = Readonly<{
  tone: Tone;
  title?: string;
  description: string;
}>;

const variantMap: Record<Tone, 'default' | 'success' | 'warning' | 'destructive' | 'info'> = {
  neutral: 'default',
  success: 'success',
  warning: 'warning',
  destructive: 'destructive',
  info: 'info',
};

export function StatusRow({ tone, title, description }: Props) {
  const variant = variantMap[tone];
  return (
    <Alert variant={variant}>
      {title ? <AlertTitle>{title}</AlertTitle> : null}
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}

/** Loading line placeholder — no arbitrary gray classes; uses muted surface tokens. */
export function LoadingStrip({ label }: Readonly<{ label: string }>) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3"
    >
      <span className="size-2 animate-pulse rounded-full bg-primary/70" aria-hidden />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}
