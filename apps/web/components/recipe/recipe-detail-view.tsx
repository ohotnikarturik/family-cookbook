import type { RecipeAssetSummary, RecipeDetail } from '@family-cookbook/contracts';
import { pickRecipeCoverAssetId, type ResolvedRecipeDisplay } from '@family-cookbook/domain';
import type { ReactNode } from 'react';

import { RecipeCardCover } from '@/components/recipe/recipe-card-cover';
import { RecipeMediaGallery, type RecipeMediaCard } from '@/components/recipe/recipe-media-gallery';
import { RecipeStepPhoto } from '@/components/recipe/recipe-step-photo';

type Fact = Readonly<{
  label: string;
  value: string;
  valueLang?: string;
}>;

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
  const amountByPosition = new Map(ingredients.map((item) => [item.position, item.amount]));

  return (
    <article className="space-y-8">
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
        <ArchivedBadge recipe={recipe} archivedLabel={labels.archived} />
        {languageSelector}
        <h2
          className="font-serif-display text-3xl font-semibold tracking-tight text-foreground"
          lang={bodyLang}
        >
          {display.title}
        </h2>
        {display.description ? (
          <section aria-labelledby="recipe-description-heading">
            <h3 id="recipe-description-heading" className="sr-only">
              {labels.descriptionHeading}
            </h3>
            <p
              className="text-base leading-relaxed text-foreground"
              lang={display.descriptionFallback ? recipe.sourceLanguage : bodyLang}
            >
              {display.description}
            </p>
          </section>
        ) : null}
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-muted-foreground">{fact.label}</dt>
              <dd className="font-medium text-foreground" lang={fact.valueLang}>
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      {ingredients.length > 0 ? (
        <section aria-labelledby="recipe-ingredients-heading">
          <h3
            id="recipe-ingredients-heading"
            className="mb-3 text-lg font-semibold text-foreground"
          >
            {labels.ingredientsHeading}
          </h3>
          <ul className="list-none space-y-2 p-0">
            {display.ingredients.map((ingredient) => {
              const amount = amountByPosition.get(ingredient.position);
              const lineLang = ingredient.usedFallback ? recipe.sourceLanguage : bodyLang;
              return (
                <li
                  key={ingredient.position}
                  className="rounded-lg border border-border bg-card px-4 py-3 text-foreground"
                >
                  {ingredient.usedFallback ? (
                    <p className="mb-1 text-xs text-muted-foreground">{labels.partialFallback}</p>
                  ) : null}
                  <p lang={lineLang}>
                    <span className="font-medium">{ingredient.name}</span>
                    {amount ? <span className="text-muted-foreground"> {amount}</span> : null}
                  </p>
                  {ingredient.notes ? (
                    <p
                      className="mt-1 text-sm text-muted-foreground"
                      lang={ingredient.notesFallback ? recipe.sourceLanguage : lineLang}
                    >
                      {ingredient.notes}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {display.steps.length > 0 ? (
        <section aria-labelledby="recipe-steps-heading">
          <h3 id="recipe-steps-heading" className="mb-3 text-lg font-semibold text-foreground">
            {labels.stepsHeading}
          </h3>
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
          <h3 id="recipe-tags-heading" className="mb-2 text-lg font-semibold text-foreground">
            {labels.tagsHeading}
          </h3>
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
          <h3 id="recipe-notes-heading" className="mb-2 text-lg font-semibold text-foreground">
            {labels.notesHeading}
          </h3>
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
