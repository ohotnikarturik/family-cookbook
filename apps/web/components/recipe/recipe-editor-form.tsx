'use client';

import { useActionState, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import {
  createRecipeAction,
  updateRecipeAction,
  type RecipeEditorActionState,
} from '@/app/actions/recipe';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Link } from '@/i18n/navigation';
import { fieldErrorForPath } from '@/lib/recipe-editor';
import type {
  PreservedTranslationCollections,
  RecipeEditorDraft,
  RecipeEditorMediaContext,
  RecipeEditorMode,
} from '@/lib/recipe-editor';
import { RecipeMediaUploadPanel } from '@/components/recipe/recipe-media-upload-panel';
import type { RecipeAssetSummary } from '@family-cookbook/contracts';

import { IngredientListEditor } from './ingredient-list-editor';
import { StepListEditor } from './step-list-editor';
import { TagListEditor } from './tag-list-editor';

type Props = Readonly<{
  mode: RecipeEditorMode;
  initialDraft: RecipeEditorDraft;
  canManageRecipeTags: boolean;
  cancelHref: string;
  recipeAssets?: readonly RecipeAssetSummary[];
}>;

export function RecipeEditorForm({
  mode,
  initialDraft,
  canManageRecipeTags,
  cancelHref,
  recipeAssets = [],
}: Props) {
  const actionFn = mode.kind === 'create' ? createRecipeAction : updateRecipeAction;
  const [state, action, pending] = useActionState<RecipeEditorActionState | null, FormData>(
    actionFn,
    null,
  );
  const [sessionAssetIds, setSessionAssetIds] = useState<readonly string[]>([]);

  function noteUploadedAsset(assetId: string) {
    setSessionAssetIds((current) => (current.includes(assetId) ? current : [...current, assetId]));
  }

  const draftSeed = useMemo(() => {
    if (state?.ok === false && state.draft) {
      return state.draft;
    }
    return initialDraft;
  }, [initialDraft, state]);

  const rehydrateKey = useMemo(() => {
    if (state?.ok === false && state.draft) {
      return `err-${state.code}-${state.draft.title.length}-${state.draft.ingredients.length}`;
    }
    return 'idle';
  }, [state]);

  return (
    <RecipeEditorFormBody
      key={rehydrateKey}
      mode={mode}
      initialDraft={draftSeed}
      canManageRecipeTags={canManageRecipeTags}
      cancelHref={cancelHref}
      recipeAssets={recipeAssets}
      sessionAssetIds={sessionAssetIds}
      onAssetUploaded={noteUploadedAsset}
      state={state}
      action={action}
      pending={pending}
    />
  );
}

