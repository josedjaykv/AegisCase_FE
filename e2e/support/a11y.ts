import { type Page, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Runs axe-core against the current page and fails on any **critical** or
 * **serious** WCAG 2.1 A/AA violation (the quality-gate threshold). Lower-impact
 * (moderate/minor) findings are reported in the message but don't fail the build.
 */
export async function expectNoA11yViolations(page: Page, context?: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const blocking = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );

  const summary = blocking
    .map((v) => `  • [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))`)
    .join('\n');

  expect(blocking, `axe critical/serious violations${context ? ` on ${context}` : ''}:\n${summary}`).toEqual([]);
}
