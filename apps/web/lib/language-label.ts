const displayNamesByLocale = new Map<string, Intl.DisplayNames | null>();

function displayNamesFor(uiLocale: string): Intl.DisplayNames | null {
  if (displayNamesByLocale.has(uiLocale)) {
    return displayNamesByLocale.get(uiLocale) ?? null;
  }
  let instance: Intl.DisplayNames | null = null;
  try {
    instance = new Intl.DisplayNames([uiLocale], { type: 'language', fallback: 'none' });
  } catch {
    instance = null;
  }
  displayNamesByLocale.set(uiLocale, instance);
  return instance;
}

/**
 * Human-readable language name for a BCP 47 tag, in the UI language
 * (`fi` → "Finnish" / "suomi" / "финский"). Falls back to the raw tag when the
 * tag is malformed or unknown. Labels only: recipe text keeps its own `lang`.
 */
export function languageLabel(tag: string, uiLocale: string): string {
  const trimmed = tag.trim();
  if (trimmed.length === 0) {
    return tag;
  }
  const names = displayNamesFor(uiLocale);
  if (!names) {
    return trimmed;
  }
  let name: string | undefined;
  try {
    name = names.of(trimmed);
  } catch {
    return trimmed;
  }
  if (!name) {
    return trimmed;
  }
  return name.charAt(0).toLocaleUpperCase(uiLocale) + name.slice(1);
}
