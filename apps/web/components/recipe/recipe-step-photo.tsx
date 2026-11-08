'use client';

import { useRecipeAssetDownload } from '@/components/recipe/use-recipe-asset-download';

type Props = Readonly<{
  familyId: string;
  recipeId: string;
  assetId: string;
  alt: string;
  loadErrorLabel: string;
  loadingLabel: string;
}>;

export function RecipeStepPhoto({
  familyId,
  recipeId,
  assetId,
  alt,
  loadErrorLabel,
  loadingLabel,
}: Props) {
  const state = useRecipeAssetDownload(familyId, recipeId, assetId, 'image');

  if (state.status === 'error') {
    return (
      <p className="mt-2 text-sm text-muted-foreground" role="status">
        {loadErrorLabel}
      </p>
    );
  }

  if (state.status !== 'ready') {
    return (
      <div className="mt-2 h-40 w-full max-w-md animate-pulse rounded-lg bg-muted" role="status">
        <span className="sr-only">{loadingLabel}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- expiring Supabase signed URLs
    <img
      src={state.url}
      alt={alt}
      className="mt-2 max-h-80 w-full max-w-md rounded-lg object-cover ring-1 ring-border"
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={state.reportFailure}
    />
  );
}
