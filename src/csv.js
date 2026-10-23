var Csv = (function (Address) {
  var BOM = '﻿';

  // 쉼표·큰따옴표·줄바꿈이 든 값만 큰따옴표로 감싸고 안의 큰따옴표는 두 번 쓴다(G16).
  function quote(text) {
    if (!/[",\r\n]/.test(text)) return text;
    return '"' + text.replace(/"/g, '""') + '"';
  }

  // map 은 { 주소: 보이는 글자 }. A1 부터 값이 있는 마지막 행·열까지 쓴다.
  function build(map) {
    var cells = {};
    var lastCol = -1;
    var lastRow = -1;
    Object.keys(map).forEach(function (key) {
      var text = map[key];
      if (text === '') return;
      var ref = Address.parseRef(key);
      if (!ref || !ref.valid) return;
      cells[Address.toAddress(ref.col, ref.row)] = text;
      if (ref.col > lastCol) lastCol = ref.col;
      if (ref.row > lastRow) lastRow = ref.row;
    });
    var lines = [];
    for (var row = 0; row <= lastRow; row++) {
      var fields = [];
      for (var col = 0; col <= lastCol; col++) {
        var addr = Address.toAddress(col, row);
        fields.push(cells[addr] === undefined ? '' : quote(cells[addr]));
      }
      lines.push(fields.join(',') + '\r\n');
    }
    return BOM + lines.join('');
  }

  return { BOM: BOM, build: build };
})(
  typeof module !== 'undefined' ? require('./address.js') : Address
);

if (typeof module !== 'undefined') module.exports = Csv;
