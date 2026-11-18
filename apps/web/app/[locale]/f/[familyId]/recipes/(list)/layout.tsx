import { listFamilyMembers, listRecipeBrowseOptions } from '@family-cookbook/application';
import { resolveMemberDisplayLabel } from '@family-cookbook/domain';
import { getSessionUser } from '@family-cookbook/data-access';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';

import { LoadingState } from '@/components/product/loading-state';
import { PageHeader } from '@/components/product/page-header';
import { RecipeBrowseShell } from '@/components/recipe/recipe-browse-shell';
import { locales, type AppLocale } from '@/i18n/routing';

type Props = Readonly<{
  children: ReactNode;
  params: Promise<{ locale: string; familyId: string }>;
}>;

/**
 * The Recipes list keeps its heading, search box and filters here, not in the page: Next.js
 * rebuilds a page whenever its search params change, but keeps the layout. So typing and picking
 * filters never lose focus or close the Filters panel; only the results below are replaced.
 * Recipe detail, new and edit pages are outside this route group and do not get these controls.
 */
export default function RecipesListLayout(props: Props) {
  return (
    <Suspense fallback={<LoadingState />}>
      <RecipesListControls params={props.params}>{props.children}</RecipesListControls>
    </Suspense>
  );
}

async function RecipesListControls({ children, params }: Props) {
  await connection();
  const { locale: localeParam, familyId } = await params;
  if (!(locales as readonly string[]).includes(localeParam)) {
    notFound();
  }
  const locale = localeParam as AppLocale;
  const t = await getTranslations({ locale, namespace: 'recipes' });
  const tMembers = await getTranslations({ locale, namespace: 'family.members' });

  const supabase = await createServerSupabaseClient();
  const sessionUser = await getSessionUser(supabase);
  if (!sessionUser) {
    // The page redirects to sign-in; nothing to show here.
    return children;
  }

  // Lists for the filters. Both may fail without breaking the page: the selects are then empty.
  const [membersListed, browse] = await Promise.all([
    listFamilyMembers(supabase, { familyId }),
    listRecipeBrowseOptions(supabase, { familyId }),
  ]);
  const contributorOptions =
    membersListed.status === 'ok'
      ? membersListed.members
          .map((member) => {
            const name = resolveMemberDisplayLabel({
              displayName: member.displayName,
              memberUserId: member.userId,
              actorUserId: sessionUser.id,
              youLabel: tMembers('you'),
              neutralLabel: tMembers('neutralName'),
            });
            return {
              userId: member.userId,
              label:
                member.status === 'suspended' ? `${name} (${tMembers('suspendedBadge')})` : name,
            };
          })
          .sort((a, b) => {
            if (a.userId === sessionUser.id) {
              return -1;
            }
            if (b.userId === sessionUser.id) {
              return 1;
            }
            return a.label.localeCompare(b.label, locale);
          })
      : [];
  const browseOptions =
    browse.status === 'ok' ? browse.options : { categories: [], tags: [], languages: [] };

  return (
    <section className="space-y-6">
      <PageHeader title={t('list.title')} description={t('list.subtitle')} />
      <RecipeBrowseShell
        familyId={familyId}
        contributorOptions={contributorOptions}
        categories={browseOptions.categories}
        tags={browseOptions.tags}
        languages={browseOptions.languages}
        membersError={membersListed.status === 'ok' ? null : tMembers('errors.loadFailed')}
      >
        {children}
      </RecipeBrowseShell>
    </section>
  );
}
