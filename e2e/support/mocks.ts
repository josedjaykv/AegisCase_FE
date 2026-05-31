import { type Page, type Route, expect } from '@playwright/test';

export type Role = 'ADMIN' | 'DETECTIVE' | 'ANALYST';

/** API origin the app talks to (VITE_API_BASE_URL). Routes are anchored to this
 * origin so they intercept API calls only — never the SPA's own navigations
 * (localhost:5173), which share the same paths (e.g. /tasks/:id). */
export const API = 'http://localhost:3000';

const TOKENS = {
  access_token: 'e2e-access-token',
  refresh_token: 'e2e-refresh-token',
  token_type: 'Bearer',
  expires_in: 3600,
  refresh_expires_in: 7200,
};

export function meBody(role: Role) {
  return {
    sub: `sub-${role}`,
    email: `${role.toLowerCase()}@aegiscase.com`,
    role,
    keycloak_user_id: `kc-${role}`,
  };
}

export const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const emptyPage = { data: [], total: 0, page: 1, limit: 20 };

/**
 * Register auth endpoints + harmless empty defaults for the polling surfaces
 * (tasks, audit, cases, media, directory). Per-test routes registered AFTER
 * this take precedence (Playwright uses the most-recently-added matching route).
 */
export async function mockAuth(page: Page, role: Role) {
  await page.route(/localhost:3000\/auth\/login/, (r) => json(r, TOKENS));
  await page.route(/localhost:3000\/auth\/refresh/, (r) => json(r, TOKENS));
  await page.route(/localhost:3000\/auth\/me/, (r) => json(r, meBody(role)));
  await page.route(/localhost:3000\/auth\/logout/, (r) => r.fulfill({ status: 204, body: '' }));

  await page.route(/localhost:3000\/users\/directory/, (r) => json(r, []));
  await page.route(/localhost:3000\/tasks(\?|$)/, (r) => json(r, emptyPage));
  await page.route(/localhost:3000\/audit(\?|$)/, (r) => json(r, { ...emptyPage, limit: 10 }));
  await page.route(/localhost:3000\/cases(\?|$)/, (r) => json(r, emptyPage));
  await page.route(/localhost:3000\/media\/entity\//, (r) => json(r, []));
}

/** Perform a UI login and land on the dashboard. */
export async function login(page: Page, role: Role) {
  await mockAuth(page, role);
  await page.goto('/login');
  await page.getByLabel('Email').fill(meBody(role).email);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}
