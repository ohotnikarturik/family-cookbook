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
import { RecipeLoading } from '@/components/recipe/recipe-loading';
import { UnavailablePage } from '@/components/product/unavailable-page';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { draftFromRecipeDetail, preservedTranslationsFromDetail } from '@/lib/recipe-editor';
import { locales, type AppLocale } from '@/i18n/routing';

type Props = Readonly<{
  params: Promise<{ locale: string; familyId: string; recipeId: string }>;
}>;

export const instant = false;

export default function EditRecipePage(props: Props) {
  return (
    <Suspense fallback={<RecipeLoading />}>
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
        <EditHeader title={t('editTitle')} />
        <RecipeBrowseStates
          variant="forbidden"
          title={t('forbiddenTitle')}
          description={t('forbiddenDescription')}
        />
        <Button type="button" variant="outline" className="min-h-11" asChild>
          <Link href={`/f/${familyId}/recipes/${recipeId}`}>{t('backToDetail')}</Link>
        </Button>
      </section>
    );
  }
  if (result.status === 'not_found') {
    return <UnavailablePage locale={locale} headingLevel="h2" embedded />;
  }
  if (result.status === 'validation_error' || result.status === 'query_failed') {
    return (
      <section className="space-y-4">
        <EditHeader title={t('editTitle')} />
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
        <EditHeader title={t('editTitle')} />
        <RecipeBrowseStates
          variant="forbidden"
          title={t('forbiddenTitle')}
          description={t('forbiddenDescription')}
        />
        <Button type="button" variant="outline" className="min-h-11" asChild>
          <Link href={`/f/${familyId}/recipes/${recipeId}`}>{t('backToDetail')}</Link>
        </Button>
      </section>
    );
  }

  const preserved = preservedTranslationsFromDetail(recipe);

  return (
    <section className="space-y-6">
      <EditHeader title={t('editTitle')} subtitle={t('editSubtitle', { title: recipe.title })} />
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

function EditHeader({ title, subtitle }: Readonly<{ title: string; subtitle?: string }>) {
  return (
    <header className="space-y-1">
      <h2 className="font-serif-display text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
    </header>
  );
}
