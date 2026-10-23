const test = require('node:test');
const assert = require('node:assert/strict');
const Formula = require('../src/formula.js');
const Functions = require('../src/functions.js');
const Value = require('../src/value.js');

const SHEET = { A1: Value.number(1), A2: Value.number(2), A3: Value.string('x') };

function calc(text, cells) {
  const source = cells || SHEET;
  const parsed = Formula.parse(text);
  assert.equal(parsed.error, undefined, 'parse failed for ' + text);
  return Formula.evaluate(parsed.ast, { get: (addr) => (addr in source ? source[addr] : Value.EMPTY) });
}

test('aggregates skip strings and empty cells inside ranges (AC12)', () => {
  assert.deepEqual(calc('=SUM(A1:A4)'), Value.number(3));
  assert.deepEqual(calc('=AVERAGE(A1:A4)'), Value.number(1.5));
  assert.deepEqual(calc('=MIN(A1:A4)'), Value.number(1));
  assert.deepEqual(calc('=MAX(A1:A4)'), Value.number(2));
  assert.deepEqual(calc('=COUNT(A1:A4)'), Value.number(2));
});

test('IF picks the branch by its condition (AC12)', () => {
  assert.deepEqual(calc('=IF(A1>0,"양","음")'), Value.string('양'));
  assert.deepEqual(calc('=IF(A1>5,"양","음")'), Value.string('음'));
  assert.deepEqual(calc('=IF(0,1)'), Value.bool(false));
  assert.deepEqual(calc('=IF(2,"y","n")'), Value.string('y'));
  assert.deepEqual(calc('=IF("a",1,2)'), Value.ERR_VALUE);
});

test('IF evaluates only the condition and the chosen branch', () => {
  assert.deepEqual(calc('=IF(1,1,1/0)'), Value.number(1));
  assert.deepEqual(calc('=IF(0,1/0,2)'), Value.number(2));
  assert.deepEqual(calc('=IF(1/0,1,2)'), Value.ERR_DIV0);
});

test('ROUND rounds half away from zero after 15-digit cleanup and ABS is absolute (AC12)', () => {
  assert.deepEqual(calc('=ROUND(2.345,2)'), Value.number(2.35));
  assert.deepEqual(calc('=ROUND(2.5,0)'), Value.number(3));
  assert.deepEqual(calc('=ROUND(-2.5,0)'), Value.number(-3));
  assert.deepEqual(calc('=ROUND(1234,-2)'), Value.number(1200));
  assert.deepEqual(calc('=ABS(-4)'), Value.number(4));
  assert.deepEqual(calc('=ABS(A1)'), Value.number(1));
});

test('function names ignore case (AC12)', () => {
  assert.deepEqual(calc('=sum(A1:A2)'), Value.number(3));
  assert.deepEqual(calc('=Max(A1:A2)'), Value.number(2));
});

test('a cell reference argument counts like a range but a direct string is #VALUE! (D8)', () => {
  assert.deepEqual(calc('=SUM(A1,A3)'), Value.number(1));
  assert.deepEqual(calc('=COUNT(A3)'), Value.number(0));
  assert.deepEqual(calc('=SUM(A1,"x")'), Value.ERR_VALUE);
  assert.deepEqual(calc('=SUM(A1,2*3)'), Value.number(7));
});

test('AVERAGE without numbers is #DIV/0! and MIN/MAX without numbers are 0', () => {
  assert.deepEqual(calc('=AVERAGE(A3:A4)'), Value.ERR_DIV0);
  assert.deepEqual(calc('=MIN(A3:A4)'), Value.number(0));
  assert.deepEqual(calc('=MAX(A3:A4)'), Value.number(0));
  assert.deepEqual(calc('=MIN(-5,A1:A2)'), Value.number(-5));
});

test('unknown names are #NAME? and wrong argument counts are #VALUE!', () => {
  assert.deepEqual(calc('=FOO(1)'), Value.ERR_NAME);
  assert.deepEqual(calc('=ABS(1,2)'), Value.ERR_VALUE);
  assert.deepEqual(calc('=ROUND(1)'), Value.ERR_VALUE);
  assert.deepEqual(calc('=IF(1)'), Value.ERR_VALUE);
  assert.deepEqual(calc('=SUM()'), Value.ERR_VALUE);
});

test('the first error among arguments is returned, including errors inside ranges', () => {
  const cells = { A1: Value.number(1), A2: Value.ERR_DIV0 };
  assert.deepEqual(calc('=SUM(A1:A2)', cells), Value.ERR_DIV0);
  assert.deepEqual(calc('=SUM(1/0,FOO(1))', cells), Value.ERR_DIV0);
  assert.deepEqual(calc('=SUM(A1:A101)', cells), Value.ERR_REF);
  assert.deepEqual(calc('=ABS(A1:A2)', cells), Value.ERR_VALUE);
});

test('functions are a call node that formula passes kinds and lazy arguments to', () => {
  const asked = [];
  const result = Functions.call('if', ['value', 'value', 'value'], (i) => {
    asked.push(i);
    return Value.number(i === 0 ? 0 : i);
  });
  assert.deepEqual(result, Value.number(2));
  assert.deepEqual(asked, [0, 2]);
});
