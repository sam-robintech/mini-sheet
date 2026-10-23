const test = require('node:test');
const assert = require('node:assert/strict');
const Sheet = require('../src/sheet.js');
const Value = require('../src/value.js');

function sheetOf(cells) {
  const sheet = Sheet.create();
  sheet.setMany(Object.keys(cells).map((addr) => ({ addr, raw: cells[addr] })));
  return sheet;
}

test('formulas read other cells, ranges and absolute references (AC11)', () => {
  const sheet = sheetOf({ A1: '2', B1: '3' });
  sheet.setRaw('C1', '=A1*B1');
  sheet.setRaw('C2', '=SUM(A1:B1)');
  sheet.setRaw('C3', '=$A$1+B$1');
  sheet.setRaw('C4', '=SUM(B1:A1)');
  sheet.setRaw('C5', '=Z99+1');
  sheet.setRaw('C6', '=Z99');
  assert.deepEqual(sheet.getValue('C6'), Value.number(0));
  assert.equal(sheet.getDisplay('C6'), '0');
  assert.deepEqual(sheet.getValue('C1'), Value.number(6));
  assert.deepEqual(sheet.getValue('C2'), Value.number(5));
  assert.deepEqual(sheet.getValue('C3'), Value.number(5));
  assert.deepEqual(sheet.getValue('C4'), Value.number(5));
  assert.deepEqual(sheet.getValue('C5'), Value.number(1));
});

test('a formula written before its inputs updates when the inputs arrive', () => {
  const sheet = Sheet.create();
  sheet.setRaw('C1', '=A1*B1');
  assert.deepEqual(sheet.getValue('C1'), Value.number(0));
  sheet.setRaw('A1', '2');
  sheet.setRaw('B1', '3');
  assert.deepEqual(sheet.getValue('C1'), Value.number(6));
});

test('two cells that refer to each other are both #CIRC! (AC14)', () => {
  const sheet = sheetOf({ A1: '=B1', B1: '=A1' });
  assert.deepEqual(sheet.getValue('A1'), Value.ERR_CIRC);
  assert.deepEqual(sheet.getValue('B1'), Value.ERR_CIRC);
});

test('a cell that refers to itself is #CIRC! (AC14)', () => {
  const sheet = sheetOf({ C1: '=C1+1', D1: '=SUM(D1:D2)' });
  assert.deepEqual(sheet.getValue('C1'), Value.ERR_CIRC);
  assert.deepEqual(sheet.getValue('D1'), Value.ERR_CIRC);
});

test('breaking a cycle brings back real values (AC14)', () => {
  const sheet = sheetOf({ A1: '=B1', B1: '=A1' });
  const changed = sheet.setRaw('B1', '5');
  assert.deepEqual(sheet.getValue('B1'), Value.number(5));
  assert.deepEqual(sheet.getValue('A1'), Value.number(5));
  assert.deepEqual(changed.sort(), ['A1', 'B1']);
});

test('a cell below a cycle gets #CIRC! through error propagation, IF can skip it', () => {
  const sheet = sheetOf({ A1: '=B1', B1: '=A1', C1: '=A1+1', D1: '=IF(1,7,A1)' });
  assert.deepEqual(sheet.getValue('C1'), Value.ERR_CIRC);
  assert.deepEqual(sheet.getValue('D1'), Value.number(7));
});

test('changing a cell recalculates only the cells that depend on it (AC15)', () => {
  const sheet = sheetOf({ A1: '1', B1: '=A1*2', C1: '=B1+1', D1: '=7' });
  const before = sheet.evalCount;
  const changed = sheet.setRaw('A1', '10');
  assert.equal(sheet.evalCount - before, 2);
  assert.deepEqual(sheet.getValue('B1'), Value.number(20));
  assert.deepEqual(sheet.getValue('C1'), Value.number(21));
  assert.deepEqual(sheet.getValue('D1'), Value.number(7));
  assert.deepEqual(changed.sort(), ['A1', 'B1', 'C1']);
});

test('each dependent is calculated once even when reached by two paths', () => {
  const sheet = sheetOf({ A1: '1', B1: '=A1', C1: '=A1', D1: '=B1+C1' });
  const before = sheet.evalCount;
  sheet.setRaw('A1', '2');
  assert.equal(sheet.evalCount - before, 3);
  assert.deepEqual(sheet.getValue('D1'), Value.number(4));
});

