'use client';

import { useId } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { newClientKey, tagDraftWithName, type RecipeEditorTagDraft } from '@/lib/recipe-editor';

type Props = Readonly<{
  tags: RecipeEditorTagDraft[];
  onChange: (tags: RecipeEditorTagDraft[]) => void;
  addLabel: string;
  removeLabel: (name: string) => string;
  nameLabel: string;
  nameHint?: string;
  disabled?: boolean;
  fieldErrors?: Record<string, string> | undefined;
}>;

export function TagListEditor({
  tags,
  onChange,
  addLabel,
  removeLabel,
  nameLabel,
  nameHint,
  disabled,
  fieldErrors,
}: Props) {
  const inputId = useId();

  function addTag() {
    onChange([...tags, { clientKey: newClientKey(), name: '' }]);
  }

  function updateTag(index: number, name: string) {
    onChange(tags.map((tag, i) => (i === index ? tagDraftWithName(tag, name) : tag)));
  }

  function removeTag(index: number) {
    onChange(tags.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <ul className="list-none space-y-2 p-0">
        {tags.map((tag, index) => {
          const error = fieldErrors?.[`tags.${index}.name`];
          return (
            <li
              key={tag.clientKey.length > 0 ? tag.clientKey : `tag-${index}`}
              className="flex flex-col gap-2 sm:flex-row sm:items-end"
            >
              <div className="grow space-y-1.5">
                <Label htmlFor={`${inputId}-${tag.clientKey}`} className="sr-only">
                  {nameLabel}
                </Label>
                <Input
                  id={`${inputId}-${tag.clientKey}`}
                  value={tag.name}
                  onChange={(event) => updateTag(index, event.target.value)}
                  disabled={disabled}
                  className="min-h-11"
                  autoComplete="off"
                  aria-invalid={error !== undefined}
                  aria-describedby={error ? `${inputId}-${tag.clientKey}-error` : undefined}
                />
                {error ? (
                  <p id={`${inputId}-${tag.clientKey}-error`} className="text-sm text-destructive">
                    {error}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 shrink-0"
                disabled={disabled}
                onClick={() => removeTag(index)}
              >
                {removeLabel(tag.name || nameLabel)}
              </Button>
            </li>
          );
        })}
      </ul>
      <div className="space-y-1">
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={disabled}
          onClick={addTag}
        >
          {addLabel}
        </Button>
        {nameHint ? <p className="text-sm text-muted-foreground">{nameHint}</p> : null}
      </div>
    </div>
  );
}
