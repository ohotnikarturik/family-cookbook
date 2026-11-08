'use client';

import { cloneElement, isValidElement, type ReactElement } from 'react';

import type { RecipeEditorIngredientDraft } from '@/lib/recipe-editor';
import { emptyIngredientRow } from '@/lib/recipe-editor';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type IngredientEditorLabels = Readonly<{
  sectionLegend: string;
  name: string;
  quantity: string;
  quantityText: string;
  quantityTextHint: string;
  unit: string;
  notes: string;
  add: string;
  remove: (name: string) => string;
  moveUp: string;
  moveDown: string;
  rowLabel: (index: number) => string;
}>;

type Props = Readonly<{
  ingredients: RecipeEditorIngredientDraft[];
  onChange: (ingredients: RecipeEditorIngredientDraft[]) => void;
  labels: IngredientEditorLabels;
  disabled?: boolean;
  fieldErrors?: Record<string, string> | undefined;
}>;

export function IngredientListEditor({
  ingredients,
  onChange,
  labels,
  disabled,
  fieldErrors,
}: Props) {
  function updateRow(index: number, patch: Partial<RecipeEditorIngredientDraft>) {
    onChange(ingredients.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    const next = ingredients.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : [emptyIngredientRow()]);
  }

  function addRow() {
    onChange([...ingredients, emptyIngredientRow()]);
  }

  function moveRow(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= ingredients.length) {
      return;
    }
    const next = [...ingredients];
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
      <ul className="list-none space-y-4 p-0">
        {ingredients.map((row, index) => (
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
                disabled={disabled || index === ingredients.length - 1}
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
                {labels.remove(row.name || labels.rowLabel(index + 1))}
              </Button>
            </div>
            <EditorField
              id={`${row.clientKey}-name`}
              label={labels.name}
              error={fieldErrors?.[`ingredients.${index}.name`]}
            >
              <Input
                value={row.name}
                onChange={(event) => updateRow(index, { name: event.target.value })}
                disabled={disabled}
                className="min-h-11"
                autoComplete="off"
              />
            </EditorField>
            <div className="grid gap-3 sm:grid-cols-2">
              <EditorField
                id={`${row.clientKey}-quantity`}
                label={labels.quantity}
                error={fieldErrors?.[`ingredients.${index}.quantity`]}
              >
                <Input
                  value={row.quantity}
                  onChange={(event) => updateRow(index, { quantity: event.target.value })}
                  disabled={disabled}
                  className="min-h-11"
                  inputMode="decimal"
                  autoComplete="off"
                />
              </EditorField>
              <EditorField
                id={`${row.clientKey}-quantity-text`}
                label={labels.quantityText}
                hint={labels.quantityTextHint}
              >
                <Input
                  value={row.quantityText}
                  onChange={(event) => updateRow(index, { quantityText: event.target.value })}
                  disabled={disabled}
                  className="min-h-11"
                  autoComplete="off"
                />
              </EditorField>
            </div>
            <EditorField id={`${row.clientKey}-unit`} label={labels.unit}>
              <Input
                value={row.unit}
                onChange={(event) => updateRow(index, { unit: event.target.value })}
                disabled={disabled}
                className="min-h-11"
                autoComplete="off"
              />
            </EditorField>
            <EditorField id={`${row.clientKey}-notes`} label={labels.notes}>
              <Input
                value={row.notes}
                onChange={(event) => updateRow(index, { notes: event.target.value })}
                disabled={disabled}
                className="min-h-11"
                autoComplete="off"
              />
            </EditorField>
          </li>
        ))}
      </ul>
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
