const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test, expect } = require('@playwright/test');

const PAGE_URL = pathToFileURL(path.resolve('index.html')).href;
const RED = 'rgb(204, 0, 0)';

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

const colorOf = (page, addr) => cell(page, addr).evaluate((td) => getComputedStyle(td).color);

async function expectRed(page, addr) {
  await expect(cell(page, addr)).toHaveClass(/\bnegative\b/);
  expect(await colorOf(page, addr)).toBe(RED);
}

async function expectNotRed(page, addr) {
  await expect(cell(page, addr)).not.toHaveClass(/\bnegative\b/);
  expect(await colorOf(page, addr)).not.toBe(RED);
}

test('AC23 only negative number values are shown in red', async ({ page }) => {
  await openSheet(page);
  const rows = [
    ['A1', '-3', '-3'],
    ['A2', '=1-5', '-4'],
    ['A3', '0', '0'],
    ['A4', '5', '5'],
    ['A5', '-abc', '-abc'],
    ['A6', '=1/0', '#DIV/0!'],
    ['A7', '=1>2', 'FALSE'],
  ];
  for (const [addr, raw] of rows) await enter(page, addr, raw);
  for (const [addr, , shown] of rows) await expect(cell(page, addr)).toHaveText(shown);
  await expectRed(page, 'A1');
  await expectRed(page, 'A2');
  for (const addr of ['A3', 'A4', 'A5', 'A6', 'A7']) await expectNotRed(page, addr);
});

test('AC23 a formula loses red when recalculation makes it non-negative', async ({ page }) => {
  await openSheet(page);
  await enter(page, 'A4', '5');
  await enter(page, 'B1', '=A4-10');
  await expect(cell(page, 'B1')).toHaveText('-5');
  await expectRed(page, 'B1');
  await enter(page, 'A4', '20');
  await expect(cell(page, 'B1')).toHaveText('10');
  await expectNotRed(page, 'B1');
});

test('AC23 a negative number loses red when edited to a positive number', async ({ page }) => {
  await openSheet(page);
  await enter(page, 'A1', '-3');
  await expectRed(page, 'A1');
  await enter(page, 'A1', '3');
  await expect(cell(page, 'A1')).toHaveText('3');
  await expectNotRed(page, 'A1');
});
