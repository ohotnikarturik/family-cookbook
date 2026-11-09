'use client';

import {
  RECIPE_ASSETS_PER_RECIPE_MAX,
  type AssetKind,
  type RecipeAssetSummary,
} from '@family-cookbook/contracts';
import { useRouter } from 'next/navigation';
import { useId, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { uploadRecipeAssetFile, type RecipeAssetUploadApiError } from '@/lib/recipe-asset-upload';

type UploadKindOption = 'recipe_photo' | 'original_document' | 'original_photo';

const KIND_OPTIONS: UploadKindOption[] = ['recipe_photo', 'original_document', 'original_photo'];

type Props = Readonly<{
  familyId: string;
  recipeId: string;
  assets: readonly Pick<RecipeAssetSummary, 'id'>[];
  /** When set, the parent already counts this session’s uploads (shared with step photos). */
  assetCount?: number;
  onUploaded?: (assetId: string) => void;
}>;

export function RecipeMediaUploadPanel({
  familyId,
  recipeId,
  assets,
  assetCount,
  onUploaded,
}: Props) {
  const t = useTranslations('recipes.mediaUpload');
  const router = useRouter();
  const fileInputId = useId();
  const kindSelectId = useId();
  const headingId = useId();
  const errorId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<UploadKindOption>('recipe_photo');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
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

  async function handleUpload() {
    const input = fileRef.current;
    const file = input?.files?.[0];
    if (atLimit) {
      return;
    }
    if (!file) {
      setError('file_required');
      setStatus('idle');
      return;
    }
    setBusy(true);
    setStatus('uploading');
    setError(null);
    const result = await uploadRecipeAssetFile(familyId, recipeId, file, kind as AssetKind);
    setBusy(false);
    if (input) {
      input.value = '';
    }
    if (!result.ok) {
      setStatus('idle');
      setError(result.error);
      return;
    }
    if (assetCount === undefined) {
      setSessionAssetIds((current) =>
        current.includes(result.assetId) ? current : [...current, result.assetId],
      );
    }
    onUploaded?.(result.assetId);
    setStatus('success');
    router.refresh();
    window.setTimeout(() => setStatus('idle'), 2000);
  }

  const accept =
    kind === 'original_document' ? 'application/pdf' : 'image/jpeg,image/png,image/webp';

  return (
    <section
      aria-labelledby={headingId}
      className="space-y-4 rounded-xl border border-dashed border-border bg-surface-raised p-4"
    >
      <div className="space-y-1">
        <h3 id={headingId} className="text-base font-semibold text-foreground">
          {t('heading')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('count', { count: counted, max: RECIPE_ASSETS_PER_RECIPE_MAX })}
        </p>
        <p className="text-sm text-muted-foreground">{t('limitsHint')}</p>
      </div>

      {atLimit ? (
        <p className="text-sm text-muted-foreground" role="status">
          {t('limitReached')}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor={kindSelectId}>{t('kindLabel')}</Label>
            <select
              id={kindSelectId}
              value={kind}
              disabled={busy}
              onChange={(event) => setKind(event.target.value as UploadKindOption)}
              className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {KIND_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {t(`kinds.${option}`)}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">{t(`kindHints.${kind}`)}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={fileInputId}>{t('fileLabel')}</Label>
            <input
              ref={fileRef}
              id={fileInputId}
              type="file"
              accept={accept}
              disabled={busy}
              className="block w-full text-sm text-foreground file:mr-4 file:min-h-11 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
              aria-invalid={error !== null}
              {...(error ? { 'aria-describedby': errorId } : {})}
              onChange={() => setError(null)}
            />
          </div>

          <Button
            type="button"
            className="min-h-11 w-full sm:w-auto"
            disabled={busy}
            onClick={() => void handleUpload()}
          >
            {busy ? t('uploading') : t('upload')}
          </Button>
        </div>
      )}

      {status === 'uploading' ? (
        <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
          {t('uploading')}
        </p>
      ) : null}
      {status === 'success' ? (
        <p className="text-sm text-foreground" role="status" aria-live="polite">
          {t('success')}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {t(`errors.${error}`)}
        </p>
      ) : null}
    </section>
  );
}
