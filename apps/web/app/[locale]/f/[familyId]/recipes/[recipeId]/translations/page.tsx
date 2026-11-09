import { getRecipe, resolveAccessibleFamily } from '@family-cookbook/application';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { canEditRecipe } from '@family-cookbook/permissions';
import { getSessionUser } from '@family-cookbook/data-access';
import { getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { notFound, redirect } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { locales, type AppLocale } from '@/i18n/routing';

const ADD_LANGUAGES = ['en', 'fi', 'ru', 'uk'] as const;

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
  const used = new Set(recipe.translations.map((item) => item.languageTag.toLowerCase()));
  used.add(recipe.sourceLanguage.toLowerCase());
  const available = ADD_LANGUAGES.filter((tag) => !used.has(tag.toLowerCase()));

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <h2 className="font-serif-display text-2xl font-semibold">{t('indexTitle')}</h2>
        <p className="text-sm text-muted-foreground">
          {t.rich('indexSubtitle', {
            title: recipe.title,
            recipeTitle: (chunks) => <span lang={recipe.sourceLanguage}>{chunks}</span>,
          })}
        </p>
      </div>

      {recipe.translations.length > 0 ? (
        <ul className="list-none space-y-2 p-0">
          {recipe.translations.map((item) => (
            <li key={item.languageTag}>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full justify-start"
                asChild
              >
                <Link href={`/f/${familyId}/recipes/${recipeId}/translations/${item.languageTag}`}>
                  {t('editLanguage', { language: item.languageTag })}
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      )}

      {available.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{t('addHeading')}</h3>
          <ul className="list-none space-y-2 p-0">
            {available.map((language) => (
              <li key={language}>
                <Button type="button" className="min-h-11 w-full justify-start" asChild>
                  <Link href={`/f/${familyId}/recipes/${recipeId}/translations/${language}`}>
                    {t('addLanguage', { language })}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Button type="button" variant="outline" className="min-h-11" asChild>
        <Link href={`/f/${familyId}/recipes/${recipeId}`}>{t('backToRecipe')}</Link>
      </Button>
    </section>
  );
}
