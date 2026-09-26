import { test, expect, type Page } from '@playwright/test';

/**
 * Runs against the Day 3 API + the synthetic fixture (tools/zoho-import/tests/fixture),
 * loaded into the local Postgres the same way `make import-fixture` does. Requires the API
 * on :3000 (`make api`) — the dev server proxies /api there (see vite.config.ts).
 */

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('ERR_CERT_AUTHORITY_INVALID')) errors.push(msg.text());
  });
  return errors;
}

async function switchTenant(page: Page, code: 'FXSA' | 'FXNO') {
  await page.getByRole('button', { name: code, exact: true }).click();
}

test('cockpit renders real fixture KPIs for fxsa with no console errors', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto('/#/cockpit');
  await switchTenant(page, 'FXSA');
  await expect(page.locator('.sidebar__user')).toHaveText('Flexistore South Africa');
  await expect(page.getByText('MONTHLY RECURRING')).toBeVisible();
  await expect(page.getByText('Rosebank Mall', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('cockpit renders real fixture KPIs for fxno with no console errors', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto('/#/cockpit');
  await switchTenant(page, 'FXNO');
  await expect(page.locator('.sidebar__user')).toHaveText('Flexistore Norway');
  await expect(page.getByText('MONTHLY RECURRING')).toBeVisible();
  expect(errors).toEqual([]);
});

test('customers list and 360 render real fixture data for fxsa', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto('/#/cockpit');
  await switchTenant(page, 'FXSA');
  await page.goto('/#/customers');
  await expect(page.getByText('Tinus Greyling')).toBeVisible();

  await page.getByText('Tinus Greyling').click();
  await expect(page.getByRole('heading', { name: 'Tinus Greyling' })).toBeVisible();

  await page.getByText('Timeline', { exact: true }).click();
  await expect(page.getByText(/Full timeline|No activity recorded/)).toBeVisible();

  await page.getByText('Legacy', { exact: true }).click();
  await expect(page.getByText(/legacy record|No legacy record/i)).toBeVisible();

  expect(errors).toEqual([]);
});

test('customers list renders real fixture data for fxno', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto('/#/cockpit');
  await switchTenant(page, 'FXNO');
  await page.goto('/#/customers');
  await expect(page.getByText('Ola Nordmann')).toBeVisible();
  expect(errors).toEqual([]);
});
