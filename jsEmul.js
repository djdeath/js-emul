// This file was generated using Gnometa
// https://github.com/djdeath/gnometa
/*
  new syntax:
    #foo and `foo	match the string object 'foo' (it's also accepted in my JS)
    'abc'		match the string object 'abc'
    'c'			match the string object 'c'
    ``abc''		match the sequence of string objects 'a', 'b', 'c'
    "abc"		token('abc')
    [1 2 3]		match the array object [1, 2, 3]
    foo(bar)		apply rule foo with argument bar
    -> ...		semantic actions written in JS (see OMetaParser's atomicHostExpr rule)
*/

/*
var M = ometa {
  number = number:n digit:d -> { n * 10 + d.digitValue() }
         | digit:d          -> { d.digitValue() }
};

translates to...

var M = objectThatDelegatesTo(OMeta, {
  number: function() {
            return this._or(function() {
                              var n = this._apply("number"),
                                  d = this._apply("digit");
                              return n * 10 + d.digitValue();
                            },
                            function() {
                              var d = this._apply("digit");
                              return d.digitValue();
                            }
                           );
          }
});
M.matchAll("123456789", "number");
*/

// try to use StringBuffer instead of string concatenation to improve performance

let StringBuffer = function() {
  this.strings = [];
  for (var idx = 0; idx < arguments.length; idx++)
    this.nextPutAll(arguments[idx]);
};
StringBuffer.prototype.nextPutAll = function(s) { this.strings.push(s); };
StringBuffer.prototype.contents   = function()  { return this.strings.join(""); };
String.prototype.writeStream      = function() { return new StringBuffer(this); };

// make Arrays print themselves sensibly

let printOn = function(x, ws) {
  if (x === undefined || x === null)
    ws.nextPutAll("" + x);
  else if (x.constructor === Array) {
    ws.nextPutAll("[");
    for (var idx = 0; idx < x.length; idx++) {
      if (idx > 0)
        ws.nextPutAll(", ");
      printOn(x[idx], ws);
    }
    ws.nextPutAll("]");
  } else
    ws.nextPutAll(x.toString());
};

Array.prototype.toString = function() {
  var ws = "".writeStream();
  printOn(this, ws);
  return ws.contents();
};

// delegation

let objectThatDelegatesTo = function(x, props) {
  var f = function() { };
  f.prototype = x;
  var r = new f();
  for (var p in props)
    if (props.hasOwnProperty(p))
      r[p] = props[p];
  return r;
};

// some reflective stuff

let ownPropertyNames = function(x) {
  var r = [];
  for (var name in x)
    if (x.hasOwnProperty(name))
      r.push(name);
  return r;
};

let isImmutable = function(x) {
   return (x === null ||
           x === undefined ||
           typeof x === "boolean" ||
           typeof x === "number" ||
           typeof x === "string");
};

String.prototype.digitValue  = function() {
  return this.charCodeAt(0) - "0".charCodeAt(0);
};

let isSequenceable = function(x) {
  return (typeof x == "string" || x.constructor === Array);
};

// some functional programming stuff

Array.prototype.delimWith = function(d) {
  return this.reduce(
    function(xs, x) {
      if (xs.length > 0)
        xs.push(d);
      xs.push(x);
      return xs;
    },
    []);
};

// escape characters

String.prototype.pad = function(s, len) {
  var r = this;
  while (r.length < len)
    r = s + r;
  return r;
};

let escapeStringFor = {};
for (var c = 0; c < 128; c++)
  escapeStringFor[c] = String.fromCharCode(c);
escapeStringFor["'".charCodeAt(0)]  = "\\'";
escapeStringFor['"'.charCodeAt(0)]  = '\\"';
escapeStringFor["\\".charCodeAt(0)] = "\\\\";
escapeStringFor["\b".charCodeAt(0)] = "\\b";
escapeStringFor["\f".charCodeAt(0)] = "\\f";
escapeStringFor["\n".charCodeAt(0)] = "\\n";
escapeStringFor["\r".charCodeAt(0)] = "\\r";
escapeStringFor["\t".charCodeAt(0)] = "\\t";
escapeStringFor["\v".charCodeAt(0)] = "\\v";
let escapeChar = function(c) {
  var charCode = c.charCodeAt(0);
  if (charCode < 128)
    return escapeStringFor[charCode];
  else if (128 <= charCode && charCode < 256)
    return "\\x" + charCode.toString(16).pad("0", 2);
  else
    return "\\u" + charCode.toString(16).pad("0", 4);
};

let unescape = function(s) {
  if (s.charAt(0) == '\\')
    switch (s.charAt(1)) {
    case "'":  return "'";
    case '"':  return '"';
    case '\\': return '\\';
    case 'b':  return '\b';
    case 'f':  return '\f';
    case 'n':  return '\n';
    case 'r':  return '\r';
    case 't':  return '\t';
    case 'v':  return '\v';
    case 'x':  return String.fromCharCode(parseInt(s.substring(2, 4), 16));
    case 'u':  return String.fromCharCode(parseInt(s.substring(2, 6), 16));
    default:   return s.charAt(1);
    }
  else
    return s;
};

String.prototype.toProgramString = function() {
  var ws = '"'.writeStream();
  for (var idx = 0; idx < this.length; idx++)
    ws.nextPutAll(escapeChar(this.charAt(idx)));
  ws.nextPutAll('"');
  return ws.contents();
};

// unique tags for objects (useful for making "hash tables")

let getTag = (function() {
  var numIdx = 0;
  return function(x) {
    if (x === null || x === undefined)
      return x;
    switch (typeof x) {
    case "boolean": return x == true ? "Btrue" : "Bfalse";
    case "string":  return "S" + x;
    case "number":  return "N" + x;
    default:        return x.hasOwnProperty("_id_") ? x._id_ : x._id_ = "R" + numIdx++;
    }
  };
})();


// the failure exception
if (!window._OMetafail) {
  window._OMetafail = new Error('match failed');
  window._OMetafail.toString = function() { return "match failed"; };
}
let fail = window._OMetafail;

// streams and memoization

let OMInputStream = function(hd, tl) {
  this.memo = { };
  this.lst  = tl.lst;
  this.idx  = tl.idx;
  this.hd   = hd;
  this.tl   = tl;
};
OMInputStream.prototype.head = function() { return this.hd; };
OMInputStream.prototype.tail = function() { return this.tl; };
OMInputStream.prototype.type = function() { return this.lst.constructor; };
OMInputStream.prototype.upTo = function(that) {
  var r = [], curr = this;
  while (curr != that) {
    r.push(curr.head());
    curr = curr.tail();
  }
  return this.type() == String ? r.join('') : r;
};

let OMInputStreamEnd = function(lst, idx) {
  this.memo = { };
  this.lst = lst;
  this.idx = idx;
};
OMInputStreamEnd.prototype = objectThatDelegatesTo(OMInputStream.prototype);
OMInputStreamEnd.prototype.head = function() { throw fail; };
OMInputStreamEnd.prototype.tail = function() { throw fail; };

// This is necessary b/c in IE, you can't say "foo"[idx]
Array.prototype.at  = function(idx) { return this[idx]; };
String.prototype.at = String.prototype.charAt;

let ListOMInputStream = function(lst, idx) {
  this.memo = { };
  this.lst  = lst;
  this.idx  = idx;
  this.hd   = lst.at(idx);
};
ListOMInputStream.prototype = objectThatDelegatesTo(OMInputStream.prototype);
ListOMInputStream.prototype.head = function() { return this.hd; };
ListOMInputStream.prototype.tail = function() {
  return this.tl || (this.tl = makeListOMInputStream(this.lst, this.idx + 1));
};

let makeListOMInputStream = function(lst, idx) {
  return new (idx < lst.length ? ListOMInputStream : OMInputStreamEnd)(lst, idx);
};

Array.prototype.toOMInputStream  = function() {
  return makeListOMInputStream(this, 0);
}
String.prototype.toOMInputStream = function() {
  return makeListOMInputStream(this, 0);
}

let makeOMInputStreamProxy = function(target) {
  return objectThatDelegatesTo(target, {
    memo:   { },
    target: target,
    tl: undefined,
    tail:   function() {
      return this.tl || (this.tl = makeOMInputStreamProxy(target.tail()));
    }
  });
}

// Failer (i.e., that which makes things fail) is used to detect (direct) left recursion and memoize failures

let Failer = function() { }
Failer.prototype.used = false;

// Source map helpers

let _sourceMap;
let resetSourceMap = function() { _sourceMap = { filenames: [], map: [], }; };
let startFileSourceMap = function(filename) { _sourceMap.filenames.push(filename); };
let addToSourseMap = function(id, start, stop) {
  _sourceMap.map[id] = [ _sourceMap.filenames.length - 1, start, stop ];
};
let createSourceMapId = function() { return _sourceMap.map.length; };
let getSourceMap = function() { return _sourceMap; };
resetSourceMap();

// the OMeta "class" and basic functionality

