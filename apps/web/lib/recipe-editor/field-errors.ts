type ZodLikeError = Readonly<{
  issues: ReadonlyArray<{
    path: ReadonlyArray<PropertyKey>;
    message: string;
  }>;
}>;

function pathSegmentLabel(segment: PropertyKey): string {
  if (typeof segment === 'number') {
    return String(segment);
  }
  if (typeof segment === 'string') {
    return segment;
  }
  return String(segment);
}

export function zodErrorToFieldMap(error: ZodLikeError): Record<string, string> {
  const map: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.map(pathSegmentLabel).join('.');
    if (path.length > 0 && !map[path]) {
      map[path] = issue.message;
    }
  }
  return map;
}

export function fieldErrorForPath(map: Record<string, string>, path: string): string | undefined {
  return map[path] ?? map[`recipe.${path}`];
}

export type DraftFieldIssueCode = 'required' | 'invalidNumber';

export type DraftIndexes = Readonly<{
  ingredients: readonly number[];
  steps: readonly number[];
  tags: readonly number[];
}>;

const FIELD_MESSAGE_KEYS = {
  title: 'errors.title',
  sourceLanguage: 'errors.sourceLanguage',
  invalidNumber: 'errors.invalidNumber',
  ingredientName: 'errors.ingredientName',
  stepInstruction: 'errors.stepInstruction',
  required: 'errors.required',
  field: 'errors.field',
} as const;

export type FieldErrorMessageKey = (typeof FIELD_MESSAGE_KEYS)[keyof typeof FIELD_MESSAGE_KEYS];

export function draftPathFromSchemaPath(path: string, indexes: DraftIndexes): string {
  const normalized = path.startsWith('recipe.') ? path.slice('recipe.'.length) : path;
  const match = /^(ingredients|steps|tags)\.(\d+)\.(.+)$/.exec(normalized);
  if (!match) {
    return normalized;
  }
  const collection = match[1] as keyof DraftIndexes;
  const payloadIndex = Number(match[2]);
  const draftIndex = indexes[collection][payloadIndex];
  if (draftIndex === undefined) {
    return normalized;
  }
  const leaf = match[3];
  return `${collection}.${draftIndex}.${leaf}`;
}

export function messageKeyForField(
  path: string,
  code: DraftFieldIssueCode | 'schema',
): FieldErrorMessageKey {
  const leaf = path.split('.').at(-1) ?? path;
  if (
    code === 'invalidNumber' ||
    leaf === 'servings' ||
    leaf === 'prepMinutes' ||
    leaf === 'cookMinutes' ||
    leaf === 'quantity' ||
    leaf === 'durationMinutes'
  ) {
    return FIELD_MESSAGE_KEYS.invalidNumber;
  }
  if (leaf === 'title') {
    return FIELD_MESSAGE_KEYS.title;
  }
  if (leaf === 'sourceLanguage' || leaf === 'languageTag') {
    return FIELD_MESSAGE_KEYS.sourceLanguage;
  }
  if (path.startsWith('ingredients.') && leaf === 'name') {
    return FIELD_MESSAGE_KEYS.ingredientName;
  }
  if (leaf === 'instruction') {
    return FIELD_MESSAGE_KEYS.stepInstruction;
  }
  if (code === 'required') {
    return FIELD_MESSAGE_KEYS.required;
  }
  return FIELD_MESSAGE_KEYS.field;
}
