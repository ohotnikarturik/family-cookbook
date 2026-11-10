'use client';

import { ChefHat } from 'lucide-react';

import { useRecipeAssetDownload } from '@/components/recipe/use-recipe-asset-download';
import { cn } from '@/lib/utils';

type Props = Readonly<{
  familyId: string;
  recipeId: string;
  coverAssetId?: string | null;
  title: string;
  loadingLabel: string;
  errorLabel?: string;
  /** Card links already expose the title, so the image should not repeat it. */
  decorative?: boolean;
  className?: string;
}>;

function CoverPlaceholder({ className, label }: Readonly<{ className?: string; label?: string }>) {
  return (
    <div
      className={cn(
        'flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-primary/15 via-accent/10 to-muted',
        className,
      )}
      {...(label
        ? { role: 'img' as const, 'aria-label': label }
        : { 'aria-hidden': true as const })}
    >
      <ChefHat className="size-8 text-primary/50" />
    </div>
  );
}

function RecipeCardCoverImage({
  familyId,
  recipeId,
  coverAssetId,
  title,
  loadingLabel,
  errorLabel,
  decorative,
  className,
}: Readonly<{
  familyId: string;
  recipeId: string;
  coverAssetId: string;
  title: string;
  loadingLabel: string;
  errorLabel?: string;
  decorative: boolean;
  className?: string;
}>) {
  const state = useRecipeAssetDownload(familyId, recipeId, coverAssetId, 'image');

  if (state.status === 'error') {
    return (
      <CoverPlaceholder
        {...(className ? { className } : {})}
        {...(decorative ? {} : { label: errorLabel ?? title })}
      />
    );
  }

  if (state.status === 'ready') {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- expiring signed URLs
      <img
        src={state.url}
        alt={decorative ? '' : title}
        className={cn('aspect-[4/3] w-full object-cover', className)}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={state.reportFailure}
      />
    );
  }

  return (
    <div
      className={cn('aspect-[4/3] w-full animate-pulse bg-muted', className)}
      role="status"
      aria-label={loadingLabel}
    />
  );
}

export function RecipeCardCover({
  familyId,
  recipeId,
  coverAssetId,
  title,
  loadingLabel,
  errorLabel,
  decorative = false,
  className,
}: Props) {
  if (!coverAssetId) {
    return <CoverPlaceholder {...(className ? { className } : {})} />;
  }

  return (
    <RecipeCardCoverImage
      familyId={familyId}
      recipeId={recipeId}
      coverAssetId={coverAssetId}
      title={title}
      loadingLabel={loadingLabel}
      decorative={decorative}
      {...(errorLabel ? { errorLabel } : {})}
      {...(className ? { className } : {})}
    />
  );
}
