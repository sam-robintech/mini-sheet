const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test, expect } = require('@playwright/test');

const PAGE_URL = pathToFileURL(path.resolve('index.html')).href;

async function openSheet(page) {
  await page.goto(PAGE_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

test('empty sheet shows 26 column headers, 100 row headers and 2600 cells', async ({ page }) => {
  await openSheet(page);
  const colHeaders = page.locator('thead th[data-col]');
  await expect(colHeaders).toHaveCount(26);
  await expect(colHeaders.first()).toHaveText('A');
  await expect(colHeaders.last()).toHaveText('Z');
  const rowHeaders = page.locator('tbody th[data-row]');
  await expect(rowHeaders).toHaveCount(100);
  await expect(rowHeaders.first()).toHaveText('1');
  await expect(rowHeaders.last()).toHaveText('100');
  await expect(page.locator('[data-cell]')).toHaveCount(2600);
  await expect(page.locator('[data-cell="A1"]')).toBeVisible();
  await expect(page.locator('[data-cell="Z100"]')).toHaveCount(1);
});

test('first active cell is A1 with an empty formula bar', async ({ page }) => {
  await openSheet(page);
  await expect(page.locator('#name-box')).toHaveText('A1');
  await expect(page.locator('#formula-input')).toHaveValue('');
  await expect(page.locator('[data-cell].active')).toHaveCount(1);
  await expect(page.locator('[data-cell="A1"]')).toHaveClass(/\bactive\b/);
  await expect(page.locator('#cell-editor')).toHaveCount(1);
  await expect(page.locator('#cell-editor')).not.toHaveClass(/\bediting\b/);
  await expect(page.locator('#cell-editor')).toBeFocused();
});

test('page loads without requests outside file URLs and without errors', async ({ page }) => {
  const outside = [];
  const errors = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('file:')) outside.push(request.url());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await openSheet(page);
  await expect(page.locator('[data-cell]')).toHaveCount(2600);
  expect(outside).toEqual([]);
  expect(errors).toEqual([]);
});

test('only src/app.js touches the DOM', () => {
  const dir = path.resolve('src');
  const offenders = fs.readdirSync(dir)
    .filter((name) => name.endsWith('.js') && name !== 'app.js')
    .filter((name) => /\b(document|window|localStorage)\b/.test(fs.readFileSync(path.join(dir, name), 'utf8')));
  expect(offenders).toEqual([]);
});
