'use client';

import { RECIPE_ASSETS_PER_RECIPE_MAX } from '@family-cookbook/contracts';
import { ChevronDown, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';

import { FormField } from '@/components/product/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  emptyStepRow,
  type RecipeEditorMediaContext,
  type RecipeEditorStepDraft,
} from '@/lib/recipe-editor';

import {
  EditorRowControls,
  moveListItem,
  useAnnouncement,
  useFocusAfterRender,
} from './editor-row-controls';
import { RecipeStepPhotoUpload } from './recipe-step-photo-upload';

type Props = Readonly<{
  steps: RecipeEditorStepDraft[];
  onChange: (steps: RecipeEditorStepDraft[]) => void;
  disabled?: boolean;
  fieldErrors?: Record<string, string> | undefined;
  mediaContext?: RecipeEditorMediaContext | undefined;
}>;

type RowPart = 'instruction' | 'options' | 'options-toggle' | 'duration' | 'up' | 'down';

/** Numbered steps; step time and step photo sit behind "More options". */
export function StepListEditor({ steps, onChange, disabled, fieldErrors, mediaContext }: Props) {
  const t = useTranslations('recipes.editor');
  const baseId = useId();
  const headingId = `${baseId}-heading`;
  const atAssetLimit =
    mediaContext !== undefined && mediaContext.assetCount >= RECIPE_ASSETS_PER_RECIPE_MAX;
  // Rows the person opened or closed; other rows open when they already have a time or photo.
  const [optionsOverride, setOptionsOverride] = useState<Readonly<Record<string, boolean>>>({});
  const focusLater = useFocusAfterRender();
  const { message, announce } = useAnnouncement();

  const rowPrefix = (row: RecipeEditorStepDraft) => `${baseId}-${row.clientKey}`;
  const rowId = (row: RecipeEditorStepDraft, part: RowPart) => `${rowPrefix(row)}-${part}`;
  const rowLabel = (index: number) => t('steps.row', { index: index + 1 });

  function updateRow(index: number, patch: Partial<RecipeEditorStepDraft>) {
    onChange(steps.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    const row = emptyStepRow();
    onChange([...steps, row]);
    focusLater(rowId(row, 'instruction'));
  }

  function removeRow(index: number) {
    const remaining = steps.filter((_, i) => i !== index);
    const next = remaining.length > 0 ? remaining : [emptyStepRow()];
    onChange(next);
    const focusRow = next[Math.min(index, next.length - 1)];
    if (focusRow) {
      focusLater(rowId(focusRow, 'instruction'));
    }
    announce(t('steps.removed', { index: index + 1 }));
  }

  function moveRow(index: number, delta: -1 | 1) {
    const row = steps[index];
    const next = moveListItem(steps, index, delta);
    if (!row || !next) {
      return;
    }
    onChange(next);
    const same = delta < 0 ? 'up' : 'down';
    const other = delta < 0 ? 'down' : 'up';
    focusLater(rowId(row, same), rowId(row, other));
    announce(t('steps.moved', { from: index + 1, position: index + delta + 1 }));
  }

  function optionsOpen(row: RecipeEditorStepDraft, index: number): boolean {
    const override = optionsOverride[row.clientKey];
    if (override !== undefined) {
      return override;
    }
    return (
      row.durationMinutes.trim() !== '' ||
      Boolean(row.mediaAssetId) ||
      fieldErrors?.[`steps.${index}.durationMinutes`] !== undefined
    );
  }

  return (
    <section
      aria-labelledby={headingId}
      className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm"
    >
      <h2 id={headingId} className="text-base font-semibold text-foreground">
        {t('sections.steps')}
      </h2>
      <ol aria-labelledby={headingId} className="list-none divide-y divide-border p-0">
        {steps.map((row, index) => {
          const open = optionsOpen(row, index);
          return (
            <li key={row.clientKey} className="py-4 first:pt-0 last:pb-0">
              <div role="group" aria-label={rowLabel(index)} className="space-y-2">
                <FormField
                  id={rowId(row, 'instruction')}
                  label={t('steps.label', { index: index + 1 })}
                  error={fieldErrors?.[`steps.${index}.instruction`]}
                >
                  <Textarea
                    value={row.instruction}
                    onChange={(event) => updateRow(index, { instruction: event.target.value })}
                    disabled={disabled}
                    className="min-h-24 text-base"
                    rows={3}
                  />
                </FormField>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Button
                    id={rowId(row, 'options-toggle')}
                    type="button"
                    variant="ghost"
                    className="px-2"
                    aria-expanded={open}
                    aria-controls={rowId(row, 'options')}
                    onClick={() =>
                      setOptionsOverride((current) => ({ ...current, [row.clientKey]: !open }))
                    }
                  >
                    <ChevronDown
                      aria-hidden
                      className={
                        open
                          ? 'rotate-180 motion-safe:transition-transform'
                          : 'motion-safe:transition-transform'
                      }
                    />
                    {t('steps.moreOptions')}
                  </Button>
                  <div className="ms-auto">
                    <EditorRowControls
                      idPrefix={rowPrefix(row)}
                      index={index}
                      count={steps.length}
                      disabled={disabled}
                      labels={{
                        moveUp: t('actions.moveUp'),
                        moveDown: t('actions.moveDown'),
                        remove: t('actions.remove'),
                        removeName: t('steps.remove', { index: index + 1 }),
                        rowLabel: rowLabel(index),
                      }}
                      onMove={(delta) => moveRow(index, delta)}
                      onRemove={() => removeRow(index)}
                    />
                  </div>
                </div>
                <div
                  id={rowId(row, 'options')}
                  hidden={!open}
                  className="space-y-4 rounded-lg border border-border bg-surface-sunken p-3"
                >
                  <FormField
                    id={rowId(row, 'duration')}
                    label={t('steps.durationMinutes')}
                    hint={t('hints.stepDuration')}
                    error={fieldErrors?.[`steps.${index}.durationMinutes`]}
                  >
                    <Input
                      value={row.durationMinutes}
                      onChange={(event) =>
                        updateRow(index, { durationMinutes: event.target.value })
                      }
                      disabled={disabled}
                      className="min-h-11 max-w-40"
                      inputMode="numeric"
                      autoComplete="off"
                    />
                  </FormField>
                  {mediaContext ? (
                    <RecipeStepPhotoUpload
                      familyId={mediaContext.familyId}
                      recipeId={mediaContext.recipeId}
                      stepIndex={index}
                      mediaAssetId={row.mediaAssetId}
                      atAssetLimit={atAssetLimit}
                      disabled={disabled === true}
                      onLinked={(assetId) => {
                        updateRow(index, { mediaAssetId: assetId });
                        mediaContext.onAssetUploaded(assetId);
                      }}
                      onClear={() => updateRow(index, { mediaAssetId: null })}
                    />
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <Button type="button" variant="outline" disabled={disabled} onClick={addRow}>
        <Plus aria-hidden />
        {t('steps.add')}
      </Button>
      <p role="status" aria-live="polite" className="sr-only">
        {message}
      </p>
    </section>
  );
}
