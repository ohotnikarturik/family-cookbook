'use client';

import { useRecipeAssetDownload } from '@/components/recipe/use-recipe-asset-download';

type Props = Readonly<{
  familyId: string;
  recipeId: string;
  assetId: string;
  alt: string;
  loadErrorLabel: string;
  loadingLabel: string;
  /** `thumbnail` is the small preview shown right after an upload. */
  size?: 'step' | 'thumbnail';
}>;

const SIZE_CLASSES = {
  step: { image: 'max-h-80 w-full max-w-md', placeholder: 'h-40 w-full max-w-md' },
  thumbnail: { image: 'size-24', placeholder: 'size-24' },
} as const;

export function RecipeStepPhoto({
  familyId,
  recipeId,
  assetId,
  alt,
  loadErrorLabel,
  loadingLabel,
  size = 'step',
}: Props) {
  const classes = SIZE_CLASSES[size];
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
      <div
        className={`mt-2 ${classes.placeholder} animate-pulse rounded-lg bg-muted`}
        role="status"
      >
        <span className="sr-only">{loadingLabel}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- expiring Supabase signed URLs
    <img
      src={state.url}
      alt={alt}
      className={`mt-2 ${classes.image} rounded-lg object-cover ring-1 ring-border`}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={state.reportFailure}
    />
  );
}
