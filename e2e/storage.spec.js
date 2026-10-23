const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test, expect } = require('@playwright/test');

const PAGE_URL = pathToFileURL(path.resolve('index.html')).href;

async function openSheet(page) {
  await page.goto(PAGE_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

const cell = (page, addr) => page.locator(`[data-cell="${addr}"]`);

async function enter(page, addr, raw) {
  await cell(page, addr).click();
  await page.keyboard.type(raw);
  await page.keyboard.press('Enter');
}

test('raw text and computed values come back after a reload', async ({ page }) => {
  await openSheet(page);
  await enter(page, 'A1', '2');
  await enter(page, 'B1', '=A1*3');
  await expect(cell(page, 'B1')).toHaveText('6');

  await page.reload();
  await expect(cell(page, 'A1')).toHaveText('2');
  await expect(cell(page, 'B1')).toHaveText('6');
  await cell(page, 'B1').click();
  await expect(page.locator('#formula-input')).toHaveValue('=A1*3');
});

test('a broken saved value opens an empty sheet without a page error', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error));
  await openSheet(page);
  await page.evaluate(() => localStorage.setItem('mini-sheet:v1', '{깨짐'));
  await page.reload();

  await expect(cell(page, 'A1')).toHaveText('');
  const texts = await page.locator('td[data-cell]').allTextContents();
  expect(texts.every((text) => text === '')).toBe(true);
  expect(errors).toEqual([]);
});

test('the undone state is what comes back after a reload', async ({ page }) => {
  await openSheet(page);
  await enter(page, 'A1', '1');
  await enter(page, 'A2', '=A1+1');
  await expect(cell(page, 'A2')).toHaveText('2');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(cell(page, 'A2')).toHaveText('');

  await page.reload();
  await expect(cell(page, 'A1')).toHaveText('1');
  await expect(cell(page, 'A2')).toHaveText('');
});
