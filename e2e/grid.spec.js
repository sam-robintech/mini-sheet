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

test('clicking a cell makes it active and shows its address and raw text', async ({ page }) => {
  await openSheet(page);
  await page.locator('[data-cell="B3"]').click();
  await expect(page.locator('[data-cell="B3"]')).toHaveClass(/\bactive\b/);
  await expect(page.locator('[data-cell].active')).toHaveCount(1);
  await expect(page.locator('#name-box')).toHaveText('B3');
  await expect(page.locator('#formula-input')).toHaveValue('');
  await page.keyboard.type('=1+1');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-cell="B3"]')).toHaveText('2');
  await page.locator('[data-cell="B3"]').click();
  await expect(page.locator('#name-box')).toHaveText('B3');
  await expect(page.locator('#formula-input')).toHaveValue('=1+1');
  await expect(page.locator('#cell-editor')).toBeFocused();
});

test('number cells align right and string cells align left', async ({ page }) => {
  await openSheet(page);
  for (const raw of ['5', 'abc', '=0.1+0.2', '=1/3', '="x"&1']) {
    await page.keyboard.type(raw);
    await page.keyboard.press('Enter');
  }
  await expect(page.locator('[data-cell="A1"]')).toHaveClass(/\bright\b/);
  await expect(page.locator('[data-cell="A2"]')).toHaveClass(/\bleft\b/);
  await expect(page.locator('[data-cell="A3"]')).toHaveText('0.3');
  await expect(page.locator('[data-cell="A3"]')).toHaveClass(/\bright\b/);
  await expect(page.locator('[data-cell="A4"]')).toHaveText('0.333333333333333');
  await expect(page.locator('[data-cell="A5"]')).toHaveText('x1');
  await expect(page.locator('[data-cell="A5"]')).toHaveClass(/\bleft\b/);
  const aligns = await page.locator('[data-cell="A1"], [data-cell="A2"]')
    .evaluateAll((tds) => tds.map((td) => getComputedStyle(td).textAlign));
  expect(aligns).toEqual(['right', 'left']);
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
