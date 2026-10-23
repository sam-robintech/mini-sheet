const test = require('node:test');
const assert = require('node:assert/strict');
const Address = require('../src/address.js');
const Value = require('../src/value.js');
const Formula = require('../src/formula.js');
const Clipboard = require('../src/clipboard.js');

function cellOf(addr) {
  const ref = Address.parseRef(addr);
  return { col: ref.col, row: ref.row };
}

// from 칸의 수식을 to 칸으로 옮긴다.
function move(text, from, to) {
  const a = cellOf(from);
  const b = cellOf(to);
  return Formula.shift(text, b.col - a.col, b.row - a.row);
}

function getRawOf(cells) {
  return (addr) => (addr in cells ? cells[addr] : '');
}

test('shift moves relative parts and keeps $ parts', () => {
  assert.equal(move('=A1+$B$1+$A2+B$2', 'C1', 'D3'), '=B3+$B$1+$A4+C$2');
});

test('shift turns a reference pushed off the grid into #REF!', () => {
  const moved = move('=A1', 'B2', 'A1');
  assert.equal(moved, '=#REF!');
  const parsed = Formula.parse(moved);
  assert.deepEqual(Formula.evaluate(parsed.ast, { get: () => Value.EMPTY }), Value.ERR_REF);
  assert.equal(move('=Z100', 'A1', 'A2'), '=#REF!');
  assert.equal(move('=Z1', 'A1', 'B1'), '=#REF!');
});

test('shift turns a whole range into one #REF! when either end leaves the grid', () => {
  assert.equal(move('=SUM(A1:B2)', 'B3', 'B2'), '=SUM(#REF!)');
  assert.equal(move('=SUM(A1:B2)', 'B3', 'C4'), '=SUM(B2:C3)');
  assert.equal(move('=SUM($A$1:B2)', 'B3', 'B2'), '=SUM($A$1:B1)');
});

test('shift leaves string tokens, function names and other text unchanged', () => {
  assert.equal(move('="A1"&A1', 'B1', 'B2'), '="A1"&A2');
  assert.equal(move('="say ""B2"""&B2', 'C1', 'C2'), '="say ""B2"""&B3');
  assert.equal(move('=LOG10(A1) + abs( A1 )', 'B1', 'C1'), '=LOG10(B1) + abs( B1 )');
  assert.equal(move('=#REF!+1', 'A1', 'B2'), '=#REF!+1');
});

test('shift does not change plain values or formulas it cannot read', () => {
  assert.equal(move('A1', 'A1', 'B2'), 'A1');
  assert.equal(move('12', 'A1', 'B2'), '12');
  assert.equal(move('', 'A1', 'B2'), '');
  assert.equal(move('="A1', 'A1', 'B2'), '="A1');
});

test('shift keeps references that were already off the grid', () => {
  assert.equal(move('=AA1+A1', 'A1', 'A2'), '=AA1+A2');
});

test('copy remembers the raw text of every cell in the range', () => {
  const clip = Clipboard.copy(getRawOf({ A1: '1', B1: '=A1+1', B2: '=A2*2' }),
    Address.parseRange('A1:B2'));
  assert.equal(clip.rows, 2);
  assert.equal(clip.cols, 2);
  assert.deepEqual(clip.origin, { col: 0, row: 0 });
  assert.deepEqual(clip.raws, [['1', '=A1+1'], ['', '=A2*2']]);
});

test('paste at D5 gives four cells with references moved by the same amount', () => {
  const clip = Clipboard.copy(
    getRawOf({ A1: '1', B1: '=A1+1', A2: '2', B2: '=A2*2+$A$1' }),
    Address.parseRange('A1:B2'));
  assert.deepEqual(Clipboard.paste(clip, cellOf('D5')), [
    { addr: 'D5', raw: '1' },
    { addr: 'E5', raw: '=D5+1' },
    { addr: 'D6', raw: '2' },
    { addr: 'E6', raw: '=D6*2+$A$1' },
  ]);
});

test('paste drops cells that would fall outside the grid', () => {
  const clip = Clipboard.copy(getRawOf({ A1: '1', B1: '2', A2: '3', B2: '4' }),
    Address.parseRange('A1:B2'));
  assert.deepEqual(Clipboard.paste(clip, cellOf('Z100')), [{ addr: 'Z100', raw: '1' }]);
  assert.deepEqual(Clipboard.paste(clip, cellOf('Y100')),
    [{ addr: 'Y100', raw: '1' }, { addr: 'Z100', raw: '2' }]);
});

test('paste does not change the clipboard it was given', () => {
  const clip = Clipboard.copy(getRawOf({ A1: '=A2' }), Address.parseRange('A1'));
  Clipboard.paste(clip, cellOf('C3'));
  assert.deepEqual(clip.raws, [['=A2']]);
  assert.deepEqual(Clipboard.paste(clip, cellOf('A1')), [{ addr: 'A1', raw: '=A2' }]);
});