let OMeta = {
  _extractLocation: function(retVal) {
    return { start: retVal.start,
             stop: this.input.idx, };
  },
  _startStructure: function(id, rule) {
    return {
      rule: rule,
      id: id,
      start: this.input.idx,
      stop: null,
      children: [],
      value: null,
    };
  },
  _appendStructure: function(structure, child, id) {
    if (!child.call)
      child.call = id;
    structure.children.push(child);
    return (structure.value = child.value);
  },
  _getStructureValue: function(structure) {
    return structure.value;
  },
  _endStructure: function(structure) {
    structure.stop = this.input.idx;
    return structure;
  },
  _forwardStructure: function(structure, id) {
    structure.call = id;
    return structure;
  },

  _apply: function(rule) {
    var memoRec = this.input.memo[rule];
    if (memoRec == undefined) {
      var origInput = this.input,
          failer    = new Failer();
      if (this[rule] === undefined)
        throw new Error('tried to apply undefined rule "' + rule + '"');
      this.input.memo[rule] = failer;
      this.input.memo[rule] = memoRec = {ans: this[rule].call(this),
                                         nextInput: this.input };
      if (failer.used) {
        var sentinel = this.input;
        while (true) {
          try {
            this.input = origInput;
            var ans = this[rule].call(this);
            if (this.input == sentinel)
              throw fail;
            memoRec.ans       = ans;
            memoRec.nextInput = this.input;
          } catch (f) {
            if (f != fail)
              throw f;
            break;
          }
        }
      }
    } else if (memoRec instanceof Failer) {
      memoRec.used = true;
      throw fail;
    }

    this.input = memoRec.nextInput;
    return memoRec.ans;
  },

  // note: _applyWithArgs and _superApplyWithArgs are not memoized, so they can't be left-recursive
  _applyWithArgs: function(rule) {
    var ruleFn = this[rule];
    var ruleFnArity = ruleFn.length;
    for (var idx = arguments.length - 1; idx >= ruleFnArity + 1; idx--) // prepend "extra" arguments in reverse order
      this._prependInput(arguments[idx]);
    return ruleFnArity == 0 ?
      ruleFn.call(this) :
      ruleFn.apply(this, Array.prototype.slice.call(arguments, 1, ruleFnArity + 1));
  },
  _superApplyWithArgs: function(recv, rule) {
    var ruleFn = this[rule];
    var ruleFnArity = ruleFn.length;
    for (var idx = arguments.length - 1; idx >= ruleFnArity + 2; idx--) // prepend "extra" arguments in reverse order
      recv._prependInput(arguments[idx]);
    return ruleFnArity == 0 ?
      ruleFn.call(recv) :
      ruleFn.apply(recv, Array.prototype.slice.call(arguments, 2, ruleFnArity + 2));
  },
  _prependInput: function(v) {
    this.input = new OMInputStream(v, this.input);
  },

  // if you want your grammar (and its subgrammars) to memoize parameterized rules, invoke this method on it:
  memoizeParameterizedRules: function() {
    this._prependInput = function(v) {
      var newInput;
      if (isImmutable(v)) {
        newInput = this.input[getTag(v)];
        if (!newInput) {
          newInput = new OMInputStream(v, this.input);
          this.input[getTag(v)] = newInput;
        }
      } else
        newInput = new OMInputStream(v, this.input);
      this.input = newInput;
    };
    this._applyWithArgs = function(rule) {
      var ruleFnArity = this[rule].length;
      for (var idx = arguments.length - 1; idx >= ruleFnArity + 1; idx--) // prepend "extra" arguments in reverse order
        this._prependInput(arguments[idx]);
      return ruleFnArity == 0 ?
        this._apply(rule) :
        this[rule].apply(this, Array.prototype.slice.call(arguments, 1, ruleFnArity + 1));
    };
  },

  _pred: function(b) {
    if (b)
      return true;
    throw fail;
  },
  _not: function(x) {
    var origInput = this.input,
        r = this._startStructure(-1);
    try {
      this._appendStructure(r, x.call(this));
    } catch (f) {
      if (f != fail)
        throw f;
      this.input = origInput;
      r.value = true;
      return this._endStructure(r);
    }
    throw fail;
  },
  _lookahead: function(x) {
    var origInput = this.input,
        r = x.call(this);
    this.input = origInput;
    return r;
  },
  _or: function() {
    var origInput = this.input;
    for (var idx = 0; idx < arguments.length; idx++) {
      try {
        this.input = origInput;
        return arguments[idx].call(this);
      } catch (f) {
        if (f != fail)
          throw f;
      }
    }
    throw fail;
  },
  _xor: function(ruleName) {
    var idx = 1, newInput, origInput = this.input, r;
    while (idx < arguments.length) {
      try {
        this.input = origInput;
        r = arguments[idx].call(this);
        if (newInput)
          throw new Error('more than one choice matched by "exclusive-OR" in ' + ruleName);
        newInput = this.input;
      } catch (f) {
        if (f != fail)
          throw f;
      }
      idx++;
    }
    if (newInput) {
      this.input = newInput;
      return r;
    }
    throw fail;
  },
  disableXORs: function() {
    this._xor = this._or;
  },
  _opt: function(x) {
    var origInput = this.input,
        r = this._startStructure(-1);
    try {
      r = x.call(this);
    } catch (f) {
      if (f != fail)
        throw f;
      this.input = origInput;
    }
    return this._endStructure(r);
  },
  _many: function(x) {
    var r = this._startStructure(-1), ans = [];
    if (arguments.length > 1) { this._appendStructure(r, x.call(this)); ans.push(r.value); }
    while (true) {
      var origInput = this.input;
      try {
        this._appendStructure(r, x.call(this));
        ans.push(r.value);
      } catch (f) {
        if (f != fail)
          throw f;
        this.input = origInput;
        break;
      }
    }
    r.value = ans
    return this._endStructure(r);
  },
  _many1: function(x) { return this._many(x, true); },
  _form: function(x) {
    var r = this._startStructure(-1);
    r.form = true;
    this._appendStructure(r, this._apply("anything"));
    var v = r.value;
    if (!isSequenceable(v))
      throw fail;
    var origInput = this.input;
    this.input = v.toOMInputStream();
    // TODO: probably append as a child
    this._appendStructure(r, x.call(this));
    this._appendStructure(r, this._apply("end"));
    r.value = v;
    this.input = origInput;
    return this._endStructure(r);
  },
  _consumedBy: function(x) {
    var origInput = this.input,
        r = this._startStructure(-1);
    this._appendStructure(r, x.call(this));
    r.value = origInput.upTo(this.input);
    return this._endStructure(r);
  },
  _idxConsumedBy: function(x) {
    var origInput = this.input,
        r = this._startStructure(-1);
    this._appendStructure(r, x.call(this));
    r.value = {fromIdx: origInput.idx, toIdx: this.input.idx};
    return this._endStructure(r);
  },
  _interleave: function(mode1, part1, mode2, part2 /* ..., moden, partn */) {
    var currInput = this.input, ans = [], r = this._startStructure(-1);
    for (var idx = 0; idx < arguments.length; idx += 2)
      ans[idx / 2] = (arguments[idx] == "*" || arguments[idx] == "+") ? [] : undefined;
    while (true) {
      var idx = 0, allDone = true;
      while (idx < arguments.length) {
        if (arguments[idx] != "0")
          try {
            this.input = currInput;
            switch (arguments[idx]) {
            case "*":
              ans[idx / 2].push(this._appendStructure(r, arguments[idx + 1].call(this)));
              break;
            case "+":
              ans[idx / 2].push(this._appendStructure(r, arguments[idx + 1].call(this)));
              arguments[idx] = "*";
              break;
            case "?":
              ans[idx / 2] = this._appendStructure(r, arguments[idx + 1].call(this));
              arguments[idx] = "0";
              break;
            case "1":
              ans[idx / 2] = this._appendStructure(r, arguments[idx + 1].call(this));
              arguments[idx] = "0";
              break;
            default:
              throw new Error("invalid mode '" + arguments[idx] + "' in OMeta._interleave");
            }
            currInput = this.input;
            break;
          } catch (f) {
            if (f != fail)
              throw f;
            // if this (failed) part's mode is "1" or "+", we're not done yet
            allDone = allDone && (arguments[idx] == "*" || arguments[idx] == "?");
          }
        idx += 2;
      }
      if (idx == arguments.length) {
        if (allDone) {
          r.value = ans;
          return this._endStructure(r);
        } else
          throw fail;
      }
    }
  },

  // some basic rules
  anything: function() {
    var r = this._startStructure(-1);
    r.value = this.input.head();
    this.input = this.input.tail();
    return this._endStructure(r);
  },
  end: function() {
    return this._not(function() { return this._apply("anything"); });
  },
  pos: function() {
    return this.input.idx;
  },
  empty: function() {
    var r = this._startStructure(-1);
    r.value = true;
    return this._endStructure(r);
  },
  apply: function(r) {
    return this._apply(r);
  },
  foreign: function(g, r) {
    var gi = objectThatDelegatesTo(g, {input: makeOMInputStreamProxy(this.input)});
    gi.initialize();
    var ans = gi._apply(r);
    this.input = gi.input.target;
    return ans;
  },

  //  some useful "derived" rules
  exactly: function(wanted) {
    var r = this._startStructure(-1);
    this._appendStructure(r, this._apply("anything"));
    if (wanted === r.value)
      return this._endStructure(r);
    throw fail;
  },
  seq: function(xs) {
    var r = this._startStructure(-1);
    for (var idx = 0; idx < xs.length; idx++)
      this._applyWithArgs("exactly", xs.at(idx));
    r.value = xs;
    return this._endStructure(r);
  },

  initialize: function() {},
  // match and matchAll are a grammar's "public interface"
  _genericMatch: function(input, rule, args, callback) {
    if (args == undefined)
      args = [];
    var realArgs = [rule];
    for (var idx = 0; idx < args.length; idx++)
      realArgs.push(args[idx]);
    var m = objectThatDelegatesTo(this, {input: input});
    m.initialize();
    try {
      let ret = realArgs.length == 1 ? m._apply.call(m, realArgs[0]) : m._applyWithArgs.apply(m, realArgs);
      if (callback)
        callback(null, ret, ret.value);
      return ret;
    } catch (f) {
      if (f != fail)
        throw f;

      var einput = m.input;
      if (einput.idx != undefined) {
        while (einput.tl != undefined && einput.tl.idx != undefined)
          einput = einput.tl;
        einput.idx--;
      }
      var err = new Error();

      err.idx = einput.idx;
      if (callback)
        callback(err);
      else
        throw err;
    }
    return { value: null };
  },
  matchStructure: function(obj, rule, args, callback) {
    return this._genericMatch([obj].toOMInputStream(), rule, args, callback);
  },
  matchAllStructure: function(listyObj, rule, args, matchFailed) {
    return this._genericMatch(listyObj.toOMInputStream(), rule, args, matchFailed);
  },
  match: function(obj, rule, args, callback) {
    return this.matchStructure(obj, rule, args, callback).value;
  },
  matchAll: function(listyObj, rule, args, matchFailed) {
    return this.matchAllStructure(listyObj, rule, args, matchFailed).value;
  },
  createInstance: function() {
    var m = objectThatDelegatesTo(this, {});
    m.initialize();
    m.matchAll = function(listyObj, aRule) {
      this.input = listyObj.toOMInputStream();
      return this._apply(aRule);
    };
    return m;
  }
};

let evalCompiler = function(str) {
  return eval(str);
};

