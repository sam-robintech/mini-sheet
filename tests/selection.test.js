const test = require('node:test');
const assert = require('node:assert/strict');
const Selection = require('../src/selection.js');

function at(addr) {
  var col = addr.charCodeAt(0) - 65;
  var row = Number(addr.slice(1)) - 1;
  return { col: col, row: row };
}

test('select makes one cell both active and focus', () => {
  assert.deepEqual(Selection.select(at('B3')), { active: at('B3'), focus: at('B3') });
});

test('the first state has A1 active', () => {
  assert.deepEqual(Selection.create(), { active: at('A1'), focus: at('A1') });
});

test('move from A1 up stays at A1', () => {
  assert.equal(Selection.rangeText(Selection.move(Selection.select(at('A1')), 'up')), 'A1');
});

test('move from A1 left stays at A1', () => {
  assert.equal(Selection.rangeText(Selection.move(Selection.select(at('A1')), 'left')), 'A1');
});

test('move from Z100 down stays at Z100', () => {
  assert.equal(Selection.rangeText(Selection.move(Selection.select(at('Z100')), 'down')), 'Z100');
});

test('move from Z100 right stays at Z100', () => {
  assert.equal(Selection.rangeText(Selection.move(Selection.select(at('Z100')), 'right')), 'Z100');
});

test('move goes one cell in each direction inside the grid', () => {
  var b2 = Selection.select(at('B2'));
  assert.equal(Selection.rangeText(Selection.move(b2, 'up')), 'B1');
  assert.equal(Selection.rangeText(Selection.move(b2, 'down')), 'B3');
  assert.equal(Selection.rangeText(Selection.move(b2, 'left')), 'A2');
  assert.equal(Selection.rangeText(Selection.move(b2, 'right')), 'C2');
});

test('extend right twice and down once from B2 selects B2:D3', () => {
  var state = Selection.select(at('B2'));
  state = Selection.extend(state, 'right');
  state = Selection.extend(state, 'right');
  state = Selection.extend(state, 'down');
  assert.equal(Selection.rangeText(state), 'B2:D3');
  assert.deepEqual(state.active, at('B2'));
});

test('extendTo D3 from B2 selects B2:D3', () => {
  var state = Selection.extendTo(Selection.select(at('B2')), at('D3'));
  assert.equal(Selection.rangeText(state), 'B2:D3');
  assert.deepEqual(state.active, at('B2'));
});

test('extend can shrink the range back toward the active cell', () => {
  var state = Selection.select(at('B2'));
  state = Selection.extend(state, 'right');
  state = Selection.extend(state, 'left');
  assert.equal(Selection.rangeText(state), 'B2');
});

test('extend up and left from B2 gives a normalized range A1:B2', () => {
  var state = Selection.select(at('B2'));
  state = Selection.extend(state, 'up');
  state = Selection.extend(state, 'left');
  assert.equal(Selection.rangeText(state), 'A1:B2');
});

test('extend stops at the grid edge', () => {
  var state = Selection.select(at('Z100'));
  state = Selection.extend(state, 'right');
  state = Selection.extend(state, 'down');
  assert.equal(Selection.rangeText(state), 'Z100');
  state = Selection.extend(Selection.select(at('A1')), 'up');
  state = Selection.extend(state, 'left');
  assert.equal(Selection.rangeText(state), 'A1');
});

test('move collapses a range to the active cell and then moves it', () => {
  var state = Selection.extendTo(Selection.select(at('B2')), at('D3'));
  var moved = Selection.move(state, 'down');
  assert.deepEqual(moved, { active: at('B3'), focus: at('B3') });
  assert.equal(Selection.rangeText(moved), 'B3');
});

test('rangeText of a single cell is a plain address', () => {
  assert.equal(Selection.rangeText(Selection.select(at('A1'))), 'A1');
});

test('range returns the normalized rectangle of the selection', () => {
  var state = Selection.extendTo(Selection.select(at('D3')), at('B2'));
  assert.deepEqual(Selection.range(state), { top: 1, left: 1, bottom: 2, right: 3 });
});

test('functions do not change the state they are given', () => {
  var state = Selection.select(at('B2'));
  Selection.move(state, 'down');
  Selection.extend(state, 'right');
  Selection.extendTo(state, at('D3'));
  assert.deepEqual(state, { active: at('B2'), focus: at('B2') });
});
