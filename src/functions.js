var Functions = (function (Value) {
  // 범위·참조 인자의 숫자만 모은다. 직접 준 값은 숫자로 바꾼다(G8, D8).
  function collectNumbers(kinds, evalArg) {
    var nums = [];
    for (var i = 0; i < kinds.length; i++) {
      var arg = evalArg(i);
      if (kinds[i] === 'value') {
        var n = Value.toNumber(arg);
        if (Value.isError(n)) return n;
        nums.push(n.value);
        continue;
      }
      var cells = Array.isArray(arg) ? arg : [arg];
      for (var j = 0; j < cells.length; j++) {
        if (Value.isError(cells[j])) return cells[j];
        if (cells[j].type === 'number') nums.push(cells[j].value);
      }
    }
    return nums;
  }

  function single(arg) {
    return Array.isArray(arg) ? Value.ERR_VALUE : arg;
  }

  function numberArg(evalArg, i) {
    return Value.toNumber(single(evalArg(i)));
  }

  function aggregate(fold) {
    return function (kinds, evalArg) {
      var nums = collectNumbers(kinds, evalArg);
      return Array.isArray(nums) ? fold(nums) : nums;
    };
  }

  function sum(nums) {
    return nums.reduce(function (a, b) { return a + b; }, 0);
  }

  function round(kinds, evalArg) {
    var x = numberArg(evalArg, 0);
    if (Value.isError(x)) return x;
    var d = numberArg(evalArg, 1);
    if (Value.isError(d)) return d;
    var scale = Math.pow(10, Math.trunc(d.value));
    var y = Number((x.value * scale).toPrecision(15));
    var sign = y < 0 ? -1 : 1;
    return Value.number(sign * Math.floor(Math.abs(y) + 0.5) / scale);
  }

  function abs(kinds, evalArg) {
    var x = numberArg(evalArg, 0);
    return Value.isError(x) ? x : Value.number(Math.abs(x.value));
  }

  function condition(v) {
    if (Value.isError(v)) return v;
    if (v.type === 'string') return Value.ERR_VALUE;
    if (v.type === 'empty') return false;
    return v.value !== 0 && v.value !== false;
  }

  function ifFn(kinds, evalArg) {
    var cond = condition(single(evalArg(0)));
    if (typeof cond !== 'boolean') return cond;
    if (cond) return single(evalArg(1));
    return kinds.length > 2 ? single(evalArg(2)) : Value.bool(false);
  }

  var TABLE = {
    SUM: { min: 1, max: Infinity, run: aggregate(function (nums) { return Value.number(sum(nums)); }) },
    AVERAGE: { min: 1, max: Infinity, run: aggregate(function (nums) {
      return nums.length ? Value.number(sum(nums) / nums.length) : Value.ERR_DIV0;
    }) },
    MIN: { min: 1, max: Infinity, run: aggregate(function (nums) {
      return Value.number(nums.length ? Math.min.apply(null, nums) : 0);
    }) },
    MAX: { min: 1, max: Infinity, run: aggregate(function (nums) {
      return Value.number(nums.length ? Math.max.apply(null, nums) : 0);
    }) },
    COUNT: { min: 1, max: Infinity, run: aggregate(function (nums) { return Value.number(nums.length); }) },
    IF: { min: 2, max: 3, run: ifFn },
    ROUND: { min: 2, max: 2, run: round },
    ABS: { min: 1, max: 1, run: abs }
  };

  function call(name, kinds, evalArg) {
    var fn = TABLE[name.toUpperCase()];
    if (!fn) return Value.ERR_NAME;
    if (kinds.length < fn.min || kinds.length > fn.max) return Value.ERR_VALUE;
    return fn.run(kinds, evalArg);
  }

  return { call: call };
})(typeof module !== 'undefined' ? require('./value.js') : Value);

if (typeof module !== 'undefined') module.exports = Functions;