test('setRaw returns only the addresses whose value changed', () => {
  const sheet = sheetOf({ A1: '1', B1: '=A1>0', C1: '=7' });
  assert.deepEqual(sheet.setRaw('A1', '2'), ['A1']);
  assert.deepEqual(sheet.setRaw('C1', '7'), []);
});

test('changing a formula drops its old references', () => {
  const sheet = sheetOf({ A1: '1', B1: '=A1' });
  sheet.setRaw('B1', '=5');
  const before = sheet.evalCount;
  sheet.setRaw('A1', '2');
  assert.equal(sheet.evalCount - before, 0);
  assert.deepEqual(sheet.getValue('B1'), Value.number(5));
});

test('setMany applies several cells in one recalculation', () => {
  const sheet = sheetOf({ A1: '1', A2: '2', B1: '=A1+A2' });
  const before = sheet.evalCount;
  const changed = sheet.setMany([{ addr: 'A1', raw: '10' }, { addr: 'A2', raw: '20' }]);
  assert.equal(sheet.evalCount - before, 1);
  assert.deepEqual(sheet.getValue('B1'), Value.number(30));
  assert.deepEqual(changed.sort(), ['A1', 'A2', 'B1']);
});

test('addresses are stored upper case and raw text is kept as typed', () => {
  const sheet = Sheet.create();
  sheet.setRaw('a1', '=1+1');
  sheet.setRaw('b2', 'hello');
  assert.equal(sheet.getRaw('A1'), '=1+1');
  assert.equal(sheet.getRaw('a1'), '=1+1');
  assert.deepEqual(sheet.getValue('A1'), Value.number(2));
  assert.equal(sheet.getDisplay('B2'), 'hello');
  assert.deepEqual(sheet.entries(), [['A1', '=1+1'], ['B2', 'hello']]);
});

test('clearing a cell removes it from entries and makes it empty', () => {
  const sheet = sheetOf({ A1: '3', B1: '=A1' });
  const changed = sheet.setRaw('A1', '');
  assert.equal(sheet.getRaw('A1'), '');
  assert.deepEqual(sheet.getValue('A1'), Value.EMPTY);
  assert.deepEqual(sheet.getValue('B1'), Value.number(0));
  assert.deepEqual(sheet.entries(), [['B1', '=A1']]);
  assert.deepEqual(changed.sort(), ['A1', 'B1']);
});

test('empty and unknown cells read as empty, and addresses outside the sheet are ignored', () => {
  const sheet = Sheet.create();
  assert.equal(sheet.getRaw('C3'), '');
  assert.deepEqual(sheet.getValue('C3'), Value.EMPTY);
  assert.equal(sheet.getDisplay('C3'), '');
  assert.deepEqual(sheet.setRaw('AA1', '5'), []);
  assert.deepEqual(sheet.entries(), []);
});

test('values follow the raw text kinds and syntax errors show #ERROR!', () => {
  const sheet = sheetOf({ A1: '12', A2: 'abc', A3: '=1+', A4: '=A3' });
  assert.deepEqual(sheet.getValue('A1'), Value.number(12));
  assert.deepEqual(sheet.getValue('A2'), Value.string('abc'));
  assert.equal(sheet.getDisplay('A3'), '#ERROR!');
  assert.equal(sheet.getDisplay('A4'), '#ERROR!');
});

test('loadAll replaces the sheet and recalculates every cell', () => {
  const sheet = sheetOf({ Z9: 'old' });
  const changed = sheet.loadAll({ A1: '2', B1: '=A1*3', C1: '=C1' });
  assert.equal(sheet.getRaw('Z9'), '');
  assert.deepEqual(sheet.getValue('B1'), Value.number(6));
  assert.deepEqual(sheet.getValue('C1'), Value.ERR_CIRC);
  assert.deepEqual(changed.sort(), ['A1', 'B1', 'C1', 'Z9']);
  sheet.setRaw('A1', '4');
  assert.deepEqual(sheet.getValue('B1'), Value.number(12));
});
