import { test, expect } from '@playwright/test';
import { json, login } from './support/mocks';

/**
 * Task lifecycle + optimistic UI: PENDING → IN_PROGRESS → COMPLETED via the
 * status picker on the task detail page. The picker change is optimistic
 * (cache updates before the server responds), and COMPLETED is terminal so the
 * picker collapses to a read-only badge.
 */
const TASK = 'task-1';

const task = (status: string) => ({
  id: TASK,
  caseId: 'case-1',
  title: 'Lift fingerprints from the door',
  description: '',
  priority: 'MEDIUM',
  status,
  dueDate: null,
  assignedToUserId: 'sub-DETECTIVE',
  assignedByUserId: 'sub-DETECTIVE',
  createdByUserId: 'sub-DETECTIVE',
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
});

test('moves a task through its lifecycle with optimistic updates', async ({ page }) => {
  await login(page, 'DETECTIVE');

  let status = 'PENDING';
  let patchCalls = 0;

  // Anchored to the API origin so the SPA's own /tasks/:id navigation isn't
  // intercepted. GET detail reflects the latest status; register before /status.
  await page.route(/localhost:3000\/tasks\/task-1(\?.*)?$/, (r) => json(r, task(status)));
  await page.route(/localhost:3000\/tasks\/task-1\/status/, (r) => {
    patchCalls += 1;
    const body = JSON.parse(r.request().postData() ?? '{}') as { status: string };
    status = body.status;
    return json(r, task(status));
  });

  await page.goto(`/tasks/${TASK}`);

  const picker = page.getByLabel('Change task status');
  await expect(picker).toContainText('Pending');

  // PENDING → IN_PROGRESS
  await picker.click();
  await page.getByRole('option', { name: 'In progress' }).click();
  await expect(picker).toContainText('In progress'); // optimistic
  await expect.poll(() => patchCalls).toBe(1);

  // IN_PROGRESS → COMPLETED (terminal → picker becomes a read-only badge)
  await picker.click();
  await page.getByRole('option', { name: 'Completed' }).click();
  await expect.poll(() => patchCalls).toBe(2);
  await expect(page.getByLabel('Change task status')).toHaveCount(0);
  // The terminal status shows as a read-only badge ("Completed" exactly — not
  // the "Status changed to Completed" toast).
  await expect(page.getByText('Completed', { exact: true })).toBeVisible();
});
