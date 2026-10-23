const test = require('node:test');
const assert = require('node:assert/strict');
const Storage = require('../src/storage.js');

function fakeStore(initial) {
  const data = Object.assign({}, initial);
  return {
    data: data,
    getItem: function (key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
    setItem: function (key, value) { data[key] = String(value); }
  };
}

test('save writes the version 1 format under mini-sheet:v1 and load reads the same raw map', () => {
  const store = fakeStore();
  Storage.save(store, [['A1', '1'], ['B1', '=A1*2']]);
  assert.equal(store.data['mini-sheet:v1'], '{"version":1,"cells":{"A1":"1","B1":"=A1*2"}}');
  assert.deepEqual(Storage.load(store), { A1: '1', B1: '=A1*2' });
});

test('save leaves out empty cells', () => {
  const store = fakeStore();
  Storage.save(store, [['A1', ''], ['B2', 'x']]);
  assert.equal(store.data['mini-sheet:v1'], '{"version":1,"cells":{"B2":"x"}}');
});

test('load returns an empty map when the stored value cannot be read', () => {
  const key = 'mini-sheet:v1';
  assert.deepEqual(Storage.load(fakeStore()), {});
  assert.deepEqual(Storage.load(fakeStore({ [key]: '{broken' })), {});
  assert.deepEqual(Storage.load({ getItem: function () { throw new Error('denied'); } }), {});
  assert.deepEqual(Storage.load(fakeStore({ [key]: '{"version":2,"cells":{"A1":"1"}}' })), {});
  assert.deepEqual(Storage.load(fakeStore({ [key]: '{"cells":{"A1":"1"}}' })), {});
  assert.deepEqual(Storage.load(fakeStore({ [key]: '{"version":1,"cells":["1"]}' })), {});
  assert.deepEqual(Storage.load(fakeStore({ [key]: '{"version":1,"cells":null}' })), {});
  assert.deepEqual(Storage.load(fakeStore({ [key]: '{"version":1}' })), {});
  assert.deepEqual(Storage.load(fakeStore({ [key]: 'null' })), {});
  assert.deepEqual(Storage.load(fakeStore({ [key]: '[1]' })), {});
  assert.deepEqual(Storage.load(fakeStore({ [key]: '"text"' })), {});
});

test('load drops non-string values, empty strings and keys outside the grid and uppercases addresses', () => {
  const stored = JSON.stringify({
    version: 1,
    cells: { a1: 'low', B2: 5, C3: '', AA1: 'x', A101: 'y', foo: 'z', '$A$2': 'w', D4: null, E5: '=1+1' }
  });
  const store = fakeStore({ 'mini-sheet:v1': stored });
  assert.deepEqual(Storage.load(store), { A1: 'low', E5: '=1+1' });
});
