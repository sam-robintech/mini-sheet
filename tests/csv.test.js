const test = require('node:test');
const assert = require('node:assert/strict');
const Csv = require('../src/csv.js');

test('build writes A1 to the last used row and column with commas, CRLF, quoting and a leading BOM', () => {
  const map = { A1: '이름', B1: '2', A2: 'a,"b"', B3: 'x' };
  assert.equal(Csv.build(map), '﻿' + '이름,2\r\n"a,""b""",\r\n,x\r\n');
});

test('build returns only the BOM for an empty map', () => {
  assert.equal(Csv.build({}), '﻿');
});

test('build treats empty display text as an empty cell', () => {
  assert.equal(Csv.build({ A1: '1', C3: '' }), '﻿' + '1\r\n');
  assert.equal(Csv.build({ B2: '' }), '﻿');
});

test('build wraps values that contain a line break in double quotes', () => {
  assert.equal(Csv.build({ A1: 'a\nb', B1: 'c\r\nd' }), '﻿' + '"a\nb","c\r\nd"\r\n');
});

test('build starts at A1 even when the first value is further down and right', () => {
  assert.equal(Csv.build({ C2: 'z' }), '﻿' + ',,\r\n,,z\r\n');
});

test('build reads lower case address keys', () => {
  assert.equal(Csv.build({ b1: 'y' }), '﻿' + ',y\r\n');
});

test('build leaves out keys that are not addresses inside the grid', () => {
  assert.equal(Csv.build({ A1: '1', AA1: 'x', A101: 'y', foo: 'z' }), '﻿' + '1\r\n');
});
