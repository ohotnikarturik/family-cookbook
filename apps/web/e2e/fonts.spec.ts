import { expect, test, type Page } from '@playwright/test';

/** W38.4: the sans body font must load its Cyrillic subset, not fall back to a system font. */

interface LoadedFace {
  family: string;
  unicodeRange: string;
}

async function loadedFontFaces(page: Page): Promise<LoadedFace[]> {
  return page.evaluate(async () => {
    await document.fonts.ready;
    const faces: { family: string; unicodeRange: string }[] = [];
    document.fonts.forEach((face) => {
      if (face.status === 'loaded') {
        faces.push({ family: face.family, unicodeRange: face.unicodeRange });
      }
    });
    return faces;
  });
}

async function bodyFontFamily(page: Page): Promise<string> {
  return page.evaluate(() => getComputedStyle(document.body).fontFamily);
}

test.describe('body font coverage', () => {
  for (const locale of ['uk', 'ru'] as const) {
    test(`${locale}: Geist Cyrillic subset is loaded and used for body text`, async ({ page }) => {
      await page.goto(`/${locale}/design`, { waitUntil: 'networkidle' });
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      expect(await bodyFontFamily(page)).toMatch(/geist/i);

      const faces = await loadedFontFaces(page);
      const cyrillicSans = faces.filter(
        (face) => /geist/i.test(face.family) && /U\+400-45F/i.test(face.unicodeRange),
      );
      expect(cyrillicSans.length).toBeGreaterThan(0);
    });
  }

  test('fi: Geist Latin subset is loaded for Finnish diacritics', async ({ page }) => {
    await page.goto('/fi/design', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    expect(await bodyFontFamily(page)).toMatch(/geist/i);

    const faces = await loadedFontFaces(page);
    // Ä, Ö, Å (U+00C4, U+00D6, U+00C5) live in the Latin subset (reported as U+0-FF).
    const latinSans = faces.filter(
      (face) => /geist/i.test(face.family) && /U\+0-FF\b/i.test(face.unicodeRange),
    );
    expect(latinSans.length).toBeGreaterThan(0);
  });
});
