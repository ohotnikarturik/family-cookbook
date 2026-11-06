import { ChefHat, Type } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { DialogSample } from '@/app/design/dialog-sample';
import { FormFieldSample } from '@/components/product/form-field-sample';
import { PrimaryNavSample } from '@/components/product/primary-nav-sample';
import { RecipeCardSample } from '@/components/product/recipe-card-sample';
import { LoadingStrip, StatusRow } from '@/components/product/status-row';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const galleryEnabled =
  process.env['NODE_ENV'] !== 'production' ||
  process.env['NEXT_PUBLIC_ENABLE_DESIGN_GALLERY'] === 'true';

function sectionSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default async function DesignGalleryPage() {
  if (!galleryEnabled) {
    notFound();
  }

  const t = await getTranslations('design');

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#design-main"
        className="absolute left-4 top-4 z-[100] -translate-y-[200%] rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-md transition-transform focus:translate-y-0 focus:outline-none focus-visible:ring-[length:var(--ring-width)] focus-visible:ring-ring focus-visible:ring-offset-[length:var(--ring-offset)] focus-visible:ring-offset-background"
      >
        {t('skipToContent')}
      </a>
      <header className="border-b border-border bg-surface-raised/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="flex size-12 items-center justify-center rounded-xl bg-primary/12 text-primary"
              aria-hidden
            >
              <ChefHat className="size-7" />
            </span>
            <div>
              <h1 className="font-serif-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                {t('title')}
              </h1>
              <p className="mt-1 max-w-prose text-sm text-muted-foreground md:text-base">
                {t('intro')}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main id="design-main" className="mx-auto max-w-3xl space-y-16 px-4 py-12 sm:px-6">
        <DesignSection title={t('sections.theme')} kicker={t('kickers.theme')}>
          <ThemeSwitcher />
        </DesignSection>

        <DesignSection title={t('sections.typography')} kicker={t('kickers.typography')}>
          <Card>
            <CardHeader className="flex flex-row items-start gap-3">
              <Type className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden />
              <div>
                <CardTitle className="font-serif-display text-2xl">{t('recipe.title')}</CardTitle>
                <CardDescription className="mt-2 text-base">{t('recipe.subtitle')}</CardDescription>
              </div>
            </CardHeader>
            <div className="space-y-4 px-5 pb-5">
              <p className="text-xl font-medium leading-snug text-foreground">
                {t('typography.displayLine')}
              </p>
              <p className="text-base leading-relaxed text-foreground">
                {t('typography.bodyLine')}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t('typography.smallLine')}
              </p>
              <p className="font-mono text-sm text-muted-foreground">{t('typography.monoLine')}</p>
            </div>
          </Card>
        </DesignSection>

        <DesignSection title={t('sections.buttons')} kicker={t('kickers.buttons')}>
          <div className="flex flex-wrap gap-3">
            <Button type="button">{t('buttons.primary')}</Button>
            <Button type="button" variant="secondary">
              {t('buttons.secondary')}
            </Button>
            <Button type="button" variant="outline">
              {t('buttons.outline')}
            </Button>
            <Button type="button" variant="destructive">
              {t('buttons.destructive')}
            </Button>
            <Button type="button" variant="quiet" size="sm">
              {t('buttons.quiet')}
            </Button>
          </div>
        </DesignSection>

        <DesignSection title={t('sections.forms')} kicker={t('kickers.forms')}>
          <FormFieldSample
            titleLabel={t('form.titleLabel')}
            titlePlaceholder={t('form.titlePlaceholder')}
            notesLabel={t('form.notesLabel')}
            notesPlaceholder={t('form.notesPlaceholder')}
            helper={t('form.helper')}
          />
        </DesignSection>

        <DesignSection title={t('sections.recipeCard')} kicker={t('kickers.recipeCard')}>
          <RecipeCardSample
            title={t('recipe.title')}
            subtitle={t('recipe.subtitle')}
            timeLabel={t('recipe.time')}
            servingsLabel={t('recipe.servings')}
            footerCtaLabel={t('recipeCardFooter')}
          />
        </DesignSection>

        <DesignSection
          title={t('sections.navigation')}
          kicker={t('kickers.navigation')}
          id="sample-nav"
        >
          <PrimaryNavSample
            label={t('nav.label')}
            items={[
              { id: 'r', label: t('nav.recipes'), icon: 'recipes' },
              { id: 'f', label: t('nav.family'), icon: 'family' },
              { id: 'a', label: t('nav.account'), icon: 'account' },
            ]}
          />
        </DesignSection>

        <DesignSection title={t('sections.dialog')} kicker={t('kickers.dialog')}>
          <DialogSample />
        </DesignSection>

        <DesignSection title={t('sections.status')} kicker={t('kickers.status')}>
          <div className="space-y-4">
            <LoadingStrip label={t('status.loading')} />
            <Alert>
              <AlertTitle>{t('status.empty')}</AlertTitle>
            </Alert>
            <StatusRow tone="destructive" description={t('status.error')} />
            <StatusRow tone="success" description={t('status.success')} />
            <Alert variant="info">
              <AlertTitle>{t('status.infoTitle')}</AlertTitle>
              <AlertDescription>{t('status.infoDescription')}</AlertDescription>
            </Alert>
          </div>
        </DesignSection>
      </main>
    </div>
  );
}

function DesignSection({
  title,
  kicker,
  id,
  children,
}: Readonly<{ title: string; kicker: string; id?: string; children: ReactNode }>) {
  const slug = sectionSlug(title);
  const headingId = `design-section-${slug}`;

  return (
    <section id={id} className="scroll-mt-8" aria-labelledby={headingId}>
      <div className="mb-4 flex flex-col gap-1 border-b border-border pb-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {kicker}
        </p>
        <h2 id={headingId} className="font-serif-display text-xl font-semibold text-foreground">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}
