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

// 칸에 원문을 차례로 넣고 화면에 보이는 값을 확인한다. 계산 규칙의 세부는 단위 테스트가 본다.
async function expectShown(page, rows) {
  for (const [addr, raw] of rows) await enter(page, addr, raw);
  for (const [addr, , shown] of rows) await expect(cell(page, addr)).toHaveText(shown);
}

test('AC5 typed text is read as number, string, formula or empty', async ({ page }) => {
  await openSheet(page);
  await expectShown(page, [
    ['A1', '12', '12'],
    ['A2', '1e3', '1000'],
    ['A3', '12a', '12a'],
    ['A4', '=1', '1'],
  ]);
  await expect(cell(page, 'A2')).toHaveClass(/\bright\b/);
  await expect(cell(page, 'A3')).toHaveClass(/\bleft\b/);
  await cell(page, 'A1').click();
  await page.keyboard.press('F2');
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Enter');
  await expect(cell(page, 'A1')).toHaveText('');
  await cell(page, 'A1').click();
  await expect(page.locator('#formula-input')).toHaveValue('');
});

test('AC9 arithmetic follows operator precedence on screen', async ({ page }) => {
  await openSheet(page);
  await expectShown(page, [
    ['A1', '=1+2*3', '7'],
    ['A2', '=(1+2)*3', '9'],
    ['A3', '=2^3^2', '64'],
    ['A4', '=-2^2', '4'],
    ['A5', '=10/4', '2.5'],
  ]);
});

test('AC10 comparisons and & show TRUE, FALSE and joined text', async ({ page }) => {
  await openSheet(page);
  await expectShown(page, [
    ['A1', '=1<2', 'TRUE'],
    ['A2', '=1<>1', 'FALSE'],
    ['A3', '=2>=2', 'TRUE'],
    ['A4', '="a"&1+1', 'a2'],
    ['A5', '="A"="a"', 'TRUE'],
  ]);
});

test('AC11 references, ranges and absolute references read cell values', async ({ page }) => {
  await openSheet(page);
  await expectShown(page, [
    ['A1', '2', '2'],
    ['B1', '3', '3'],
    ['C1', '=A1*B1', '6'],
    ['C2', '=SUM(A1:B1)', '5'],
    ['C3', '=$A$1+B$1', '5'],
    ['C4', '=SUM(B1:A1)', '5'],
    ['C5', '=D9+1', '1'],
  ]);
});

test('AC12 the eight functions compute on screen and accept lower-case names', async ({ page }) => {
  await openSheet(page);
  await expectShown(page, [
    ['A1', '1', '1'],
    ['A2', '2', '2'],
    ['A3', 'x', 'x'],
    ['B1', '=SUM(A1:A4)', '3'],
    ['B2', '=AVERAGE(A1:A4)', '1.5'],
    ['B3', '=MIN(A1:A4)', '1'],
    ['B4', '=MAX(A1:A4)', '2'],
    ['B5', '=COUNT(A1:A4)', '2'],
    ['B6', '=IF(A1>0,"양","음")', '양'],
    ['B7', '=ROUND(2.345,2)', '2.35'],
    ['B8', '=ROUND(-2.5,0)', '-3'],
    ['B9', '=ABS(-4)', '4'],
    ['B10', '=sum(A1:A4)', '3'],
  ]);
});

test('AC13 error values show in the cells and spread to dependents', async ({ page }) => {
  await openSheet(page);
  await expectShown(page, [
    ['B1', '=1/0', '#DIV/0!'],
    ['B2', '=FOO(1)', '#NAME?'],
    ['B3', '=AA1', '#REF!'],
    ['B4', '=A101', '#REF!'],
    ['B5', '="a"+1', '#VALUE!'],
    ['B6', '=ABS(1,2)', '#VALUE!'],
    ['B7', '=1+', '#ERROR!'],
    ['A1', '=1/0', '#DIV/0!'],
    ['C1', '=A1+1', '#DIV/0!'],
  ]);
});

test('AC14 circular references show #CIRC! and recover when broken', async ({ page }) => {
  await openSheet(page);
  await enter(page, 'A1', '=B1');
  await enter(page, 'B1', '=A1');
  await enter(page, 'C1', '=C1+1');
  await expect(cell(page, 'A1')).toHaveText('#CIRC!');
  await expect(cell(page, 'B1')).toHaveText('#CIRC!');
  await expect(cell(page, 'C1')).toHaveText('#CIRC!');
  await enter(page, 'B1', '5');
  await expect(cell(page, 'A1')).toHaveText('5');
  await expect(cell(page, 'B1')).toHaveText('5');
});

test('AC16 pasting a formula shifts relative parts and keeps $ parts', async ({ page }) => {
  await openSheet(page);
  await enter(page, 'C1', '=A1+$B$1+$A2+B$2');
  await cell(page, 'C1').click();
  await page.keyboard.press('ControlOrMeta+c');
  await cell(page, 'D3').click();
  await page.keyboard.press('ControlOrMeta+v');
  await cell(page, 'D3').click();
  await expect(page.locator('#formula-input')).toHaveValue('=B3+$B$1+$A4+C$2');
});

test('AC16 pasting a reference off the sheet shows #REF!', async ({ page }) => {
  await openSheet(page);
  await enter(page, 'B2', '=A1');
  await cell(page, 'B2').click();
  await page.keyboard.press('ControlOrMeta+c');
  await cell(page, 'A1').click();
  await page.keyboard.press('ControlOrMeta+v');
  await expect(cell(page, 'A1')).toHaveText('#REF!');
  await cell(page, 'A1').click();
  await expect(page.locator('#formula-input')).toHaveValue('=#REF!');
});
