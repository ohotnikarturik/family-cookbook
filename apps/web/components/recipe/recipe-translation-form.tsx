'use client';

import type { RecipeDetail } from '@family-cookbook/contracts';
import { useActionState, useId, useMemo, useState, type ReactNode } from 'react';

import {
  saveRecipeTranslationAction,
  type TranslationActionErrorCode,
} from '@/app/actions/recipe-translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Labels = Readonly<{
  title: string;
  description: string;
  notes: string;
  ingredientsHeading: string;
  stepsHeading: string;
  ingredientByPosition: Record<number, string>;
  ingredientNotesByPosition: Record<number, string>;
  stepByPosition: Record<number, string>;
  originalLabel: string;
  save: string;
  saving: string;
  markReviewed: string;
  reviewHelp: string;
}>;

type Props = Readonly<{
  recipe: RecipeDetail;
  familyId: string;
  languageTag: string;
  showReviewCheckbox: boolean;
  initial: {
    title: string;
    description: string;
    notes: string;
    ingredientNames: Record<number, string>;
    ingredientNotes: Record<number, string>;
    stepInstructions: Record<number, string>;
    reviewStatus: 'unreviewed' | 'reviewed';
  };
  labels: Labels;
  savedMessage: string;
  errorMessages: Record<TranslationActionErrorCode, string>;
}>;

