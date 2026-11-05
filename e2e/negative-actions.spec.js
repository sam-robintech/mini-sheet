// AC23 를 지우기·되돌리기·붙여 넣기 조작에서도 확인한다. (e2e/negative.spec.js 를 보탠다)
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

test('AC23 clearing a negative cell removes the red and Ctrl+Z brings it back', async ({ page }) => {
  await openSheet(page);
  await enter(page, 'A1', '-3');
  await expectRed(page, 'A1');

  await cell(page, 'A1').click();
  await page.keyboard.press('Delete');
  await expect(cell(page, 'A1')).toHaveText('');
  await expectNotRed(page, 'A1');

  await page.keyboard.press('ControlOrMeta+z');
  await expect(cell(page, 'A1')).toHaveText('-3');
  await expectRed(page, 'A1');
});

test('AC23 overwriting a negative cell with a positive number removes the red', async ({ page }) => {
  await openSheet(page);
  await enter(page, 'A1', '-3');
  await expectRed(page, 'A1');

  await enter(page, 'A1', '7');
  await expect(cell(page, 'A1')).toHaveText('7');
  await expectNotRed(page, 'A1');
});

test('AC23 pasted negative values and pasted formulas with negative results are red', async ({ page }) => {
  await openSheet(page);
  await enter(page, 'A1', '-3');
  await enter(page, 'B1', '=A1*2');
  await enter(page, 'A2', '4');

  await cell(page, 'A1').click();
  await cell(page, 'B1').click({ modifiers: ['Shift'] });
  await page.keyboard.press('ControlOrMeta+c');
  await cell(page, 'D1').click();
  await page.keyboard.press('ControlOrMeta+v');

  await expect(cell(page, 'D1')).toHaveText('-3');
  await expect(cell(page, 'E1')).toHaveText('-6');
  await expectRed(page, 'D1');
  await expectRed(page, 'E1');

  // B1 의 수식을 B2 에 붙이면 =A2*2 가 되어 양수다.
  await cell(page, 'B1').click();
  await page.keyboard.press('ControlOrMeta+c');
  await cell(page, 'B2').click();
  await page.keyboard.press('ControlOrMeta+v');
  await expect(cell(page, 'B2')).toHaveText('8');
  await expectNotRed(page, 'B2');
});
