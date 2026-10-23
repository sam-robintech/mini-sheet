var App = (function () {
  var cells = {};
  var active = 'A1';
  var nameBox;
  var formulaInput;
  var editor;

  function buildGrid(table) {
    var thead = document.createElement('thead');
    var headRow = document.createElement('tr');
    var corner = document.createElement('th');
    corner.className = 'corner';
    headRow.appendChild(corner);
    for (var col = 0; col < Address.MAX_COL; col++) {
      var th = document.createElement('th');
      th.setAttribute('data-col', String(col));
      th.textContent = String.fromCharCode(65 + col);
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);

    var tbody = document.createElement('tbody');
    for (var row = 0; row < Address.MAX_ROW; row++) {
      var tr = document.createElement('tr');
      var rowHead = document.createElement('th');
      rowHead.setAttribute('data-row', String(row));
      rowHead.textContent = String(row + 1);
      tr.appendChild(rowHead);
      for (var c = 0; c < Address.MAX_COL; c++) {
        var addr = Address.toAddress(c, row);
        var td = document.createElement('td');
        td.setAttribute('data-cell', addr);
        cells[addr] = td;
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(thead);
    table.appendChild(tbody);
  }

  function showActive() {
    cells[active].classList.add('active');
    nameBox.textContent = active;
    formulaInput.value = '';
    editor.value = '';
    editor.focus();
  }

  function start() {
    nameBox = document.getElementById('name-box');
    formulaInput = document.getElementById('formula-input');
    editor = document.getElementById('cell-editor');
    buildGrid(document.getElementById('grid'));
    showActive();
  }

  return { start: start };
})();

App.start();
