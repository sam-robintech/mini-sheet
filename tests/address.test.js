const test = require('node:test');
const assert = require('node:assert/strict');
const Address = require('../src/address.js');

test('parseRef reads absolute column and row', () => {
  assert.deepEqual(Address.parseRef('$B$3'),
    { col: 1, row: 2, absCol: true, absRow: true, valid: true });
});

test('parseRef reads mixed absolute markers', () => {
  assert.deepEqual(Address.parseRef('$A1'),
    { col: 0, row: 0, absCol: true, absRow: false, valid: true });
  assert.deepEqual(Address.parseRef('A$1'),
    { col: 0, row: 0, absCol: false, absRow: true, valid: true });
});

test('parseRef marks references outside the grid as invalid', () => {
  assert.equal(Address.parseRef('AA1').valid, false);
  assert.equal(Address.parseRef('A101').valid, false);
  assert.equal(Address.parseRef('A0').valid, false);
  assert.equal(Address.parseRef('Z100').valid, true);
});

test('parseRef ignores letter case', () => {
  assert.deepEqual(Address.parseRef('a1'), Address.parseRef('A1'));
  assert.deepEqual(Address.parseRef('$b$3'), Address.parseRef('$B$3'));
});

test('parseRef returns null for text that is not a reference', () => {
  assert.equal(Address.parseRef('1A'), null);
  assert.equal(Address.parseRef(''), null);
  assert.equal(Address.parseRef('A1:B2'), null);
});

test('toAddress builds an upper case address from column and row', () => {
  assert.equal(Address.toAddress(0, 0), 'A1');
  assert.equal(Address.toAddress(25, 99), 'Z100');
});

test('normalize turns a reference into an upper case address without markers', () => {
  assert.equal(Address.normalize('a1'), 'A1');
  assert.equal(Address.normalize('$c$7'), 'C7');
  assert.equal(Address.normalize('AA1'), null);
  assert.equal(Address.normalize('hello'), null);
});

test('parseRange orders corners so B5:A1 becomes A1:B5', () => {
  const range = Address.parseRange('B5:A1');
  assert.deepEqual(range, { top: 0, left: 0, bottom: 4, right: 1, valid: true });
  assert.equal(Address.rangeToString(range), 'A1:B5');
});

test('parseRange reads lower case and absolute corners', () => {
  assert.equal(Address.rangeToString(Address.parseRange('$b$1:a$2')), 'A1:B2');
});

test('parseRange marks a range with an outside corner as invalid', () => {
  assert.equal(Address.parseRange('A1:A101').valid, false);
  assert.equal(Address.parseRange('A1').valid, true);
  assert.equal(Address.parseRange('A1:'), null);
});

test('rangeAddresses lists every address in row order', () => {
  const list = Address.rangeAddresses(Address.parseRange('B5:A1'));
  assert.equal(list.length, 10);
  assert.deepEqual(list.slice(0, 4), ['A1', 'B1', 'A2', 'B2']);
  assert.equal(list[9], 'B5');
});

test('rangeToString shows a single cell range as one address', () => {
  assert.equal(Address.rangeToString(Address.parseRange('C3:C3')), 'C3');
});
