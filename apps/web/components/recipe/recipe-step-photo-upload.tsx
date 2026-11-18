'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { RecipeFilePicker } from '@/components/recipe/recipe-file-picker';
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
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<RecipeAssetUploadApiError | null>(null);
  const step = stepIndex + 1;

  async function handlePick(file: File) {
    if (atAssetLimit || busy) {
      return;
    }
    setBusy(true);
    setAdded(false);
    setError(null);
    const result = await uploadRecipeAssetFile(familyId, recipeId, file, 'step_photo');
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setAdded(true);
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
            alt={t('previewAlt', { step })}
            loadErrorLabel={tMedia('loadError')}
            loadingLabel={tMedia('loading')}
          />
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={disabled || busy}
            onClick={() => {
              setAdded(false);
              onClear();
            }}
          >
            {t('remove')}
          </Button>
          <p className="text-xs text-muted-foreground">{t('saveReminder')}</p>
          <p className="text-xs text-muted-foreground">{t('removeHint')}</p>
        </div>
      ) : atAssetLimit ? (
        <p className="text-sm text-muted-foreground">{t('limitReached')}</p>
      ) : (
        <RecipeFilePicker
          disabled={disabled === true || busy}
          onPick={(file) => void handlePick(file)}
          actions={[
            { pick: 'step', label: t('addPhoto', { step }) },
            { pick: 'step', label: t('takePhoto', { step }), camera: true },
          ]}
        />
      )}
      <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
        {busy ? t('uploading') : added && mediaAssetId ? t('added') : ''}
      </p>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {tErrors(error)}
        </p>
      ) : null}
    </fieldset>
  );
}
