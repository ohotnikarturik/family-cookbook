export type ParsedIngredientLine = Readonly<{ amount: string; unit: string; name: string }>;

export type ParsedIngredientLines = Readonly<{
  rows: ParsedIngredientLine[];
  /** True when more lines were given than `limit` allows; the extra lines are dropped. */
  truncated: boolean;
}>;

/** Longest text accepted from the "Add several at once" box. */
export const INGREDIENT_LINES_TEXT_MAX = 20_000;

// A leading amount: "1 1/2", "1/2", "2-3" or "1,5". It may touch the unit ("200g").
const LEADING_AMOUNT =
  /^(\d+\s+\d+\s*\/\s*\d+|\d+\s*\/\s*\d+|\d+(?:[.,]\d+)?\s*[-–]\s*\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?)(?=\s|$|[^\d\s.,/])/u;
const LIST_MARKER = /^[-–•*]\s+/u;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Unit matchers, longest first, so "ст. л." wins over "л" and "kg" over "g". */
function unitMatchers(unitOptions: readonly string[]): { unit: string; pattern: RegExp }[] {
  return [...new Set(unitOptions.map((unit) => unit.trim()).filter((unit) => unit.length > 0))]
    .sort((a, b) => b.length - a.length)
    .map((unit) => {
      const body = unit.split(/\s+/).map(escapeRegExp).join('\\s*');
      const end = unit.endsWith('.') ? '' : '(?=\\s|$)';
      return { unit, pattern: new RegExp(`^${body}${end}`, 'iu') };
    });
}

function splitLine(
  line: string,
  units: ReturnType<typeof unitMatchers>,
): ParsedIngredientLine | null {
  const text = line.trim().replace(LIST_MARKER, '').replace(/\s+/g, ' ').trim();
  if (text.length === 0) {
    return null;
  }
  const amountMatch = LEADING_AMOUNT.exec(text);
  if (!amountMatch?.[1]) {
    return { amount: '', unit: '', name: text };
  }
  const amount = amountMatch[1].replace(/\s+/g, ' ');
  let rest = text.slice(amountMatch[0].length).trim();
  let unit = '';
  for (const matcher of units) {
    const found = matcher.pattern.exec(rest);
    if (found) {
      unit = found[0].trim();
      rest = rest.slice(found[0].length).trim();
      break;
    }
  }
  // "2-3" is kept as typed; the Amount field stores it as text when the recipe is saved.
  return { amount, unit, name: rest };
}

/**
 * "Add several at once": one ingredient per line, as `[amount] [unit] name`.
 * Units come from the editor's unit suggestions; blank lines are skipped.
 */
export function parseIngredientLines(
  text: string,
  unitOptions: readonly string[],
  limit: number,
): ParsedIngredientLines {
  const units = unitMatchers(unitOptions);
  const rows: ParsedIngredientLine[] = [];
  let truncated = false;
  for (const line of text.slice(0, INGREDIENT_LINES_TEXT_MAX).split(/\r?\n/)) {
    const row = splitLine(line, units);
    if (!row) {
      continue;
    }
    if (rows.length >= Math.max(0, limit)) {
      truncated = true;
      break;
    }
    rows.push(row);
  }
  return { rows, truncated };
}

/** Splits the catalog's `unitOptions` string ("g|kg|ml") into a list. */
export function unitOptionsFromCatalog(value: string): string[] {
  return value
    .split('|')
    .map((unit) => unit.trim())
    .filter((unit) => unit.length > 0);
}
