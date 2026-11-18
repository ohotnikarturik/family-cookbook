'use client';

import { useActionState, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import {
  createRecipeAction,
  updateRecipeAction,
  type RecipeEditorActionState,
} from '@/app/actions/recipe';
import { FormField } from '@/components/product/form-field';
import { Hint } from '@/components/product/hint';
import { textLinkClassName } from '@/components/product/text-link';
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
  /** Categories the family already uses, offered as suggestions. */
  categoryOptions?: readonly string[];
}>;

export function RecipeEditorForm({
  mode,
  initialDraft,
  canManageRecipeTags,
  cancelHref,
  recipeAssets = [],
  categoryOptions = [],
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
      categoryOptions={categoryOptions}
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
  categoryOptions = [],
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
  const tLang = useTranslations('locale.languages');
  const tCommon = useTranslations('common');
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
  const formId = useId();
  const detailsHeadingId = useId();
  const tagsHeadingId = useId();
  const categoryListId = `${titleId}-categories`;

  const fieldErrors = state?.ok === false ? state.fieldErrors : undefined;
  const titleError = fieldErrors ? fieldErrorForPath(fieldErrors, 'title') : undefined;
  const sourceLanguageError = fieldErrors
    ? fieldErrorForPath(fieldErrors, 'sourceLanguage')
    : undefined;
  const servingsError = fieldErrors ? fieldErrorForPath(fieldErrors, 'servings') : undefined;
  const prepError = fieldErrors ? fieldErrorForPath(fieldErrors, 'prepMinutes') : undefined;
  const cookError = fieldErrors ? fieldErrorForPath(fieldErrors, 'cookMinutes') : undefined;
  const categoryError = fieldErrors ? fieldErrorForPath(fieldErrors, 'category') : undefined;
  const notesError = fieldErrors ? fieldErrorForPath(fieldErrors, 'notes') : undefined;

  useEffect(() => {
    if (state?.ok === false) {
      alertRef.current?.focus();
    }
  }, [state]);

  return (
    <div className="space-y-6 pb-28 md:pb-24">
      <form id={formId} action={action} className="space-y-6" aria-busy={pending} noValidate>
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
                  className={textLinkClassName}
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
          <h2 className="text-base font-semibold text-foreground">{t('sections.basics')}</h2>
          <FormField
            id={titleId}
            label={t('fields.title')}
            hint={t('hints.title')}
            error={titleError}
          >
            <Input
              value={draft.title}
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
              disabled={pending}
              required
              className="min-h-11"
              autoComplete="off"
            />
          </FormField>

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
            <Hint
              id={`${titleId}-lang-hint`}
              more={{
                summary: tCommon('whatIsThis'),
                content: <p>{t('hints.sourceLanguageMore')}</p>,
              }}
            >
              {t('hints.sourceLanguage')}
            </Hint>
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

          <FormField id={descriptionId} label={t('fields.description')}>
            <Textarea
              value={draft.description}
              onChange={(event) =>
                setDraft((current) => ({ ...current, description: event.target.value }))
              }
              disabled={pending}
              className="min-h-24 text-base"
              rows={4}
            />
          </FormField>
        </section>

        <IngredientListEditor
          ingredients={draft.ingredients}
          onChange={(ingredients) => setDraft((current) => ({ ...current, ingredients }))}
          disabled={pending}
          fieldErrors={fieldErrors}
        />

        <StepListEditor
          steps={draft.steps}
          onChange={(steps) => setDraft((current) => ({ ...current, steps }))}
          disabled={pending}
          fieldErrors={fieldErrors}
          {...(mediaContext ? { mediaContext } : {})}
        />

        <section
          aria-labelledby={detailsHeadingId}
          className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <h2 id={detailsHeadingId} className="text-base font-semibold text-foreground">
            {t('sections.details')}
          </h2>
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
          <FormField
            id={`${titleId}-category`}
            label={t('fields.category')}
            hint={categoryOptions.length > 0 ? t('hints.category') : undefined}
            error={categoryError}
          >
            <Input
              value={draft.category}
              onChange={(event) =>
                setDraft((current) => ({ ...current, category: event.target.value }))
              }
              disabled={pending}
              className="min-h-11"
              autoComplete="off"
              list={categoryOptions.length > 0 ? categoryListId : undefined}
            />
          </FormField>
          {categoryOptions.length > 0 ? (
            <datalist id={categoryListId}>
              {categoryOptions.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          ) : null}
          <div role="group" aria-labelledby={tagsHeadingId} className="space-y-2">
            <h3 id={tagsHeadingId} className="text-sm font-medium text-foreground">
              {t('sections.tags')}
            </h3>
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
          </div>
          <FormField id={`${titleId}-notes`} label={t('fields.notes')} error={notesError}>
            <Textarea
              value={draft.notes}
              onChange={(event) =>
                setDraft((current) => ({ ...current, notes: event.target.value }))
              }
              disabled={pending}
              className="min-h-20 text-base"
              rows={3}
            />
          </FormField>
        </section>

        {preserved && preserved.translations.length > 0 ? (
          <p className="text-sm text-muted-foreground">{t('hints.translationsPreserved')}</p>
        ) : null}
      </form>
      {mode.kind === 'edit' ? (
        <RecipeMediaUploadPanel
          familyId={mode.familyId}
          recipeId={mode.recipeId}
          assets={attachedAssets}
          assetCount={assetCount}
          onUploaded={onAssetUploaded}
        />
      ) : null}
      <div className="fixed inset-x-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:bottom-0">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            type="submit"
            form={formId}
            disabled={pending}
            className="min-h-11 w-full sm:w-auto"
          >
            {pending ? t('saving') : t('submit')}
          </Button>
          <Button type="button" variant="outline" className="min-h-11 w-full sm:w-auto" asChild>
            <Link href={cancelHref}>{t('cancel')}</Link>
          </Button>
        </div>
      </div>
    </div>
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
    <FormField id={id} label={label} error={error}>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="min-h-11"
        inputMode={inputMode}
        autoComplete="off"
      />
    </FormField>
  );
}
