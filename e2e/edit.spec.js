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

async function enter(page, addr, raw) {
  await cell(page, addr).click();
  await page.keyboard.type(raw);
  await page.keyboard.press('Enter');
}

async function caretAtEnd(page) {
  return page.locator('#cell-editor').evaluate(
    (el) => el.selectionStart === el.value.length && el.selectionEnd === el.value.length,
  );
}

test('F2 opens the existing text with the caret at the end and Esc restores it', async ({ page }) => {
  await openSheet(page);
  await enter(page, 'A1', 'abc');
  await cell(page, 'A1').click();
  await page.keyboard.press('F2');
  await expect(page.locator('#cell-editor')).toHaveClass(/\bediting\b/);
  await expect(page.locator('#cell-editor')).toHaveValue('abc');
  expect(await caretAtEnd(page)).toBe(true);
  await page.keyboard.type('x');
  await expect(page.locator('#cell-editor')).toHaveValue('abcx');
  await page.keyboard.press('Escape');
  await expect(cell(page, 'A1')).toHaveText('abc');
  await expect(cell(page, 'A1')).toHaveClass(/\bactive\b/);
  await expect(page.locator('#cell-editor')).not.toHaveClass(/\bediting\b/);
  await expect(page.locator('#cell-editor')).toHaveValue('');
  await expect(page.locator('#formula-input')).toHaveValue('abc');
});

test('double click opens the existing text with the caret at the end and Esc restores it', async ({ page }) => {
  await openSheet(page);
  await enter(page, 'A1', 'abc');
  await cell(page, 'A1').dblclick();
  await expect(page.locator('#cell-editor')).toHaveClass(/\bediting\b/);
  await expect(page.locator('#cell-editor')).toHaveValue('abc');
  await expect(page.locator('#cell-editor')).toBeFocused();
  expect(await caretAtEnd(page)).toBe(true);
  await page.keyboard.type('x');
  await page.keyboard.press('Escape');
  await expect(cell(page, 'A1')).toHaveText('abc');
});

test('arrow keys while editing move only the text caret', async ({ page }) => {
  await openSheet(page);
  await enter(page, 'B2', 'abc');
  await cell(page, 'B2').click();
  await page.keyboard.press('F2');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.type('X');
  await expect(page.locator('#cell-editor')).toHaveValue('aXbc');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#name-box')).toHaveText('B2');
  await expect(page.locator('#cell-editor')).toHaveClass(/\bediting\b/);
  await page.keyboard.press('Enter');
  await expect(cell(page, 'B2')).toHaveText('aXbc');
});

test('Enter in the formula bar commits to the active cell', async ({ page }) => {
  await openSheet(page);
  await cell(page, 'A1').click();
  await page.locator('#formula-input').fill('=2*3');
  await page.locator('#formula-input').press('Enter');
  await expect(cell(page, 'A1')).toHaveText('6');
  await expect(cell(page, 'A1')).toHaveClass(/\bactive\b/);
  await expect(page.locator('#formula-input')).toHaveValue('=2*3');
  await expect(page.locator('#cell-editor')).toBeFocused();
});

test('Esc in the formula bar cancels the change', async ({ page }) => {
  await openSheet(page);
  await enter(page, 'A1', 'abc');
  await cell(page, 'A1').click();
  await page.locator('#formula-input').fill('zzz');
  await page.locator('#formula-input').press('Escape');
  await expect(cell(page, 'A1')).toHaveText('abc');
  await expect(page.locator('#formula-input')).toHaveValue('abc');
  await expect(page.locator('#cell-editor')).toBeFocused();
});

test('committing A1 recalculates the cells that depend on it on screen', async ({ page }) => {
  await openSheet(page);
  await enter(page, 'A1', '1');
  await enter(page, 'B1', '=A1*2');
  await enter(page, 'C1', '=B1+1');
  await expect(cell(page, 'B1')).toHaveText('2');
  await expect(cell(page, 'C1')).toHaveText('3');
  await enter(page, 'A1', '10');
  await expect(cell(page, 'B1')).toHaveText('20');
  await expect(cell(page, 'C1')).toHaveText('21');
});
