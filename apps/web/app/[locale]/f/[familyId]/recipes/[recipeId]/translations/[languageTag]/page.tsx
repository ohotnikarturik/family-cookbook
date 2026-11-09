import { getRecipe, resolveAccessibleFamily } from '@family-cookbook/application';
import { recipeLanguageTagSchema } from '@family-cookbook/contracts';
import { getSessionUser } from '@family-cookbook/data-access';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { canEditRecipe } from '@family-cookbook/permissions';
import { getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { notFound, redirect } from 'next/navigation';

import { RecipeTranslationForm } from '@/components/recipe/recipe-translation-form';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { locales, type AppLocale } from '@/i18n/routing';

type Props = Readonly<{
  params: Promise<{ locale: string; familyId: string; recipeId: string; languageTag: string }>;
}>;

export const instant = false;

export default async function RecipeTranslationEditPage({ params }: Props) {
  await connection();
  const { locale: localeParam, familyId, recipeId, languageTag: languageParam } = await params;
  if (!(locales as readonly string[]).includes(localeParam)) {
    notFound();
  }
  const locale = localeParam as AppLocale;
  const t = await getTranslations({ locale, namespace: 'recipes.translationEditor' });

  const languageParsed = recipeLanguageTagSchema.safeParse(languageParam);
  if (!languageParsed.success) {
    notFound();
  }
  const languageTag = languageParsed.data;

  const supabase = await createServerSupabaseClient();
  const sessionUser = await getSessionUser(supabase);
  if (!sessionUser) {
    redirect(
      `/${locale}/auth/sign-in?next=/${locale}/f/${familyId}/recipes/${recipeId}/translations/${languageTag}`,
    );
  }

  const workspace = await resolveAccessibleFamily(supabase, familyId);
  const result = await getRecipe(supabase, { familyId, recipeId });
  if (result.status !== 'ok') {
    notFound();
  }

  if (
    workspace.status !== 'ok' ||
    !canEditRecipe(workspace.workspace.role, sessionUser.id, result.recipe.createdBy)
  ) {
    notFound();
  }

  const { recipe } = result;
  if (languageTag.toLowerCase() === recipe.sourceLanguage.toLowerCase()) {
    notFound();
  }

  const recipeTranslation = recipe.translations.find(
    (item) => item.languageTag.toLowerCase() === languageTag.toLowerCase(),
  );

  const ingredientNames: Record<number, string> = {};
  const ingredientNotes: Record<number, string> = {};
  for (const item of recipe.ingredientTranslations) {
    if (item.languageTag.toLowerCase() !== languageTag.toLowerCase()) {
      continue;
    }
    ingredientNames[item.ingredientPosition] = item.name;
    if (item.notes) {
      ingredientNotes[item.ingredientPosition] = item.notes;
    }
  }

  const stepInstructions: Record<number, string> = {};
  for (const item of recipe.stepTranslations) {
    if (item.languageTag.toLowerCase() === languageTag.toLowerCase()) {
      stepInstructions[item.stepPosition] = item.instruction;
    }
  }

  const showReviewCheckbox = ['owner', 'admin', 'editor'].includes(workspace.workspace.role);

  const ingredientByPosition = Object.fromEntries(
    recipe.ingredients.map((item) => [
      item.position,
      t('fields.ingredient', { position: item.position }),
    ]),
  );
  const ingredientNotesByPosition = Object.fromEntries(
    recipe.ingredients.map((item) => [
      item.position,
      t('fields.ingredientNotes', { position: item.position }),
    ]),
  );
  const stepByPosition = Object.fromEntries(
    recipe.steps.map((item) => [item.position, t('fields.step', { position: item.position })]),
  );

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        languageTag={languageTag}
        sourceLanguage={recipe.sourceLanguage}
        title={recipe.title}
        t={t}
      />
      <RecipeTranslationForm
        recipe={recipe}
        familyId={familyId}
        languageTag={languageTag}
        showReviewCheckbox={showReviewCheckbox}
        initial={{
          title: recipeTranslation?.title ?? '',
          description: recipeTranslation?.description ?? '',
          notes: recipeTranslation?.notes ?? '',
          ingredientNames,
          ingredientNotes,
          stepInstructions,
          reviewStatus: recipeTranslation?.reviewStatus ?? 'unreviewed',
        }}
        labels={{
          title: t('fields.title'),
          description: t('fields.description'),
          notes: t('fields.notes'),
          ingredientsHeading: t('fields.ingredients'),
          stepsHeading: t('fields.steps'),
          ingredientByPosition,
          ingredientNotesByPosition,
          stepByPosition,
          originalLabel: t('originalLabel'),
          save: t('save'),
          saving: t('saving'),
          markReviewed: t('markReviewed'),
          reviewHelp: t('reviewHelp'),
        }}
        savedMessage={t('saved')}
        errorMessages={{
          validation: t('errors.validation'),
          forbidden: t('errors.forbidden'),
          version_conflict: t('errors.versionConflict'),
          mutation_failed: t('errors.saveFailed'),
          auth_required: t('errors.auth'),
        }}
      />
      <Button type="button" variant="outline" className="min-h-11" asChild>
        <Link href={`/f/${familyId}/recipes/${recipeId}/translations`}>{t('backToList')}</Link>
      </Button>
    </section>
  );
}

function PageHeader({
  languageTag,
  sourceLanguage,
  title,
  t,
}: Readonly<{
  languageTag: string;
  sourceLanguage: string;
  title: string;
  t: Awaited<ReturnType<typeof getTranslations>>;
}>) {
  return (
    <header className="space-y-2">
      <h2 className="font-serif-display text-2xl font-semibold">
        {t('pageTitle', { language: languageTag })}
      </h2>
      <p className="text-sm text-muted-foreground">
        {t.rich('pageSubtitle', {
          title,
          recipeTitle: (chunks) => <span lang={sourceLanguage}>{chunks}</span>,
        })}
      </p>
    </header>
  );
}
