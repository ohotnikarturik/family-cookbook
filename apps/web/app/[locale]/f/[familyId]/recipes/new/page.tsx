import { resolveAccessibleFamily } from '@family-cookbook/application';
import { canCreateRecipe } from '@family-cookbook/permissions';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

import { RecipeBrowseStates } from '@/components/recipe/recipe-browse-states';
import { RecipeEditorForm } from '@/components/recipe/recipe-editor-form';
import { RecipeLoading } from '@/components/recipe/recipe-loading';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { emptyRecipeEditorDraft } from '@/lib/recipe-editor';
import { locales, type AppLocale } from '@/i18n/routing';

type Props = Readonly<{ params: Promise<{ locale: string; familyId: string }> }>;

export const instant = false;

export default function NewRecipePage(props: Props) {
  return (
    <Suspense fallback={<RecipeLoading />}>
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
        <EditorHeader title={t('createTitle')} />
        <RecipeBrowseStates
          variant="forbidden"
          title={t('forbiddenTitle')}
          description={t('forbiddenDescription')}
        />
        <Button type="button" variant="outline" className="min-h-11" asChild>
          <Link href={`/f/${familyId}/recipes`}>{t('backToList')}</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <EditorHeader title={t('createTitle')} subtitle={t('createSubtitle')} />
      <RecipeEditorForm
        mode={{ kind: 'create', familyId, defaultSourceLanguage: family.defaultLanguage }}
        initialDraft={emptyRecipeEditorDraft(family.defaultLanguage)}
        canManageRecipeTags={
          family.role === 'owner' || family.role === 'admin' || family.role === 'editor'
        }
        cancelHref={`/f/${familyId}/recipes`}
      />
    </section>
  );
}

function EditorHeader({ title, subtitle }: Readonly<{ title: string; subtitle?: string }>) {
  return (
    <header className="space-y-1">
      <h2 className="font-serif-display text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
    </header>
  );
}
