import { test, expect } from '@playwright/test';
import { login, mockAuth } from './support/mocks';
import { expectNoA11yViolations } from './support/a11y';

test.describe('Login & role-based navigation', () => {
  test('login screen has no critical/serious a11y violations', async ({ page }) => {
    await mockAuth(page, 'ADMIN');
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expectNoA11yViolations(page, 'login');
  });

  test('ADMIN sees Users and Audit in the sidebar', async ({ page }) => {
    await login(page, 'ADMIN');
    await expect(page.getByRole('link', { name: 'Users' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Audit' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Cases' })).toBeVisible();
    // A11y: the dashboard archetype (sidebar + topbar + widgets) is clean.
    await expectNoA11yViolations(page, 'dashboard');
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
