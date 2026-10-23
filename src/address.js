var Address = (function () {
  var MAX_COL = 26;
  var MAX_ROW = 100;

  function colToIndex(letters) {
    return letters.toUpperCase().charCodeAt(0) - 65;
  }

  function toAddress(col, row) {
    return String.fromCharCode(65 + col) + (row + 1);
  }

  function parseRef(text) {
    var m = /^(\$?)([A-Za-z]+)(\$?)(\d+)$/.exec(text);
    if (!m) return null;
    var col = m[2].length === 1 ? colToIndex(m[2]) : MAX_COL;
    var row = Number(m[4]) - 1;
    return { col: col, row: row, absCol: m[1] === '$', absRow: m[3] === '$',
             valid: col < MAX_COL && row >= 0 && row < MAX_ROW };
  }

  function normalize(text) {
    var ref = parseRef(text);
    if (!ref || !ref.valid) return null;
    return toAddress(ref.col, ref.row);
  }

  function parseRange(text) {
    var parts = text.split(':');
    if (parts.length > 2) return null;
    var a = parseRef(parts[0]);
    var b = parts.length === 2 ? parseRef(parts[1]) : a;
    if (!a || !b) return null;
    return { top: Math.min(a.row, b.row), left: Math.min(a.col, b.col),
             bottom: Math.max(a.row, b.row), right: Math.max(a.col, b.col),
             valid: a.valid && b.valid };
  }

  function rangeToString(range) {
    var start = toAddress(range.left, range.top);
    var end = toAddress(range.right, range.bottom);
    return start === end ? start : start + ':' + end;
  }

  function rangeAddresses(range) {
    var list = [];
    for (var row = range.top; row <= range.bottom; row++) {
      for (var col = range.left; col <= range.right; col++) {
        list.push(toAddress(col, row));
      }
    }
    return list;
  }

  return { MAX_COL: MAX_COL, MAX_ROW: MAX_ROW, parseRef: parseRef, toAddress: toAddress,
           normalize: normalize, parseRange: parseRange, rangeToString: rangeToString,
           rangeAddresses: rangeAddresses };
})();

if (typeof module !== 'undefined') module.exports = Address;
