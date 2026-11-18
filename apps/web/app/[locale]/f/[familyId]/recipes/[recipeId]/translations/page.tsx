import { getRecipe, resolveAccessibleFamily } from '@family-cookbook/application';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { canEditRecipe } from '@family-cookbook/permissions';
import { getSessionUser } from '@family-cookbook/data-access';
import { getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { notFound, redirect } from 'next/navigation';

import { PageHeader } from '@/components/product/page-header';
import { AddTranslationDialog } from '@/components/recipe/add-translation-dialog';
import { textLinkClassName } from '@/components/product/text-link';
import { Link } from '@/i18n/navigation';
import { locales, type AppLocale } from '@/i18n/routing';
import { languageLabel } from '@/lib/language-label';
import { availableTranslationLanguages } from '@/lib/translation-languages';

type Props = Readonly<{
  params: Promise<{ locale: string; familyId: string; recipeId: string }>;
}>;

export const instant = false;

export default async function RecipeTranslationsIndexPage({ params }: Props) {
  await connection();
  const { locale: localeParam, familyId, recipeId } = await params;
  if (!(locales as readonly string[]).includes(localeParam)) {
    notFound();
  }
  const locale = localeParam as AppLocale;
  const t = await getTranslations({ locale, namespace: 'recipes.translationEditor' });

  const supabase = await createServerSupabaseClient();
  const sessionUser = await getSessionUser(supabase);
  if (!sessionUser) {
    redirect(
      `/${locale}/auth/sign-in?next=/${locale}/f/${familyId}/recipes/${recipeId}/translations`,
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
  const available = availableTranslationLanguages(recipe).map((tag) => ({
    tag,
    label: languageLabel(tag, locale),
  }));

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title={t('indexTitle')}
        back={{ href: `/f/${familyId}/recipes/${recipeId}`, label: t('backToRecipe') }}
        description={t.rich('indexSubtitle', {
          title: recipe.title,
          recipeTitle: (chunks) => <span lang={recipe.sourceLanguage}>{chunks}</span>,
        })}
      />

      {recipe.translations.length > 0 ? (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {recipe.translations.map((item) => {
            const language = languageLabel(item.languageTag, locale);
            return (
              <li
                key={item.languageTag}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2"
              >
                <div className="min-w-0 py-1">
                  <p className="font-medium text-foreground">{language}</p>
                  {item.reviewStatus ? (
                    <p className="text-sm text-muted-foreground">
                      {item.reviewStatus === 'reviewed'
                        ? t('statusReviewed')
                        : t('statusUnreviewed')}
                    </p>
                  ) : null}
                </div>
                <Link
                  href={`/f/${familyId}/recipes/${recipeId}/translations/${item.languageTag}`}
                  aria-label={t('editLanguage', { language })}
                  className={`${textLinkClassName} inline-flex min-h-11 items-center`}
                >
                  {t('edit')}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      )}

      {available.length > 0 ? (
        <AddTranslationDialog familyId={familyId} recipeId={recipeId} languages={available} />
      ) : (
        <p className="text-sm text-muted-foreground">{t('allAdded')}</p>
      )}
    </section>
  );
}
