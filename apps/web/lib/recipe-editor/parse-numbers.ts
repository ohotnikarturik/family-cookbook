// Mirrors the ingredient `quantity` bounds in `@family-cookbook/contracts` (not exported there);
// parse-numbers.test.ts checks them against `recipeIngredientInputSchema`.
export const INGREDIENT_QUANTITY_MAX = 99_999_999.9999;
const INGREDIENT_QUANTITY_FRACTION_DIGITS = 4;

export function trimToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseOptionalPositiveNumber(raw: string): number | null | 'invalid' {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }
  // fi, ru, and uk keyboards use a comma as the decimal separator.
  const normalized = /^\d+,\d+$/.test(trimmed) ? trimmed.replace(',', '.') : trimmed;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 'invalid';
  }
  return parsed;
}

export function parseOptionalNonNegativeInt(raw: string): number | null | 'invalid' {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isInteger(parsed) || parsed < 0 || String(parsed) !== trimmed) {
    return 'invalid';
  }
  return parsed;
}

export function formatOptionalNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

export type IngredientAmount =
  | Readonly<{ kind: 'empty' }>
  | Readonly<{ kind: 'quantity'; quantity: number }>
  | Readonly<{ kind: 'text'; text: string }>;

const DECIMAL = /^(\d+)(?:[.,](\d+))?$/;
const FRACTION = /^(\d+)\s*\/\s*(\d+)$/;
const MIXED = /^(\d+)\s+(\d+)\s*\/\s*(\d+)$/;
const FRACTION_SCALE = 10 ** INGREDIENT_QUANTITY_FRACTION_DIGITS;

function numericAmount(text: string): number | null {
  const decimal = DECIMAL.exec(text);
  if (decimal) {
    return Number(`${decimal[1]}.${decimal[2] ?? '0'}`);
  }
  const fraction = FRACTION.exec(text);
  if (fraction) {
    const denominator = Number(fraction[2]);
    return denominator > 0 ? Number(fraction[1]) / denominator : null;
  }
  const mixed = MIXED.exec(text);
  if (mixed) {
    const numerator = Number(mixed[2]);
    const denominator = Number(mixed[3]);
    if (denominator <= 0 || numerator >= denominator) {
      return null;
    }
    return Number(mixed[1]) + numerator / denominator;
  }
  return null;
}

/**
 * The editor's single Amount field: `2`, `1.5`, `1,5`, `1/2` and `1 1/2` become a number
 * (rounded to the contract's four decimal places); anything else, such as "to taste" or
 * "2-3", is kept as text.
 */
export function parseIngredientAmount(raw: string): IngredientAmount {
  const text = raw.trim().replace(/\s+/g, ' ');
  if (text.length === 0) {
    return { kind: 'empty' };
  }
  const value = numericAmount(text);
  if (value !== null && Number.isFinite(value)) {
    const rounded = Math.round(value * FRACTION_SCALE) / FRACTION_SCALE;
    if (rounded > 0 && rounded <= INGREDIENT_QUANTITY_MAX) {
      return { kind: 'quantity', quantity: rounded };
    }
  }
  return { kind: 'text', text };
}

/** A stored quantity as the Amount field shows it: the locale's decimal mark, no grouping. */
export function formatAmountInput(quantity: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      useGrouping: false,
      maximumFractionDigits: INGREDIENT_QUANTITY_FRACTION_DIGITS,
    }).format(quantity);
  } catch {
    return String(quantity);
  }
}
