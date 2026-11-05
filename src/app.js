var App = (function () {
  var cells = {};
  var sheet = Sheet.create();
  var selection = Selection.create();
  var history = History.create();
  var editing = false;
  var shown = null;
  var selected = [];
  var clip = null;
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
    td.classList.toggle('negative', Value.isNegative(value));
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

  // 고른 범위 칸에 .selected 를 붙인다.
  function showSelected() {
    selected.forEach(function (addr) { cells[addr].classList.remove('selected'); });
    var r = Selection.range(selection);
    selected = [];
    for (var row = r.top; row <= r.bottom; row++) {
      for (var col = r.left; col <= r.right; col++) {
        var addr = Address.toAddress(col, row);
        cells[addr].classList.add('selected');
        selected.push(addr);
      }
    }
  }

  function showActive() {
    var addr = activeAddr();
    if (shown) cells[shown].classList.remove('active');
    cells[addr].classList.add('active');
    shown = addr;
    showSelected();
    nameBox.textContent = Selection.rangeText(selection);
    formulaInput.value = sheet.getRaw(addr);
    placeEditor();
    var focus = Address.toAddress(selection.focus.col, selection.focus.row);
    cells[focus].scrollIntoView({ block: 'nearest', inline: 'nearest' });
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

  // 원문을 바꾸는 단 하나의 길. 바뀐 칸을 다시 그리고 [{ addr, before, after }] 를 돌려준다(D11).
  function applyRaws(list) {
    var step = list.map(function (item) {
      return { addr: item.addr, before: sheet.getRaw(item.addr) };
    });
    var changed = sheet.setMany(list);
    step.forEach(function (item) {
      item.after = sheet.getRaw(item.addr);
      if (changed.indexOf(item.addr) < 0) changed.push(item.addr);
    });
    changed.forEach(renderCell);
    Storage.save(localStorage, sheet.entries());
    return step;
  }

  // 확정 한 번·지우기 한 번·붙여 넣기 한 번이 되돌리기 한 단계다.
  function change(list) {
    history.push(applyRaws(list));
  }

  // 되돌리기는 before 를, 다시 하기는 after 를 넣는다.
  function replay(step, side) {
    if (!step) return;
    applyRaws(step.map(function (item) { return { addr: item.addr, raw: item[side] }; }));
    showActive();
  }

  // 편집 상자와 수식 입력줄이 함께 타는 확정 경로.
  function commitRaw(raw) {
    var addr = activeAddr();
    endEdit();
    change([{ addr: addr, raw: raw }]);
  }

  function commit() {
    commitRaw(editor.value);
  }

  // 고른 범위의 모든 칸을 한 번에 비운다(AC8).
  function clearRange() {
    var list = Address.rangeAddresses(Selection.range(selection)).map(function (addr) {
      return { addr: addr, raw: '' };
    });
    change(list);
    showActive();
  }

  // 페이지 안 클립보드에 고른 범위의 원문을 기억한다(G13). 운영체제 클립보드는 쓰지 않는다.
  function copyRange() {
    clip = Clipboard.copy(sheet.getRaw, Selection.range(selection));
  }

  // 활성 칸을 왼쪽 위로 붙인다. 표 밖으로 넘치는 칸은 Clipboard 가 버린다.
  function pasteClip() {
    if (!clip) return;
    change(Clipboard.paste(clip, selection.active));
    showActive();
  }

  // 한글 자판에서도 Ctrl/Cmd+C·V·Z·Y 를 잡도록 key 와 code 를 함께 본다.
  function shortcut(event) {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return null;
    var key = event.key.toLowerCase();
    var isZ = key === 'z' || event.code === 'KeyZ';
    if (event.shiftKey) return isZ ? 'redo' : null;
    if (key === 'c' || event.code === 'KeyC') return 'copy';
    if (key === 'v' || event.code === 'KeyV') return 'paste';
    if (isZ) return 'undo';
    if (key === 'y' || event.code === 'KeyY') return 'redo';
    return null;
  }

  function onEditorInput() {
    if (!editing) startEdit();
  }

  var ARROWS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

  // 고친 상태가 아닐 때 방향키·Enter·Tab 은 move, Shift+방향키는 extend(D13, R5).
  function onIdleKeydown(event) {
    if (event.key === 'F2') {
      event.preventDefault();
      openEdit();
      return;
    }
    if ((event.key === 'Delete' || event.key === 'Backspace') &&
        !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      clearRange();
      return;
    }
    var action = shortcut(event);
    if (action) {
      event.preventDefault();
      if (action === 'copy') copyRange();
      else if (action === 'paste') pasteClip();
      else if (action === 'undo') replay(history.undo(), 'before');
      else replay(history.redo(), 'after');
      return;
    }
    var arrow = ARROWS[event.key];
    var dir = arrow || null;
    if (event.key === 'Enter') dir = event.shiftKey ? 'up' : 'down';
    else if (event.key === 'Tab') dir = event.shiftKey ? 'left' : 'right';
    if (!dir || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    selection = arrow && event.shiftKey ? Selection.extend(selection, dir) : Selection.move(selection, dir);
    showActive();
  }

  function onEditorKeydown(event) {
    if (event.isComposing) return;
    if (!editing) {
      onIdleKeydown(event);
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
    var cell = { col: ref.col, row: ref.row };
    selection = event.shiftKey ? Selection.extendTo(selection, cell) : Selection.select(cell);
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

  // 보이는 값으로 CSV 를 만들어 sheet.csv 로 내려받는다(D14).
  function downloadCsv() {
    var map = {};
    sheet.entries().forEach(function (entry) {
      map[entry[0]] = sheet.getDisplay(entry[0]);
    });
    var blob = new Blob([Csv.build(map)], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'sheet.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
    editor.focus({ preventScroll: true });
  }

  function start() {
    wrap = document.getElementById('grid-wrap');
    nameBox = document.getElementById('name-box');
    formulaInput = document.getElementById('formula-input');
    editor = document.getElementById('cell-editor');
    var table = document.getElementById('grid');
    buildGrid(table);
    // 저장한 원문을 넣고 전체를 다시 계산해 그린다. 읽지 못하면 빈 표다(D14).
    var saved = Storage.load(localStorage);
    sheet.loadAll(saved).concat(Object.keys(saved)).forEach(renderCell);
    table.addEventListener('mousedown', onGridMousedown);
    table.addEventListener('dblclick', onGridDblclick);
    formulaInput.addEventListener('keydown', onFormulaKeydown);
    editor.addEventListener('compositionstart', onEditorInput);
    editor.addEventListener('input', onEditorInput);
    editor.addEventListener('keydown', onEditorKeydown);
    document.getElementById('download-csv').addEventListener('click', downloadCsv);
    editor.value = '';
    showActive();
  }

  return { start: start };
})();

App.start();
