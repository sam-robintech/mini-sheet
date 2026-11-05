// AC23 / G20 음수 빨간 글자가 칸 상태(활성·고른 범위·고치는 중)와 새로 고침·되돌리기에서도 맞는지 본다.
// 기본 표(A1~A7, 다시 계산)는 e2e/negative.spec.js 가 본다.
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

const colorOf = (locator) => locator.evaluate((el) => getComputedStyle(el).color);

async function expectRed(page, addr) {
  await expect(cell(page, addr)).toHaveClass(/\bnegative\b/);
  expect(await colorOf(cell(page, addr))).toBe(RED);
}

async function expectNotRed(page, addr) {
  await expect(cell(page, addr)).not.toHaveClass(/\bnegative\b/);
  expect(await colorOf(cell(page, addr))).not.toBe(RED);
}

test('AC23 negative zero and a formula giving zero are not red', async ({ page }) => {
  await openSheet(page);
  await enter(page, 'A1', '-0');
  await enter(page, 'A2', '=3-3');
  await enter(page, 'A3', '=-0.5');
  await expect(cell(page, 'A2')).toHaveText('0');
  await expect(cell(page, 'A3')).toHaveText('-0.5');
  await expectNotRed(page, 'A1');
  await expectNotRed(page, 'A2');
  await expectRed(page, 'A3');
});

test('AC23 a negative cell stays red while active and inside a selected range', async ({ page }) => {
  await openSheet(page);
  await enter(page, 'B2', '-3');
  await enter(page, 'C2', '=0-7');
  await cell(page, 'B2').click();
  await expect(cell(page, 'B2')).toHaveClass(/\bactive\b/);
  await expectRed(page, 'B2');
  await page.keyboard.press('Shift+ArrowRight');
  await expect(cell(page, 'C2')).toHaveClass(/\bselected\b/);
  await expectRed(page, 'B2');
  await expectRed(page, 'C2');
});

test('AC23 the editor text is not red while editing a negative cell', async ({ page }) => {
  await openSheet(page);
  await enter(page, 'A1', '-3');
  await cell(page, 'A1').click();
  await page.keyboard.press('F2');
  const editor = page.locator('#cell-editor');
  await expect(editor).toBeVisible();
  await expect(editor).toHaveValue('-3');
  expect(await colorOf(editor)).not.toBe(RED);
  await page.keyboard.press('Escape');
  await expectRed(page, 'A1');
});

test('AC23 red text survives a page reload', async ({ page }) => {
  await openSheet(page);
  await enter(page, 'A1', '-3');
  await enter(page, 'A2', '=A1*2');
  await enter(page, 'A3', '4');
  await page.reload();
  await expect(cell(page, 'A2')).toHaveText('-6');
  await expectRed(page, 'A1');
  await expectRed(page, 'A2');
  await expectNotRed(page, 'A3');
});

test('AC23 undo and redo bring the red color back and forth', async ({ page }) => {
  await openSheet(page);
  await enter(page, 'A1', '-3');
  await enter(page, 'A1', '3');
  await expectNotRed(page, 'A1');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(cell(page, 'A1')).toHaveText('-3');
  await expectRed(page, 'A1');
  await page.keyboard.press('ControlOrMeta+y');
  await expect(cell(page, 'A1')).toHaveText('3');
  await expectNotRed(page, 'A1');
});
