'use client';

import type { RecipeDetail } from '@family-cookbook/contracts';
import type { TranslationReviewStatus } from '@family-cookbook/contracts';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';

type Props = Readonly<{
  recipe: RecipeDetail;
  viewLanguage: string;
  labels: {
    label: string;
    originalOptionLabel: string;
    unreviewedBadge: string;
  };
}>;

function reviewStatusFor(
  recipe: RecipeDetail,
  languageTag: string,
): TranslationReviewStatus | null {
  const match = recipe.translations.find((item) => item.languageTag === languageTag);
  return match?.reviewStatus ?? null;
}

export function RecipeLanguageSelector({ recipe, viewLanguage, labels }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const options = [
    { value: recipe.sourceLanguage, label: labels.originalOptionLabel },
    ...recipe.translations.map((item) => ({
      value: item.languageTag,
      label: item.languageTag,
    })),
  ];

  function onSelect(nextLanguage: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextLanguage === recipe.sourceLanguage) {
      params.delete('viewLang');
    } else {
      params.set('viewLang', nextLanguage);
    }
    const query = params.toString();
    router.replace(query.length > 0 ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="space-y-2">
      <p id="recipe-language-label" className="text-sm font-medium text-foreground">
        {labels.label}
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-labelledby="recipe-language-label">
        {options.map((option) => {
          const selected = viewLanguage.trim().toLowerCase() === option.value.trim().toLowerCase();
          const reviewStatus = reviewStatusFor(recipe, option.value);
          return (
            <Button
              key={option.value}
              type="button"
              variant={selected ? 'default' : 'outline'}
              className="min-h-11"
              aria-pressed={selected}
              onClick={() => onSelect(option.value)}
            >
              <span>{option.label}</span>
              {reviewStatus === 'unreviewed' && option.value !== recipe.sourceLanguage ? (
                <span className="ms-2 rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                  {labels.unreviewedBadge}
                </span>
              ) : null}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
