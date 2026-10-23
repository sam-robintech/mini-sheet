var App = (function () {
  var cells = {};
  var sheet = Sheet.create();
  var selection = Selection.create();
  var editing = false;
  var shown = null;
  var wrap;
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

  function activeAddr() {
    return Address.toAddress(selection.active.col, selection.active.row);
  }

  // 바뀐 칸만 글자와 정렬 클래스를 고친다(D13).
  function renderCell(addr) {
    var td = cells[addr];
    var value = sheet.getValue(addr);
    td.textContent = sheet.getDisplay(addr);
    td.classList.remove('right', 'left');
    if (value.type !== 'empty') td.classList.add(Value.align(value));
  }

  function placeEditor() {
    var td = cells[activeAddr()];
    var wrapRect = wrap.getBoundingClientRect();
    var rect = td.getBoundingClientRect();
    editor.style.left = (rect.left - wrapRect.left + wrap.scrollLeft) + 'px';
    editor.style.top = (rect.top - wrapRect.top + wrap.scrollTop) + 'px';
    // 숨긴 상자도 칸 크기로 둔다. 너무 좁은 상자는 insertText 뒤 커서가 맨 앞에 남는다.
    editor.style.width = rect.width + 'px';
    editor.style.height = rect.height + 'px';
  }

  function showActive() {
    var addr = activeAddr();
    if (shown) cells[shown].classList.remove('active');
    cells[addr].classList.add('active');
    shown = addr;
    nameBox.textContent = Selection.rangeText(selection);
    formulaInput.value = sheet.getRaw(addr);
    placeEditor();
    cells[addr].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    editor.focus({ preventScroll: true });
  }

  function startEdit() {
    editing = true;
    editor.classList.add('editing');
    placeEditor();
  }

  function endEdit() {
    editing = false;
    editor.classList.remove('editing');
    editor.value = '';
  }

  // 더블클릭·F2 는 기존 원문을 채우고 커서를 끝에 둔다(D13).
  function openEdit() {
    var raw = sheet.getRaw(activeAddr());
    editor.value = raw;
    startEdit();
    editor.focus({ preventScroll: true });
    editor.setSelectionRange(raw.length, raw.length);
  }

  // 편집 상자와 수식 입력줄이 함께 타는 확정 경로.
  function commitRaw(raw) {
    var addr = activeAddr();
    var changed = sheet.setRaw(addr, raw);
    endEdit();
    if (changed.indexOf(addr) < 0) changed.push(addr);
    changed.forEach(renderCell);
  }

  function commit() {
    commitRaw(editor.value);
  }

  function onEditorInput() {
    if (!editing) startEdit();
  }

  function onEditorKeydown(event) {
    if (event.isComposing) return;
    if (!editing) {
      if (event.key === 'F2') {
        event.preventDefault();
        openEdit();
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      endEdit();
      return;
    }
    var dir = null;
    if (event.key === 'Enter') dir = event.shiftKey ? 'up' : 'down';
    else if (event.key === 'Tab') dir = event.shiftKey ? 'left' : 'right';
    if (!dir) return;
    event.preventDefault();
    commit();
    selection = Selection.move(selection, dir);
    showActive();
  }

  function onGridMousedown(event) {
    var td = event.target.closest('td[data-cell]');
    if (!td) return;
    event.preventDefault();
    if (editing) commit();
    var ref = Address.parseRef(td.getAttribute('data-cell'));
    selection = Selection.select({ col: ref.col, row: ref.row });
    showActive();
  }

  function onGridDblclick(event) {
    if (!event.target.closest('td[data-cell]')) return;
    openEdit();
  }

  // 수식 입력줄의 Enter 는 같은 확정 경로, Esc 는 취소다(G12).
  function onFormulaKeydown(event) {
    if (event.isComposing) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      commitRaw(formulaInput.value);
      showActive();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      showActive();
    }
  }

  function start() {
    wrap = document.getElementById('grid-wrap');
    nameBox = document.getElementById('name-box');
    formulaInput = document.getElementById('formula-input');
    editor = document.getElementById('cell-editor');
    var table = document.getElementById('grid');
    buildGrid(table);
    table.addEventListener('mousedown', onGridMousedown);
    table.addEventListener('dblclick', onGridDblclick);
    formulaInput.addEventListener('keydown', onFormulaKeydown);
    editor.addEventListener('compositionstart', onEditorInput);
    editor.addEventListener('input', onEditorInput);
    editor.addEventListener('keydown', onEditorKeydown);
    editor.value = '';
    showActive();
  }

  return { start: start };
})();

App.start();
