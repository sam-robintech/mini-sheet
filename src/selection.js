var Selection = (function (Address) {
  var STEPS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  function step(cell, dir) {
    var d = STEPS[dir];
    var col = Math.min(Math.max(cell.col + d[0], 0), Address.MAX_COL - 1);
    var row = Math.min(Math.max(cell.row + d[1], 0), Address.MAX_ROW - 1);
    return { col: col, row: row };
  }

  function copy(cell) {
    return { col: cell.col, row: cell.row };
  }

  function select(cell) {
    return { active: copy(cell), focus: copy(cell) };
  }

  function create() {
    return select({ col: 0, row: 0 });
  }

  // 방향키·Enter(down)·Shift+Enter(up)·Tab(right)·Shift+Tab(left): 범위를 접고 옮긴다.
  function move(state, dir) {
    return select(step(state.active, dir));
  }

  // Shift+방향키: 활성 칸은 그대로, focus 만 옮긴다.
  function extend(state, dir) {
    return { active: copy(state.active), focus: step(state.focus, dir) };
  }

  // Shift+클릭
  function extendTo(state, cell) {
    return { active: copy(state.active), focus: copy(cell) };
  }

  function range(state) {
    var a = state.active;
    var f = state.focus;
    return { top: Math.min(a.row, f.row), left: Math.min(a.col, f.col),
             bottom: Math.max(a.row, f.row), right: Math.max(a.col, f.col) };
  }

  function rangeText(state) {
    return Address.rangeToString(range(state));
  }

  return { create: create, select: select, move: move, extend: extend,
           extendTo: extendTo, range: range, rangeText: rangeText };
})(typeof module !== 'undefined' ? require('./address.js') : Address);

if (typeof module !== 'undefined') module.exports = Selection;
