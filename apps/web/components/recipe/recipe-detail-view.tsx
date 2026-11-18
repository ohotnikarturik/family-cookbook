import type { RecipeAssetSummary, RecipeDetail } from '@family-cookbook/contracts';
import { pickRecipeCoverAssetId, type ResolvedRecipeDisplay } from '@family-cookbook/domain';
import { Camera, Clock, Flame, Timer, Users, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { RecipeCardCover } from '@/components/recipe/recipe-card-cover';
import { RecipeMediaGallery, type RecipeMediaCard } from '@/components/recipe/recipe-media-gallery';
import { RecipeStepPhoto } from '@/components/recipe/recipe-step-photo';
import { Button } from '@/components/ui/button';

export type RecipeFactKind = 'prep' | 'cook' | 'total' | 'serves';

/** One item of the facts row, for example "Prep 20 min". */
type Fact = Readonly<{ kind: RecipeFactKind; text: string }>;

/** Quieter detail under the facts row, such as category or source language. */
type DetailPair = Readonly<{ label: string; value: string; valueLang?: string }>;

type AddPhotosPrompt = Readonly<{ title: string; body: string; action: string; href: string }>;

const FACT_ICONS: Record<RecipeFactKind, LucideIcon> = {
  prep: Clock,
  cook: Flame,
  total: Timer,
  serves: Users,
};

type IngredientLine = Readonly<{
  position: number;
  name: string;
  amount: string | null;
  notes: string | null;
}>;

type Labels = Readonly<{
  descriptionHeading: string;
  ingredientsHeading: string;
  stepsHeading: string;
  tagsHeading: string;
  notesHeading: string;
  archived: string;
  stepLabel: (position: number) => string;
  partialFallback: string;
}>;

type MediaLabels = Readonly<{
  sectionHeading: string;
  photosHeading: string;
  documentsHeading: string;
  downloadPdf: string;
  loadError: string;
  loading: string;
  imageAltFallback: string;
  documentFallback: string;
  pdfDescription: string;
  stepPhotoAlt: string;
}>;

type Props = Readonly<{
  recipe: RecipeDetail;
  familyId: string;
  display: ResolvedRecipeDisplay;
  languageSelector?: ReactNode;
  facts: Fact[];
  details: DetailPair[];
  attribution: string;
  addPhotos?: AddPhotosPrompt | undefined;
  ingredients: IngredientLine[];
  labels: Labels;
  mediaLabels: MediaLabels;
}>;

export function RecipeDetailView({
  recipe,
  familyId,
  display,
  languageSelector,
  facts,
  details,
  attribution,
  addPhotos,
  ingredients,
  labels,
  mediaLabels,
}: Props) {
  const bodyLang = display.contentLang;
  const inlineStepAssetIds = new Set(
    recipe.steps.flatMap((step) => {
      if (!step.mediaAssetId) {
        return [];
      }
      const asset = recipe.assets.find((item) => item.id === step.mediaAssetId);
      if (!asset || !isInlineStepPhoto(asset)) {
        return [];
      }
      return [asset.id];
    }),
  );
  const heroAssetId = pickRecipeCoverAssetId(
    recipe.assets.map((asset) => ({
      id: asset.id,
      assetKind: asset.assetKind,
      processingStatus: asset.processingStatus,
      detectedMimeType: asset.detectedMimeType,
      createdAt: asset.createdAt,
    })),
  );
  const galleryAssets = recipe.assets
    .filter((asset) => asset.id !== heroAssetId && !inlineStepAssetIds.has(asset.id))
    .map(toMediaCard);
  const archivedOrSelector =
    recipe.status === 'archived' || languageSelector ? (
      <>
        <ArchivedBadge recipe={recipe} archivedLabel={labels.archived} />
        {languageSelector}
      </>
    ) : null;
  const amountByPosition = new Map(ingredients.map((item) => [item.position, item.amount]));

  return (
    <article aria-labelledby={`recipe-title-${recipe.id}`} className="space-y-8">
      {archivedOrSelector ? <div className="space-y-3">{archivedOrSelector}</div> : null}
      {heroAssetId ? (
        <div className="-mx-2 overflow-hidden rounded-xl border border-border md:mx-0">
          <RecipeCardCover
            familyId={familyId}
            recipeId={recipe.id}
            coverAssetId={heroAssetId}
            title={display.title}
            loadingLabel={mediaLabels.loading}
            errorLabel={mediaLabels.loadError}
          />
        </div>
      ) : null}
      <header className="space-y-3 border-b border-border pb-6">
        {display.description ? (
          <section aria-labelledby="recipe-description-heading">
            <h2 id="recipe-description-heading" className="sr-only">
              {labels.descriptionHeading}
            </h2>
            <p
              className="text-base leading-relaxed text-foreground"
              lang={display.descriptionFallback ? recipe.sourceLanguage : bodyLang}
            >
              {display.description}
            </p>
          </section>
        ) : null}
        {facts.length > 0 ? (
          <ul className="flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-sm font-medium text-foreground">
            {facts.map((fact) => {
              const Icon = FACT_ICONS[fact.kind];
              return (
                <li key={fact.kind} className="inline-flex items-center gap-1.5">
                  <Icon className="size-4 text-muted-foreground" aria-hidden />
                  {fact.text}
                </li>
              );
            })}
          </ul>
        ) : null}
        {details.length > 0 ? (
          <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {details.map((detail) => (
              <div key={detail.label} className="flex gap-1.5">
                <dt className="text-muted-foreground">{detail.label}:</dt>
                <dd className="text-foreground" lang={detail.valueLang}>
                  {detail.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        <p className="text-sm text-muted-foreground">{attribution}</p>
      </header>

      {addPhotos ? (
        <section
          aria-labelledby="recipe-add-photos-heading"
          className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="space-y-1">
            <h2 id="recipe-add-photos-heading" className="text-base font-semibold text-foreground">
              {addPhotos.title}
            </h2>
            <p className="text-sm text-muted-foreground">{addPhotos.body}</p>
          </div>
          <Button asChild className="min-h-11 shrink-0">
            <a href={addPhotos.href}>
              <Camera className="size-4" aria-hidden />
              {addPhotos.action}
            </a>
          </Button>
        </section>
      ) : null}

      {ingredients.length > 0 ? (
        <section aria-labelledby="recipe-ingredients-heading">
          <h2
            id="recipe-ingredients-heading"
            className="mb-3 text-lg font-semibold text-foreground"
          >
            {labels.ingredientsHeading}
          </h2>
          <ul className="list-none divide-y divide-border border-y border-border p-0">
            {display.ingredients.map((ingredient) => {
              const amount = amountByPosition.get(ingredient.position);
              const lineLang = ingredient.usedFallback ? recipe.sourceLanguage : bodyLang;
              return (
                <li
                  key={ingredient.position}
                  className="grid grid-cols-[minmax(4.5rem,7.5rem)_minmax(0,1fr)] gap-x-4 py-2.5 text-foreground"
                >
                  <span className="font-medium tabular-nums">{amount}</span>
                  <div className="min-w-0">
                    {ingredient.usedFallback ? (
                      <p className="mb-1 text-xs text-muted-foreground">{labels.partialFallback}</p>
                    ) : null}
                    <p lang={lineLang}>{ingredient.name}</p>
                    {ingredient.notes ? (
                      <p
                        className="text-sm text-muted-foreground"
                        lang={ingredient.notesFallback ? recipe.sourceLanguage : lineLang}
                      >
                        {ingredient.notes}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {display.steps.length > 0 ? (
        <section aria-labelledby="recipe-steps-heading">
          <h2 id="recipe-steps-heading" className="mb-3 text-lg font-semibold text-foreground">
            {labels.stepsHeading}
          </h2>
          <ol className="list-none space-y-4 p-0">
            {display.steps.map((step) => {
              const sourceStep = recipe.steps.find((item) => item.position === step.position);
              return (
                <li key={step.position} className="flex gap-3">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary"
                    aria-hidden
                  >
                    {step.position}
                  </span>
                  <div className="min-w-0 flex-1">
                    {step.usedFallback ? (
                      <p className="text-xs text-muted-foreground">{labels.partialFallback}</p>
                    ) : null}
                    <p
                      className="pt-1 leading-relaxed text-foreground"
                      lang={step.usedFallback ? recipe.sourceLanguage : bodyLang}
                    >
                      <span className="sr-only">{labels.stepLabel(step.position)}. </span>
                      {step.instruction}
                    </p>
                    {sourceStep?.mediaAssetId && inlineStepAssetIds.has(sourceStep.mediaAssetId) ? (
                      <RecipeStepPhoto
                        familyId={familyId}
                        recipeId={recipe.id}
                        assetId={sourceStep.mediaAssetId}
                        alt={mediaLabels.stepPhotoAlt}
                        loadErrorLabel={mediaLabels.loadError}
                        loadingLabel={mediaLabels.loading}
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      {recipe.tags.length > 0 ? (
        <section aria-labelledby="recipe-tags-heading">
          <h2 id="recipe-tags-heading" className="mb-2 text-lg font-semibold text-foreground">
            {labels.tagsHeading}
          </h2>
          <ul className="flex list-none flex-wrap gap-2 p-0">
            {recipe.tags.map((tag) => (
              <li
                key={tag.id}
                className="rounded-md bg-muted px-3 py-1 text-sm text-muted-foreground"
              >
                {tag.name}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {display.notes ? (
        <section aria-labelledby="recipe-notes-heading">
          <h2 id="recipe-notes-heading" className="mb-2 text-lg font-semibold text-foreground">
            {labels.notesHeading}
          </h2>
          <p
            className="leading-relaxed text-foreground"
            lang={display.notesFallback ? recipe.sourceLanguage : bodyLang}
          >
            {display.notes}
          </p>
        </section>
      ) : null}

      <RecipeMediaGallery
        familyId={familyId}
        recipeId={recipe.id}
        assets={galleryAssets}
        labels={mediaLabels}
      />
    </article>
  );
}

function isInlineStepPhoto(asset: RecipeAssetSummary): boolean {
  return (
    asset.assetKind === 'step_photo' &&
    asset.processingStatus === 'available' &&
    asset.detectedMimeType !== 'application/pdf'
  );
}

function toMediaCard(asset: RecipeAssetSummary): RecipeMediaCard {
  return {
    id: asset.id,
    assetKind: asset.assetKind,
    originalFilename: asset.originalFilename,
    detectedMimeType: asset.detectedMimeType,
  };
}

function ArchivedBadge({
  recipe,
  archivedLabel,
}: Readonly<{ recipe: RecipeDetail; archivedLabel: string }>) {
  if (recipe.status !== 'archived') {
    return null;
  }
  return (
    <p className="inline-flex rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
      {archivedLabel}
    </p>
  );
}
