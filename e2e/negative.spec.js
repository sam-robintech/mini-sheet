const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test, expect } = require('@playwright/test');

const PAGE_URL = pathToFileURL(path.resolve('index.html')).href;
const RED = 'rgb(255, 0, 0)';

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

test('AC23 negative numbers and negative formula results show in red', async ({ page }) => {
  await openSheet(page);
  const red = [['A1', '-3'], ['A2', '=1-5'], ['A3', '=-1e-20']];
  const plain = [
    ['A4', '0'], ['A5', '5'], ['A6', '=-0'], ['A7', 'abc'],
    ['A8', '="-3"'], ['A9', '=1<2'], ['A10', '=1/0'],
  ];
  for (const [addr, raw] of red.concat(plain)) await enter(page, addr, raw);

  await expect(cell(page, 'A2')).toHaveText('-4');
  for (const [addr] of red) await expectRed(page, addr);
  for (const [addr] of plain) await expectNotRed(page, addr);
  await expectNotRed(page, 'A11');
});

test('AC23 red follows the recomputed value of a formula', async ({ page }) => {
  await openSheet(page);
  await enter(page, 'B1', '=C1-1');
  await expectRed(page, 'B1');

  await enter(page, 'C1', '5');
  await expect(cell(page, 'B1')).toHaveText('4');
  await expectNotRed(page, 'B1');

  await enter(page, 'C1', '0');
  await expect(cell(page, 'B1')).toHaveText('-1');
  await expectRed(page, 'B1');
});

test('AC23 negative cells stay red when active and after a reload', async ({ page }) => {
  await openSheet(page);
  await enter(page, 'A1', '-3');
  await enter(page, 'A2', '=1-5');

  await cell(page, 'A1').click();
  await expect(cell(page, 'A1')).toHaveClass(/\bactive\b/);
  await expectRed(page, 'A1');

  await page.reload();
  await expect(cell(page, 'A1')).toHaveText('-3');
  await expectRed(page, 'A1');
  await expectRed(page, 'A2');
});
