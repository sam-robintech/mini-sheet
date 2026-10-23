const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Formula = require('../src/formula.js');
const Value = require('../src/value.js');

function ctxOf(cells) {
  return { get: (addr) => (addr in cells ? cells[addr] : Value.EMPTY) };
}

function calc(text, cells) {
  const parsed = Formula.parse(text);
  assert.equal(parsed.error, undefined, 'parse failed for ' + text);
  return Formula.evaluate(parsed.ast, ctxOf(cells || {}));
}

test('arithmetic follows operator precedence and parentheses', () => {
  assert.deepEqual(calc('=1+2*3'), Value.number(7));
  assert.deepEqual(calc('=(1+2)*3'), Value.number(9));
  assert.deepEqual(calc('=10/4'), Value.number(2.5));
  assert.deepEqual(calc('=10-4-3'), Value.number(3));
  assert.deepEqual(calc('=1.5e1 + .5'), Value.number(15.5));
});

test('power groups from the left and unary minus binds before power', () => {
  assert.deepEqual(calc('=2^3^2'), Value.number(64));
  assert.deepEqual(calc('=-2^2'), Value.number(4));
  assert.deepEqual(calc('=+3'), Value.number(3));
  assert.deepEqual(calc('=2^-1'), Value.number(0.5));
});

test('comparisons return booleans', () => {
  assert.deepEqual(calc('=1<2'), Value.bool(true));
  assert.deepEqual(calc('=1<>1'), Value.bool(false));
  assert.deepEqual(calc('=2>=2'), Value.bool(true));
  assert.deepEqual(calc('=2<=1'), Value.bool(false));
  assert.deepEqual(calc('=3>2'), Value.bool(true));
  assert.deepEqual(calc('=1=1'), Value.bool(true));
});

test('string comparison ignores case', () => {
  assert.deepEqual(calc('="A"="a"'), Value.bool(true));
  assert.deepEqual(calc('="a"<"B"'), Value.bool(true));
});

test('comparison treats an empty cell as the other side kind', () => {
  assert.deepEqual(calc('=A1=0'), Value.bool(true));
  assert.deepEqual(calc('=A1=""'), Value.bool(true));
  assert.deepEqual(calc('=A1<1'), Value.bool(true));
  assert.deepEqual(calc('=A1=B1'), Value.bool(true));
  assert.deepEqual(calc('=A1=(1>2)'), Value.bool(true));
});

test('comparison of different kinds orders number before string before boolean', () => {
  assert.deepEqual(calc('=1<"a"'), Value.bool(true));
  assert.deepEqual(calc('="1"=1'), Value.bool(false));
  assert.deepEqual(calc('="z"<(1=1)'), Value.bool(true));
});

test('concatenation joins text after arithmetic', () => {
  assert.deepEqual(calc('="a"&1+1'), Value.string('a2'));
  assert.deepEqual(calc('="x"&A1&"y"'), Value.string('xy'));
  assert.deepEqual(calc('="say ""hi"""'), Value.string('say "hi"'));
  assert.deepEqual(calc('=(1<2)&""'), Value.string('TRUE'));
});

test('references read cell values through ctx.get', () => {
  const cells = { A1: Value.number(2), B1: Value.number(3) };
  assert.deepEqual(calc('=A1*B1', cells), Value.number(6));
  assert.deepEqual(calc('=$A$1+b$1', cells), Value.number(5));
  assert.deepEqual(calc('=C1+1', cells), Value.number(1));
});

test('references outside the grid evaluate to #REF!', () => {
  assert.deepEqual(calc('=AA1'), Value.ERR_REF);
  assert.deepEqual(calc('=A101'), Value.ERR_REF);
});

test('error literals and division by zero produce error values', () => {
  assert.deepEqual(calc('=#REF!'), Value.ERR_REF);
  assert.deepEqual(calc('=1/0'), Value.ERR_DIV0);
  assert.deepEqual(calc('="a"+1'), Value.ERR_VALUE);
});

test('binary operators return the left error before the right error', () => {
  const cells = { A1: Value.ERR_DIV0, B1: Value.ERR_NAME };
  assert.deepEqual(calc('=A1+B1', cells), Value.ERR_DIV0);
  assert.deepEqual(calc('=1+B1', cells), Value.ERR_NAME);
  assert.deepEqual(calc('=A1&B1', cells), Value.ERR_DIV0);
  assert.deepEqual(calc('=A1<B1', cells), Value.ERR_DIV0);
  assert.deepEqual(calc('=-A1', cells), Value.ERR_DIV0);
});

test('a range used as a plain value is #VALUE!', () => {
  assert.deepEqual(calc('=A1:B2+1'), Value.ERR_VALUE);
});

test('refs lists references and expanded ranges inside the grid', () => {
  assert.deepEqual(Formula.parse('=a1+$B$2').refs, ['A1', 'B2']);
  assert.deepEqual(Formula.parse('=B2:A1').refs, ['A1', 'B1', 'A2', 'B2']);
  assert.deepEqual(Formula.parse('=A1+A1:A2').refs, ['A1', 'A2']);
});

test('refs leaves out references and ranges outside the grid', () => {
  assert.deepEqual(Formula.parse('=AA1+A101+B1').refs, ['B1']);
  assert.deepEqual(Formula.parse('=A1:A101').refs, []);
});

test('parse reads function calls as call nodes', () => {
  const parsed = Formula.parse('=SUM(A1:A2, 3)');
  assert.equal(parsed.ast.type, 'call');
  assert.equal(parsed.ast.name, 'SUM');
  assert.deepEqual(parsed.ast.args.map((a) => a.type), ['range', 'num']);
  assert.deepEqual(parsed.refs, ['A1', 'A2']);
  assert.equal(Formula.parse('=NOW()').ast.args.length, 0);
});

test('parse returns #ERROR! for broken formulas', () => {
  for (const text of ['=1+', '=(1', '=1)', '=', '="abc', '=1 2', '=SUM(1,', '=@', '=A1:', '=#BAD!', '=*1']) {
    assert.deepEqual(Formula.parse(text), { error: '#ERROR!' }, text);
  }
});

test('formula.js does not use eval or Function', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/formula.js'), 'utf8');
  assert.equal(/\beval\s*\(/.test(source), false);
  assert.equal(/\bFunction\s*\(/.test(source), false);
});
