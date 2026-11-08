import { StatusRow } from '@/components/product/status-row';

type Props = Readonly<{
  variant: 'empty' | 'forbidden' | 'error' | 'invalidFilters';
  title?: string;
  description: string;
}>;

export function RecipeBrowseStates({ variant, title, description }: Props) {
  const tone =
    variant === 'forbidden' ? 'warning' : variant === 'error' ? 'destructive' : 'neutral';
  return <StatusRow tone={tone} description={description} {...(title ? { title } : {})} />;
}
