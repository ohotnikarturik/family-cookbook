'use client';

import { MAX_RECIPE_INGREDIENTS } from '@family-cookbook/contracts';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';

import { FormField } from '@/components/product/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  emptyIngredientRow,
  INGREDIENT_LINES_TEXT_MAX,
  parseIngredientLines,
  unitOptionsFromCatalog,
  type RecipeEditorIngredientDraft,
} from '@/lib/recipe-editor';

import {
  EditorRowControls,
  moveListItem,
  useAnnouncement,
  useFocusAfterRender,
} from './editor-row-controls';

type Props = Readonly<{
  ingredients: RecipeEditorIngredientDraft[];
  onChange: (ingredients: RecipeEditorIngredientDraft[]) => void;
  disabled?: boolean;
  fieldErrors?: Record<string, string> | undefined;
}>;

type RowPart = 'amount' | 'unit' | 'name' | 'note' | 'up' | 'down' | 'remove';

function isBlankRow(row: RecipeEditorIngredientDraft): boolean {
  return [row.amount, row.unit, row.name, row.notes].every((value) => value.trim().length === 0);
}

/**
 * One compact row per ingredient: Amount · Unit · Ingredient (two lines on phones), an optional
 * note, arrow buttons to reorder, and "Add several at once" for pasting a list.
 */
