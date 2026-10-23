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
const editor = (page) => page.locator('#cell-editor');

async function enter(page, addr, raw) {
  await cell(page, addr).click();
  await page.keyboard.type(raw);
  await page.keyboard.press('Enter');
}

// 확정 두 번(A1, A2) · 지우기 한 번(A1) · 붙여 넣기 한 번(A2 → B2).
async function commitClearPaste(page) {
  await enter(page, 'A1', '1');
  await enter(page, 'A2', '=A1+1');
  await cell(page, 'A1').click();
  await page.keyboard.press('Delete');
  await cell(page, 'A2').click();
  await page.keyboard.press('ControlOrMeta+c');
  await cell(page, 'B2').click();
  await page.keyboard.press('ControlOrMeta+v');
}

async function expectRow(page, a1, a2, b2) {
  await expect(cell(page, 'A1')).toHaveText(a1);
  await expect(cell(page, 'A2')).toHaveText(a2);
  await expect(cell(page, 'B2')).toHaveText(b2);
}

test('each Ctrl+Z undoes one commit, clear or paste step in reverse order', async ({ page }) => {
  await openSheet(page);
  await commitClearPaste(page);
  await expectRow(page, '', '1', '1');

  await page.keyboard.press('ControlOrMeta+z');
  await expectRow(page, '', '1', '');
  await page.keyboard.press('ControlOrMeta+z');
  await expectRow(page, '1', '2', '');
  await page.keyboard.press('ControlOrMeta+z');
  await expectRow(page, '1', '', '');
  await page.keyboard.press('ControlOrMeta+z');
  await expectRow(page, '', '', '');
  await page.keyboard.press('ControlOrMeta+z');
  await expectRow(page, '', '', '');
  await expect(editor(page)).toHaveValue('');
  await expect(editor(page)).not.toHaveClass(/\bediting\b/);
});

test('Ctrl+Y and Ctrl+Shift+Z redo undone steps', async ({ page }) => {
  await openSheet(page);
  await commitClearPaste(page);
  for (let i = 0; i < 4; i++) await page.keyboard.press('ControlOrMeta+z');
  await expectRow(page, '', '', '');

  await page.keyboard.press('ControlOrMeta+y');
  await expectRow(page, '1', '', '');
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expectRow(page, '1', '2', '');
  await page.keyboard.press('ControlOrMeta+y');
  await expectRow(page, '', '1', '');
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expectRow(page, '', '1', '1');
  await page.keyboard.press('ControlOrMeta+y');
  await expectRow(page, '', '1', '1');
  await expect(editor(page)).toHaveValue('');
});

test('undo updates the formula bar of the active cell', async ({ page }) => {
  await openSheet(page);
  await enter(page, 'A1', '=1+1');
  await cell(page, 'A1').click();
  await expect(page.locator('#formula-input')).toHaveValue('=1+1');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(cell(page, 'A1')).toHaveText('');
  await expect(page.locator('#formula-input')).toHaveValue('');
});

test('a new commit after undo leaves nothing to redo', async ({ page }) => {
  await openSheet(page);
  await enter(page, 'A1', '1');
  await enter(page, 'A2', '2');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(cell(page, 'A2')).toHaveText('');
  await enter(page, 'B1', '3');
  await page.keyboard.press('ControlOrMeta+y');
  await expect(cell(page, 'A2')).toHaveText('');
  await expect(cell(page, 'B1')).toHaveText('3');
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(cell(page, 'A2')).toHaveText('');
  await expect(cell(page, 'B1')).toHaveText('3');
});

test('committing the same raw again is not a step', async ({ page }) => {
  await openSheet(page);
  await enter(page, 'A1', '1');
  await enter(page, 'B1', '5');
  await cell(page, 'B1').click();
  await page.keyboard.press('F2');
  await page.keyboard.press('Enter');
  await expect(cell(page, 'B1')).toHaveText('5');

  await page.keyboard.press('ControlOrMeta+z');
  await expect(cell(page, 'B1')).toHaveText('');
  await expect(cell(page, 'A1')).toHaveText('1');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(cell(page, 'A1')).toHaveText('');
});

test('undo recalculates cells that depend on the restored cells', async ({ page }) => {
  await openSheet(page);
  await enter(page, 'A1', '2');
  await enter(page, 'B1', '=A1*3');
  await enter(page, 'A1', '5');
  await expect(cell(page, 'B1')).toHaveText('15');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(cell(page, 'A1')).toHaveText('2');
  await expect(cell(page, 'B1')).toHaveText('6');
});

test('Ctrl+Z while editing stays inside the editor and adds no sheet step', async ({ page }) => {
  await openSheet(page);
  await enter(page, 'A1', '1');
  await cell(page, 'B1').click();
  await page.keyboard.type('ab');
  await expect(editor(page)).toHaveClass(/\bediting\b/);
  await page.keyboard.press('ControlOrMeta+z');
  await expect(cell(page, 'A1')).toHaveText('1');
  await page.keyboard.press('Escape');
  await expect(cell(page, 'B1')).toHaveText('');
  await expect(cell(page, 'A1')).toHaveText('1');
});