let GenericMatcher=objectThatDelegatesTo(OMeta,{
"notLast":function(){var $elf=this,$vars={},$r0=this._startStructure(1, true);$vars.rule=this._getStructureValue(this.anything());$vars.r=this._appendStructure($r0,this._apply($vars.rule),5);this._appendStructure($r0,this._lookahead(function(){return this._forwardStructure(this._apply($vars.rule),10);}),8);$r0.value=$vars.r;return this._endStructure($r0);}});let BaseStrParser=objectThatDelegatesTo(OMeta,{
"string":function(){var $elf=this,$vars={},$r0=this._startStructure(15, true);$vars.r=this._appendStructure($r0,this.anything(),18);this._pred(((typeof $vars.r) === "string"));$r0.value=$vars.r;return this._endStructure($r0);},
"char":function(){var $elf=this,$vars={},$r0=this._startStructure(23, true);$vars.r=this._appendStructure($r0,this.anything(),26);this._pred((((typeof $vars.r) === "string") && ($vars.r["length"] == (1))));$r0.value=$vars.r;return this._endStructure($r0);},
"space":function(){var $elf=this,$vars={},$r0=this._startStructure(31, true);$vars.r=this._appendStructure($r0,this._apply("char"),34);this._pred(($vars.r.charCodeAt((0)) <= (32)));$r0.value=$vars.r;return this._endStructure($r0);},
"spaces":function(){var $elf=this,$vars={},$r0=this._startStructure(39, true);$r0.value=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("space"),42);}),40);return this._endStructure($r0);},
"digit":function(){var $elf=this,$vars={},$r0=this._startStructure(44, true);$vars.r=this._appendStructure($r0,this._apply("char"),47);this._pred((($vars.r >= "0") && ($vars.r <= "9")));$r0.value=$vars.r;return this._endStructure($r0);},
"lower":function(){var $elf=this,$vars={},$r0=this._startStructure(52, true);$vars.r=this._appendStructure($r0,this._apply("char"),55);this._pred((($vars.r >= "a") && ($vars.r <= "z")));$r0.value=$vars.r;return this._endStructure($r0);},
"upper":function(){var $elf=this,$vars={},$r0=this._startStructure(60, true);$vars.r=this._appendStructure($r0,this._apply("char"),63);this._pred((($vars.r >= "A") && ($vars.r <= "Z")));$r0.value=$vars.r;return this._endStructure($r0);},
"letter":function(){var $elf=this,$vars={},$r0=this._startStructure(68, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("lower"),71);},function(){return this._forwardStructure(this._apply("upper"),73);}),69);return this._endStructure($r0);},
"letterOrDigit":function(){var $elf=this,$vars={},$r0=this._startStructure(75, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("letter"),78);},function(){return this._forwardStructure(this._apply("digit"),80);}),76);return this._endStructure($r0);},
"token":function(){var $elf=this,$vars={},$r0=this._startStructure(82, true);$vars.tok=this._getStructureValue(this.anything());this._appendStructure($r0,this._apply("spaces"),85);$r0.value=this._appendStructure($r0,this.seq($vars.tok),87);return this._endStructure($r0);},
"listOf":function(){var $elf=this,$vars={},$r0=this._startStructure(90, true);$vars.rule=this._getStructureValue(this.anything());$vars.delim=this._getStructureValue(this.anything());$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(96);$vars.f=this._appendStructure($r1,this._apply($vars.rule),99);$vars.rs=this._appendStructure($r1,this._many(function(){var $r2=this._startStructure(105);this._appendStructure($r2,this._applyWithArgs("token",$vars.delim),107);$r2.value=this._appendStructure($r2,this._apply($vars.rule),110);return this._endStructure($r2);}),103);$r1.value=[$vars.f].concat($vars.rs);return this._endStructure($r1);},function(){var $r1=this._startStructure(95);$r1.value=[];return this._endStructure($r1);}),94);return this._endStructure($r0);},
"enum":function(){var $elf=this,$vars={},$r0=this._startStructure(115, true);$vars.rule=this._getStructureValue(this.anything());$vars.delim=this._getStructureValue(this.anything());$vars.v=this._appendStructure($r0,this._applyWithArgs("listOf",$vars.rule,$vars.delim),120);this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._applyWithArgs("token",$vars.delim),126);},function(){return this._forwardStructure(this._apply("empty"),129);}),124);$r0.value=$vars.v;return this._endStructure($r0);},
"fromTo":function(){var $elf=this,$vars={},$r0=this._startStructure(132, true);$vars.x=this._getStructureValue(this.anything());$vars.y=this._getStructureValue(this.anything());$r0.value=this._appendStructure($r0,this._consumedBy(function(){var $r1=this._startStructure(138);this._appendStructure($r1,this.seq($vars.x),140);this._appendStructure($r1,this._many(function(){var $r2=this._startStructure(145);this._appendStructure($r2,this._not(function(){return this._forwardStructure(this.seq($vars.y),149);}),147);$r2.value=this._appendStructure($r2,this._apply("char"),152);return this._endStructure($r2);}),143);$r1.value=this._appendStructure($r1,this.seq($vars.y),154);return this._endStructure($r1);}),136);return this._endStructure($r0);}})
let BSJSParser=objectThatDelegatesTo(BaseStrParser,{
"enum":function(){var $elf=this,$vars={},$r0=this._startStructure(158, true);$vars.r=this._getStructureValue(this.anything());$vars.d=this._getStructureValue(this.anything());$vars.v=this._appendStructure($r0,this._applyWithArgs("listOf",$vars.r,$vars.d),163);this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._applyWithArgs("token",","),169);},function(){return this._forwardStructure(this._apply("empty"),171);}),167);$r0.value=$vars.v;return this._endStructure($r0);},
"space":function(){var $elf=this,$vars={},$r0=this._startStructure(174, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(BaseStrParser._superApplyWithArgs(this,"space"),177);},function(){return this._forwardStructure(this._applyWithArgs("fromTo","//","\n"),179);},function(){return this._forwardStructure(this._applyWithArgs("fromTo","/*","*/"),183);}),175);return this._endStructure($r0);},
"nameFirst":function(){var $elf=this,$vars={},$r0=this._startStructure(187, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("letter"),190);},function(){return this._forwardStructure(this.exactly("$"),192);},function(){return this._forwardStructure(this.exactly("_"),194);}),188);return this._endStructure($r0);},
"nameRest":function(){var $elf=this,$vars={},$r0=this._startStructure(196, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("nameFirst"),199);},function(){return this._forwardStructure(this._apply("digit"),201);}),197);return this._endStructure($r0);},
"iName":function(){var $elf=this,$vars={},$r0=this._startStructure(203, true);$r0.value=this._appendStructure($r0,this._consumedBy(function(){var $r1=this._startStructure(206);this._appendStructure($r1,this._apply("nameFirst"),208);$r1.value=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._apply("nameRest"),212);}),210);return this._endStructure($r1);}),204);return this._endStructure($r0);},
"isKeyword":function(){var $elf=this,$vars={},$r0=this._startStructure(214, true);$vars.x=this._getStructureValue(this.anything());$r0.value=this._pred(BSJSParser._isKeyword($vars.x));return this._endStructure($r0);},
"name":function(){var $elf=this,$vars={},$r0=this._startStructure(219, true);$vars.n=this._appendStructure($r0,this._apply("iName"),222);this._appendStructure($r0,this._not(function(){return this._forwardStructure(this._applyWithArgs("isKeyword",$vars.n),226);}),224);$r0.value=["name",(($vars.n == "self")?"$elf":$vars.n)];return this._endStructure($r0);},
"keyword":function(){var $elf=this,$vars={},$r0=this._startStructure(230, true);$vars.k=this._appendStructure($r0,this._apply("iName"),233);this._appendStructure($r0,this._applyWithArgs("isKeyword",$vars.k),235);$r0.value=[$vars.k,$vars.k];return this._endStructure($r0);},
"hexDigit":function(){var $elf=this,$vars={},$r0=this._startStructure(239, true);$vars.x=this._appendStructure($r0,this._apply("char"),242);$vars.v=this["hexDigits"].indexOf($vars.x.toLowerCase());this._pred(($vars.v >= (0)));$r0.value=$vars.v;return this._endStructure($r0);},
"hexLit":function(){var $elf=this,$vars={},$r0=this._startStructure(249, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(252);$vars.n=this._appendStructure($r1,this._apply("hexLit"),255);$vars.d=this._appendStructure($r1,this._apply("hexDigit"),258);$r1.value=(($vars.n * (16)) + $vars.d);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("hexDigit"),261);}),250);return this._endStructure($r0);},
"number":function(){var $elf=this,$vars={},$r0=this._startStructure(263, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(266);this._appendStructure($r1,this.exactly("0"),267);this._appendStructure($r1,this.exactly("x"),267);"0x";$vars.n=this._appendStructure($r1,this._apply("hexLit"),269);$r1.value=["number",$vars.n];return this._endStructure($r1);},function(){var $r1=this._startStructure(272);$vars.f=this._appendStructure($r1,this._consumedBy(function(){var $r2=this._startStructure(277);this._appendStructure($r2,this._many1(function(){return this._forwardStructure(this._apply("digit"),281);}),279);$r2.value=this._appendStructure($r2,this._opt(function(){var $r3=this._startStructure(285);this._appendStructure($r3,this.exactly("."),287);$r3.value=this._appendStructure($r3,this._many1(function(){return this._forwardStructure(this._apply("digit"),291);}),289);return this._endStructure($r3);}),283);return this._endStructure($r2);}),275);$r1.value=["number",parseFloat($vars.f)];return this._endStructure($r1);}),264);return this._endStructure($r0);},
"escapeChar":function(){var $elf=this,$vars={},$r0=this._startStructure(294, true);$vars.s=this._appendStructure($r0,this._consumedBy(function(){var $r1=this._startStructure(299);this._appendStructure($r1,this.exactly("\\"),301);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(305);this._appendStructure($r2,this.exactly("u"),307);this._appendStructure($r2,this._apply("hexDigit"),309);this._appendStructure($r2,this._apply("hexDigit"),311);this._appendStructure($r2,this._apply("hexDigit"),313);$r2.value=this._appendStructure($r2,this._apply("hexDigit"),315);return this._endStructure($r2);},function(){var $r2=this._startStructure(317);this._appendStructure($r2,this.exactly("x"),319);this._appendStructure($r2,this._apply("hexDigit"),321);$r2.value=this._appendStructure($r2,this._apply("hexDigit"),323);return this._endStructure($r2);},function(){return this._forwardStructure(this._apply("char"),325);}),303);return this._endStructure($r1);}),297);$r0.value=unescape($vars.s);return this._endStructure($r0);},
"str":function(){var $elf=this,$vars={},$r0=this._startStructure(328, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(331);this._appendStructure($r1,this.exactly("\""),332);this._appendStructure($r1,this.exactly("\""),332);this._appendStructure($r1,this.exactly("\""),332);"\"\"\"";$vars.cs=this._appendStructure($r1,this._many(function(){var $r2=this._startStructure(336);this._appendStructure($r2,this._not(function(){var $r3=this._startStructure(340);this._appendStructure($r3,this.exactly("\""),341);this._appendStructure($r3,this.exactly("\""),341);this._appendStructure($r3,this.exactly("\""),341);$r3.value="\"\"\"";return this._endStructure($r3);}),338);$r2.value=this._appendStructure($r2,this._apply("char"),342);return this._endStructure($r2);}),334);this._appendStructure($r1,this.exactly("\""),332);this._appendStructure($r1,this.exactly("\""),332);this._appendStructure($r1,this.exactly("\""),332);"\"\"\"";$r1.value=["string",$vars.cs.join("")];return this._endStructure($r1);},function(){var $r1=this._startStructure(345);this._appendStructure($r1,this.exactly("\'"),347);$vars.cs=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this._apply("escapeChar"),354);},function(){var $r3=this._startStructure(356);this._appendStructure($r3,this._not(function(){return this._forwardStructure(this.exactly("\'"),360);}),358);$r3.value=this._appendStructure($r3,this._apply("char"),362);return this._endStructure($r3);}),352);}),350);this._appendStructure($r1,this.exactly("\'"),364);$r1.value=["string",$vars.cs.join("")];return this._endStructure($r1);},function(){var $r1=this._startStructure(367);this._appendStructure($r1,this.exactly("\""),369);$vars.cs=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this._apply("escapeChar"),376);},function(){var $r3=this._startStructure(378);this._appendStructure($r3,this._not(function(){return this._forwardStructure(this.exactly("\""),382);}),380);$r3.value=this._appendStructure($r3,this._apply("char"),384);return this._endStructure($r3);}),374);}),372);this._appendStructure($r1,this.exactly("\""),386);$r1.value=["string",$vars.cs.join("")];return this._endStructure($r1);},function(){var $r1=this._startStructure(389);this._appendStructure($r1,this._or(function(){return this._forwardStructure(this.exactly("#"),393);},function(){return this._forwardStructure(this.exactly("`"),395);}),391);$vars.n=this._appendStructure($r1,this._apply("iName"),398);$r1.value=["string",$vars.n];return this._endStructure($r1);}),329);return this._endStructure($r0);},
"special":function(){var $elf=this,$vars={},$r0=this._startStructure(401, true);$vars.s=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this.exactly("("),406);},function(){return this._forwardStructure(this.exactly(")"),408);},function(){return this._forwardStructure(this.exactly("{"),410);},function(){return this._forwardStructure(this.exactly("}"),412);},function(){return this._forwardStructure(this.exactly("["),414);},function(){return this._forwardStructure(this.exactly("]"),416);},function(){return this._forwardStructure(this.exactly(","),418);},function(){return this._forwardStructure(this.exactly(";"),420);},function(){return this._forwardStructure(this.exactly("?"),422);},function(){return this._forwardStructure(this.exactly(":"),424);},function(){var $r1=this._startStructure(426);this._appendStructure($r1,this.exactly("!"),427);this._appendStructure($r1,this.exactly("="),427);this._appendStructure($r1,this.exactly("="),427);$r1.value="!==";return this._endStructure($r1);},function(){var $r1=this._startStructure(428);this._appendStructure($r1,this.exactly("!"),429);this._appendStructure($r1,this.exactly("="),429);$r1.value="!=";return this._endStructure($r1);},function(){var $r1=this._startStructure(430);this._appendStructure($r1,this.exactly("="),431);this._appendStructure($r1,this.exactly("="),431);this._appendStructure($r1,this.exactly("="),431);$r1.value="===";return this._endStructure($r1);},function(){var $r1=this._startStructure(432);this._appendStructure($r1,this.exactly("="),433);this._appendStructure($r1,this.exactly("="),433);$r1.value="==";return this._endStructure($r1);},function(){var $r1=this._startStructure(434);this._appendStructure($r1,this.exactly("="),435);$r1.value="=";return this._endStructure($r1);},function(){var $r1=this._startStructure(436);this._appendStructure($r1,this.exactly(">"),437);this._appendStructure($r1,this.exactly("="),437);$r1.value=">=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly(">"),438);},function(){var $r1=this._startStructure(440);this._appendStructure($r1,this.exactly("<"),441);this._appendStructure($r1,this.exactly("="),441);$r1.value="<=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("<"),442);},function(){var $r1=this._startStructure(444);this._appendStructure($r1,this.exactly("+"),445);this._appendStructure($r1,this.exactly("+"),445);$r1.value="++";return this._endStructure($r1);},function(){var $r1=this._startStructure(446);this._appendStructure($r1,this.exactly("+"),447);this._appendStructure($r1,this.exactly("="),447);$r1.value="+=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("+"),448);},function(){var $r1=this._startStructure(450);this._appendStructure($r1,this.exactly("-"),451);this._appendStructure($r1,this.exactly("-"),451);$r1.value="--";return this._endStructure($r1);},function(){var $r1=this._startStructure(452);this._appendStructure($r1,this.exactly("-"),453);this._appendStructure($r1,this.exactly("="),453);$r1.value="-=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("-"),454);},function(){var $r1=this._startStructure(456);this._appendStructure($r1,this.exactly("*"),457);this._appendStructure($r1,this.exactly("="),457);$r1.value="*=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("*"),458);},function(){var $r1=this._startStructure(460);this._appendStructure($r1,this.exactly("/"),461);this._appendStructure($r1,this.exactly("="),461);$r1.value="/=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("/"),462);},function(){var $r1=this._startStructure(464);this._appendStructure($r1,this.exactly("%"),465);this._appendStructure($r1,this.exactly("="),465);$r1.value="%=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("%"),466);},function(){var $r1=this._startStructure(468);this._appendStructure($r1,this.exactly("&"),469);this._appendStructure($r1,this.exactly("&"),469);this._appendStructure($r1,this.exactly("="),469);$r1.value="&&=";return this._endStructure($r1);},function(){var $r1=this._startStructure(470);this._appendStructure($r1,this.exactly("&"),471);this._appendStructure($r1,this.exactly("&"),471);$r1.value="&&";return this._endStructure($r1);},function(){var $r1=this._startStructure(472);this._appendStructure($r1,this.exactly("|"),473);this._appendStructure($r1,this.exactly("|"),473);this._appendStructure($r1,this.exactly("="),473);$r1.value="||=";return this._endStructure($r1);},function(){var $r1=this._startStructure(474);this._appendStructure($r1,this.exactly("|"),475);this._appendStructure($r1,this.exactly("|"),475);$r1.value="||";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("."),476);},function(){return this._forwardStructure(this.exactly("!"),478);}),404);$r0.value=[$vars.s,$vars.s];return this._endStructure($r0);},
"tok":function(){var $elf=this,$vars={},$r0=this._startStructure(481, true);this._appendStructure($r0,this._apply("spaces"),483);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("name"),487);},function(){return this._forwardStructure(this._apply("keyword"),489);},function(){return this._forwardStructure(this._apply("number"),491);},function(){return this._forwardStructure(this._apply("str"),493);},function(){return this._forwardStructure(this._apply("special"),495);}),485);return this._endStructure($r0);},
"toks":function(){var $elf=this,$vars={},$r0=this._startStructure(497, true);$vars.ts=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("token"),502);}),500);this._appendStructure($r0,this._apply("spaces"),504);this._appendStructure($r0,this.end(),506);$r0.value=$vars.ts;return this._endStructure($r0);},
"token":function(){var $elf=this,$vars={},$r0=this._startStructure(509, true);$vars.tt=this._getStructureValue(this.anything());$vars.t=this._appendStructure($r0,this._apply("tok"),513);this._pred(($vars.t[(0)] == $vars.tt));$r0.value=$vars.t[(1)];return this._endStructure($r0);},
"spacesNoNl":function(){var $elf=this,$vars={},$r0=this._startStructure(518, true);$r0.value=this._appendStructure($r0,this._many(function(){var $r1=this._startStructure(521);this._appendStructure($r1,this._not(function(){return this._forwardStructure(this.exactly("\n"),525);}),523);$r1.value=this._appendStructure($r1,this._apply("space"),527);return this._endStructure($r1);}),519);return this._endStructure($r0);},
"expr":function(){var $elf=this,$vars={},$r0=this._startStructure(529, true);$vars.e=this._appendStructure($r0,this._apply("orExpr"),532);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(536);this._appendStructure($r1,this._applyWithArgs("token","?"),538);$vars.t=this._appendStructure($r1,this._apply("expr"),541);this._appendStructure($r1,this._applyWithArgs("token",":"),543);$vars.f=this._appendStructure($r1,this._apply("expr"),546);$r1.value=["condExpr",$vars.e,$vars.t,$vars.f];return this._endStructure($r1);},function(){var $r1=this._startStructure(549);this._appendStructure($r1,this._applyWithArgs("token","="),551);$vars.rhs=this._appendStructure($r1,this._apply("expr"),554);$r1.value=["set",$vars.e,$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(557);this._appendStructure($r1,this._applyWithArgs("token","+="),559);$vars.rhs=this._appendStructure($r1,this._apply("expr"),562);$r1.value=["mset",$vars.e,"+",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(565);this._appendStructure($r1,this._applyWithArgs("token","-="),567);$vars.rhs=this._appendStructure($r1,this._apply("expr"),570);$r1.value=["mset",$vars.e,"-",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(573);this._appendStructure($r1,this._applyWithArgs("token","*="),575);$vars.rhs=this._appendStructure($r1,this._apply("expr"),578);$r1.value=["mset",$vars.e,"*",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(581);this._appendStructure($r1,this._applyWithArgs("token","/="),583);$vars.rhs=this._appendStructure($r1,this._apply("expr"),586);$r1.value=["mset",$vars.e,"/",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(589);this._appendStructure($r1,this._applyWithArgs("token","%="),591);$vars.rhs=this._appendStructure($r1,this._apply("expr"),594);$r1.value=["mset",$vars.e,"%",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(597);this._appendStructure($r1,this._applyWithArgs("token","&&="),599);$vars.rhs=this._appendStructure($r1,this._apply("expr"),602);$r1.value=["mset",$vars.e,"&&",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(605);this._appendStructure($r1,this._applyWithArgs("token","||="),607);$vars.rhs=this._appendStructure($r1,this._apply("expr"),610);$r1.value=["mset",$vars.e,"||",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(613);this._appendStructure($r1,this._apply("empty"),615);$r1.value=$vars.e;return this._endStructure($r1);}),534);return this._endStructure($r0);},
"orExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(618, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(621);$vars.x=this._appendStructure($r1,this._apply("orExpr"),624);this._appendStructure($r1,this._applyWithArgs("token","||"),626);$vars.y=this._appendStructure($r1,this._apply("andExpr"),629);$r1.value=["binop","||",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("andExpr"),632);}),619);return this._endStructure($r0);},
"andExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(634, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(637);$vars.x=this._appendStructure($r1,this._apply("andExpr"),640);this._appendStructure($r1,this._applyWithArgs("token","&&"),642);$vars.y=this._appendStructure($r1,this._apply("eqExpr"),645);$r1.value=["binop","&&",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("eqExpr"),648);}),635);return this._endStructure($r0);},
"eqExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(650, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(653);$vars.x=this._appendStructure($r1,this._apply("eqExpr"),656);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(660);this._appendStructure($r2,this._applyWithArgs("token","=="),662);$vars.y=this._appendStructure($r2,this._apply("relExpr"),665);$r2.value=["binop","==",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(668);this._appendStructure($r2,this._applyWithArgs("token","!="),670);$vars.y=this._appendStructure($r2,this._apply("relExpr"),673);$r2.value=["binop","!=",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(676);this._appendStructure($r2,this._applyWithArgs("token","==="),678);$vars.y=this._appendStructure($r2,this._apply("relExpr"),681);$r2.value=["binop","===",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(684);this._appendStructure($r2,this._applyWithArgs("token","!=="),686);$vars.y=this._appendStructure($r2,this._apply("relExpr"),689);$r2.value=["binop","!==",$vars.x,$vars.y];return this._endStructure($r2);}),658);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("relExpr"),692);}),651);return this._endStructure($r0);},
"relExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(694, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(697);$vars.x=this._appendStructure($r1,this._apply("relExpr"),700);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(704);this._appendStructure($r2,this._applyWithArgs("token",">"),706);$vars.y=this._appendStructure($r2,this._apply("addExpr"),709);$r2.value=["binop",">",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(712);this._appendStructure($r2,this._applyWithArgs("token",">="),714);$vars.y=this._appendStructure($r2,this._apply("addExpr"),717);$r2.value=["binop",">=",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(720);this._appendStructure($r2,this._applyWithArgs("token","<"),722);$vars.y=this._appendStructure($r2,this._apply("addExpr"),725);$r2.value=["binop","<",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(728);this._appendStructure($r2,this._applyWithArgs("token","<="),730);$vars.y=this._appendStructure($r2,this._apply("addExpr"),733);$r2.value=["binop","<=",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(736);this._appendStructure($r2,this._applyWithArgs("token","instanceof"),738);$vars.y=this._appendStructure($r2,this._apply("addExpr"),741);$r2.value=["binop","instanceof",$vars.x,$vars.y];return this._endStructure($r2);}),702);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("addExpr"),744);}),695);return this._endStructure($r0);},
"addExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(746, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(749);$vars.x=this._appendStructure($r1,this._apply("addExpr"),752);this._appendStructure($r1,this._applyWithArgs("token","+"),754);$vars.y=this._appendStructure($r1,this._apply("mulExpr"),757);$r1.value=["binop","+",$vars.x,$vars.y];return this._endStructure($r1);},function(){var $r1=this._startStructure(760);$vars.x=this._appendStructure($r1,this._apply("addExpr"),763);this._appendStructure($r1,this._applyWithArgs("token","-"),765);$vars.y=this._appendStructure($r1,this._apply("mulExpr"),768);$r1.value=["binop","-",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("mulExpr"),771);}),747);return this._endStructure($r0);},
"mulExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(773, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(776);$vars.x=this._appendStructure($r1,this._apply("mulExpr"),779);this._appendStructure($r1,this._applyWithArgs("token","*"),781);$vars.y=this._appendStructure($r1,this._apply("unary"),784);$r1.value=["binop","*",$vars.x,$vars.y];return this._endStructure($r1);},function(){var $r1=this._startStructure(787);$vars.x=this._appendStructure($r1,this._apply("mulExpr"),790);this._appendStructure($r1,this._applyWithArgs("token","/"),792);$vars.y=this._appendStructure($r1,this._apply("unary"),795);$r1.value=["binop","/",$vars.x,$vars.y];return this._endStructure($r1);},function(){var $r1=this._startStructure(798);$vars.x=this._appendStructure($r1,this._apply("mulExpr"),801);this._appendStructure($r1,this._applyWithArgs("token","%"),803);$vars.y=this._appendStructure($r1,this._apply("unary"),806);$r1.value=["binop","%",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("unary"),809);}),774);return this._endStructure($r0);},
"unary":function(){var $elf=this,$vars={},$r0=this._startStructure(811, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(814);this._appendStructure($r1,this._applyWithArgs("token","-"),816);$vars.p=this._appendStructure($r1,this._apply("postfix"),819);$r1.value=["unop","-",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(822);this._appendStructure($r1,this._applyWithArgs("token","+"),824);$vars.p=this._appendStructure($r1,this._apply("postfix"),827);$r1.value=["unop","+",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(830);this._appendStructure($r1,this._applyWithArgs("token","++"),832);$vars.p=this._appendStructure($r1,this._apply("postfix"),835);$r1.value=["preop","++",$vars.p,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(838);this._appendStructure($r1,this._applyWithArgs("token","--"),840);$vars.p=this._appendStructure($r1,this._apply("postfix"),843);$r1.value=["preop","--",$vars.p,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(846);this._appendStructure($r1,this._applyWithArgs("token","!"),848);$vars.p=this._appendStructure($r1,this._apply("unary"),851);$r1.value=["unop","!",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(854);this._appendStructure($r1,this._applyWithArgs("token","void"),856);$vars.p=this._appendStructure($r1,this._apply("unary"),859);$r1.value=["unop","void",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(862);this._appendStructure($r1,this._applyWithArgs("token","delete"),864);$vars.p=this._appendStructure($r1,this._apply("unary"),867);$r1.value=["unop","delete",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(870);this._appendStructure($r1,this._applyWithArgs("token","typeof"),872);$vars.p=this._appendStructure($r1,this._apply("unary"),875);$r1.value=["unop","typeof",$vars.p];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("postfix"),878);}),812);return this._endStructure($r0);},
"postfix":function(){var $elf=this,$vars={},$r0=this._startStructure(880, true);$vars.p=this._appendStructure($r0,this._apply("primExpr"),883);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(887);this._appendStructure($r1,this._apply("spacesNoNl"),889);this._appendStructure($r1,this._applyWithArgs("token","++"),891);$r1.value=["postop","++",$vars.p,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(894);this._appendStructure($r1,this._apply("spacesNoNl"),896);this._appendStructure($r1,this._applyWithArgs("token","--"),898);$r1.value=["postop","--",$vars.p,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(901);this._appendStructure($r1,this._apply("empty"),903);$r1.value=$vars.p;return this._endStructure($r1);}),885);return this._endStructure($r0);},
"primExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(906, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(909);$vars.p=this._appendStructure($r1,this._apply("primExpr"),912);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(916);this._appendStructure($r2,this._applyWithArgs("token","["),918);$vars.i=this._appendStructure($r2,this._apply("expr"),921);this._appendStructure($r2,this._applyWithArgs("token","]"),923);$r2.value=["getp",$vars.i,$vars.p];return this._endStructure($r2);},function(){var $r2=this._startStructure(926);this._appendStructure($r2,this._applyWithArgs("token","."),928);$vars.m=this._appendStructure($r2,this._applyWithArgs("token","name"),931);this._appendStructure($r2,this._applyWithArgs("token","("),933);$vars.as=this._appendStructure($r2,this._applyWithArgs("listOf","expr",","),936);this._appendStructure($r2,this._applyWithArgs("token",")"),940);$r2.value=["send",$vars.m,$vars.p].concat($vars.as);return this._endStructure($r2);},function(){var $r2=this._startStructure(943);this._appendStructure($r2,this._applyWithArgs("token","."),945);$vars.f=this._appendStructure($r2,this._applyWithArgs("token","name"),948);$r2.value=["getp",["string",$vars.f],$vars.p];return this._endStructure($r2);},function(){var $r2=this._startStructure(951);this._appendStructure($r2,this._applyWithArgs("token","("),953);$vars.as=this._appendStructure($r2,this._applyWithArgs("listOf","expr",","),956);this._appendStructure($r2,this._applyWithArgs("token",")"),960);$r2.value=["call",$vars.p].concat($vars.as).concat(this._extractLocation($r2));return this._endStructure($r2);}),914);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("primExprHd"),963);}),907);return this._endStructure($r0);},
"primExprHd":function(){var $elf=this,$vars={},$r0=this._startStructure(965, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(968);this._appendStructure($r1,this._applyWithArgs("token","("),970);$vars.e=this._appendStructure($r1,this._apply("expr"),973);this._appendStructure($r1,this._applyWithArgs("token",")"),975);$r1.value=$vars.e;return this._endStructure($r1);},function(){var $r1=this._startStructure(978);this._appendStructure($r1,this._applyWithArgs("token","this"),980);$r1.value=["this"];return this._endStructure($r1);},function(){var $r1=this._startStructure(983);$vars.n=this._appendStructure($r1,this._applyWithArgs("token","name"),986);$r1.value=["get",$vars.n];return this._endStructure($r1);},function(){var $r1=this._startStructure(989);$vars.n=this._appendStructure($r1,this._applyWithArgs("token","number"),992);$r1.value=["number",$vars.n];return this._endStructure($r1);},function(){var $r1=this._startStructure(995);$vars.s=this._appendStructure($r1,this._applyWithArgs("token","string"),998);$r1.value=["string",$vars.s];return this._endStructure($r1);},function(){var $r1=this._startStructure(1001);this._appendStructure($r1,this._applyWithArgs("token","function"),1003);$r1.value=this._appendStructure($r1,this._apply("funcRest"),1005);return this._endStructure($r1);},function(){var $r1=this._startStructure(1007);this._appendStructure($r1,this._applyWithArgs("token","new"),1009);$vars.e=this._appendStructure($r1,this._apply("primExpr"),1012);$r1.value=["new",$vars.e];return this._endStructure($r1);},function(){var $r1=this._startStructure(1015);this._appendStructure($r1,this._applyWithArgs("token","["),1017);$vars.es=this._appendStructure($r1,this._applyWithArgs("enum","expr",","),1020);this._appendStructure($r1,this._applyWithArgs("token","]"),1024);$r1.value=["arr"].concat($vars.es);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("json"),1027);},function(){return this._forwardStructure(this._apply("re"),1029);}),966);return this._endStructure($r0);},
"json":function(){var $elf=this,$vars={},$r0=this._startStructure(1031, true);this._appendStructure($r0,this._applyWithArgs("token","{"),1033);$vars.bs=this._appendStructure($r0,this._applyWithArgs("enum","jsonBinding",","),1036);this._appendStructure($r0,this._applyWithArgs("token","}"),1040);$r0.value=["json"].concat($vars.bs);return this._endStructure($r0);},
"jsonBinding":function(){var $elf=this,$vars={},$r0=this._startStructure(1043, true);$vars.n=this._appendStructure($r0,this._apply("jsonPropName"),1046);this._appendStructure($r0,this._applyWithArgs("token",":"),1048);$vars.v=this._appendStructure($r0,this._apply("expr"),1051);$r0.value=["binding",$vars.n,$vars.v];return this._endStructure($r0);},
"jsonPropName":function(){var $elf=this,$vars={},$r0=this._startStructure(1054, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._applyWithArgs("token","name"),1057);},function(){return this._forwardStructure(this._applyWithArgs("token","number"),1059);},function(){return this._forwardStructure(this._applyWithArgs("token","string"),1061);}),1055);return this._endStructure($r0);},
"re":function(){var $elf=this,$vars={},$r0=this._startStructure(1063, true);this._appendStructure($r0,this._apply("spaces"),1065);$vars.x=this._appendStructure($r0,this._consumedBy(function(){var $r1=this._startStructure(1070);this._appendStructure($r1,this.exactly("/"),1072);this._appendStructure($r1,this._apply("reBody"),1074);this._appendStructure($r1,this.exactly("/"),1076);$r1.value=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._apply("reFlag"),1080);}),1078);return this._endStructure($r1);}),1068);$r0.value=["regExpr",$vars.x];return this._endStructure($r0);},
"reBody":function(){var $elf=this,$vars={},$r0=this._startStructure(1083, true);this._appendStructure($r0,this._apply("re1stChar"),1085);$r0.value=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("reChar"),1089);}),1087);return this._endStructure($r0);},
"re1stChar":function(){var $elf=this,$vars={},$r0=this._startStructure(1091, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1094);this._appendStructure($r1,this._not(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this.exactly("*"),1100);},function(){return this._forwardStructure(this.exactly("\\"),1102);},function(){return this._forwardStructure(this.exactly("/"),1104);},function(){return this._forwardStructure(this.exactly("["),1106);}),1098);}),1096);$r1.value=this._appendStructure($r1,this._apply("reNonTerm"),1108);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("escapeChar"),1110);},function(){return this._forwardStructure(this._apply("reClass"),1112);}),1092);return this._endStructure($r0);},
"reChar":function(){var $elf=this,$vars={},$r0=this._startStructure(1114, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("re1stChar"),1117);},function(){return this._forwardStructure(this.exactly("*"),1119);}),1115);return this._endStructure($r0);},
"reNonTerm":function(){var $elf=this,$vars={},$r0=this._startStructure(1121, true);this._appendStructure($r0,this._not(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this.exactly("\n"),1127);},function(){return this._forwardStructure(this.exactly("\r"),1129);}),1125);}),1123);$r0.value=this._appendStructure($r0,this._apply("char"),1131);return this._endStructure($r0);},
"reClass":function(){var $elf=this,$vars={},$r0=this._startStructure(1133, true);this._appendStructure($r0,this.exactly("["),1135);this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("reClassChar"),1139);}),1137);$r0.value=this._appendStructure($r0,this.exactly("]"),1141);return this._endStructure($r0);},
"reClassChar":function(){var $elf=this,$vars={},$r0=this._startStructure(1143, true);this._appendStructure($r0,this._not(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this.exactly("["),1149);},function(){return this._forwardStructure(this.exactly("]"),1151);}),1147);}),1145);$r0.value=this._appendStructure($r0,this._apply("reChar"),1153);return this._endStructure($r0);},
"reFlag":function(){var $elf=this,$vars={},$r0=this._startStructure(1155, true);$r0.value=this._appendStructure($r0,this._apply("nameFirst"),1156);return this._endStructure($r0);},
"formal":function(){var $elf=this,$vars={},$r0=this._startStructure(1158, true);this._appendStructure($r0,this._apply("spaces"),1160);$r0.value=this._appendStructure($r0,this._applyWithArgs("token","name"),1162);return this._endStructure($r0);},
"funcRest":function(){var $elf=this,$vars={},$r0=this._startStructure(1164, true);this._appendStructure($r0,this._applyWithArgs("token","("),1166);$vars.fs=this._appendStructure($r0,this._applyWithArgs("listOf","formal",","),1169);this._appendStructure($r0,this._applyWithArgs("token",")"),1173);this._appendStructure($r0,this._applyWithArgs("token","{"),1175);$vars.body=this._appendStructure($r0,this._apply("srcElems"),1178);this._appendStructure($r0,this._applyWithArgs("token","}"),1180);$r0.value=["func",$vars.fs,$vars.body];return this._endStructure($r0);},
"sc":function(){var $elf=this,$vars={},$r0=this._startStructure(1183, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1186);this._appendStructure($r1,this._apply("spacesNoNl"),1188);$r1.value=this._appendStructure($r1,this._or(function(){return this._forwardStructure(this.exactly("\n"),1192);},function(){return this._forwardStructure(this._lookahead(function(){return this._forwardStructure(this.exactly("}"),1196);}),1194);},function(){return this._forwardStructure(this.end(),1198);}),1190);return this._endStructure($r1);},function(){return this._forwardStructure(this._applyWithArgs("token",";"),1200);}),1184);return this._endStructure($r0);},
"varBinder":function(){var $elf=this,$vars={},$r0=this._startStructure(1202, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._applyWithArgs("token","var"),1205);},function(){return this._forwardStructure(this._applyWithArgs("token","let"),1207);},function(){return this._forwardStructure(this._applyWithArgs("token","const"),1209);}),1203);return this._endStructure($r0);},
"varBinding":function(){var $elf=this,$vars={},$r0=this._startStructure(1211, true);$vars.n=this._appendStructure($r0,this._applyWithArgs("token","name"),1214);$vars.v=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1219);this._appendStructure($r1,this._applyWithArgs("token","="),1221);$r1.value=this._appendStructure($r1,this._apply("expr"),1223);return this._endStructure($r1);},function(){var $r1=this._startStructure(1225);this._appendStructure($r1,this._apply("empty"),1227);$r1.value=["get","undefined"];return this._endStructure($r1);}),1217);$r0.value=["assignVar",$vars.n,$vars.v,this._extractLocation($r0)];return this._endStructure($r0);},
"block":function(){var $elf=this,$vars={},$r0=this._startStructure(1231, true);this._appendStructure($r0,this._applyWithArgs("token","{"),1233);$vars.ss=this._appendStructure($r0,this._apply("srcElems"),1236);this._appendStructure($r0,this._applyWithArgs("token","}"),1238);$r0.value=["begin",$vars.ss];return this._endStructure($r0);},
"stmt":function(){var $elf=this,$vars={},$r0=this._startStructure(1241, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("block"),1244);},function(){var $r1=this._startStructure(1246);$vars.decl=this._appendStructure($r1,this._apply("varBinder"),1249);$vars.bs=this._appendStructure($r1,this._applyWithArgs("listOf","varBinding",","),1252);this._appendStructure($r1,this._apply("sc"),1256);$r1.value=["beginVars",$vars.decl].concat($vars.bs);return this._endStructure($r1);},function(){var $r1=this._startStructure(1259);this._appendStructure($r1,this._applyWithArgs("token","if"),1261);this._appendStructure($r1,this._applyWithArgs("token","("),1263);$vars.c=this._appendStructure($r1,this._apply("expr"),1266);this._appendStructure($r1,this._applyWithArgs("token",")"),1268);$vars.t=this._appendStructure($r1,this._apply("stmt"),1271);$vars.f=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1276);this._appendStructure($r2,this._applyWithArgs("token","else"),1278);$r2.value=this._appendStructure($r2,this._apply("stmt"),1280);return this._endStructure($r2);},function(){var $r2=this._startStructure(1282);this._appendStructure($r2,this._apply("empty"),1284);$r2.value=["get","undefined"];return this._endStructure($r2);}),1274);$r1.value=["if",$vars.c,$vars.t,$vars.f];return this._endStructure($r1);},function(){var $r1=this._startStructure(1288);this._appendStructure($r1,this._applyWithArgs("token","while"),1290);this._appendStructure($r1,this._applyWithArgs("token","("),1292);$vars.c=this._appendStructure($r1,this._apply("expr"),1295);this._appendStructure($r1,this._applyWithArgs("token",")"),1297);$vars.s=this._appendStructure($r1,this._apply("stmt"),1300);$r1.value=["while",$vars.c,$vars.s,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(1303);this._appendStructure($r1,this._applyWithArgs("token","do"),1305);$vars.s=this._appendStructure($r1,this._apply("stmt"),1308);this._appendStructure($r1,this._applyWithArgs("token","while"),1310);this._appendStructure($r1,this._applyWithArgs("token","("),1312);$vars.c=this._appendStructure($r1,this._apply("expr"),1315);this._appendStructure($r1,this._applyWithArgs("token",")"),1317);this._appendStructure($r1,this._apply("sc"),1319);$r1.value=["doWhile",$vars.s,$vars.c,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(1322);this._appendStructure($r1,this._applyWithArgs("token","for"),1324);this._appendStructure($r1,this._applyWithArgs("token","("),1326);$vars.i=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1331);$vars.decl=this._appendStructure($r2,this._apply("varBinder"),1334);$vars.bs=this._appendStructure($r2,this._applyWithArgs("listOf","varBinding",","),1337);$r2.value=["beginVars",$vars.decl].concat($vars.bs);return this._endStructure($r2);},function(){return this._forwardStructure(this._apply("expr"),1342);},function(){var $r2=this._startStructure(1344);this._appendStructure($r2,this._apply("empty"),1346);$r2.value=["get","undefined"];return this._endStructure($r2);}),1329);this._appendStructure($r1,this._applyWithArgs("token",";"),1349);$vars.c=this._appendStructure($r1,this._or(function(){return this._forwardStructure(this._apply("expr"),1354);},function(){var $r2=this._startStructure(1356);this._appendStructure($r2,this._apply("empty"),1358);$r2.value=["get","true"];return this._endStructure($r2);}),1352);this._appendStructure($r1,this._applyWithArgs("token",";"),1361);$vars.u=this._appendStructure($r1,this._or(function(){return this._forwardStructure(this._apply("expr"),1366);},function(){var $r2=this._startStructure(1368);this._appendStructure($r2,this._apply("empty"),1370);$r2.value=["get","undefined"];return this._endStructure($r2);}),1364);this._appendStructure($r1,this._applyWithArgs("token",")"),1373);$vars.s=this._appendStructure($r1,this._apply("stmt"),1376);$r1.value=["for",$vars.i,$vars.c,$vars.u,$vars.s,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(1379);this._appendStructure($r1,this._applyWithArgs("token","for"),1381);this._appendStructure($r1,this._applyWithArgs("token","("),1383);$vars.v=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1388);$vars.decl=this._appendStructure($r2,this._apply("varBinder"),1391);$vars.n=this._appendStructure($r2,this._applyWithArgs("token","name"),1394);$r2.value=["beginVars",$vars.decl,["noAssignVar",$vars.n]];return this._endStructure($r2);},function(){return this._forwardStructure(this._apply("expr"),1397);}),1386);this._appendStructure($r1,this._applyWithArgs("token","in"),1399);$vars.e=this._appendStructure($r1,this._apply("expr"),1402);this._appendStructure($r1,this._applyWithArgs("token",")"),1404);$vars.s=this._appendStructure($r1,this._apply("stmt"),1407);$r1.value=["forIn",$vars.v,$vars.e,$vars.s,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(1410);this._appendStructure($r1,this._applyWithArgs("token","switch"),1412);this._appendStructure($r1,this._applyWithArgs("token","("),1414);$vars.e=this._appendStructure($r1,this._apply("expr"),1417);this._appendStructure($r1,this._applyWithArgs("token",")"),1419);this._appendStructure($r1,this._applyWithArgs("token","{"),1421);$vars.cs=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._or(function(){var $r3=this._startStructure(1428);this._appendStructure($r3,this._applyWithArgs("token","case"),1430);$vars.c=this._appendStructure($r3,this._apply("expr"),1433);this._appendStructure($r3,this._applyWithArgs("token",":"),1435);$vars.cs=this._appendStructure($r3,this._apply("srcElems"),1438);$r3.value=["case",$vars.c,["begin",$vars.cs]];return this._endStructure($r3);},function(){var $r3=this._startStructure(1441);this._appendStructure($r3,this._applyWithArgs("token","default"),1443);this._appendStructure($r3,this._applyWithArgs("token",":"),1445);$vars.cs=this._appendStructure($r3,this._apply("srcElems"),1448);$r3.value=["default",["begin",$vars.cs]];return this._endStructure($r3);}),1426);}),1424);this._appendStructure($r1,this._applyWithArgs("token","}"),1451);$r1.value=["switch",$vars.e].concat($vars.cs);return this._endStructure($r1);},function(){var $r1=this._startStructure(1454);this._appendStructure($r1,this._applyWithArgs("token","break"),1456);this._appendStructure($r1,this._apply("sc"),1458);$r1.value=["break"];return this._endStructure($r1);},function(){var $r1=this._startStructure(1461);this._appendStructure($r1,this._applyWithArgs("token","continue"),1463);this._appendStructure($r1,this._apply("sc"),1465);$r1.value=["continue"];return this._endStructure($r1);},function(){var $r1=this._startStructure(1468);this._appendStructure($r1,this._applyWithArgs("token","throw"),1470);this._appendStructure($r1,this._apply("spacesNoNl"),1472);$vars.e=this._appendStructure($r1,this._apply("expr"),1475);this._appendStructure($r1,this._apply("sc"),1477);$r1.value=["throw",$vars.e];return this._endStructure($r1);},function(){var $r1=this._startStructure(1480);this._appendStructure($r1,this._applyWithArgs("token","try"),1482);$vars.t=this._appendStructure($r1,this._apply("block"),1485);this._appendStructure($r1,this._applyWithArgs("token","catch"),1487);this._appendStructure($r1,this._applyWithArgs("token","("),1489);$vars.e=this._appendStructure($r1,this._applyWithArgs("token","name"),1492);this._appendStructure($r1,this._applyWithArgs("token",")"),1494);$vars.c=this._appendStructure($r1,this._apply("block"),1497);$vars.f=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1502);this._appendStructure($r2,this._applyWithArgs("token","finally"),1504);$r2.value=this._appendStructure($r2,this._apply("block"),1506);return this._endStructure($r2);},function(){var $r2=this._startStructure(1508);this._appendStructure($r2,this._apply("empty"),1510);$r2.value=["get","undefined"];return this._endStructure($r2);}),1500);$r1.value=["try",$vars.t,$vars.e,$vars.c,$vars.f];return this._endStructure($r1);},function(){var $r1=this._startStructure(1514);this._appendStructure($r1,this._applyWithArgs("token","return"),1516);$vars.e=this._appendStructure($r1,this._or(function(){return this._forwardStructure(this._apply("expr"),1521);},function(){var $r2=this._startStructure(1523);this._appendStructure($r2,this._apply("empty"),1525);$r2.value=["get","undefined"];return this._endStructure($r2);}),1519);this._appendStructure($r1,this._apply("sc"),1528);$r1.value=["return",$vars.e,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(1531);this._appendStructure($r1,this._applyWithArgs("token","with"),1533);this._appendStructure($r1,this._applyWithArgs("token","("),1535);$vars.x=this._appendStructure($r1,this._apply("expr"),1538);this._appendStructure($r1,this._applyWithArgs("token",")"),1540);$vars.s=this._appendStructure($r1,this._apply("stmt"),1543);$r1.value=["with",$vars.x,$vars.s];return this._endStructure($r1);},function(){var $r1=this._startStructure(1546);$vars.e=this._appendStructure($r1,this._apply("expr"),1549);this._appendStructure($r1,this._apply("sc"),1551);$r1.value=$vars.e;return this._endStructure($r1);},function(){var $r1=this._startStructure(1554);this._appendStructure($r1,this._applyWithArgs("token",";"),1556);$r1.value=["get","undefined"];return this._endStructure($r1);}),1242);return this._endStructure($r0);},
"srcElem":function(){var $elf=this,$vars={},$r0=this._startStructure(1559, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1562);this._appendStructure($r1,this._applyWithArgs("token","function"),1564);$vars.n=this._appendStructure($r1,this._applyWithArgs("token","name"),1567);$vars.f=this._appendStructure($r1,this._apply("funcRest"),1570);$r1.value=["assignVar",$vars.n,$vars.f,this._extractLocation($r1)];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("stmt"),1573);}),1560);return this._endStructure($r0);},
"srcElems":function(){var $elf=this,$vars={},$r0=this._startStructure(1575, true);$vars.ss=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("srcElem"),1580);}),1578);$r0.value=["beginTop"].concat($vars.ss);return this._endStructure($r0);},
"topLevel":function(){var $elf=this,$vars={},$r0=this._startStructure(1583, true);$vars.r=this._appendStructure($r0,this._apply("srcElems"),1586);this._appendStructure($r0,this._apply("spaces"),1588);this._appendStructure($r0,this.end(),1590);$r0.value=$vars.r;return this._endStructure($r0);}});(BSJSParser["hexDigits"]="0123456789abcdef");(BSJSParser["keywords"]=({}));(keywords=["break","case","catch","continue","default","delete","do","else","finally","for","function","if","in","instanceof","new","return","switch","this","throw","try","typeof","var","void","while","with","ometa","let","const"]);for(var idx=(0);(idx < keywords["length"]);idx++){(BSJSParser["keywords"][keywords[idx]]=true);}(BSJSParser["_isKeyword"]=(function (k){return this["keywords"].hasOwnProperty(k);}));let emitValue=(function (location,variable,expr){return ["$v(",location["start"],",",location["stop"],",\"",variable,"\",",expr,")"].join("");});let emitValueBefore=(function (expr,opExpr,loc){return ["(function(){",opExpr,";var $r=",expr,";return ",emitValue(loc,expr,"$r"),";})()"].join("");});let emitEvent=(function (location,name){return ["$e(",location["start"],",",location["stop"],",\"",name,"\")"].join("");});let BSJSTranslator=objectThatDelegatesTo(OMeta,{
"trans":function(){var $elf=this,$vars={},$r0=this._startStructure(1594, true);this._appendStructure($r0,this._form(function(){var $r1=this._startStructure(1598);$vars.t=this._getStructureValue(this.anything());$r1.value=($vars.ans=this._appendStructure($r1,this._apply($vars.t),1603));return this._endStructure($r1);}),1596);$r0.value=$vars.ans;return this._endStructure($r0);},
"curlyTrans":function(){var $elf=this,$vars={},$r0=this._startStructure(1607, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1610);this._appendStructure($r1,this._form(function(){var $r2=this._startStructure(1614);this._appendStructure($r2,this.exactly("begin"),1616);$r2.value=($vars.r=this._appendStructure($r2,this._apply("curlyTrans"),1620));return this._endStructure($r2);}),1612);$r1.value=$vars.r;return this._endStructure($r1);},function(){var $r1=this._startStructure(1623);this._appendStructure($r1,this._form(function(){var $r2=this._startStructure(1627);this._appendStructure($r2,this.exactly("begin"),1629);$r2.value=($vars.rs=this._appendStructure($r2,this._many(function(){return this._forwardStructure(this._apply("trans"),1635);}),1633));return this._endStructure($r2);}),1625);$r1.value=(("{" + $vars.rs.join(";")) + ";}");return this._endStructure($r1);},function(){var $r1=this._startStructure(1638);$vars.r=this._appendStructure($r1,this._apply("trans"),1641);$r1.value=(("{" + $vars.r) + ";}");return this._endStructure($r1);}),1608);return this._endStructure($r0);},
"this":function(){var $elf=this,$vars={},$r0=this._startStructure(1644, true);$r0.value="this";return this._endStructure($r0);},
"break":function(){var $elf=this,$vars={},$r0=this._startStructure(1646, true);$r0.value="break";return this._endStructure($r0);},
"continue":function(){var $elf=this,$vars={},$r0=this._startStructure(1648, true);$r0.value="continue";return this._endStructure($r0);},
"number":function(){var $elf=this,$vars={},$r0=this._startStructure(1650, true);$vars.n=this._getStructureValue(this.anything());$r0.value=(("(" + $vars.n) + ")");return this._endStructure($r0);},
"string":function(){var $elf=this,$vars={},$r0=this._startStructure(1654, true);$vars.s=this._getStructureValue(this.anything());$r0.value=$vars.s.toProgramString();return this._endStructure($r0);},
"name":function(){var $elf=this,$vars={},$r0=this._startStructure(1658, true);$vars.s=this._getStructureValue(this.anything());$r0.value=$vars.s;return this._endStructure($r0);},
"regExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(1662, true);$vars.x=this._getStructureValue(this.anything());$r0.value=$vars.x;return this._endStructure($r0);},
"arr":function(){var $elf=this,$vars={},$r0=this._startStructure(1666, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1671);}),1669);$r0.value=(("[" + $vars.xs.join(",")) + "]");return this._endStructure($r0);},
"unop":function(){var $elf=this,$vars={},$r0=this._startStructure(1674, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1678);$r0.value=(((("(" + $vars.op) + " ") + $vars.x) + ")");return this._endStructure($r0);},
"getp":function(){var $elf=this,$vars={},$r0=this._startStructure(1681, true);$vars.fd=this._appendStructure($r0,this._apply("trans"),1684);$vars.x=this._appendStructure($r0,this._apply("trans"),1687);$r0.value=((($vars.x + "[") + $vars.fd) + "]");return this._endStructure($r0);},
"get":function(){var $elf=this,$vars={},$r0=this._startStructure(1690, true);$vars.x=this._getStructureValue(this.anything());$r0.value=$vars.x;return this._endStructure($r0);},
"set":function(){var $elf=this,$vars={},$r0=this._startStructure(1694, true);$vars.lhs=this._appendStructure($r0,this._apply("trans"),1697);$vars.rhs=this._appendStructure($r0,this._apply("trans"),1700);$vars.l=this._getStructureValue(this.anything());$r0.value=(((("(" + $vars.lhs) + "=") + emitValue($vars.l,$vars.lhs,$vars.rhs)) + ")");return this._endStructure($r0);},
"mset":function(){var $elf=this,$vars={},$r0=this._startStructure(1704, true);$vars.lhs=this._appendStructure($r0,this._apply("trans"),1707);$vars.op=this._getStructureValue(this.anything());$vars.rhs=this._appendStructure($r0,this._apply("trans"),1711);$vars.l=this._getStructureValue(this.anything());$r0.value=(((("(" + $vars.lhs) + "=") + emitValue($vars.l,$vars.lhs,(((($vars.lhs + " ") + $vars.op) + " ") + $vars.rhs))) + ")");return this._endStructure($r0);},
"binop":function(){var $elf=this,$vars={},$r0=this._startStructure(1715, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1719);$vars.y=this._appendStructure($r0,this._apply("trans"),1722);$r0.value=(((((("(" + $vars.x) + " ") + $vars.op) + " ") + $vars.y) + ")");return this._endStructure($r0);},
"preop":function(){var $elf=this,$vars={},$r0=this._startStructure(1725, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1729);$vars.l=this._getStructureValue(this.anything());$r0.value=((($vars.op + $vars.x) + ",") + emitValue($vars.l,$vars.x,$vars.x));return this._endStructure($r0);},
"postop":function(){var $elf=this,$vars={},$r0=this._startStructure(1733, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1737);$vars.l=this._getStructureValue(this.anything());$r0.value=emitValueBefore($vars.x,($vars.x + $vars.op),$vars.l);return this._endStructure($r0);},
"return":function(){var $elf=this,$vars={},$r0=this._startStructure(1741, true);$vars.x=this._appendStructure($r0,this._apply("trans"),1744);$vars.l=this._getStructureValue(this.anything());$r0.value=("return " + emitValue($vars.l,"return",$vars.x));return this._endStructure($r0);},
"with":function(){var $elf=this,$vars={},$r0=this._startStructure(1748, true);$vars.x=this._appendStructure($r0,this._apply("trans"),1751);$vars.s=this._appendStructure($r0,this._apply("curlyTrans"),1754);$r0.value=((("with(" + $vars.x) + ")") + $vars.s);return this._endStructure($r0);},
"if":function(){var $elf=this,$vars={},$r0=this._startStructure(1757, true);$vars.cond=this._appendStructure($r0,this._apply("trans"),1760);$vars.t=this._appendStructure($r0,this._apply("curlyTrans"),1763);$vars.e=this._appendStructure($r0,this._apply("curlyTrans"),1766);$r0.value=((((("if(" + $vars.cond) + ")") + $vars.t) + "else") + $vars.e);return this._endStructure($r0);},
"condExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(1769, true);$vars.cond=this._appendStructure($r0,this._apply("trans"),1772);$vars.t=this._appendStructure($r0,this._apply("trans"),1775);$vars.e=this._appendStructure($r0,this._apply("trans"),1778);$r0.value=(((((("(" + $vars.cond) + "?") + $vars.t) + ":") + $vars.e) + ")");return this._endStructure($r0);},
"while":function(){var $elf=this,$vars={},$r0=this._startStructure(1781, true);$vars.cond=this._appendStructure($r0,this._apply("trans"),1784);$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),1787);$vars.l=this._getStructureValue(this.anything());$r0.value=((("while(" + $vars.cond) + ")") + $vars.body);return this._endStructure($r0);},
"doWhile":function(){var $elf=this,$vars={},$r0=this._startStructure(1791, true);$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),1794);$vars.cond=this._appendStructure($r0,this._apply("trans"),1797);$vars.l=this._getStructureValue(this.anything());$r0.value=(((("do" + $vars.body) + "while(") + $vars.cond) + ")");return this._endStructure($r0);},
"for":function(){var $elf=this,$vars={},$r0=this._startStructure(1801, true);$vars.init=this._appendStructure($r0,this._apply("trans"),1804);$vars.cond=this._appendStructure($r0,this._apply("trans"),1807);$vars.upd=this._appendStructure($r0,this._apply("trans"),1810);$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),1813);$vars.l=this._getStructureValue(this.anything());$r0.value=((((((("for(" + $vars.init) + ";") + $vars.cond) + ";") + $vars.upd) + ")") + $vars.body);return this._endStructure($r0);},
"forIn":function(){var $elf=this,$vars={},$r0=this._startStructure(1817, true);$vars.x=this._appendStructure($r0,this._apply("trans"),1820);$vars.arr=this._appendStructure($r0,this._apply("trans"),1823);$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),1826);$vars.l=this._getStructureValue(this.anything());$r0.value=((((("for(" + $vars.x) + " in ") + $vars.arr) + ")") + $vars.body);return this._endStructure($r0);},
"beginTop":function(){var $elf=this,$vars={},$r0=this._startStructure(1830, true);$vars.xs=this._appendStructure($r0,this._many(function(){var $r1=this._startStructure(1835);$vars.x=this._appendStructure($r1,this._apply("trans"),1838);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1842);this._appendStructure($r2,this._or(function(){var $r3=this._startStructure(1845);$r3.value=this._pred(($vars.x[($vars.x["length"] - (1))] == "}"));return this._endStructure($r3);},function(){return this._forwardStructure(this.end(),1848);}),1844);$r2.value=$vars.x;return this._endStructure($r2);},function(){var $r2=this._startStructure(1851);this._appendStructure($r2,this._apply("empty"),1853);$r2.value=($vars.x + ";");return this._endStructure($r2);}),1840);return this._endStructure($r1);}),1833);$r0.value=$vars.xs.join("");return this._endStructure($r0);},
"begin":function(){var $elf=this,$vars={},$r0=this._startStructure(1857, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1860);$vars.x=this._appendStructure($r1,this._apply("trans"),1863);this._appendStructure($r1,this.end(),1865);$r1.value=$vars.x;return this._endStructure($r1);},function(){var $r1=this._startStructure(1868);$vars.xs=this._appendStructure($r1,this._many(function(){var $r2=this._startStructure(1873);$vars.x=this._appendStructure($r2,this._apply("trans"),1876);$r2.value=this._appendStructure($r2,this._or(function(){var $r3=this._startStructure(1880);this._appendStructure($r3,this._or(function(){var $r4=this._startStructure(1883);$r4.value=this._pred(($vars.x[($vars.x["length"] - (1))] == "}"));return this._endStructure($r4);},function(){return this._forwardStructure(this.end(),1886);}),1882);$r3.value=$vars.x;return this._endStructure($r3);},function(){var $r3=this._startStructure(1889);this._appendStructure($r3,this._apply("empty"),1891);$r3.value=($vars.x + ";");return this._endStructure($r3);}),1878);return this._endStructure($r2);}),1871);$r1.value=(("{" + $vars.xs.join("")) + "}");return this._endStructure($r1);}),1858);return this._endStructure($r0);},
"beginVars":function(){var $elf=this,$vars={},$r0=this._startStructure(1895, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1898);$vars.decl=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r1,this._apply("trans"),1902);this._appendStructure($r1,this.end(),1904);$r1.value=(($vars.decl + " ") + $vars.x);return this._endStructure($r1);},function(){var $r1=this._startStructure(1907);$vars.decl=this._getStructureValue(this.anything());$vars.xs=this._appendStructure($r1,this._many(function(){var $r2=this._startStructure(1912);$r2.value=($vars.x=this._appendStructure($r2,this._apply("trans"),1915));return this._endStructure($r2);}),1911);$r1.value=(($vars.decl + " ") + $vars.xs.join(","));return this._endStructure($r1);}),1896);return this._endStructure($r0);},
"func":function(){var $elf=this,$vars={},$r0=this._startStructure(1918, true);$vars.args=this._getStructureValue(this.anything());$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),1922);$r0.value=(((("(function (" + $vars.args.join(",")) + ")") + $vars.body) + ")");return this._endStructure($r0);},
"call":function(){var $elf=this,$vars={},$r0=this._startStructure(1925, true);$vars.fn=this._appendStructure($r0,this._apply("trans"),1928);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1933);}),1931);$vars.l=this._getStructureValue(this.anything());$r0.value=(($vars.fn == "log")?((($vars.fn + "(") + emitValue($vars.l,$vars.fn,$vars.args.join(","))) + ")"):((($vars.fn + "(") + $vars.args.join(",")) + ")"));return this._endStructure($r0);},
"send":function(){var $elf=this,$vars={},$r0=this._startStructure(1937, true);$vars.msg=this._getStructureValue(this.anything());$vars.recv=this._appendStructure($r0,this._apply("trans"),1941);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1946);}),1944);$r0.value=((((($vars.recv + ".") + $vars.msg) + "(") + $vars.args.join(",")) + ")");return this._endStructure($r0);},
"new":function(){var $elf=this,$vars={},$r0=this._startStructure(1949, true);$vars.x=this._appendStructure($r0,this._apply("trans"),1952);$r0.value=("new " + $vars.x);return this._endStructure($r0);},
"assignVar":function(){var $elf=this,$vars={},$r0=this._startStructure(1955, true);$vars.name=this._getStructureValue(this.anything());$vars.val=this._appendStructure($r0,this._apply("trans"),1959);$vars.l=this._getStructureValue(this.anything());$r0.value=(($vars.name + "=") + emitValue($vars.l,$vars.name,$vars.val));return this._endStructure($r0);},
"noAssignVar":function(){var $elf=this,$vars={},$r0=this._startStructure(1963, true);$vars.name=this._getStructureValue(this.anything());$r0.value=$vars.name;return this._endStructure($r0);},
"throw":function(){var $elf=this,$vars={},$r0=this._startStructure(1967, true);$vars.x=this._appendStructure($r0,this._apply("trans"),1970);$r0.value=("throw " + $vars.x);return this._endStructure($r0);},
"try":function(){var $elf=this,$vars={},$r0=this._startStructure(1973, true);$vars.x=this._appendStructure($r0,this._apply("curlyTrans"),1976);$vars.name=this._getStructureValue(this.anything());$vars.c=this._appendStructure($r0,this._apply("curlyTrans"),1980);$vars.f=this._appendStructure($r0,this._apply("curlyTrans"),1983);$r0.value=((((((("try " + $vars.x) + "catch(") + $vars.name) + ")") + $vars.c) + "finally") + $vars.f);return this._endStructure($r0);},
"json":function(){var $elf=this,$vars={},$r0=this._startStructure(1986, true);$vars.props=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1991);}),1989);$r0.value=(("({" + $vars.props.join(",")) + "})");return this._endStructure($r0);},
"binding":function(){var $elf=this,$vars={},$r0=this._startStructure(1994, true);$vars.name=this._getStructureValue(this.anything());$vars.val=this._appendStructure($r0,this._apply("trans"),1998);$r0.value=(($vars.name.toProgramString() + ": ") + $vars.val);return this._endStructure($r0);},
"switch":function(){var $elf=this,$vars={},$r0=this._startStructure(2001, true);$vars.x=this._appendStructure($r0,this._apply("trans"),2004);$vars.cases=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),2009);}),2007);$r0.value=(((("switch(" + $vars.x) + "){") + $vars.cases.join(";")) + "}");return this._endStructure($r0);},
"case":function(){var $elf=this,$vars={},$r0=this._startStructure(2012, true);$vars.x=this._appendStructure($r0,this._apply("trans"),2015);$vars.y=this._appendStructure($r0,this._apply("trans"),2018);$r0.value=((("case " + $vars.x) + ": ") + $vars.y);return this._endStructure($r0);},
"default":function(){var $elf=this,$vars={},$r0=this._startStructure(2021, true);$vars.y=this._appendStructure($r0,this._apply("trans"),2024);$r0.value=("default: " + $vars.y);return this._endStructure($r0);}})