export function IngredientListEditor({ ingredients, onChange, disabled, fieldErrors }: Props) {
  const t = useTranslations('recipes.editor');
  const baseId = useId();
  const headingId = `${baseId}-heading`;
  const hintId = `${baseId}-amount-hint`;
  const unitListId = `${baseId}-units`;
  const bulkToggleId = `${baseId}-bulk-toggle`;
  const bulkPanelId = `${baseId}-bulk`;
  const bulkTextId = `${baseId}-bulk-text`;
  const units = unitOptionsFromCatalog(t('ingredients.unitOptions'));

  const [revealedNotes, setRevealedNotes] = useState<ReadonlySet<string>>(() => new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkError, setBulkError] = useState<string | undefined>(undefined);
  const focusLater = useFocusAfterRender();
  const { message, announce } = useAnnouncement();

  const rowPrefix = (row: RecipeEditorIngredientDraft) => `${baseId}-${row.clientKey}`;
  const rowId = (row: RecipeEditorIngredientDraft, part: RowPart) => `${rowPrefix(row)}-${part}`;
  const rowLabel = (index: number) => t('ingredients.row', { index: index + 1 });
  const displayName = (row: RecipeEditorIngredientDraft, index: number) =>
    row.name.trim() || rowLabel(index);

  function updateRow(index: number, patch: Partial<RecipeEditorIngredientDraft>) {
    onChange(ingredients.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    const row = emptyIngredientRow();
    onChange([...ingredients, row]);
    focusLater(rowId(row, 'amount'));
  }

  function removeRow(index: number) {
    const row = ingredients[index];
    if (!row) {
      return;
    }
    const remaining = ingredients.filter((_, i) => i !== index);
    const next = remaining.length > 0 ? remaining : [emptyIngredientRow()];
    onChange(next);
    const focusRow = next[Math.min(index, next.length - 1)];
    if (focusRow) {
      focusLater(rowId(focusRow, 'amount'));
    }
    announce(t('ingredients.removed', { name: displayName(row, index) }));
  }

  function moveRow(index: number, delta: -1 | 1) {
    const row = ingredients[index];
    const next = moveListItem(ingredients, index, delta);
    if (!row || !next) {
      return;
    }
    onChange(next);
    // Keep focus on the arrow that was pressed; at the top or bottom it is disabled, so use the other.
    const same = delta < 0 ? 'up' : 'down';
    const other = delta < 0 ? 'down' : 'up';
    focusLater(rowId(row, same), rowId(row, other));
    announce(
      t('ingredients.moved', { name: displayName(row, index), position: index + delta + 1 }),
    );
  }

  function revealNote(row: RecipeEditorIngredientDraft) {
    setRevealedNotes((current) => new Set(current).add(row.clientKey));
    focusLater(rowId(row, 'note'));
  }

  function openBulk() {
    setBulkOpen(true);
    setBulkError(undefined);
    focusLater(bulkTextId);
  }

  function closeBulk() {
    setBulkOpen(false);
    setBulkText('');
    setBulkError(undefined);
    focusLater(bulkToggleId);
  }

  function applyBulk() {
    const kept = ingredients.filter((row) => !isBlankRow(row));
    const room = MAX_RECIPE_INGREDIENTS - kept.length;
    const parsed = parseIngredientLines(bulkText, units, room);
    const first = parsed.rows[0];
    if (!first) {
      setBulkError(
        room <= 0
          ? t('ingredients.bulk.full', { max: MAX_RECIPE_INGREDIENTS })
          : t('ingredients.bulk.empty'),
      );
      focusLater(bulkTextId);
      return;
    }
    const added = parsed.rows.map((line) => ({ ...emptyIngredientRow(), ...line }));
    onChange([...kept, ...added]);
    setBulkOpen(false);
    setBulkText('');
    setBulkError(undefined);
    announce(
      parsed.truncated
        ? t('ingredients.bulk.truncated', { count: added.length, max: MAX_RECIPE_INGREDIENTS })
        : t('ingredients.bulk.added', { count: added.length }),
    );
    const firstAdded = added[0];
    if (firstAdded) {
      focusLater(rowId(firstAdded, 'amount'));
    }
  }

  return (
    <section
      aria-labelledby={headingId}
      className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm"
    >
      <div className="space-y-1">
        <h2 id={headingId} className="text-base font-semibold text-foreground">
          {t('sections.ingredients')}
        </h2>
        <p id={hintId} className="text-sm text-muted-foreground">
          {t('hints.amount')}
        </p>
      </div>
      <datalist id={unitListId}>
        {units.map((unit) => (
          <option key={unit} value={unit} />
        ))}
      </datalist>
      <ul aria-labelledby={headingId} className="list-none divide-y divide-border p-0">
        {ingredients.map((row, index) => {
          const error = (field: string) => fieldErrors?.[`ingredients.${index}.${field}`];
          const noteError = error('notes');
          const noteOpen =
            revealedNotes.has(row.clientKey) || row.notes.trim() !== '' || noteError !== undefined;
          return (
            <li key={row.clientKey} className="py-4 first:pt-0 last:pb-0">
              <div role="group" aria-label={rowLabel(index)} className="space-y-2">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,6.5rem)_minmax(0,8rem)_minmax(0,1fr)]">
                  <FormField
                    id={rowId(row, 'amount')}
                    label={t('ingredients.amount')}
                    error={error('amount')}
                  >
                    <Input
                      value={row.amount}
                      onChange={(event) => updateRow(index, { amount: event.target.value })}
                      disabled={disabled}
                      className="min-h-11"
                      autoComplete="off"
                      aria-describedby={hintId}
                    />
                  </FormField>
                  <FormField
                    id={rowId(row, 'unit')}
                    label={t('ingredients.unit')}
                    error={error('unit')}
                  >
                    <Input
                      value={row.unit}
                      onChange={(event) => updateRow(index, { unit: event.target.value })}
                      disabled={disabled}
                      className="min-h-11"
                      autoComplete="off"
                      list={unitListId}
                    />
                  </FormField>
                  <FormField
                    id={rowId(row, 'name')}
                    label={t('ingredients.name')}
                    error={error('name')}
                    className="col-span-2 sm:col-span-1"
                  >
                    <Input
                      value={row.name}
                      onChange={(event) => updateRow(index, { name: event.target.value })}
                      disabled={disabled}
                      className="min-h-11"
                      autoComplete="off"
                    />
                  </FormField>
                </div>
                {noteOpen ? (
                  <FormField
                    id={rowId(row, 'note')}
                    label={t('ingredients.note')}
                    error={noteError}
                  >
                    <Input
                      value={row.notes}
                      onChange={(event) => updateRow(index, { notes: event.target.value })}
                      disabled={disabled}
                      className="min-h-11"
                      autoComplete="off"
                    />
                  </FormField>
                ) : null}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {noteOpen ? null : (
                    <Button
                      type="button"
                      variant="ghost"
                      className="px-2"
                      disabled={disabled}
                      onClick={() => revealNote(row)}
                    >
                      <Plus aria-hidden />
                      {t('ingredients.addNote')}
                    </Button>
                  )}
                  <div className="ms-auto">
                    <EditorRowControls
                      idPrefix={rowPrefix(row)}
                      index={index}
                      count={ingredients.length}
                      disabled={disabled}
                      labels={{
                        moveUp: t('actions.moveUp'),
                        moveDown: t('actions.moveDown'),
                        remove: t('actions.remove'),
                        removeName: t('ingredients.remove', { name: displayName(row, index) }),
                        rowLabel: rowLabel(index),
                      }}
                      onMove={(delta) => moveRow(index, delta)}
                      onRemove={() => removeRow(index)}
                    />
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={disabled} onClick={addRow}>
          <Plus aria-hidden />
          {t('ingredients.add')}
        </Button>
        <Button
          id={bulkToggleId}
          type="button"
          variant="ghost"
          disabled={disabled}
          aria-expanded={bulkOpen}
          aria-controls={bulkPanelId}
          onClick={bulkOpen ? closeBulk : openBulk}
        >
          {t('ingredients.bulk.open')}
        </Button>
      </div>
      <div
        id={bulkPanelId}
        hidden={!bulkOpen}
        className="space-y-3 rounded-lg border border-border bg-surface-sunken p-3"
      >
        <FormField
          id={bulkTextId}
          label={t('ingredients.bulk.label')}
          hint={t('ingredients.bulk.hint')}
          error={bulkError}
        >
          <Textarea
            value={bulkText}
            onChange={(event) => setBulkText(event.target.value)}
            disabled={disabled}
            rows={6}
            maxLength={INGREDIENT_LINES_TEXT_MAX}
            className="min-h-32 text-base"
          />
        </FormField>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={disabled} onClick={applyBulk}>
            {t('ingredients.bulk.add')}
          </Button>
          <Button type="button" variant="ghost" onClick={closeBulk}>
            {t('ingredients.bulk.cancel')}
          </Button>
        </div>
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {message}
      </p>
    </section>
  );
}
