import { recipeDetailSchema, type RecipeDetail } from '@family-cookbook/contracts';

type IngredientRow = {
  position: number;
  name: string;
  quantity: number | string | null;
  quantity_text: string | null;
  unit: string | null;
  notes: string | null;
};

type StepRow = {
  position: number;
  instruction: string;
  duration_minutes: number | null;
};

type FamilyTagRow = {
  id: string;
  family_id: string;
  name: string;
  normalized_name: string;
  created_by: string;
  created_at: string;
};

type TagJoinRow = {
  tag_id: string;
  family_tags: FamilyTagRow | FamilyTagRow[] | null;
};

type TranslationRow = {
  language_tag: string;
  title: string;
  description: string | null;
  notes: string | null;
  review_status: 'unreviewed' | 'reviewed';
};

type RecipeRow = {
  id: string;
  family_id: string;
  created_by: string;
  updated_by: string;
  title: string;
  description: string | null;
  source_language: string;
  category: string | null;
  servings: number | string | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  notes: string | null;
  status: 'active' | 'archived';
  version: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  recipe_ingredients: IngredientRow[] | null;
  recipe_steps: StepRow[] | null;
  recipe_tags: TagJoinRow[] | null;
  recipe_translations: TranslationRow[] | null;
};

function readNumeric(
  value: number | string | null,
): { ok: true; value: number | null } | { ok: false } {
  if (value === null) {
    return { ok: true, value: null };
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? { ok: true, value } : { ok: false };
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { ok: false };
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? { ok: true, value: parsed } : { ok: false };
}

export function mapRecipeDetailRow(row: RecipeRow): RecipeDetail | null {
  const servings = readNumeric(row.servings);
  if (!servings.ok) {
    return null;
  }

  const ingredients = [];
  for (const item of [...(row.recipe_ingredients ?? [])].sort((a, b) => a.position - b.position)) {
    const quantity = readNumeric(item.quantity);
    if (!quantity.ok) {
      return null;
    }
    ingredients.push({
      position: item.position,
      name: item.name,
      quantity: quantity.value,
      quantityText: item.quantity_text,
      unit: item.unit,
      notes: item.notes,
    });
  }

  const candidate = {
    id: row.id,
    familyId: row.family_id,
    title: row.title,
    sourceLanguage: row.source_language,
    category: row.category,
    status: row.status,
    version: row.version,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    description: row.description,
    servings: servings.value,
    prepMinutes: row.prep_minutes,
    cookMinutes: row.cook_minutes,
    notes: row.notes,
    archivedAt: row.archived_at,
    ingredients,
    steps: (row.recipe_steps ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((item) => ({
        position: item.position,
        instruction: item.instruction,
        durationMinutes: item.duration_minutes,
      })),
    tags: (row.recipe_tags ?? [])
      .flatMap((join) => {
        if (!join.family_tags) {
          return [];
        }
        return Array.isArray(join.family_tags) ? join.family_tags : [join.family_tags];
      })
      .map((tag) => ({
        id: tag.id,
        familyId: tag.family_id,
        name: tag.name,
        normalizedName: tag.normalized_name,
      })),
    translations: (row.recipe_translations ?? []).map((item) => ({
      languageTag: item.language_tag,
      title: item.title,
      description: item.description,
      notes: item.notes,
      reviewStatus: item.review_status,
    })),
  };

  const parsed = recipeDetailSchema.safeParse(candidate);
  if (!parsed.success) {
    return null;
  }
  return parsed.data;
}
