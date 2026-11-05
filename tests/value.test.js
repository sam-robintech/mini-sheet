const test = require('node:test');
const assert = require('node:assert/strict');
const Value = require('../src/value.js');

test('parseRaw reads plain numbers as numbers', () => {
  assert.deepEqual(Value.parseRaw('12'), { kind: 'number', value: 12 });
  assert.deepEqual(Value.parseRaw('1e3'), { kind: 'number', value: 1000 });
  assert.deepEqual(Value.parseRaw('-3.5'), { kind: 'number', value: -3.5 });
  assert.deepEqual(Value.parseRaw('.5'), { kind: 'number', value: 0.5 });
  assert.deepEqual(Value.parseRaw(' 7 '), { kind: 'number', value: 7 });
});

test('parseRaw reads text that is not a number as a string', () => {
  assert.deepEqual(Value.parseRaw('12a'), { kind: 'string', value: '12a' });
  assert.deepEqual(Value.parseRaw('이름'), { kind: 'string', value: '이름' });
  assert.deepEqual(Value.parseRaw('1.2.3'), { kind: 'string', value: '1.2.3' });
});

test('parseRaw reads text starting with = as a formula', () => {
  assert.deepEqual(Value.parseRaw('=1'), { kind: 'formula', value: '=1' });
});

test('parseRaw reads empty text as an empty cell', () => {
  assert.deepEqual(Value.parseRaw(''), { kind: 'empty', value: '' });
});

test('display shows numbers rounded to 15 significant digits', () => {
  assert.equal(Value.display(Value.number(0.1 + 0.2)), '0.3');
  assert.equal(Value.display(Value.number(1 / 3)), '0.333333333333333');
  assert.equal(Value.display(Value.number(-3.5)), '-3.5');
});

test('display shows booleans as TRUE and FALSE', () => {
  assert.equal(Value.display(Value.bool(true)), 'TRUE');
  assert.equal(Value.display(Value.bool(false)), 'FALSE');
});

test('display shows strings, errors and empty cells as their text', () => {
  assert.equal(Value.display(Value.string('abc')), 'abc');
  assert.equal(Value.display(Value.ERR_DIV0), '#DIV/0!');
  assert.equal(Value.display(Value.EMPTY), '');
});

test('error constants hold the six error texts', () => {
  assert.deepEqual(
    [Value.ERR_DIV0, Value.ERR_NAME, Value.ERR_REF, Value.ERR_VALUE, Value.ERR_CIRC, Value.ERR_SYNTAX]
      .map((e) => e.type + ' ' + e.value),
    ['error #DIV/0!', 'error #NAME?', 'error #REF!', 'error #VALUE!', 'error #CIRC!', 'error #ERROR!']);
});

test('toNumber turns empty into 0 and booleans into 1 and 0', () => {
  assert.deepEqual(Value.toNumber(Value.EMPTY), { type: 'number', value: 0 });
  assert.deepEqual(Value.toNumber(Value.bool(true)), { type: 'number', value: 1 });
  assert.deepEqual(Value.toNumber(Value.bool(false)), { type: 'number', value: 0 });
  assert.deepEqual(Value.toNumber(Value.number(4)), { type: 'number', value: 4 });
});

test('toNumber gives #VALUE! for every string, even one that reads as a number', () => {
  assert.deepEqual(Value.toNumber(Value.string('1')), Value.ERR_VALUE);
  assert.deepEqual(Value.toNumber(Value.string(' 3')), Value.ERR_VALUE);
  assert.deepEqual(Value.toNumber(Value.string('x')), Value.ERR_VALUE);
});

test('toNumber passes an error value through unchanged', () => {
  assert.deepEqual(Value.toNumber(Value.ERR_DIV0), Value.ERR_DIV0);
});

test('toText turns empty into empty text and other values into their shown text', () => {
  assert.deepEqual(Value.toText(Value.EMPTY), { type: 'string', value: '' });
  assert.deepEqual(Value.toText(Value.number(2)), { type: 'string', value: '2' });
  assert.deepEqual(Value.toText(Value.bool(true)), { type: 'string', value: 'TRUE' });
  assert.deepEqual(Value.toText(Value.string('a')), { type: 'string', value: 'a' });
  assert.deepEqual(Value.toText(Value.ERR_REF), Value.ERR_REF);
});

test('align puts only numbers on the right', () => {
  assert.equal(Value.align(Value.number(1)), 'right');
  assert.equal(Value.align(Value.string('1')), 'left');
  assert.equal(Value.align(Value.bool(true)), 'left');
  assert.equal(Value.align(Value.ERR_VALUE), 'left');
  assert.equal(Value.align(Value.EMPTY), 'left');
});

test('isNegative is true for numbers below zero', () => {
  assert.equal(Value.isNegative(Value.number(-3)), true);
  assert.equal(Value.isNegative(Value.number(-0.5)), true);
});

test('isNegative is false for zero, minus zero, positives, strings, booleans, errors and empty cells', () => {
  assert.equal(Value.isNegative(Value.number(0)), false);
  assert.equal(Value.isNegative({ type: 'number', value: -0 }), false);
  assert.equal(Value.isNegative(Value.number(5)), false);
  assert.equal(Value.isNegative(Value.string('-abc')), false);
  assert.equal(Value.isNegative(Value.bool(true)), false);
  assert.equal(Value.isNegative(Value.bool(false)), false);
  assert.equal(Value.isNegative(Value.ERR_DIV0), false);
  assert.equal(Value.isNegative(Value.EMPTY), false);
});

test('isError tells error values apart', () => {
  assert.equal(Value.isError(Value.ERR_NAME), true);
  assert.equal(Value.isError(Value.number(1)), false);
});
