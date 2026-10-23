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

test('typing 5 and Enter commits 5 and moves the active cell one down', async ({ page }) => {
  await openSheet(page);
  await page.keyboard.type('5');
  await expect(page.locator('#cell-editor')).toHaveClass(/\bediting\b/);
  await page.keyboard.press('Enter');
  await expect(cell(page, 'A1')).toHaveText('5');
  await expect(cell(page, 'A2')).toHaveClass(/\bactive\b/);
  await expect(page.locator('#name-box')).toHaveText('A2');
  await expect(page.locator('#cell-editor')).not.toHaveClass(/\bediting\b/);
  await expect(page.locator('#cell-editor')).toHaveValue('');
});

test('typing on a cell with content starts over with the new text', async ({ page }) => {
  await openSheet(page);
  await page.keyboard.type('abc');
  await page.keyboard.press('Enter');
  await cell(page, 'A1').click();
  await expect(page.locator('#formula-input')).toHaveValue('abc');
  await page.keyboard.type('이름');
  await expect(page.locator('#cell-editor')).toHaveValue('이름');
  await page.keyboard.press('Enter');
  await expect(cell(page, 'A1')).toHaveText('이름');
});

test('Tab, Shift+Tab and Shift+Enter commit and move right, left and up', async ({ page }) => {
  await openSheet(page);
  await cell(page, 'B2').click();
  await page.keyboard.type('1');
  await page.keyboard.press('Tab');
  await expect(cell(page, 'B2')).toHaveText('1');
  await expect(page.locator('#name-box')).toHaveText('C2');
  await page.keyboard.type('2');
  await page.keyboard.press('Shift+Tab');
  await expect(cell(page, 'C2')).toHaveText('2');
  await expect(page.locator('#name-box')).toHaveText('B2');
  await page.keyboard.type('3');
  await page.keyboard.press('Shift+Enter');
  await expect(cell(page, 'B2')).toHaveText('3');
  await expect(page.locator('#name-box')).toHaveText('B1');
  await expect(page.locator('#cell-editor')).toBeFocused();
});
