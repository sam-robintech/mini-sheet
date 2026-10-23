var Clipboard = (function (Address, Formula) {
  // 고른 범위(top·left·bottom·right)의 원문을 기억한다. 표는 바꾸지 않는다.
  function copy(getRaw, range) {
    var raws = [];
    for (var row = range.top; row <= range.bottom; row++) {
      var line = [];
      for (var col = range.left; col <= range.right; col++) {
        line.push(getRaw(Address.toAddress(col, row)));
      }
      raws.push(line);
    }
    return { rows: raws.length, cols: raws[0].length,
             origin: { col: range.left, row: range.top }, raws: raws };
  }

  // target 칸을 왼쪽 위로 붙일 칸 목록. 표 밖으로 넘치는 칸은 버린다(G13).
  function paste(clip, target) {
    var dCol = target.col - clip.origin.col;
    var dRow = target.row - clip.origin.row;
    var list = [];
    for (var r = 0; r < clip.rows; r++) {
      for (var c = 0; c < clip.cols; c++) {
        var col = target.col + c;
        var row = target.row + r;
        if (col >= Address.MAX_COL || row >= Address.MAX_ROW) continue;
        list.push({ addr: Address.toAddress(col, row),
                    raw: Formula.shift(clip.raws[r][c], dCol, dRow) });
      }
    }
    return list;
  }

  return { copy: copy, paste: paste };
})(
  typeof module !== 'undefined' ? require('./address.js') : Address,
  typeof module !== 'undefined' ? require('./formula.js') : Formula
);

if (typeof module !== 'undefined') module.exports = Clipboard;
