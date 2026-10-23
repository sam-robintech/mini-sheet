var Storage = (function (Address) {
  var KEY = 'mini-sheet:v1';

  function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  // entries 는 [[addr, raw], ...]. 빈 칸은 적지 않는다(G15).
  function save(store, entries) {
    var cells = {};
    entries.forEach(function (entry) {
      if (entry[1] !== '') cells[entry[0]] = entry[1];
    });
    store.setItem(KEY, JSON.stringify({ version: 1, cells: cells }));
  }

  // 읽지 못하면 빈 표. 읽으면 { 대문자 주소: 비지 않은 문자열 } 만 돌려준다(C9 경계 검증).
  function load(store) {
    var data;
    try {
      var text = store.getItem(KEY);
      if (text === null || text === undefined) return {};
      data = JSON.parse(text);
    } catch (e) {
      return {};
    }
    if (!isPlainObject(data) || data.version !== 1 || !isPlainObject(data.cells)) return {};
    var cells = {};
    Object.keys(data.cells).forEach(function (key) {
      var raw = data.cells[key];
      if (typeof raw !== 'string' || raw === '') return;
      if (!/^[A-Za-z]+\d+$/.test(key)) return;
      var addr = Address.normalize(key);
      if (addr) cells[addr] = raw;
    });
    return cells;
  }

  return { KEY: KEY, save: save, load: load };
})(
  typeof module !== 'undefined' ? require('./address.js') : Address
);

if (typeof module !== 'undefined') module.exports = Storage;
