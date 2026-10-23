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
const formulaInput = (page) => page.locator('#formula-input');

async function enter(page, addr, raw) {
  await cell(page, addr).click();
  await page.keyboard.type(raw);
  await page.keyboard.press('Enter');
}

async function fillA1B2(page) {
  await enter(page, 'A1', '1');
  await enter(page, 'B1', '=A1+1');
  await enter(page, 'A2', '2');
  await enter(page, 'B2', '=A2*2');
}

async function copyA1B2(page) {
  await cell(page, 'A1').click();
  await cell(page, 'B2').click({ modifiers: ['Shift'] });
  await page.keyboard.press('ControlOrMeta+c');
}

test('copying A1:B2 and pasting at D5 fills D5:E6 with shifted formulas', async ({ page }) => {
  await openSheet(page);
  await fillA1B2(page);
  await copyA1B2(page);
  await cell(page, 'D5').click();
  await page.keyboard.press('ControlOrMeta+v');

  await expect(cell(page, 'D5')).toHaveText('1');
  await expect(cell(page, 'E5')).toHaveText('2');
  await expect(cell(page, 'D6')).toHaveText('2');
  await expect(cell(page, 'E6')).toHaveText('4');
  await expect(formulaInput(page)).toHaveValue('1');
  await cell(page, 'E5').click();
  await expect(formulaInput(page)).toHaveValue('=D5+1');
  await cell(page, 'E6').click();
  await expect(formulaInput(page)).toHaveValue('=D6*2');
  await expect(page.locator('#cell-editor')).toHaveValue('');
  await expect(page.locator('#cell-editor')).not.toHaveClass(/\bediting\b/);
});

test('copying does not change the sheet and pasted cells recalculate their dependents', async ({ page }) => {
  await openSheet(page);
  await fillA1B2(page);
  await copyA1B2(page);
  await expect(cell(page, 'A1')).toHaveText('1');
  await expect(cell(page, 'B2')).toHaveText('4');
  await enter(page, 'F1', '=SUM(D5:E6)');
  await expect(cell(page, 'F1')).toHaveText('0');
  await cell(page, 'D5').click();
  await page.keyboard.press('ControlOrMeta+v');
  await expect(cell(page, 'F1')).toHaveText('9');
});

test('pasting a 2x2 range at Z100 changes only Z100 without page errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  await openSheet(page);
  await fillA1B2(page);
  await copyA1B2(page);
  await cell(page, 'Z100').click();
  await page.keyboard.press('ControlOrMeta+v');
  await expect(cell(page, 'Z100')).toHaveText('1');
  await expect(cell(page, 'Y100')).toHaveText('');
  await expect(cell(page, 'Z99')).toHaveText('');
  await expect(page.locator('#name-box')).toHaveText('Z100');
  expect(errors).toEqual([]);
});

test('pasting with nothing copied does nothing', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  await openSheet(page);
  await enter(page, 'A1', 'x');
  await cell(page, 'A1').click();
  await page.keyboard.press('ControlOrMeta+v');
  await expect(cell(page, 'A1')).toHaveText('x');
  await expect(page.locator('#cell-editor')).toHaveValue('');
  expect(errors).toEqual([]);
});

test('the app never touches the operating system clipboard', async ({ page }) => {
  await page.addInitScript(() => {
    window.__osClipboardUsed = false;
    const mark = () => { window.__osClipboardUsed = true; return Promise.resolve(''); };
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      get() {
        window.__osClipboardUsed = true;
        return { readText: mark, writeText: mark, read: mark, write: mark };
      },
    });
  });
  await openSheet(page);
  await fillA1B2(page);
  await copyA1B2(page);
  await cell(page, 'D5').click();
  await page.keyboard.press('ControlOrMeta+v');
  await expect(cell(page, 'E5')).toHaveText('2');
  expect(await page.evaluate(() => window.__osClipboardUsed)).toBe(false);
});
