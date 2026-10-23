var Value = (function () {
  var NUMBER_RE = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

  function error(text) {
    return { type: 'error', value: text };
  }

  var EMPTY = { type: 'empty' };

  function number(n) {
    return { type: 'number', value: n };
  }

  function string(s) {
    return { type: 'string', value: s };
  }

  function bool(b) {
    return { type: 'bool', value: b };
  }

  function isError(v) {
    return v.type === 'error';
  }

  function parseRaw(raw) {
    if (raw === '') return { kind: 'empty', value: '' };
    if (raw.charAt(0) === '=') return { kind: 'formula', value: raw };
    var trimmed = raw.trim();
    if (NUMBER_RE.test(trimmed)) return { kind: 'number', value: Number(trimmed) };
    return { kind: 'string', value: raw };
  }

  function display(v) {
    if (v.type === 'number') return String(Number(v.value.toPrecision(15)));
    if (v.type === 'bool') return v.value ? 'TRUE' : 'FALSE';
    if (v.type === 'empty') return '';
    return v.value;
  }

  function toNumber(v) {
    if (v.type === 'number' || v.type === 'error') return v;
    if (v.type === 'empty') return number(0);
    if (v.type === 'bool') return number(v.value ? 1 : 0);
    return ERR_VALUE;
  }

  function toText(v) {
    if (v.type === 'string' || v.type === 'error') return v;
    return string(display(v));
  }

  function align(v) {
    return v.type === 'number' ? 'right' : 'left';
  }

  var ERR_DIV0 = error('#DIV/0!');
  var ERR_NAME = error('#NAME?');
  var ERR_REF = error('#REF!');
  var ERR_VALUE = error('#VALUE!');
  var ERR_CIRC = error('#CIRC!');
  var ERR_SYNTAX = error('#ERROR!');

  return { EMPTY: EMPTY, ERR_DIV0: ERR_DIV0, ERR_NAME: ERR_NAME, ERR_REF: ERR_REF,
           ERR_VALUE: ERR_VALUE, ERR_CIRC: ERR_CIRC, ERR_SYNTAX: ERR_SYNTAX,
           number: number, string: string, bool: bool, error: error, isError: isError,
           parseRaw: parseRaw, display: display, toNumber: toNumber, toText: toText,
           align: align };
})();

if (typeof module !== 'undefined') module.exports = Value;
