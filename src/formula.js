var Formula = (function (Address, Value, Functions) {
  var ERROR_TEXTS = ['#DIV/0!', '#NAME?', '#REF!', '#VALUE!', '#CIRC!', '#ERROR!'];
  var NUMBER_RE = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/;
  var FUNC_RE = /^([A-Za-z][A-Za-z0-9_.]*)\(/;
  var REF_RE = /^\$?[A-Za-z]+\$?\d+/;
  var OP_RE = /^(<=|>=|<>|[-+*\/^&=<>(),:])/;
  var COMPARE_OPS = ['=', '<>', '<', '>', '<=', '>='];

  function SyntaxFail() {}

  function readString(text, start) {
    var out = '';
    var i = start + 1;
    while (i < text.length) {
      if (text.charAt(i) === '"') {
        if (text.charAt(i + 1) !== '"') return { value: out, end: i + 1 };
        out += '"';
        i += 2;
      } else {
        out += text.charAt(i);
        i++;
      }
    }
    throw new SyntaxFail();
  }

  function readError(rest) {
    for (var i = 0; i < ERROR_TEXTS.length; i++) {
      var errText = ERROR_TEXTS[i];
      if (rest.slice(0, errText.length).toUpperCase() === errText) return errText;
    }
    throw new SyntaxFail();
  }

  function tokenize(text) {
    var tokens = [];
    var i = 0;
    while (i < text.length) {
      var ch = text.charAt(i);
      var rest = text.slice(i);
      var m;
      if (/\s/.test(ch)) {
        i++;
      } else if (ch === '"') {
        var str = readString(text, i);
        tokens.push({ type: 'str', value: str.value });
        i = str.end;
      } else if (ch === '#') {
        var errText = readError(rest);
        tokens.push({ type: 'err', value: errText });
        i += errText.length;
      } else if ((m = NUMBER_RE.exec(rest))) {
        tokens.push({ type: 'num', value: Number(m[0]) });
        i += m[0].length;
      } else if ((m = FUNC_RE.exec(rest))) {
        tokens.push({ type: 'func', value: m[1].toUpperCase() });
        i += m[0].length;
      } else if ((m = REF_RE.exec(rest))) {
        tokens.push({ type: 'ref', value: m[0] });
        i += m[0].length;
      } else if ((m = OP_RE.exec(rest))) {
        tokens.push({ type: 'op', value: m[0] });
        i += m[0].length;
      } else {
        throw new SyntaxFail();
      }
    }
    return tokens;
  }

  function Parser(tokens) {
    this.tokens = tokens;
    this.pos = 0;
    this.refs = [];
  }

  Parser.prototype.peekOp = function (ops) {
    var tok = this.tokens[this.pos];
    return tok && tok.type === 'op' && ops.indexOf(tok.value) >= 0 ? tok.value : null;
  };

  Parser.prototype.expectOp = function (op) {
    if (!this.peekOp([op])) throw new SyntaxFail();
    this.pos++;
  };

  Parser.prototype.addRef = function (addr) {
    if (this.refs.indexOf(addr) < 0) this.refs.push(addr);
  };

  Parser.prototype.binaryLevel = function (ops, next) {
    var left = next.call(this);
    var op;
    while ((op = this.peekOp(ops))) {
      this.pos++;
      left = { type: 'binary', op: op, left: left, right: next.call(this) };
    }
    return left;
  };

  Parser.prototype.comparison = function () {
    return this.binaryLevel(COMPARE_OPS, this.concat);
  };

  Parser.prototype.concat = function () {
    return this.binaryLevel(['&'], this.additive);
  };

  Parser.prototype.additive = function () {
    return this.binaryLevel(['+', '-'], this.multiplicative);
  };

  Parser.prototype.multiplicative = function () {
    return this.binaryLevel(['*', '/'], this.power);
  };

  Parser.prototype.power = function () {
    return this.binaryLevel(['^'], this.unary);
  };

  Parser.prototype.unary = function () {
    var op = this.peekOp(['-', '+']);
    if (!op) return this.primary();
    this.pos++;
    return { type: 'unary', op: op, arg: this.unary() };
  };

  Parser.prototype.primary = function () {
    var tok = this.tokens[this.pos];
    if (!tok) throw new SyntaxFail();
    this.pos++;
    if (tok.type === 'num' || tok.type === 'str' || tok.type === 'err') {
      return { type: tok.type, value: tok.value };
    }
    if (tok.type === 'ref') return this.reference(tok.value);
    if (tok.type === 'func') return this.call(tok.value);
    if (tok.type === 'op' && tok.value === '(') {
      var inner = this.comparison();
      this.expectOp(')');
      return inner;
    }
    throw new SyntaxFail();
  };

  Parser.prototype.reference = function (text) {
    if (!this.peekOp([':'])) {
      var ref = Address.parseRef(text);
      var addr = ref.valid ? Address.toAddress(ref.col, ref.row) : null;
      if (addr) this.addRef(addr);
      return { type: 'ref', addr: addr };
    }
    this.pos++;
    var end = this.tokens[this.pos];
    if (!end || end.type !== 'ref') throw new SyntaxFail();
    this.pos++;
    var range = Address.parseRange(text + ':' + end.value);
    if (range.valid) Address.rangeAddresses(range).forEach(this.addRef, this);
    return { type: 'range', range: range };
  };

  Parser.prototype.call = function (name) {
    var args = [];
    if (this.peekOp([')'])) {
      this.pos++;
      return { type: 'call', name: name, args: args };
    }
    args.push(this.comparison());
    while (this.peekOp([','])) {
      this.pos++;
      args.push(this.comparison());
    }
    this.expectOp(')');
    return { type: 'call', name: name, args: args };
  };

  function parse(text) {
    var body = text.charAt(0) === '=' ? text.slice(1) : text;
    try {
      var parser = new Parser(tokenize(body));
      var ast = parser.comparison();
      if (parser.pos !== parser.tokens.length) throw new SyntaxFail();
      return { ast: ast, refs: parser.refs };
    } catch (e) {
      if (e instanceof SyntaxFail) return { error: Value.ERR_SYNTAX.value };
      throw e;
    }
  }

  var KIND_RANK = { number: 0, string: 1, bool: 2 };
  var EMPTY_AS = { number: Value.number(0), string: Value.string(''), bool: Value.bool(false) };

  function compareValues(a, b) {
    if (a.type === 'empty' && b.type === 'empty') return 0;
    if (a.type === 'empty') a = EMPTY_AS[b.type];
    if (b.type === 'empty') b = EMPTY_AS[a.type];
    if (a.type !== b.type) return KIND_RANK[a.type] - KIND_RANK[b.type];
    var x = a.type === 'string' ? a.value.toLowerCase() : a.value;
    var y = b.type === 'string' ? b.value.toLowerCase() : b.value;
    return x < y ? -1 : x > y ? 1 : 0;
  }

  function compare(op, a, b) {
    var c = compareValues(a, b);
    if (op === '=') return c === 0;
    if (op === '<>') return c !== 0;
    if (op === '<') return c < 0;
    if (op === '>') return c > 0;
    if (op === '<=') return c <= 0;
    return c >= 0;
  }

  function arithmetic(op, x, y) {
    if (op === '/' && y === 0) return Value.ERR_DIV0;
    var n;
    if (op === '+') n = x + y;
    else if (op === '-') n = x - y;
    else if (op === '*') n = x * y;
    else if (op === '/') n = x / y;
    else n = Math.pow(x, y);
    return isFinite(n) ? Value.number(n) : Value.ERR_VALUE;
  }

  function evalBinary(node, ctx) {
    var left = evaluate(node.left, ctx);
    if (Value.isError(left)) return left;
    var right = evaluate(node.right, ctx);
    if (Value.isError(right)) return right;
    if (COMPARE_OPS.indexOf(node.op) >= 0) return Value.bool(compare(node.op, left, right));
    if (node.op === '&') {
      var lt = Value.toText(left);
      if (Value.isError(lt)) return lt;
      var rt = Value.toText(right);
      if (Value.isError(rt)) return rt;
      return Value.string(lt.value + rt.value);
    }
    var x = Value.toNumber(left);
    if (Value.isError(x)) return x;
    var y = Value.toNumber(right);
    if (Value.isError(y)) return y;
    return arithmetic(node.op, x.value, y.value);
  }

  function evaluate(node, ctx) {
    if (node.type === 'num') return Value.number(node.value);
    if (node.type === 'str') return Value.string(node.value);
    if (node.type === 'err') return Value.error(node.value);
    if (node.type === 'ref') return node.addr ? ctx.get(node.addr) : Value.ERR_REF;
    if (node.type === 'range') return node.range.valid ? Value.ERR_VALUE : Value.ERR_REF;
    if (node.type === 'unary') {
      var n = Value.toNumber(evaluate(node.arg, ctx));
      if (Value.isError(n)) return n;
      return Value.number(node.op === '-' ? -n.value : n.value);
    }
    if (node.type === 'binary') return evalBinary(node, ctx);
    return evalCall(node, ctx);
  }

  function argKind(arg) {
    return arg.type === 'range' || arg.type === 'ref' ? arg.type : 'value';
  }

  function evalCall(node, ctx) {
    return Functions.call(node.name, node.args.map(argKind), function (i) {
      var arg = node.args[i];
      if (arg.type !== 'range') return evaluate(arg, ctx);
      if (!arg.range.valid) return Value.ERR_REF;
      return Address.rangeAddresses(arg.range).map(function (addr) { return ctx.get(addr); });
    });
  }

  return { parse: parse, evaluate: evaluate };
})(
  typeof module !== 'undefined' ? require('./address.js') : Address,
  typeof module !== 'undefined' ? require('./value.js') : Value,
  typeof module !== 'undefined' ? require('./functions.js') : Functions
);

if (typeof module !== 'undefined') module.exports = Formula;
