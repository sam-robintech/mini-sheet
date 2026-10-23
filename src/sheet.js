var Sheet = (function (Address, Value, Formula) {
  function sameValue(a, b) {
    return a.type === b.type && a.value === b.value;
  }

  function create() {
    var cells = {};      // 주소 → { raw, ast, refs, constant }
    var values = {};     // 주소 → 칸 값(D3)
    var dependents = {}; // 주소 → 그 주소를 참조하는 주소 목록(역방향 그래프)
    var evalCount = 0;
    var ctx = { get: getValue };

    function getValue(addr) {
      var key = Address.normalize(addr);
      return (key && values[key]) || Value.EMPTY;
    }

    function getRaw(addr) {
      var key = Address.normalize(addr);
      return key && cells[key] ? cells[key].raw : '';
    }

    function getDisplay(addr) {
      return Value.display(getValue(addr));
    }

    function unlink(addr) {
      var cell = cells[addr];
      if (!cell) return;
      cell.refs.forEach(function (ref) {
        var list = dependents[ref];
        list.splice(list.indexOf(addr), 1);
        if (list.length === 0) delete dependents[ref];
      });
    }

    function link(addr, refs) {
      refs.forEach(function (ref) {
        (dependents[ref] = dependents[ref] || []).push(addr);
      });
    }

    function store(addr, raw) {
      unlink(addr);
      delete cells[addr];
      if (raw === '') return;
      var parsed = Value.parseRaw(raw);
      var cell = { raw: raw, ast: null, refs: [], constant: null };
      if (parsed.kind === 'number') cell.constant = Value.number(parsed.value);
      else if (parsed.kind === 'string') cell.constant = Value.string(parsed.value);
      else {
        var result = Formula.parse(raw);
        if (result.error) cell.constant = Value.error(result.error);
        else {
          cell.ast = result.ast;
          cell.refs = result.refs;
        }
      }
      cells[addr] = cell;
      link(addr, cell.refs);
    }

    // 바뀐 칸과 그 칸에 기대는 칸을 역방향 그래프로 모은다.
    function collectAffected(starts) {
      var affected = {};
      var stack = starts.slice();
      while (stack.length) {
        var addr = stack.pop();
        if (affected[addr]) continue;
        affected[addr] = true;
        (dependents[addr] || []).forEach(function (dep) { stack.push(dep); });
      }
      return affected;
    }

    // Tarjan: 기대는 칸(refs)을 간선으로 보면 요소가 계산할 순서대로 나온다.
    function components(affected) {
      var index = {};
      var low = {};
      var onStack = {};
      var stack = [];
      var next = 0;
      var result = [];

      function visit(addr) {
        index[addr] = low[addr] = next++;
        stack.push(addr);
        onStack[addr] = true;
        var refs = cells[addr] ? cells[addr].refs : [];
        refs.forEach(function (ref) {
          if (!affected[ref]) return;
          if (index[ref] === undefined) {
            visit(ref);
            low[addr] = Math.min(low[addr], low[ref]);
          } else if (onStack[ref]) {
            low[addr] = Math.min(low[addr], index[ref]);
          }
        });
        if (low[addr] !== index[addr]) return;
        var group = [];
        var member;
        do {
          member = stack.pop();
          onStack[member] = false;
          group.push(member);
        } while (member !== addr);
        result.push(group);
      }

      Object.keys(affected).forEach(function (addr) {
        if (index[addr] === undefined) visit(addr);
      });
      return result;
    }

    function compute(addr) {
      var cell = cells[addr];
      if (!cell) return Value.EMPTY;
      if (!cell.ast) return cell.constant;
      evalCount++;
      var value = Formula.evaluate(cell.ast, ctx);
      // 빈 칸을 그대로 가리키는 수식은 0 을 보인다(AC11).
      return value.type === 'empty' ? Value.number(0) : value;
    }

    function isCycle(group) {
      if (group.length > 1) return true;
      var cell = cells[group[0]];
      return Boolean(cell) && cell.refs.indexOf(group[0]) >= 0;
    }

    function recalc(starts) {
      var changed = [];
      components(collectAffected(starts)).forEach(function (group) {
        var cycle = isCycle(group);
        group.forEach(function (addr) {
          var old = values[addr] || Value.EMPTY;
          var value = cycle ? Value.ERR_CIRC : compute(addr);
          if (value.type === 'empty') delete values[addr];
          else values[addr] = value;
          if (!sameValue(old, value)) changed.push(addr);
        });
      });
      return changed;
    }

    function setMany(list) {
      var starts = [];
      list.forEach(function (item) {
        var addr = Address.normalize(item.addr);
        if (!addr) return;
        store(addr, item.raw);
        if (starts.indexOf(addr) < 0) starts.push(addr);
      });
      return recalc(starts);
    }

    function setRaw(addr, raw) {
      return setMany([{ addr: addr, raw: raw }]);
    }

    function entries() {
      return Object.keys(cells).map(function (addr) { return [addr, cells[addr].raw]; });
    }

    function loadAll(cellsMap) {
      var list = Object.keys(cells).map(function (addr) { return { addr: addr, raw: '' }; });
      Object.keys(cellsMap).forEach(function (addr) {
        list.push({ addr: addr, raw: cellsMap[addr] });
      });
      return setMany(list);
    }

    return {
      setRaw: setRaw, setMany: setMany, getRaw: getRaw, getValue: getValue,
      getDisplay: getDisplay, entries: entries, loadAll: loadAll,
      get evalCount() { return evalCount; }
    };
  }

  return { create: create };
})(
  typeof module !== 'undefined' ? require('./address.js') : Address,
  typeof module !== 'undefined' ? require('./value.js') : Value,
  typeof module !== 'undefined' ? require('./formula.js') : Formula
);

if (typeof module !== 'undefined') module.exports = Sheet;
