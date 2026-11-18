import { listRecipeBrowseOptions, resolveAccessibleFamily } from '@family-cookbook/application';
import { canCreateRecipe } from '@family-cookbook/permissions';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

import { RecipeBrowseStates } from '@/components/recipe/recipe-browse-states';
import { RecipeEditorForm } from '@/components/recipe/recipe-editor-form';
import { LoadingState } from '@/components/product/loading-state';
import { PageHeader } from '@/components/product/page-header';
import { emptyRecipeEditorDraft } from '@/lib/recipe-editor';
import { locales, type AppLocale } from '@/i18n/routing';

type Props = Readonly<{ params: Promise<{ locale: string; familyId: string }> }>;

export const instant = false;

export default function NewRecipePage(props: Props) {
  return (
    <Suspense fallback={<LoadingState />}>
      <NewRecipeContent params={props.params} />
    </Suspense>
  );
}

async function NewRecipeContent({ params }: Props) {
  await connection();
  const { locale: localeParam, familyId } = await params;
  if (!(locales as readonly string[]).includes(localeParam)) {
    notFound();
  }
  const locale = localeParam as AppLocale;
  const t = await getTranslations({ locale, namespace: 'recipes.editor' });

  const supabase = await createServerSupabaseClient();
  const workspace = await resolveAccessibleFamily(supabase, familyId);
  if (workspace.status === 'auth_required') {
    redirect(`/${locale}/auth/sign-in?next=/${locale}/f/${familyId}/recipes/new`);
  }
  if (workspace.status !== 'ok') {
    notFound();
  }

  const { workspace: family } = workspace;

  if (!canCreateRecipe(family.role)) {
    return (
      <section className="space-y-4">
        <PageHeader
          title={t('createTitle')}
          back={{ href: `/f/${familyId}/recipes`, label: t('backToList') }}
        />
        <RecipeBrowseStates
          variant="forbidden"
          title={t('forbiddenTitle')}
          description={t('forbiddenDescription')}
        />
      </section>
    );
  }

  // Suggestions only: if the list cannot be loaded, the category field still takes free text.
  const browseOptions = await listRecipeBrowseOptions(supabase, { familyId });
  const categoryOptions = browseOptions.status === 'ok' ? browseOptions.options.categories : [];

  return (
    <section className="space-y-6">
      <PageHeader title={t('createTitle')} description={t('createSubtitle')} />
      <RecipeEditorForm
        mode={{ kind: 'create', familyId, defaultSourceLanguage: family.defaultLanguage }}
        initialDraft={emptyRecipeEditorDraft(family.defaultLanguage)}
        canManageRecipeTags={
          family.role === 'owner' || family.role === 'admin' || family.role === 'editor'
        }
        cancelHref={`/f/${familyId}/recipes`}
        categoryOptions={categoryOptions}
      />
    </section>
  );
}