export function RecipeTranslationForm(props: Props) {
  const [state, submitAction, pending] = useActionState(saveRecipeTranslationAction, null);
  const [title, setTitle] = useState(props.initial.title);
  const [description, setDescription] = useState(props.initial.description);
  const [notes, setNotes] = useState(props.initial.notes);
  const [ingredientNames, setIngredientNames] = useState(props.initial.ingredientNames);
  const [ingredientNotes, setIngredientNotes] = useState(props.initial.ingredientNotes);
  const [stepInstructions, setStepInstructions] = useState(props.initial.stepInstructions);
  const [reviewed, setReviewed] = useState(props.initial.reviewStatus === 'reviewed');
  const [version, setVersion] = useState(props.recipe.version);
  const formId = useId();
  const nextVersion = Math.max(
    version,
    props.recipe.version,
    state?.ok === true ? state.version : version,
  );
  if (nextVersion !== version) {
    setVersion(nextVersion);
  }

  const payloadJson = useMemo(
    () =>
      JSON.stringify({
        title,
        description: description.trim().length > 0 ? description : null,
        notes: notes.trim().length > 0 ? notes : null,
        reviewStatus: reviewed ? 'reviewed' : 'unreviewed',
        ingredients: props.recipe.ingredients.map((item) => ({
          ingredientPosition: item.position,
          languageTag: props.languageTag,
          name: ingredientNames[item.position] ?? '',
          notes:
            (ingredientNotes[item.position] ?? '').trim().length > 0
              ? ingredientNotes[item.position]
              : null,
        })),
        steps: props.recipe.steps.map((item) => ({
          stepPosition: item.position,
          languageTag: props.languageTag,
          instruction: stepInstructions[item.position] ?? '',
        })),
      }),
    [
      description,
      ingredientNames,
      ingredientNotes,
      notes,
      props.languageTag,
      props.recipe.ingredients,
      props.recipe.steps,
      reviewed,
      stepInstructions,
      title,
    ],
  );

  const errorMessage = state?.ok === false ? props.errorMessages[state.code] : null;

  return (
    <form action={submitAction} className="space-y-8">
      <input type="hidden" name="familyId" value={props.familyId} />
      <input type="hidden" name="recipeId" value={props.recipe.id} />
      <input type="hidden" name="languageTag" value={props.languageTag} />
      <input type="hidden" name="expectedVersion" value={version} />
      <input type="hidden" name="payload" value={payloadJson} />

      <FieldBlock
        id={`${formId}-title`}
        label={props.labels.title}
        original={props.recipe.title}
        originalLabel={props.labels.originalLabel}
        originalLang={props.recipe.sourceLanguage}
      >
        <Input
          id={`${formId}-title`}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="min-h-11"
          lang={props.languageTag}
          required
        />
      </FieldBlock>

      <FieldBlock
        id={`${formId}-description`}
        label={props.labels.description}
        original={props.recipe.description ?? ''}
        originalLabel={props.labels.originalLabel}
        originalLang={props.recipe.sourceLanguage}
      >
        <Textarea
          id={`${formId}-description`}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="min-h-24"
          lang={props.languageTag}
        />
      </FieldBlock>

      <FieldBlock
        id={`${formId}-notes`}
        label={props.labels.notes}
        original={props.recipe.notes ?? ''}
        originalLabel={props.labels.originalLabel}
        originalLang={props.recipe.sourceLanguage}
      >
        <Textarea
          id={`${formId}-notes`}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="min-h-20"
          lang={props.languageTag}
        />
      </FieldBlock>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">{props.labels.ingredientsHeading}</h3>
        {props.recipe.ingredients.map((ingredient) => {
          const showNotes =
            (ingredient.notes ?? '').trim().length > 0 ||
            (ingredientNotes[ingredient.position] ?? '').trim().length > 0;
          return (
            <div key={ingredient.position} className="space-y-4">
              <FieldBlock
                id={`${formId}-ingredient-${ingredient.position}`}
                label={props.labels.ingredientByPosition[ingredient.position] ?? ''}
                original={ingredient.name}
                originalLabel={props.labels.originalLabel}
                originalLang={props.recipe.sourceLanguage}
              >
                <Input
                  id={`${formId}-ingredient-${ingredient.position}`}
                  value={ingredientNames[ingredient.position] ?? ''}
                  onChange={(event) =>
                    setIngredientNames((prev) => ({
                      ...prev,
                      [ingredient.position]: event.target.value,
                    }))
                  }
                  className="min-h-11"
                  lang={props.languageTag}
                  required
                />
              </FieldBlock>
              {showNotes ? (
                <FieldBlock
                  id={`${formId}-ingredient-notes-${ingredient.position}`}
                  label={props.labels.ingredientNotesByPosition[ingredient.position] ?? ''}
                  original={ingredient.notes ?? ''}
                  originalLabel={props.labels.originalLabel}
                  originalLang={props.recipe.sourceLanguage}
                >
                  <Textarea
                    id={`${formId}-ingredient-notes-${ingredient.position}`}
                    value={ingredientNotes[ingredient.position] ?? ''}
                    onChange={(event) =>
                      setIngredientNotes((prev) => ({
                        ...prev,
                        [ingredient.position]: event.target.value,
                      }))
                    }
                    className="min-h-16"
                    lang={props.languageTag}
                  />
                </FieldBlock>
              ) : null}
            </div>
          );
        })}
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">{props.labels.stepsHeading}</h3>
        {props.recipe.steps.map((step) => (
          <FieldBlock
            key={step.position}
            id={`${formId}-step-${step.position}`}
            label={props.labels.stepByPosition[step.position] ?? ''}
            original={step.instruction}
            originalLabel={props.labels.originalLabel}
            originalLang={props.recipe.sourceLanguage}
          >
            <Textarea
              id={`${formId}-step-${step.position}`}
              value={stepInstructions[step.position] ?? ''}
              onChange={(event) =>
                setStepInstructions((prev) => ({
                  ...prev,
                  [step.position]: event.target.value,
                }))
              }
              className="min-h-20"
              lang={props.languageTag}
              required
            />
          </FieldBlock>
        ))}
      </section>

      {props.showReviewCheckbox ? (
        <label className="flex min-h-11 items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={reviewed}
            onChange={(event) => setReviewed(event.target.checked)}
            className="mt-1 size-5"
          />
          <span>
            {props.labels.markReviewed}
            <span className="block text-muted-foreground">{props.labels.reviewHelp}</span>
          </span>
        </label>
      ) : null}

      {state?.ok === true ? (
        <p className="text-sm text-foreground" role="status">
          {props.savedMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={pending}>
        {pending ? props.labels.saving : props.labels.save}
      </Button>
    </form>
  );
}

function FieldBlock({
  id,
  label,
  original,
  originalLabel,
  originalLang,
  children,
}: Readonly<{
  id: string;
  label: string;
  original: string;
  originalLabel: string;
  originalLang: string;
  children: ReactNode;
}>) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
      <div className="space-y-1">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {children}
      </div>
      {original.length > 0 ? (
        <aside
          className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground"
          lang={originalLang}
        >
          <p className="mb-1 font-medium text-foreground">{originalLabel}</p>
          <p className="whitespace-pre-wrap">{original}</p>
        </aside>
      ) : null}
    </div>
  );
}
