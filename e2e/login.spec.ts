import { test, expect } from '@playwright/test';
import { login } from './support/mocks';

test.describe('Login & role-based navigation', () => {
  test('ADMIN sees Users and Audit in the sidebar', async ({ page }) => {
    await login(page, 'ADMIN');
    await expect(page.getByRole('link', { name: 'Users' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Audit' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Cases' })).toBeVisible();
  });

  test('DETECTIVE sees Cases but not Users or Audit', async ({ page }) => {
    await login(page, 'DETECTIVE');
    await expect(page.getByRole('link', { name: 'Cases' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Audit' })).toHaveCount(0);
  });

  test('ANALYST sees Tasks but not Users or Audit', async ({ page }) => {
    await login(page, 'ANALYST');
    await expect(page.getByRole('link', { name: 'Tasks' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Audit' })).toHaveCount(0);
  });
});
