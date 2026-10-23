var History = (function () {
  // 단계는 [{ addr, before, after }]. 바뀐 칸이 하나도 없으면 단계가 아니다.
  function changes(step) {
    for (var i = 0; i < step.length; i++) {
      if (step[i].before !== step[i].after) return true;
    }
    return false;
  }

  // 되돌리기 기록. 가장 오래된 단계부터 버려 limit 단계까지만 둔다(G14).
  function create(limit) {
    if (limit === undefined) limit = 100;
    var done = [];
    var undone = [];

    function push(step) {
      if (!changes(step)) return;
      done.push(step);
      if (done.length > limit) done.shift();
      undone = [];
    }

    function undo() {
      if (done.length === 0) return null;
      var step = done.pop();
      undone.push(step);
      return step;
    }

    function redo() {
      if (undone.length === 0) return null;
      var step = undone.pop();
      done.push(step);
      return step;
    }

    return {
      push: push,
      undo: undo,
      redo: redo,
      canUndo: function () { return done.length > 0; },
      canRedo: function () { return undone.length > 0; }
    };
  }

  return { create: create };
})();

if (typeof module !== 'undefined') module.exports = History;
