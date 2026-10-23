const fs = require('node:fs');
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

async function fillSample(page) {
  await enter(page, 'A1', '이름');
  await enter(page, 'B1', '=1+1');
  await enter(page, 'A2', 'a,"b"');
  await enter(page, 'B3', 'x');
  await expect(cell(page, 'B1')).toHaveText('2');
}

async function download(page) {
  const [file] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#download-csv').click(),
  ]);
  return file;
}

test('the CSV button shows its label at the top of the page', async ({ page }) => {
  await openSheet(page);
  await expect(page.locator('#download-csv')).toHaveText('CSV 내려받기');
});

test('pressing the CSV button downloads sheet.csv', async ({ page }) => {
  await openSheet(page);
  await fillSample(page);
  const file = await download(page);
  expect(file.suggestedFilename()).toBe('sheet.csv');
});

test('the downloaded file holds the BOM and the shown values', async ({ page }) => {
  await openSheet(page);
  await fillSample(page);
  const file = await download(page);
  const text = fs.readFileSync(await file.path(), 'utf8');
  expect(text).toBe('﻿이름,2\r\n"a,""b""",\r\n,x\r\n');
});

test('downloading makes no request outside the page', async ({ page }) => {
  const outside = [];
  page.on('request', (request) => {
    const url = request.url();
    if (!url.startsWith('file:') && !url.startsWith('blob:')) outside.push(url);
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error));
  await openSheet(page);
  await fillSample(page);
  await download(page);
  expect(outside).toEqual([]);
  expect(errors).toEqual([]);
});
