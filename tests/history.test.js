const test = require('node:test');
const assert = require('node:assert/strict');
const History = require('../src/history.js');

function step(addr, before, after) {
  return [{ addr: addr, before: before, after: after }];
}

test('undo returns pushed steps in reverse order and redo returns them again', () => {
  const history = History.create();
  const a = step('A1', '', '1');
  const b = step('A2', '', '2');
  const c = step('A3', '', '3');
  history.push(a);
  history.push(b);
  history.push(c);

  assert.equal(history.undo(), c);
  assert.equal(history.undo(), b);
  assert.equal(history.undo(), a);
  assert.equal(history.undo(), null);
  assert.equal(history.canUndo(), false);
  assert.equal(history.canRedo(), true);

  assert.equal(history.redo(), a);
  assert.equal(history.redo(), b);
  assert.equal(history.redo(), c);
  assert.equal(history.redo(), null);
  assert.equal(history.canRedo(), false);
  assert.equal(history.canUndo(), true);
});

test('pushing a new step after undo clears the redo list', () => {
  const history = History.create();
  history.push(step('A1', '', '1'));
  history.push(step('A2', '', '2'));
  history.undo();
  history.push(step('B1', '', 'x'));

  assert.equal(history.canRedo(), false);
  assert.equal(history.redo(), null);
});

test('a step whose before and after are all the same is not pushed', () => {
  const history = History.create();
  const a = step('A1', '', '1');
  history.push(a);
  history.push([{ addr: 'A1', before: '1', after: '1' },
                { addr: 'A2', before: '', after: '' }]);
  history.push([]);

  assert.equal(history.undo(), a);
  assert.equal(history.undo(), null);
});

test('a step with at least one changed cell is pushed', () => {
  const history = History.create();
  const mixed = [{ addr: 'A1', before: '1', after: '1' },
                 { addr: 'A2', before: '', after: '2' }];
  history.push(mixed);

  assert.equal(history.undo(), mixed);
});

test('after 101 pushes undo returns only the last 100 steps', () => {
  const history = History.create();
  const steps = [];
  for (let i = 1; i <= 101; i++) {
    const s = step('A1', String(i - 1), String(i));
    steps.push(s);
    history.push(s);
  }

  for (let i = 101; i >= 2; i--) {
    assert.equal(history.undo(), steps[i - 1]);
  }
  assert.equal(history.undo(), null);
  assert.equal(history.canUndo(), false);
});

test('create takes a smaller limit', () => {
  const history = History.create(2);
  history.push(step('A1', '', '1'));
  history.push(step('A1', '1', '2'));
  history.push(step('A1', '2', '3'));

  assert.notEqual(history.undo(), null);
  assert.notEqual(history.undo(), null);
  assert.equal(history.undo(), null);
});

test('an empty history has nothing to undo or redo', () => {
  const history = History.create();
  assert.equal(history.canUndo(), false);
  assert.equal(history.canRedo(), false);
  assert.equal(history.undo(), null);
  assert.equal(history.redo(), null);
});
