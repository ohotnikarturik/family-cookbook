import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

const WCAG_AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] as const;

function formatViolations(
  violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations'],
): string {
  return violations
    .map((violation) => {
      const nodes = violation.nodes
        .slice(0, 3)
        .map((node) => node.target.join(', '))
        .join('; ');
      return `${violation.id} (${violation.impact}): ${violation.help} — ${nodes}`;
    })
    .join('\n');
}

export type AxeAssertionOptions = {
  /** Documented WCAG exceptions — see docs/ACCESSIBILITY_RELEASE.md */
  disableRules?: string[];
};

export async function expectNoSeriousAxeViolations(
  page: Page,
  options?: AxeAssertionOptions,
): Promise<void> {
  let builder = new AxeBuilder({ page }).withTags([...WCAG_AXE_TAGS]);
  if (options?.disableRules?.length) {
    builder = builder.disableRules(options.disableRules);
  }
  const results = await builder.analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(serious, formatViolations(serious)).toEqual([]);
}
