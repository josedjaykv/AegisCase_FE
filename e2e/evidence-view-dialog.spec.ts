import { test, expect } from '@playwright/test';
import { json, login } from './support/mocks';
import { expectNoA11yViolations } from './support/a11y';

/**
 * The Phase 5 guardrail: `GET /evidence/:id` MUTATES the chain of custody, so it
 * must NEVER be called without explicit confirmation through <EvidenceViewDialog>.
 * This test proves the read-only path (summary + chain, no mutating GET) and that
 * the mutating GET fires ONLY after the user confirms.
 */
const EVID = 'evid-1';

const evidence = {
  id: EVID,
  caseId: 'case-1',
  evidenceType: 'TESTIMONIAL',
  title: 'Test evidence',
  description: 'A statement from a witness.',
  evidenceStatus: 'IN_CUSTODY',
  currentCustodianId: 'sub-DETECTIVE',
  createdByUserId: 'sub-DETECTIVE',
  archived: false,
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
};

const chain = [
  {
    id: 'coc-1',
    evidenceId: EVID,
    previousCustodianId: null,
    newCustodianId: 'sub-DETECTIVE',
    transferredByUserId: 'sub-DETECTIVE',
    transferReason: 'Initial registration',
    createdAt: '2026-05-01T00:00:00.000Z',
  },
];

test('reads via summary + chain on load; mutating GET only on confirm', async ({ page }) => {
  await login(page, 'DETECTIVE');

  let viewCalls = 0;
  // Read-only endpoints (no side effect). Anchored to the API origin so they
  // never intercept the SPA's own /evidence/:id navigation (localhost:5173).
  await page.route(/localhost:3000\/evidence\/evid-1\/summary/, (r) => json(r, evidence));
  await page.route(/localhost:3000\/evidence\/evid-1\/chain-of-custody/, (r) => json(r, chain));
  // The MUTATING bare GET — count invocations (anchored + end-of-string so it
  // doesn't match /summary or /chain-of-custody).
  await page.route(/localhost:3000\/evidence\/evid-1(\?.*)?$/, (r) => {
    viewCalls += 1;
    return json(r, { ...evidence, custodyChain: chain });
  });

  await page.goto(`/evidence/${EVID}`);

  // Read-only summary rendered without the mutating call. The description block
  // is unique to the summary having loaded.
  await expect(page.getByText('A statement from a witness.')).toBeVisible();
  expect(viewCalls).toBe(0);

  // A11y: the Detail archetype (header, badges, warning box, chain card) is clean.
  await expectNoA11yViolations(page, 'evidence detail');

  // Open the view dialog and confirm.
  await page.getByRole('button', { name: /View & take custody/i }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/record .* as the current custodian/i)).toBeVisible();
  await dialog.getByRole('button', { name: /View & take custody/i }).click();

  // Now — and only now — the mutating GET fires exactly once.
  await expect.poll(() => viewCalls).toBe(1);
});
