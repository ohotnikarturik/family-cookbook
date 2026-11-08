import {
  getRecipe,
  getRecipeAuditLog,
  getRecipeHistory,
  resolveAccessibleFamily,
} from '@family-cookbook/application';
import { getSessionUser } from '@family-cookbook/data-access';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { canViewAuditEvents, canViewRecipeHistory } from '@family-cookbook/permissions';
import { getFormatter, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

import { RecipeAuditList } from '@/components/recipe/recipe-audit-list';
import { RecipeBrowseStates } from '@/components/recipe/recipe-browse-states';
import { RecipeHistoryList } from '@/components/recipe/recipe-history-list';
import { RecipeHistoryPagination } from '@/components/recipe/recipe-history-pagination';
import { RecipeLoading } from '@/components/recipe/recipe-loading';
import { UnavailablePage } from '@/components/product/unavailable-page';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { locales, type AppLocale } from '@/i18n/routing';
import { recipeContentLang } from '@/lib/format-recipe-meta';
import { recipeHistoryHref, type HistoryQuery } from '@/lib/recipe-history/query';

type Props = Readonly<{
  params: Promise<{ locale: string; familyId: string; recipeId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export const instant = false;

export default function RecipeHistoryPage(props: Props) {
  return (
    <Suspense fallback={<RecipeLoading />}>
      <RecipeHistoryContent params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

function parseCursor(raw: string | string[] | undefined): string | undefined {
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim();
  }
  return undefined;
}

function historyReturnPath(
  locale: string,
  familyId: string,
  recipeId: string,
  query: HistoryQuery,
): string {
  return `/${locale}${recipeHistoryHref(familyId, recipeId, query)}`;
}

async function RecipeHistoryContent({ params, searchParams }: Props) {
  await connection();
  const { locale: localeParam, familyId, recipeId } = await params;
  if (!(locales as readonly string[]).includes(localeParam)) {
    notFound();
  }
  const locale = localeParam as AppLocale;
  const t = await getTranslations({ locale, namespace: 'recipes' });
  const format = await getFormatter({ locale });
  const sp = await searchParams;
  const cursor = parseCursor(sp.cursor);
  const auditCursor = parseCursor(sp.auditCursor);

  const supabase = await createServerSupabaseClient();
  const sessionUser = await getSessionUser(supabase);
  const workspace = await resolveAccessibleFamily(supabase, familyId);
  const recipeResult = await getRecipe(supabase, { familyId, recipeId });

  if (recipeResult.status === 'auth_required') {
    redirect(
      `/${locale}/auth/sign-in?next=${encodeURIComponent(historyReturnPath(locale, familyId, recipeId, { cursor, auditCursor }))}`,
    );
  }
  if (recipeResult.status === 'forbidden') {
    return (
      <section className="space-y-4">
        <BackToDetail familyId={familyId} recipeId={recipeId} label={t('history.backToDetail')} />
        <RecipeBrowseStates
          variant="forbidden"
          title={t('status.forbiddenTitle')}
          description={t('status.forbidden')}
        />
      </section>
    );
  }
  if (recipeResult.status === 'not_found') {
    return <UnavailablePage locale={locale} headingLevel="h2" embedded />;
  }
  if (recipeResult.status === 'validation_error' || recipeResult.status === 'query_failed') {
    return (
      <section className="space-y-4">
        <BackToDetail familyId={familyId} recipeId={recipeId} label={t('history.backToDetail')} />
        <RecipeBrowseStates
          variant="error"
          title={t('status.errorTitle')}
          description={t('status.error')}
        />
      </section>
    );
  }

  const { recipe } = recipeResult;
  const role = workspace.status === 'ok' ? workspace.workspace.role : null;
  const userId = sessionUser?.id ?? null;
  const allowedHistory =
    role !== null && userId !== null && canViewRecipeHistory(role, userId, recipe.createdBy);

  if (!allowedHistory) {
    return (
      <section className="space-y-4">
        <BackToDetail familyId={familyId} recipeId={recipeId} label={t('history.backToDetail')} />
        <RecipeBrowseStates
          variant="forbidden"
          title={t('history.forbiddenTitle')}
          description={t('history.forbiddenDescription')}
        />
      </section>
    );
  }

  const historyInput = { familyId, recipeId, ...(cursor ? { cursor } : {}) };
  const auditInput = { familyId, recipeId, ...(auditCursor ? { cursor: auditCursor } : {}) };
  const historyResult = await getRecipeHistory(supabase, historyInput);

  if (historyResult.status === 'forbidden') {
    return (
      <section className="space-y-4">
        <BackToDetail familyId={familyId} recipeId={recipeId} label={t('history.backToDetail')} />
        <RecipeBrowseStates
          variant="forbidden"
          title={t('history.forbiddenTitle')}
          description={t('history.forbiddenDescription')}
        />
      </section>
    );
  }
  if (historyResult.status === 'not_found') {
    return <UnavailablePage locale={locale} headingLevel="h2" embedded />;
  }
  if (historyResult.status !== 'ok') {
    return (
      <section className="space-y-4">
        <BackToDetail familyId={familyId} recipeId={recipeId} label={t('history.backToDetail')} />
        <RecipeBrowseStates
          variant="error"
          title={t('status.errorTitle')}
          description={t('status.error')}
        />
      </section>
    );
  }

  const { items, nextCursor } = historyResult.result;
  const showAudit = role !== null && canViewAuditEvents(role);
  const revisionQuery: HistoryQuery = auditCursor ? { auditCursor } : {};
  const auditQuery: HistoryQuery = cursor ? { cursor } : {};
  const contentLang = recipeContentLang(recipe, locale);
  let auditItems: Awaited<ReturnType<typeof getRecipeAuditLog>> = { status: 'forbidden' };
  if (showAudit) {
    auditItems = await getRecipeAuditLog(supabase, auditInput);
  }
  if (showAudit && auditItems.status === 'auth_required') {
    redirect(
      `/${locale}/auth/sign-in?next=${encodeURIComponent(historyReturnPath(locale, familyId, recipeId, { cursor, auditCursor }))}`,
    );
  }

  const formatDate = (iso: string) =>
    format.dateTime(new Date(iso), { dateStyle: 'medium', timeStyle: 'short' });

  const eventLabel = (eventType: string) => {
    switch (eventType) {
      case 'recipe.created':
        return t('audit.events.recipe_created');
      case 'recipe.updated':
        return t('audit.events.recipe_updated');
      case 'recipe.archived':
        return t('audit.events.recipe_archived');
      case 'recipe.restored':
        return t('audit.events.recipe_restored');
      default:
        return eventType;
    }
  };

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-8 py-2">
      <header className="space-y-2">
        <BackToDetail familyId={familyId} recipeId={recipeId} label={t('history.backToDetail')} />
        <h2 className="font-serif-display text-3xl font-semibold tracking-tight text-foreground">
          {t('history.title')}
        </h2>
        <p className="text-muted-foreground">
          {t.rich('history.subtitle', {
            title: recipe.title,
            recipeTitle: (chunks) =>
              contentLang ? <span lang={contentLang}>{chunks}</span> : <span>{chunks}</span>,
          })}
        </p>
      </header>

      <RecipeHistoryList
        items={items}
        heading={t('history.revisionsHeading')}
        emptyTitle={t('history.emptyTitle')}
        emptyDescription={t('history.emptyDescription')}
        versionLabel={(version) => t('history.version', { version })}
        actorYou={t('history.actorYou')}
        actorMember={t('history.actorMember')}
        changeSummaryLabel={t('history.changeSummaryLabel')}
        formatDate={formatDate}
        sessionUserId={userId}
      />

      {items.length > 0 || cursor ? (
        <RecipeHistoryPagination
          familyId={familyId}
          recipeId={recipeId}
          paramName="cursor"
          nextCursor={nextCursor}
          currentCursor={cursor}
          preserved={revisionQuery}
          navLabel={t('history.pagination.label')}
          firstPageLabel={t('history.pagination.first')}
          nextPageLabel={t('history.pagination.next')}
          resultsSummary={t('history.pagination.count', { count: items.length })}
        />
      ) : null}

      {showAudit ? (
        auditItems.status === 'ok' ? (
          <>
            <RecipeAuditList
              items={auditItems.result.items}
              heading={t('audit.heading')}
              emptyTitle={t('audit.emptyTitle')}
              emptyDescription={t('audit.emptyDescription')}
              eventLabel={eventLabel}
              versionLabel={(version) => t('audit.version', { version })}
              actorYou={t('history.actorYou')}
              actorMember={t('history.actorMember')}
              formatDate={formatDate}
              sessionUserId={userId}
            />
            {auditItems.result.items.length > 0 || auditCursor ? (
              <RecipeHistoryPagination
                familyId={familyId}
                recipeId={recipeId}
                paramName="auditCursor"
                nextCursor={auditItems.result.nextCursor}
                currentCursor={auditCursor}
                preserved={auditQuery}
                navLabel={t('audit.pagination.label')}
                firstPageLabel={t('audit.pagination.first')}
                nextPageLabel={t('audit.pagination.next')}
                resultsSummary={t('audit.pagination.count', {
                  count: auditItems.result.items.length,
                })}
              />
            ) : null}
          </>
        ) : (
          <RecipeBrowseStates
            variant="error"
            title={t('audit.errorTitle')}
            description={t('audit.errorDescription')}
          />
        )
      ) : null}
    </section>
  );
}

function BackToDetail({
  familyId,
  recipeId,
  label,
}: Readonly<{ familyId: string; recipeId: string; label: string }>) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="min-h-11 w-full justify-start px-0 sm:w-auto"
      asChild
    >
      <Link
        href={`/f/${familyId}/recipes/${recipeId}`}
        className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {label}
      </Link>
    </Button>
  );
}
