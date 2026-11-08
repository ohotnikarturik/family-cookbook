'use client';

import type { AssetKind, RecipeAssetMimeType } from '@family-cookbook/contracts';

import { Button } from '@/components/ui/button';
import { useRecipeAssetDownload } from '@/components/recipe/use-recipe-asset-download';

const IMAGE_KINDS = new Set<AssetKind>(['original_photo', 'recipe_photo', 'step_photo']);

export type RecipeMediaCard = Readonly<{
  id: string;
  assetKind: AssetKind;
  originalFilename: string | null;
  detectedMimeType: RecipeAssetMimeType;
}>;

type MediaLabels = Readonly<{
  sectionHeading: string;
  photosHeading: string;
  documentsHeading: string;
  downloadPdf: string;
  loadError: string;
  loading: string;
  imageAltFallback: string;
  documentFallback: string;
  pdfDescription: string;
}>;

type Props = Readonly<{
  familyId: string;
  recipeId: string;
  assets: readonly RecipeMediaCard[];
  labels: MediaLabels;
}>;

export function RecipeMediaGallery({ familyId, recipeId, assets, labels }: Props) {
  const photos = assets.filter(
    (asset) => IMAGE_KINDS.has(asset.assetKind) && asset.detectedMimeType.startsWith('image/'),
  );
  const documents = assets.filter(
    (asset) =>
      asset.assetKind === 'original_document' && asset.detectedMimeType === 'application/pdf',
  );

  if (photos.length === 0 && documents.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="recipe-media-heading" className="space-y-6">
      <h3 id="recipe-media-heading" className="text-lg font-semibold text-foreground">
        {labels.sectionHeading}
      </h3>

      {photos.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">{labels.photosHeading}</h4>
          <ul className="grid list-none gap-4 p-0 sm:grid-cols-2">
            {photos.map((asset) => (
              <li key={asset.id}>
                <RecipePhotoTile
                  familyId={familyId}
                  recipeId={recipeId}
                  asset={asset}
                  labels={labels}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {documents.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">{labels.documentsHeading}</h4>
          <ul className="list-none space-y-3 p-0">
            {documents.map((asset) => (
              <li
                key={asset.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {asset.originalFilename?.trim() || labels.documentFallback}
                  </p>
                  <p className="text-sm text-muted-foreground">{labels.pdfDescription}</p>
                </div>
                <DocumentDownloadButton
                  familyId={familyId}
                  recipeId={recipeId}
                  assetId={asset.id}
                  downloadLabel={labels.downloadPdf}
                  errorLabel={labels.loadError}
                  loadingLabel={labels.loading}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function RecipePhotoTile({
  familyId,
  recipeId,
  asset,
  labels,
}: Readonly<{
  familyId: string;
  recipeId: string;
  asset: RecipeMediaCard;
  labels: MediaLabels;
}>) {
  const state = useRecipeAssetDownload(familyId, recipeId, asset.id, 'image');
  const alt = asset.originalFilename?.trim() || labels.imageAltFallback;

  if (state.status === 'error') {
    return (
      <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground" role="status">
        {labels.loadError}
      </p>
    );
  }

  if (state.status !== 'ready') {
    return (
      <div className="aspect-[4/3] w-full animate-pulse rounded-lg bg-muted" role="status">
        <span className="sr-only">{labels.loading}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- expiring Supabase signed URLs
    <img
      src={state.url}
      alt={alt}
      className="aspect-[4/3] w-full rounded-lg object-cover ring-1 ring-border"
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={state.reportFailure}
    />
  );
}

function DocumentDownloadButton({
  familyId,
  recipeId,
  assetId,
  downloadLabel,
  errorLabel,
  loadingLabel,
}: Readonly<{
  familyId: string;
  recipeId: string;
  assetId: string;
  downloadLabel: string;
  errorLabel: string;
  loadingLabel: string;
}>) {
  const state = useRecipeAssetDownload(familyId, recipeId, assetId, 'pdf');

  if (state.status === 'error') {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        {errorLabel}
      </p>
    );
  }

  if (state.status !== 'ready') {
    return (
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full sm:w-auto"
        disabled
        aria-busy="true"
      >
        <span className="sr-only">{loadingLabel}</span>
        {downloadLabel}
      </Button>
    );
  }

  return (
    <Button type="button" variant="outline" className="min-h-11 w-full sm:w-auto" asChild>
      <a href={state.url} rel="noopener noreferrer">
        {downloadLabel}
      </a>
    </Button>
  );
}
