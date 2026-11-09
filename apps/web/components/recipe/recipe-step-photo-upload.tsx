'use client';

import { useRouter } from 'next/navigation';
import { useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RecipeStepPhoto } from '@/components/recipe/recipe-step-photo';
import { uploadRecipeAssetFile, type RecipeAssetUploadApiError } from '@/lib/recipe-asset-upload';

type Props = Readonly<{
  familyId: string;
  recipeId: string;
  stepIndex: number;
  mediaAssetId: string | null | undefined;
  atAssetLimit: boolean;
  disabled?: boolean;
  onLinked: (assetId: string) => void;
  onClear: () => void;
}>;

export function RecipeStepPhotoUpload({
  familyId,
  recipeId,
  stepIndex,
  mediaAssetId,
  atAssetLimit,
  disabled,
  onLinked,
  onClear,
}: Props) {
  const t = useTranslations('recipes.mediaUpload.step');
  const tMedia = useTranslations('recipes.detail.media');
  const tErrors = useTranslations('recipes.mediaUpload.errors');
  const router = useRouter();
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<RecipeAssetUploadApiError | null>(null);

  async function handleFileChange() {
    const file = fileRef.current?.files?.[0];
    if (!file || atAssetLimit) {
      return;
    }
    setBusy(true);
    setError(null);
    const result = await uploadRecipeAssetFile(familyId, recipeId, file, 'step_photo');
    setBusy(false);
    if (fileRef.current) {
      fileRef.current.value = '';
    }
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onLinked(result.assetId);
    router.refresh();
  }

  return (
    <fieldset className="mt-4 space-y-2 border-t border-border pt-4">
      <legend className="text-sm font-medium text-foreground">{t('legend')}</legend>
      <p className="text-xs text-muted-foreground">{t('hint')}</p>
      {mediaAssetId ? (
        <div className="space-y-2">
          <RecipeStepPhoto
            familyId={familyId}
            recipeId={recipeId}
            assetId={mediaAssetId}
            alt={t('previewAlt', { step: stepIndex + 1 })}
            loadErrorLabel={tMedia('loadError')}
            loadingLabel={tMedia('loading')}
          />
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={disabled || busy}
            onClick={onClear}
          >
            {t('remove')}
          </Button>
          <p className="text-xs text-muted-foreground">{t('saveReminder')}</p>
          <p className="text-xs text-muted-foreground">{t('removeHint')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor={inputId}>{atAssetLimit ? t('limitReached') : t('fileLabel')}</Label>
          <input
            ref={fileRef}
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={disabled || busy || atAssetLimit}
            className="block w-full text-sm text-foreground file:mr-4 file:min-h-11 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
            onChange={() => void handleFileChange()}
          />
        </div>
      )}
      {busy ? (
        <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
          {t('uploading')}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {tErrors(error)}
        </p>
      ) : null}
    </fieldset>
  );
}
