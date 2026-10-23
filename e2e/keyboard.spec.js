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
const nameBox = (page) => page.locator('#name-box');

test('arrow keys at A1 going up or left stay on A1', async ({ page }) => {
  await openSheet(page);
  await page.keyboard.press('ArrowUp');
  await expect(nameBox(page)).toHaveText('A1');
  await page.keyboard.press('ArrowLeft');
  await expect(nameBox(page)).toHaveText('A1');
  await expect(cell(page, 'A1')).toHaveClass(/\bactive\b/);
  await expect(page.locator('#cell-editor')).toHaveValue('');
});

test('arrow keys move the active cell one step in each direction', async ({ page }) => {
  await openSheet(page);
  await page.keyboard.press('ArrowRight');
  await expect(nameBox(page)).toHaveText('B1');
  await page.keyboard.press('ArrowDown');
  await expect(nameBox(page)).toHaveText('B2');
  await page.keyboard.press('ArrowLeft');
  await expect(nameBox(page)).toHaveText('A2');
  await page.keyboard.press('ArrowUp');
  await expect(nameBox(page)).toHaveText('A1');
  await expect(cell(page, 'A1')).toHaveClass(/\bactive\b/);
  await expect(cell(page, 'A2')).not.toHaveClass(/\bactive\b/);
});

test('at Z100 down, right, Enter and Tab stay on Z100', async ({ page }) => {
  await openSheet(page);
  await cell(page, 'Z100').click();
  for (const key of ['ArrowDown', 'ArrowRight', 'Enter', 'Tab']) {
    await page.keyboard.press(key);
    await expect(nameBox(page)).toHaveText('Z100');
  }
  await expect(cell(page, 'Z100')).toHaveClass(/\bactive\b/);
  await expect(page.locator('#cell-editor')).toBeFocused();
  await expect(page.locator('#cell-editor')).not.toHaveClass(/\bediting\b/);
});

test('Enter and Tab move down and right, Shift+Enter and Shift+Tab move up and left', async ({ page }) => {
  await openSheet(page);
  await cell(page, 'C3').click();
  await page.keyboard.press('Enter');
  await expect(nameBox(page)).toHaveText('C4');
  await page.keyboard.press('Shift+Enter');
  await expect(nameBox(page)).toHaveText('C3');
  await page.keyboard.press('Tab');
  await expect(nameBox(page)).toHaveText('D3');
  await page.keyboard.press('Shift+Tab');
  await expect(nameBox(page)).toHaveText('C3');
  await expect(page.locator('#cell-editor')).toBeFocused();
});

async function expectSelected(page, addrs) {
  await expect(page.locator('td.selected')).toHaveCount(addrs.length);
  for (const addr of addrs) {
    await expect(cell(page, addr)).toHaveClass(/\bselected\b/);
  }
}

const B2_D3 = ['B2', 'C2', 'D2', 'B3', 'C3', 'D3'];

test('Shift+arrow keys select B2:D3 and the name box shows the range', async ({ page }) => {
  await openSheet(page);
  await cell(page, 'B2').click();
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Shift+ArrowDown');
  await expect(nameBox(page)).toHaveText('B2:D3');
  await expectSelected(page, B2_D3);
  await expect(cell(page, 'B2')).toHaveClass(/\bactive\b/);
});

test('clicking B2 then Shift+clicking D3 selects B2:D3', async ({ page }) => {
  await openSheet(page);
  await cell(page, 'B2').click();
  await cell(page, 'D3').click({ modifiers: ['Shift'] });
  await expect(nameBox(page)).toHaveText('B2:D3');
  await expectSelected(page, B2_D3);
  await expect(cell(page, 'B2')).toHaveClass(/\bactive\b/);
});

test('an arrow key after a range collapses it to one cell', async ({ page }) => {
  await openSheet(page);
  await cell(page, 'B2').click();
  await cell(page, 'D3').click({ modifiers: ['Shift'] });
  await page.keyboard.press('ArrowDown');
  await expect(nameBox(page)).toHaveText('B3');
  await expectSelected(page, ['B3']);
});

test('arrow keys while editing move the text cursor, not the active cell', async ({ page }) => {
  await openSheet(page);
  await page.keyboard.type('ab');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.type('x');
  await expect(page.locator('#cell-editor')).toHaveValue('axb');
  await expect(nameBox(page)).toHaveText('A1');
});
