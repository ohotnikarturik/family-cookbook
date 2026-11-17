import { getRecipe, resolveAccessibleFamily } from '@family-cookbook/application';
import { getSessionUser } from '@family-cookbook/data-access';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { canEditRecipe, canManageRecipeTags } from '@family-cookbook/permissions';
import { getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

import { RecipeBrowseStates } from '@/components/recipe/recipe-browse-states';
import { RecipeEditorForm } from '@/components/recipe/recipe-editor-form';
import { LoadingState } from '@/components/product/loading-state';
import { PageHeader } from '@/components/product/page-header';
import { UnavailablePage } from '@/components/product/unavailable-page';
import { draftFromRecipeDetail, preservedTranslationsFromDetail } from '@/lib/recipe-editor';
import { locales, type AppLocale } from '@/i18n/routing';

type Props = Readonly<{
  params: Promise<{ locale: string; familyId: string; recipeId: string }>;
}>;

export const instant = false;

export default function EditRecipePage(props: Props) {
  return (
    <Suspense fallback={<LoadingState />}>
      <EditRecipeContent params={props.params} />
    </Suspense>
  );
}

async function EditRecipeContent({ params }: Props) {
  await connection();
  const { locale: localeParam, familyId, recipeId } = await params;
  if (!(locales as readonly string[]).includes(localeParam)) {
    notFound();
  }
  const locale = localeParam as AppLocale;
  const t = await getTranslations({ locale, namespace: 'recipes.editor' });
  const backToDetail = { href: `/f/${familyId}/recipes/${recipeId}`, label: t('backToDetail') };

  const supabase = await createServerSupabaseClient();
  const sessionUser = await getSessionUser(supabase);
  if (!sessionUser) {
    redirect(`/${locale}/auth/sign-in?next=/${locale}/f/${familyId}/recipes/${recipeId}/edit`);
  }

  const workspace = await resolveAccessibleFamily(supabase, familyId);
  if (workspace.status === 'auth_required') {
    redirect(`/${locale}/auth/sign-in?next=/${locale}/f/${familyId}/recipes/${recipeId}/edit`);
  }
  if (workspace.status !== 'ok') {
    notFound();
  }

  const result = await getRecipe(supabase, { familyId, recipeId });
  if (result.status === 'auth_required') {
    redirect(`/${locale}/auth/sign-in?next=/${locale}/f/${familyId}/recipes/${recipeId}/edit`);
  }
  if (result.status === 'forbidden') {
    return (
      <section className="space-y-4">
        <PageHeader title={t('editTitle')} back={backToDetail} />
        <RecipeBrowseStates
          variant="forbidden"
          title={t('forbiddenTitle')}
          description={t('forbiddenDescription')}
        />
      </section>
    );
  }
  if (result.status === 'not_found') {
    return <UnavailablePage locale={locale} headingLevel="h1" embedded />;
  }
  if (result.status === 'validation_error' || result.status === 'query_failed') {
    return (
      <section className="space-y-4">
        <PageHeader title={t('editTitle')} back={backToDetail} />
        <RecipeBrowseStates
          variant="error"
          title={t('loadErrorTitle')}
          description={t('loadErrorDescription')}
        />
      </section>
    );
  }

  const { recipe } = result;
  if (!canEditRecipe(workspace.workspace.role, sessionUser.id, recipe.createdBy)) {
    return (
      <section className="space-y-4">
        <PageHeader title={t('editTitle')} back={backToDetail} />
        <RecipeBrowseStates
          variant="forbidden"
          title={t('forbiddenTitle')}
          description={t('forbiddenDescription')}
        />
      </section>
    );
  }

  const preserved = preservedTranslationsFromDetail(recipe);

  return (
    <section className="space-y-6">
      <PageHeader
        title={t('editTitle')}
        description={t('editSubtitle', { title: recipe.title })}
        back={backToDetail}
      />
      <RecipeEditorForm
        mode={{
          kind: 'edit',
          familyId,
          recipeId,
          expectedVersion: recipe.version,
          preserved,
        }}
        initialDraft={draftFromRecipeDetail(recipe)}
        canManageRecipeTags={canManageRecipeTags(workspace.workspace.role)}
        cancelHref={`/f/${familyId}/recipes/${recipeId}`}
        recipeAssets={recipe.assets}
      />
    </section>
  );
}
