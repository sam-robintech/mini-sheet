const test = require('node:test');
const assert = require('node:assert/strict');
const Formula = require('../src/formula.js');
const Value = require('../src/value.js');

const SHEET = { A1: Value.number(1), A2: Value.number(2), A3: Value.string('x') };

// 문법 오류는 parse 의 error 글자를, 나머지는 evaluate 의 칸 값을 돌려준다.
function calc(text, cells) {
  const source = cells || SHEET;
  const parsed = Formula.parse(text);
  if (parsed.error) return Value.error(parsed.error);
  return Formula.evaluate(parsed.ast, { get: (addr) => (addr in source ? source[addr] : Value.EMPTY) });
}

test('dividing by zero is #DIV/0! (AC13)', () => {
  assert.deepEqual(calc('=1/0'), Value.ERR_DIV0);
  assert.deepEqual(calc('=A1/A9'), Value.ERR_DIV0);
});

test('an unknown function parses and evaluates to #NAME? (AC13)', () => {
  assert.equal(Formula.parse('=FOO(1)').error, undefined);
  assert.deepEqual(calc('=FOO(1)'), Value.ERR_NAME);
});

test('references and ranges outside the sheet are #REF! (AC13)', () => {
  assert.equal(Formula.parse('=AA1').error, undefined);
  assert.deepEqual(calc('=AA1'), Value.ERR_REF);
  assert.deepEqual(calc('=A101'), Value.ERR_REF);
  assert.deepEqual(calc('=A0'), Value.ERR_REF);
  assert.deepEqual(calc('=SUM(A1:A101)'), Value.ERR_REF);
  assert.deepEqual(calc('=SUM(AA1:A1)'), Value.ERR_REF);
  assert.deepEqual(Formula.parse('=SUM(A1:A101)').refs, []);
});

test('a string in a number position is #VALUE! (AC13)', () => {
  assert.deepEqual(calc('="a"+1'), Value.ERR_VALUE);
  assert.deepEqual(calc('="1"+1'), Value.ERR_VALUE);
  assert.deepEqual(calc('=-"a"'), Value.ERR_VALUE);
  assert.deepEqual(calc('=A3*2'), Value.ERR_VALUE);
  assert.deepEqual(calc('=ABS("a")'), Value.ERR_VALUE);
});

test('a wrong argument count is #VALUE! (AC13)', () => {
  assert.deepEqual(calc('=ABS(1,2)'), Value.ERR_VALUE);
  assert.deepEqual(calc('=ROUND(1)'), Value.ERR_VALUE);
  assert.deepEqual(calc('=IF(1)'), Value.ERR_VALUE);
  assert.deepEqual(calc('=SUM()'), Value.ERR_VALUE);
});

test('a syntax error is #ERROR! (AC13)', () => {
  assert.deepEqual(calc('=1+'), Value.ERR_SYNTAX);
  assert.deepEqual(calc('=(1'), Value.ERR_SYNTAX);
  assert.deepEqual(calc('=1)'), Value.ERR_SYNTAX);
  assert.deepEqual(calc('="abc'), Value.ERR_SYNTAX);
  assert.deepEqual(calc('=#FOO'), Value.ERR_SYNTAX);
  assert.deepEqual(calc('=SUM(A1:)'), Value.ERR_SYNTAX);
});

test('error text tokens evaluate to their error value', () => {
  assert.deepEqual(calc('=#REF!'), Value.ERR_REF);
  assert.deepEqual(calc('=#div/0!'), Value.ERR_DIV0);
  assert.deepEqual(calc('=SUM(#REF!)'), Value.ERR_REF);
  assert.deepEqual(calc('=1+#NAME?'), Value.ERR_NAME);
});

test('an error in a referenced cell or range spreads (AC13, G4)', () => {
  const cells = { A1: Value.ERR_DIV0, A2: Value.number(2), B1: Value.ERR_CIRC };
  assert.deepEqual(calc('=A1+1', cells), Value.ERR_DIV0);
  assert.deepEqual(calc('=-A1', cells), Value.ERR_DIV0);
  assert.deepEqual(calc('=A1&"x"', cells), Value.ERR_DIV0);
  assert.deepEqual(calc('=A1=1', cells), Value.ERR_DIV0);
  assert.deepEqual(calc('=SUM(A1:A2)', cells), Value.ERR_DIV0);
  assert.deepEqual(calc('=COUNT(A1:A2)', cells), Value.ERR_DIV0);
  assert.deepEqual(calc('=ABS(B1)', cells), Value.ERR_CIRC);
});

test('the left error wins in operators and function arguments (D7)', () => {
  const cells = { A1: Value.ERR_DIV0, B1: Value.ERR_REF };
  assert.deepEqual(calc('=A1+B1', cells), Value.ERR_DIV0);
  assert.deepEqual(calc('=B1+A1', cells), Value.ERR_REF);
  assert.deepEqual(calc('=1/0+FOO(1)'), Value.ERR_DIV0);
  assert.deepEqual(calc('="a"+1/0'), Value.ERR_DIV0);
  assert.deepEqual(calc('=SUM(B1,A1)', cells), Value.ERR_REF);
  assert.deepEqual(calc('=SUM(A1:B1)', cells), Value.ERR_DIV0);
  assert.deepEqual(calc('=ROUND(1/0,#REF!)'), Value.ERR_DIV0);
});

test('IF does not spread an error from the branch it does not pick (D7)', () => {
  assert.deepEqual(calc('=IF(1,1,1/0)'), Value.number(1));
  assert.deepEqual(calc('=IF(0,1/0,2)'), Value.number(2));
  assert.deepEqual(calc('=IF(0,1,1/0)'), Value.ERR_DIV0);
  assert.deepEqual(calc('=IF(#REF!,1,2)'), Value.ERR_REF);
});

test('a result that is not finite is #VALUE!', () => {
  assert.deepEqual(calc('=10^400'), Value.ERR_VALUE);
  assert.deepEqual(calc('=(-1)^0.5'), Value.ERR_VALUE);
});
