'use client';

import { cloneElement, isValidElement, type ReactElement } from 'react';

import type { RecipeEditorMediaContext, RecipeEditorStepDraft } from '@/lib/recipe-editor';
import { RECIPE_ASSETS_PER_RECIPE_MAX } from '@family-cookbook/contracts';

import { RecipeStepPhotoUpload } from './recipe-step-photo-upload';
import { emptyStepRow } from '@/lib/recipe-editor';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export type StepEditorLabels = Readonly<{
  sectionLegend: string;
  instruction: string;
  durationMinutes: string;
  durationHint: string;
  add: string;
  remove: (index: number) => string;
  moveUp: string;
  moveDown: string;
  rowLabel: (index: number) => string;
}>;

type Props = Readonly<{
  steps: RecipeEditorStepDraft[];
  onChange: (steps: RecipeEditorStepDraft[]) => void;
  labels: StepEditorLabels;
  disabled?: boolean;
  fieldErrors?: Record<string, string> | undefined;
  mediaContext?: RecipeEditorMediaContext | undefined;
}>;

export function StepListEditor({
  steps,
  onChange,
  labels,
  disabled,
  fieldErrors,
  mediaContext,
}: Props) {
  const atAssetLimit =
    mediaContext !== undefined && mediaContext.assetCount >= RECIPE_ASSETS_PER_RECIPE_MAX;
  function updateRow(index: number, patch: Partial<RecipeEditorStepDraft>) {
    onChange(steps.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    const next = steps.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : [emptyStepRow()]);
  }

  function addRow() {
    onChange([...steps, emptyStepRow()]);
  }

  function moveRow(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= steps.length) {
      return;
    }
    const next = [...steps];
    const current = next[index];
    const swap = next[target];
    if (!current || !swap) {
      return;
    }
    next[index] = swap;
    next[target] = current;
    onChange(next);
  }

  return (
    <fieldset className="space-y-4 rounded-xl border border-border bg-surface-raised p-4">
      <legend className="px-1 text-base font-semibold text-foreground">
        {labels.sectionLegend}
      </legend>
      <ol className="list-none space-y-4 p-0">
        {steps.map((row, index) => (
          <li
            key={row.clientKey}
            className="space-y-3 rounded-lg border border-border bg-card p-4"
            role="group"
            aria-label={labels.rowLabel(index + 1)}
          >
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                disabled={disabled || index === 0}
                aria-label={`${labels.moveUp}, ${labels.rowLabel(index + 1)}`}
                onClick={() => moveRow(index, -1)}
              >
                {labels.moveUp}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                disabled={disabled || index === steps.length - 1}
                aria-label={`${labels.moveDown}, ${labels.rowLabel(index + 1)}`}
                onClick={() => moveRow(index, 1)}
              >
                {labels.moveDown}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                disabled={disabled}
                onClick={() => removeRow(index)}
              >
                {labels.remove(index + 1)}
              </Button>
            </div>
            <EditorField
              id={`${row.clientKey}-instruction`}
              label={labels.instruction}
              error={fieldErrors?.[`steps.${index}.instruction`]}
            >
              <Textarea
                value={row.instruction}
                onChange={(event) => updateRow(index, { instruction: event.target.value })}
                disabled={disabled}
                className="min-h-24 text-base"
                rows={4}
              />
            </EditorField>
            <EditorField
              id={`${row.clientKey}-duration`}
              label={labels.durationMinutes}
              hint={labels.durationHint}
              error={fieldErrors?.[`steps.${index}.durationMinutes`]}
            >
              <Input
                value={row.durationMinutes}
                onChange={(event) => updateRow(index, { durationMinutes: event.target.value })}
                disabled={disabled}
                className="min-h-11"
                inputMode="numeric"
                autoComplete="off"
              />
            </EditorField>
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
          </li>
        ))}
      </ol>
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        disabled={disabled}
        onClick={addRow}
      >
        {labels.add}
      </Button>
    </fieldset>
  );
}

function EditorField({
  id,
  label,
  hint,
  error,
  children,
}: Readonly<{
  id: string;
  label: string;
  hint?: string;
  error?: string | undefined;
  children: ReactElement<{
    id?: string;
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
  }>;
}>) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter((value) => value !== null)
    .join(' ');
  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-invalid': error !== undefined,
        ...(describedBy.length > 0 ? { 'aria-describedby': describedBy } : {}),
      })
    : children;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {control}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