function RecipeEditorFormBody({
  mode,
  initialDraft,
  canManageRecipeTags,
  cancelHref,
  recipeAssets = [],
  sessionAssetIds,
  onAssetUploaded,
  state,
  action,
  pending,
}: Readonly<
  Props & {
    state: RecipeEditorActionState | null;
    action: (formData: FormData) => void;
    pending: boolean;
    sessionAssetIds: readonly string[];
    onAssetUploaded: (assetId: string) => void;
  }
>) {
  const t = useTranslations('recipes.editor');
  const tUpload = useTranslations('recipes.mediaUpload');
  const tLang = useTranslations('locale.languages');
  const locale = useLocale();

  const [draft, setDraft] = useState(initialDraft);
  const alertRef = useRef<HTMLDivElement>(null);
  const preserved: PreservedTranslationCollections | null =
    mode.kind === 'edit' ? mode.preserved : null;

  const attachedAssets = recipeAssets;
  const assetCount = useMemo(() => {
    const ids = new Set(attachedAssets.map((asset) => asset.id));
    for (const id of sessionAssetIds) {
      ids.add(id);
    }
    return ids.size;
  }, [attachedAssets, sessionAssetIds]);
  const mediaContext: RecipeEditorMediaContext | undefined =
    mode.kind === 'edit'
      ? {
          familyId: mode.familyId,
          recipeId: mode.recipeId,
          assetCount,
          onAssetUploaded,
        }
      : undefined;

  const titleId = useId();
  const descriptionId = useId();

  const fieldErrors = state?.ok === false ? state.fieldErrors : undefined;
  const titleError = fieldErrors ? fieldErrorForPath(fieldErrors, 'title') : undefined;
  const sourceLanguageError = fieldErrors
    ? fieldErrorForPath(fieldErrors, 'sourceLanguage')
    : undefined;
  const servingsError = fieldErrors ? fieldErrorForPath(fieldErrors, 'servings') : undefined;
  const prepError = fieldErrors ? fieldErrorForPath(fieldErrors, 'prepMinutes') : undefined;
  const cookError = fieldErrors ? fieldErrorForPath(fieldErrors, 'cookMinutes') : undefined;

  useEffect(() => {
    if (state?.ok === false) {
      alertRef.current?.focus();
    }
  }, [state]);

  return (
    <>
      {mode.kind === 'edit' ? (
        <RecipeMediaUploadPanel
          familyId={mode.familyId}
          recipeId={mode.recipeId}
          assets={attachedAssets}
          assetCount={assetCount}
          onUploaded={onAssetUploaded}
        />
      ) : (
        <p className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          {tUpload('createDeferred')}
        </p>
      )}
      <form action={action} className="mt-6 space-y-6" aria-busy={pending} noValidate>
        <input type="hidden" name="familyId" value={mode.familyId} />
        <input type="hidden" name="payload" value={JSON.stringify(draft)} />
        {mode.kind === 'edit' ? (
          <>
            <input type="hidden" name="recipeId" value={mode.recipeId} />
            <input type="hidden" name="expectedVersion" value={mode.expectedVersion} />
            <input type="hidden" name="preserved" value={JSON.stringify(mode.preserved)} />
          </>
        ) : null}
        {state?.ok === false && state.code === 'version_conflict' ? (
          <div
            ref={alertRef}
            tabIndex={-1}
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            role="alert"
          >
            <p className="text-sm text-foreground">{state.message}</p>
            {mode.kind === 'edit' ? (
              <p className="mt-2 text-sm text-muted-foreground">
                <a
                  href={`/${locale}/f/${mode.familyId}/recipes/${mode.recipeId}/edit`}
                  className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t('errors.reloadEdit')}
                </a>
              </p>
            ) : null}
          </div>
        ) : null}

        {state?.ok === false && state.code !== 'version_conflict' && state.message.length > 0 ? (
          <p
            ref={alertRef}
            tabIndex={-1}
            className="text-sm text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            role="alert"
          >
            {state.message}
          </p>
        ) : null}

        {pending ? (
          <p className="text-sm text-muted-foreground" role="status">
            {t('saving')}
          </p>
        ) : null}

        <section className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">
          <h3 className="text-base font-semibold text-foreground">{t('sections.basics')}</h3>
          <div className="space-y-2">
            <Label htmlFor={titleId}>{t('fields.title')}</Label>
            <Input
              id={titleId}
              value={draft.title}
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
              disabled={pending}
              required
              className="min-h-11"
              aria-invalid={titleError !== undefined}
              aria-describedby={titleError ? `${titleId}-error` : undefined}
              autoComplete="off"
            />
            {titleError ? (
              <p id={`${titleId}-error`} className="text-sm text-destructive">
                {titleError}
              </p>
            ) : null}
            <p className="text-sm text-muted-foreground">{t('hints.title')}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${titleId}-lang`}>{t('fields.sourceLanguage')}</Label>
            <select
              id={`${titleId}-lang`}
              value={draft.sourceLanguagePreset}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  sourceLanguagePreset: event.target
                    .value as RecipeEditorDraft['sourceLanguagePreset'],
                }))
              }
              disabled={pending}
              aria-invalid={sourceLanguageError !== undefined}
              aria-describedby={
                sourceLanguageError ? `${titleId}-lang-error` : `${titleId}-lang-hint`
              }
              className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="en">{tLang('en')}</option>
              <option value="fi">{tLang('fi')}</option>
              <option value="ru">{tLang('ru')}</option>
              <option value="uk">{tLang('uk')}</option>
              <option value="other">{t('fields.sourceLanguageOther')}</option>
            </select>
            <p id={`${titleId}-lang-hint`} className="text-sm text-muted-foreground">
              {t('hints.sourceLanguage')}
            </p>
            {sourceLanguageError && draft.sourceLanguagePreset !== 'other' ? (
              <p id={`${titleId}-lang-error`} className="text-sm text-destructive">
                {sourceLanguageError}
              </p>
            ) : null}
            {draft.sourceLanguagePreset === 'other' ? (
              <div className="space-y-2">
                <Label htmlFor={`${titleId}-lang-other`}>{t('fields.sourceLanguageOther')}</Label>
                <Input
                  id={`${titleId}-lang-other`}
                  value={draft.sourceLanguageOther}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, sourceLanguageOther: event.target.value }))
                  }
                  disabled={pending}
                  className="min-h-11"
                  placeholder={t('fields.sourceLanguageOtherPlaceholder')}
                  autoComplete="off"
                  aria-invalid={sourceLanguageError !== undefined}
                  aria-describedby={sourceLanguageError ? `${titleId}-lang-error` : undefined}
                />
                {sourceLanguageError ? (
                  <p id={`${titleId}-lang-error`} className="text-sm text-destructive">
                    {sourceLanguageError}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor={descriptionId}>{t('fields.description')}</Label>
            <Textarea
              id={descriptionId}
              value={draft.description}
              onChange={(event) =>
                setDraft((current) => ({ ...current, description: event.target.value }))
              }
              disabled={pending}
              className="min-h-24 text-base"
              rows={4}
            />
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">
          <h3 className="text-base font-semibold text-foreground">{t('sections.timing')}</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField
              label={t('fields.servings')}
              value={draft.servings}
              onChange={(value) => setDraft((current) => ({ ...current, servings: value }))}
              disabled={pending}
              inputMode="decimal"
              error={servingsError}
            />
            <NumberField
              label={t('fields.prepMinutes')}
              value={draft.prepMinutes}
              onChange={(value) => setDraft((current) => ({ ...current, prepMinutes: value }))}
              disabled={pending}
              inputMode="numeric"
              error={prepError}
            />
            <NumberField
              label={t('fields.cookMinutes')}
              value={draft.cookMinutes}
              onChange={(value) => setDraft((current) => ({ ...current, cookMinutes: value }))}
              disabled={pending}
              inputMode="numeric"
              error={cookError}
            />
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">
          <h3 className="text-base font-semibold text-foreground">{t('sections.meta')}</h3>
          <div className="space-y-2">
            <Label htmlFor={`${titleId}-category`}>{t('fields.category')}</Label>
            <Input
              id={`${titleId}-category`}
              value={draft.category}
              onChange={(event) =>
                setDraft((current) => ({ ...current, category: event.target.value }))
              }
              disabled={pending}
              className="min-h-11"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${titleId}-notes`}>{t('fields.notes')}</Label>
            <Textarea
              id={`${titleId}-notes`}
              value={draft.notes}
              onChange={(event) =>
                setDraft((current) => ({ ...current, notes: event.target.value }))
              }
              disabled={pending}
              className="min-h-20 text-base"
              rows={3}
            />
          </div>
        </section>

        <section className="space-y-2 rounded-xl border border-border bg-card p-4 shadow-sm">
          <h3 className="text-base font-semibold text-foreground">{t('sections.tags')}</h3>
          <TagListEditor
            tags={draft.tags}
            onChange={(tags) => setDraft((current) => ({ ...current, tags }))}
            addLabel={t('tags.add')}
            removeLabel={(name) => t('tags.remove', { name: name || t('tags.unnamed') })}
            nameLabel={t('tags.name')}
            nameHint={canManageRecipeTags ? t('hints.tagsEditor') : t('hints.tagsContributor')}
            disabled={pending}
            fieldErrors={fieldErrors}
          />
        </section>

        <IngredientListEditor
          ingredients={draft.ingredients}
          onChange={(ingredients) => setDraft((current) => ({ ...current, ingredients }))}
          disabled={pending}
          fieldErrors={fieldErrors}
          labels={{
            sectionLegend: t('sections.ingredients'),
            name: t('ingredients.name'),
            quantity: t('ingredients.quantity'),
            quantityText: t('ingredients.quantityText'),
            quantityTextHint: t('hints.quantityText'),
            unit: t('ingredients.unit'),
            notes: t('ingredients.notes'),
            add: t('ingredients.add'),
            remove: (name) => t('ingredients.remove', { name }),
            moveUp: t('actions.moveUp'),
            moveDown: t('actions.moveDown'),
            rowLabel: (index) => t('ingredients.row', { index }),
          }}
        />

        <StepListEditor
          steps={draft.steps}
          onChange={(steps) => setDraft((current) => ({ ...current, steps }))}
          disabled={pending}
          fieldErrors={fieldErrors}
          {...(mediaContext ? { mediaContext } : {})}
          labels={{
            sectionLegend: t('sections.steps'),
            instruction: t('steps.instruction'),
            durationMinutes: t('steps.durationMinutes'),
            durationHint: t('hints.stepDuration'),
            add: t('steps.add'),
            remove: (index) => t('steps.remove', { index }),
            moveUp: t('actions.moveUp'),
            moveDown: t('actions.moveDown'),
            rowLabel: (index) => t('steps.row', { index }),
          }}
        />

        {preserved && preserved.translations.length > 0 ? (
          <p className="text-sm text-muted-foreground">{t('hints.translationsPreserved')}</p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="submit" disabled={pending} className="min-h-11 w-full sm:w-auto">
            {pending ? t('saving') : t('submit')}
          </Button>
          <Button type="button" variant="outline" className="min-h-11 w-full sm:w-auto" asChild>
            <Link href={cancelHref}>{t('cancel')}</Link>
          </Button>
        </div>
      </form>
    </>
  );
}

function NumberField({
  label,
  value,
  onChange,
  disabled,
  inputMode = 'text',
  error,
}: Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  inputMode?: 'text' | 'decimal' | 'numeric';
  error?: string | undefined;
}>) {
  const id = useId();
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="min-h-11"
        inputMode={inputMode}
        autoComplete="off"
        aria-invalid={error !== undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
