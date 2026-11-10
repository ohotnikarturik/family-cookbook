'use client';

import { ChevronDown } from 'lucide-react';
import { useActionState, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import {
  createRecipeAction,
  updateRecipeAction,
  type RecipeEditorActionState,
} from '@/app/actions/recipe';
import { FormField } from '@/components/product/form-field';
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
  const formId = useId();

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
    <div className="pb-28 md:pb-24">
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
      <form id={formId} action={action} className="mt-6 space-y-6" aria-busy={pending} noValidate>
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
          <h3 className="text-base font-semibold text-foreground">{t('sections.basics')}</h3>
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

        <EditorSection
          title={t('sections.timing')}
          defaultOpen={
            draft.servings.trim() !== '' ||
            draft.prepMinutes.trim() !== '' ||
            draft.cookMinutes.trim() !== '' ||
            sectionHasError(fieldErrors, ['servings', 'prepMinutes', 'cookMinutes'])
          }
        >
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
        </EditorSection>

        <EditorSection
          title={t('sections.meta')}
          defaultOpen={
            draft.category.trim() !== '' ||
            draft.notes.trim() !== '' ||
            sectionHasError(fieldErrors, ['category', 'notes'])
          }
        >
          <FormField id={`${titleId}-category`} label={t('fields.category')}>
            <Input
              value={draft.category}
              onChange={(event) =>
                setDraft((current) => ({ ...current, category: event.target.value }))
              }
              disabled={pending}
              className="min-h-11"
              autoComplete="off"
            />
          </FormField>
          <FormField id={`${titleId}-notes`} label={t('fields.notes')}>
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
        </EditorSection>

        <EditorSection
          title={t('sections.tags')}
          defaultOpen={
            draft.tags.some((tag) => tag.name.trim() !== '') ||
            sectionHasError(fieldErrors, ['tags'])
          }
        >
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
        </EditorSection>

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
      </form>
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

function EditorSection({
  title,
  defaultOpen,
  children,
}: Readonly<{ title: string; defaultOpen: boolean; children: ReactNode }>) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (defaultOpen && detailsRef.current) {
      detailsRef.current.open = true;
    }
  }, [defaultOpen]);

  return (
    <details ref={detailsRef} className="group rounded-xl border border-border bg-card shadow-sm">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-base font-semibold text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <ChevronDown
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="space-y-4 border-t border-border p-4">{children}</div>
    </details>
  );
}

function sectionHasError(
  fieldErrors: Record<string, string> | undefined,
  prefixes: readonly string[],
): boolean {
  if (!fieldErrors) {
    return false;
  }
  return Object.keys(fieldErrors).some((key) =>
    prefixes.some(
      (prefix) =>
        key === prefix || key.startsWith(`${prefix}.`) || key.startsWith(`recipe.${prefix}`),
    ),
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
