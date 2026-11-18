'use client';

import { RECIPE_ASSETS_PER_RECIPE_MAX, type RecipeAssetSummary } from '@family-cookbook/contracts';
import { useRouter } from 'next/navigation';
import { useId, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { RecipeFilePicker } from '@/components/recipe/recipe-file-picker';
import { RecipeStepPhoto } from '@/components/recipe/recipe-step-photo';
import {
  assetKindForPick,
  sanitizeOriginalFilename,
  uploadRecipeAssetFile,
  type RecipeAssetUploadApiError,
  type RecipeUploadPick,
} from '@/lib/recipe-asset-upload';

type Props = Readonly<{
  familyId: string;
  recipeId: string;
  assets: readonly Pick<RecipeAssetSummary, 'id'>[];
  /** When set, the parent already counts this session’s uploads (shared with step photos). */
  assetCount?: number;
  onUploaded?: (assetId: string) => void;
}>;

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; name: string | null }
  | { status: 'added'; assetId: string; image: boolean; pick: RecipeUploadPick };

export function RecipeMediaUploadPanel({
  familyId,
  recipeId,
  assets,
  assetCount,
  onUploaded,
}: Props) {
  const t = useTranslations('recipes.mediaUpload');
  const tMedia = useTranslations('recipes.detail.media');
  const router = useRouter();
  const headingId = useId();
  const [state, setState] = useState<UploadState>({ status: 'idle' });
  const [error, setError] = useState<RecipeAssetUploadApiError | null>(null);
  const [sessionAssetIds, setSessionAssetIds] = useState<readonly string[]>([]);

  const counted = useMemo(() => {
    if (assetCount !== undefined) {
      return assetCount;
    }
    const ids = new Set(assets.map((asset) => asset.id));
    for (const id of sessionAssetIds) {
      ids.add(id);
    }
    return ids.size;
  }, [assetCount, assets, sessionAssetIds]);
  const atLimit = counted >= RECIPE_ASSETS_PER_RECIPE_MAX;
  const busy = state.status === 'uploading';

  async function handlePick(file: File, pick: RecipeUploadPick) {
    if (atLimit || busy) {
      return;
    }
    const kind = assetKindForPick(pick, file);
    setError(null);
    setState({ status: 'uploading', name: sanitizeOriginalFilename(file.name) });
    const result = await uploadRecipeAssetFile(familyId, recipeId, file, kind);
    if (!result.ok) {
      setState({ status: 'idle' });
      setError(result.error);
      return;
    }
    if (assetCount === undefined) {
      setSessionAssetIds((current) =>
        current.includes(result.assetId) ? current : [...current, result.assetId],
      );
    }
    onUploaded?.(result.assetId);
    setState({
      status: 'added',
      assetId: result.assetId,
      image: kind !== 'original_document',
      pick,
    });
    router.refresh();
  }

  let statusText = '';
  if (state.status === 'uploading') {
    statusText = state.name ? t('uploadingFile', { name: state.name }) : t('uploading');
  } else if (state.status === 'added') {
    statusText = state.pick === 'scan' ? t('addedScan') : t('addedPhoto');
  }

  return (
    <section
      aria-labelledby={headingId}
      aria-busy={busy || undefined}
      className="space-y-4 rounded-xl border border-dashed border-border bg-surface-raised p-4"
    >
      <div className="space-y-1">
        <h2 id={headingId} className="text-base font-semibold text-foreground">
          {t('heading')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('count', { count: counted, max: RECIPE_ASSETS_PER_RECIPE_MAX })}
        </p>
        {atLimit ? null : <p className="text-sm text-muted-foreground">{t('addHint')}</p>}
        <p className="text-sm text-muted-foreground">{t('limitsHint')}</p>
      </div>

      {atLimit ? (
        <p className="text-sm text-muted-foreground" role="status">
          {t('limitReached')}
        </p>
      ) : (
        <RecipeFilePicker
          disabled={busy}
          onPick={(file, pick) => void handlePick(file, pick)}
          actions={[
            { pick: 'photo', label: t('addPhoto'), primary: true },
            { pick: 'photo', label: t('takePhoto'), camera: true },
            { pick: 'scan', label: t('addScan') },
          ]}
        />
      )}

      <div className="flex items-center gap-3">
        {state.status === 'uploading' ? (
          <span
            className="size-4 shrink-0 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent motion-reduce:animate-none"
            aria-hidden
          />
        ) : null}
        <p
          className={
            state.status === 'added' ? 'text-sm text-foreground' : 'text-sm text-muted-foreground'
          }
          role="status"
          aria-live="polite"
        >
          {statusText}
        </p>
      </div>
      {state.status === 'added' && state.image ? (
        <RecipeStepPhoto
          key={state.assetId}
          familyId={familyId}
          recipeId={recipeId}
          assetId={state.assetId}
          alt={t('previewAlt')}
          loadErrorLabel={tMedia('loadError')}
          loadingLabel={tMedia('loading')}
          size="thumbnail"
        />
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {t(`errors.${error}`)}
        </p>
      ) : null}
    </section>
  );
}
