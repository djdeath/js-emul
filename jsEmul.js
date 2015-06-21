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
  window._OMetafail = new Error();
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
    return { start: retVal.start.idx,
             stop: this.input.idx, };
  },
  _structureLocation: function(input) {
    return { idx: input.idx };
  },
  _startStructure: function(id, rule) {
    return {
      rule: rule,
      id: id,
      start: this._structureLocation(this.input),
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
  _structureMatches: function(parent, child) {
    return (parent.start.idx == child.start.idx &&
            parent.stop.idx == child.stop.idx);
  },
  _endStructure: function(structure) {
    structure.stop = this._structureLocation(this.input);
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
"fromTo":function(){var $elf=this,$vars={},$r0=this._startStructure(115, true);$vars.x=this._getStructureValue(this.anything());$vars.y=this._getStructureValue(this.anything());$r0.value=this._appendStructure($r0,this._consumedBy(function(){var $r1=this._startStructure(121);this._appendStructure($r1,this.seq($vars.x),123);this._appendStructure($r1,this._many(function(){var $r2=this._startStructure(128);this._appendStructure($r2,this._not(function(){return this._forwardStructure(this.seq($vars.y),132);}),130);$r2.value=this._appendStructure($r2,this._apply("char"),135);return this._endStructure($r2);}),126);$r1.value=this._appendStructure($r1,this.seq($vars.y),137);return this._endStructure($r1);}),119);return this._endStructure($r0);}})
let BSJSParser=objectThatDelegatesTo(BaseStrParser,{
"enum":function(){var $elf=this,$vars={},$r0=this._startStructure(141, true);$vars.r=this._getStructureValue(this.anything());$vars.d=this._getStructureValue(this.anything());$vars.v=this._appendStructure($r0,this._applyWithArgs("listOf",$vars.r,$vars.d),146);this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._applyWithArgs("token",","),152);},function(){return this._forwardStructure(this._apply("empty"),154);}),150);$r0.value=$vars.v;return this._endStructure($r0);},
"space":function(){var $elf=this,$vars={},$r0=this._startStructure(157, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(BaseStrParser._superApplyWithArgs(this,"space"),160);},function(){return this._forwardStructure(this._applyWithArgs("fromTo","//","\n"),162);},function(){return this._forwardStructure(this._applyWithArgs("fromTo","/*","*/"),166);}),158);return this._endStructure($r0);},
"nameFirst":function(){var $elf=this,$vars={},$r0=this._startStructure(170, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("letter"),173);},function(){return this._forwardStructure(this.exactly("$"),175);},function(){return this._forwardStructure(this.exactly("_"),177);}),171);return this._endStructure($r0);},
"nameRest":function(){var $elf=this,$vars={},$r0=this._startStructure(179, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("nameFirst"),182);},function(){return this._forwardStructure(this._apply("digit"),184);}),180);return this._endStructure($r0);},
"iName":function(){var $elf=this,$vars={},$r0=this._startStructure(186, true);$r0.value=this._appendStructure($r0,this._consumedBy(function(){var $r1=this._startStructure(189);this._appendStructure($r1,this._apply("nameFirst"),191);$r1.value=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._apply("nameRest"),195);}),193);return this._endStructure($r1);}),187);return this._endStructure($r0);},
"isKeyword":function(){var $elf=this,$vars={},$r0=this._startStructure(197, true);$vars.x=this._getStructureValue(this.anything());$r0.value=this._pred(BSJSParser._isKeyword($vars.x));return this._endStructure($r0);},
"name":function(){var $elf=this,$vars={},$r0=this._startStructure(202, true);$vars.n=this._appendStructure($r0,this._apply("iName"),205);this._appendStructure($r0,this._not(function(){return this._forwardStructure(this._applyWithArgs("isKeyword",$vars.n),209);}),207);$r0.value=["name",(($vars.n == "self")?"$elf":$vars.n)];return this._endStructure($r0);},
"keyword":function(){var $elf=this,$vars={},$r0=this._startStructure(213, true);$vars.k=this._appendStructure($r0,this._apply("iName"),216);this._appendStructure($r0,this._applyWithArgs("isKeyword",$vars.k),218);$r0.value=[$vars.k,$vars.k];return this._endStructure($r0);},
"hexDigit":function(){var $elf=this,$vars={},$r0=this._startStructure(222, true);$vars.x=this._appendStructure($r0,this._apply("char"),225);$vars.v=this["hexDigits"].indexOf($vars.x.toLowerCase());this._pred(($vars.v >= (0)));$r0.value=$vars.v;return this._endStructure($r0);},
"hexLit":function(){var $elf=this,$vars={},$r0=this._startStructure(232, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(235);$vars.n=this._appendStructure($r1,this._apply("hexLit"),238);$vars.d=this._appendStructure($r1,this._apply("hexDigit"),241);$r1.value=(($vars.n * (16)) + $vars.d);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("hexDigit"),244);}),233);return this._endStructure($r0);},
"number":function(){var $elf=this,$vars={},$r0=this._startStructure(246, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(249);this._appendStructure($r1,this.exactly("0"),250);this._appendStructure($r1,this.exactly("x"),250);"0x";$vars.n=this._appendStructure($r1,this._apply("hexLit"),252);$r1.value=["number",$vars.n];return this._endStructure($r1);},function(){var $r1=this._startStructure(255);$vars.f=this._appendStructure($r1,this._consumedBy(function(){var $r2=this._startStructure(260);this._appendStructure($r2,this._many1(function(){return this._forwardStructure(this._apply("digit"),264);}),262);$r2.value=this._appendStructure($r2,this._opt(function(){var $r3=this._startStructure(268);this._appendStructure($r3,this.exactly("."),270);$r3.value=this._appendStructure($r3,this._many1(function(){return this._forwardStructure(this._apply("digit"),274);}),272);return this._endStructure($r3);}),266);return this._endStructure($r2);}),258);$r1.value=["number",parseFloat($vars.f)];return this._endStructure($r1);}),247);return this._endStructure($r0);},
"escapeChar":function(){var $elf=this,$vars={},$r0=this._startStructure(277, true);$vars.s=this._appendStructure($r0,this._consumedBy(function(){var $r1=this._startStructure(282);this._appendStructure($r1,this.exactly("\\"),284);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(288);this._appendStructure($r2,this.exactly("u"),290);this._appendStructure($r2,this._apply("hexDigit"),292);this._appendStructure($r2,this._apply("hexDigit"),294);this._appendStructure($r2,this._apply("hexDigit"),296);$r2.value=this._appendStructure($r2,this._apply("hexDigit"),298);return this._endStructure($r2);},function(){var $r2=this._startStructure(300);this._appendStructure($r2,this.exactly("x"),302);this._appendStructure($r2,this._apply("hexDigit"),304);$r2.value=this._appendStructure($r2,this._apply("hexDigit"),306);return this._endStructure($r2);},function(){return this._forwardStructure(this._apply("char"),308);}),286);return this._endStructure($r1);}),280);$r0.value=unescape($vars.s);return this._endStructure($r0);},
"str":function(){var $elf=this,$vars={},$r0=this._startStructure(311, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(314);this._appendStructure($r1,this.exactly("\""),315);this._appendStructure($r1,this.exactly("\""),315);this._appendStructure($r1,this.exactly("\""),315);"\"\"\"";$vars.cs=this._appendStructure($r1,this._many(function(){var $r2=this._startStructure(319);this._appendStructure($r2,this._not(function(){var $r3=this._startStructure(323);this._appendStructure($r3,this.exactly("\""),324);this._appendStructure($r3,this.exactly("\""),324);this._appendStructure($r3,this.exactly("\""),324);$r3.value="\"\"\"";return this._endStructure($r3);}),321);$r2.value=this._appendStructure($r2,this._apply("char"),325);return this._endStructure($r2);}),317);this._appendStructure($r1,this.exactly("\""),315);this._appendStructure($r1,this.exactly("\""),315);this._appendStructure($r1,this.exactly("\""),315);"\"\"\"";$r1.value=["string",$vars.cs.join("")];return this._endStructure($r1);},function(){var $r1=this._startStructure(328);this._appendStructure($r1,this.exactly("\'"),330);$vars.cs=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this._apply("escapeChar"),337);},function(){var $r3=this._startStructure(339);this._appendStructure($r3,this._not(function(){return this._forwardStructure(this.exactly("\'"),343);}),341);$r3.value=this._appendStructure($r3,this._apply("char"),345);return this._endStructure($r3);}),335);}),333);this._appendStructure($r1,this.exactly("\'"),347);$r1.value=["string",$vars.cs.join("")];return this._endStructure($r1);},function(){var $r1=this._startStructure(350);this._appendStructure($r1,this.exactly("\""),352);$vars.cs=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this._apply("escapeChar"),359);},function(){var $r3=this._startStructure(361);this._appendStructure($r3,this._not(function(){return this._forwardStructure(this.exactly("\""),365);}),363);$r3.value=this._appendStructure($r3,this._apply("char"),367);return this._endStructure($r3);}),357);}),355);this._appendStructure($r1,this.exactly("\""),369);$r1.value=["string",$vars.cs.join("")];return this._endStructure($r1);},function(){var $r1=this._startStructure(372);this._appendStructure($r1,this._or(function(){return this._forwardStructure(this.exactly("#"),376);},function(){return this._forwardStructure(this.exactly("`"),378);}),374);$vars.n=this._appendStructure($r1,this._apply("iName"),381);$r1.value=["string",$vars.n];return this._endStructure($r1);}),312);return this._endStructure($r0);},
"special":function(){var $elf=this,$vars={},$r0=this._startStructure(384, true);$vars.s=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this.exactly("("),389);},function(){return this._forwardStructure(this.exactly(")"),391);},function(){return this._forwardStructure(this.exactly("{"),393);},function(){return this._forwardStructure(this.exactly("}"),395);},function(){return this._forwardStructure(this.exactly("["),397);},function(){return this._forwardStructure(this.exactly("]"),399);},function(){return this._forwardStructure(this.exactly(","),401);},function(){return this._forwardStructure(this.exactly(";"),403);},function(){return this._forwardStructure(this.exactly("?"),405);},function(){return this._forwardStructure(this.exactly(":"),407);},function(){var $r1=this._startStructure(409);this._appendStructure($r1,this.exactly("!"),410);this._appendStructure($r1,this.exactly("="),410);this._appendStructure($r1,this.exactly("="),410);$r1.value="!==";return this._endStructure($r1);},function(){var $r1=this._startStructure(411);this._appendStructure($r1,this.exactly("!"),412);this._appendStructure($r1,this.exactly("="),412);$r1.value="!=";return this._endStructure($r1);},function(){var $r1=this._startStructure(413);this._appendStructure($r1,this.exactly("="),414);this._appendStructure($r1,this.exactly("="),414);this._appendStructure($r1,this.exactly("="),414);$r1.value="===";return this._endStructure($r1);},function(){var $r1=this._startStructure(415);this._appendStructure($r1,this.exactly("="),416);this._appendStructure($r1,this.exactly("="),416);$r1.value="==";return this._endStructure($r1);},function(){var $r1=this._startStructure(417);this._appendStructure($r1,this.exactly("="),418);$r1.value="=";return this._endStructure($r1);},function(){var $r1=this._startStructure(419);this._appendStructure($r1,this.exactly(">"),420);this._appendStructure($r1,this.exactly("="),420);$r1.value=">=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly(">"),421);},function(){var $r1=this._startStructure(423);this._appendStructure($r1,this.exactly("<"),424);this._appendStructure($r1,this.exactly("="),424);$r1.value="<=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("<"),425);},function(){var $r1=this._startStructure(427);this._appendStructure($r1,this.exactly("+"),428);this._appendStructure($r1,this.exactly("+"),428);$r1.value="++";return this._endStructure($r1);},function(){var $r1=this._startStructure(429);this._appendStructure($r1,this.exactly("+"),430);this._appendStructure($r1,this.exactly("="),430);$r1.value="+=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("+"),431);},function(){var $r1=this._startStructure(433);this._appendStructure($r1,this.exactly("-"),434);this._appendStructure($r1,this.exactly("-"),434);$r1.value="--";return this._endStructure($r1);},function(){var $r1=this._startStructure(435);this._appendStructure($r1,this.exactly("-"),436);this._appendStructure($r1,this.exactly("="),436);$r1.value="-=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("-"),437);},function(){var $r1=this._startStructure(439);this._appendStructure($r1,this.exactly("*"),440);this._appendStructure($r1,this.exactly("="),440);$r1.value="*=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("*"),441);},function(){var $r1=this._startStructure(443);this._appendStructure($r1,this.exactly("/"),444);this._appendStructure($r1,this.exactly("="),444);$r1.value="/=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("/"),445);},function(){var $r1=this._startStructure(447);this._appendStructure($r1,this.exactly("%"),448);this._appendStructure($r1,this.exactly("="),448);$r1.value="%=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("%"),449);},function(){var $r1=this._startStructure(451);this._appendStructure($r1,this.exactly("&"),452);this._appendStructure($r1,this.exactly("&"),452);this._appendStructure($r1,this.exactly("="),452);$r1.value="&&=";return this._endStructure($r1);},function(){var $r1=this._startStructure(453);this._appendStructure($r1,this.exactly("&"),454);this._appendStructure($r1,this.exactly("&"),454);$r1.value="&&";return this._endStructure($r1);},function(){var $r1=this._startStructure(455);this._appendStructure($r1,this.exactly("|"),456);this._appendStructure($r1,this.exactly("|"),456);this._appendStructure($r1,this.exactly("="),456);$r1.value="||=";return this._endStructure($r1);},function(){var $r1=this._startStructure(457);this._appendStructure($r1,this.exactly("|"),458);this._appendStructure($r1,this.exactly("|"),458);$r1.value="||";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("."),459);},function(){return this._forwardStructure(this.exactly("!"),461);}),387);$r0.value=[$vars.s,$vars.s];return this._endStructure($r0);},
"tok":function(){var $elf=this,$vars={},$r0=this._startStructure(464, true);this._appendStructure($r0,this._apply("spaces"),466);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("name"),470);},function(){return this._forwardStructure(this._apply("keyword"),472);},function(){return this._forwardStructure(this._apply("number"),474);},function(){return this._forwardStructure(this._apply("str"),476);},function(){return this._forwardStructure(this._apply("special"),478);}),468);return this._endStructure($r0);},
"toks":function(){var $elf=this,$vars={},$r0=this._startStructure(480, true);$vars.ts=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("token"),485);}),483);this._appendStructure($r0,this._apply("spaces"),487);this._appendStructure($r0,this.end(),489);$r0.value=$vars.ts;return this._endStructure($r0);},
"token":function(){var $elf=this,$vars={},$r0=this._startStructure(492, true);$vars.tt=this._getStructureValue(this.anything());$vars.t=this._appendStructure($r0,this._apply("tok"),496);this._pred(($vars.t[(0)] == $vars.tt));$r0.value=$vars.t[(1)];return this._endStructure($r0);},
"spacesNoNl":function(){var $elf=this,$vars={},$r0=this._startStructure(501, true);$r0.value=this._appendStructure($r0,this._many(function(){var $r1=this._startStructure(504);this._appendStructure($r1,this._not(function(){return this._forwardStructure(this.exactly("\n"),508);}),506);$r1.value=this._appendStructure($r1,this._apply("space"),510);return this._endStructure($r1);}),502);return this._endStructure($r0);},
"expr":function(){var $elf=this,$vars={},$r0=this._startStructure(512, true);$vars.e=this._appendStructure($r0,this._apply("orExpr"),515);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(519);this._appendStructure($r1,this._applyWithArgs("token","?"),521);$vars.t=this._appendStructure($r1,this._apply("expr"),524);this._appendStructure($r1,this._applyWithArgs("token",":"),526);$vars.f=this._appendStructure($r1,this._apply("expr"),529);$r1.value=["condExpr",$vars.e,$vars.t,$vars.f];return this._endStructure($r1);},function(){var $r1=this._startStructure(532);this._appendStructure($r1,this._applyWithArgs("token","="),534);$vars.rhs=this._appendStructure($r1,this._apply("expr"),537);$r1.value=["set",$vars.e,$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(540);this._appendStructure($r1,this._applyWithArgs("token","+="),542);$vars.rhs=this._appendStructure($r1,this._apply("expr"),545);$r1.value=["mset",$vars.e,"+",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(548);this._appendStructure($r1,this._applyWithArgs("token","-="),550);$vars.rhs=this._appendStructure($r1,this._apply("expr"),553);$r1.value=["mset",$vars.e,"-",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(556);this._appendStructure($r1,this._applyWithArgs("token","*="),558);$vars.rhs=this._appendStructure($r1,this._apply("expr"),561);$r1.value=["mset",$vars.e,"*",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(564);this._appendStructure($r1,this._applyWithArgs("token","/="),566);$vars.rhs=this._appendStructure($r1,this._apply("expr"),569);$r1.value=["mset",$vars.e,"/",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(572);this._appendStructure($r1,this._applyWithArgs("token","%="),574);$vars.rhs=this._appendStructure($r1,this._apply("expr"),577);$r1.value=["mset",$vars.e,"%",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(580);this._appendStructure($r1,this._applyWithArgs("token","&&="),582);$vars.rhs=this._appendStructure($r1,this._apply("expr"),585);$r1.value=["mset",$vars.e,"&&",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(588);this._appendStructure($r1,this._applyWithArgs("token","||="),590);$vars.rhs=this._appendStructure($r1,this._apply("expr"),593);$r1.value=["mset",$vars.e,"||",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(596);this._appendStructure($r1,this._apply("empty"),598);$r1.value=$vars.e;return this._endStructure($r1);}),517);return this._endStructure($r0);},
"orExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(601, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(604);$vars.x=this._appendStructure($r1,this._apply("orExpr"),607);this._appendStructure($r1,this._applyWithArgs("token","||"),609);$vars.y=this._appendStructure($r1,this._apply("andExpr"),612);$r1.value=["binop","||",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("andExpr"),615);}),602);return this._endStructure($r0);},
"andExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(617, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(620);$vars.x=this._appendStructure($r1,this._apply("andExpr"),623);this._appendStructure($r1,this._applyWithArgs("token","&&"),625);$vars.y=this._appendStructure($r1,this._apply("eqExpr"),628);$r1.value=["binop","&&",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("eqExpr"),631);}),618);return this._endStructure($r0);},
"eqExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(633, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(636);$vars.x=this._appendStructure($r1,this._apply("eqExpr"),639);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(643);this._appendStructure($r2,this._applyWithArgs("token","=="),645);$vars.y=this._appendStructure($r2,this._apply("relExpr"),648);$r2.value=["binop","==",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(651);this._appendStructure($r2,this._applyWithArgs("token","!="),653);$vars.y=this._appendStructure($r2,this._apply("relExpr"),656);$r2.value=["binop","!=",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(659);this._appendStructure($r2,this._applyWithArgs("token","==="),661);$vars.y=this._appendStructure($r2,this._apply("relExpr"),664);$r2.value=["binop","===",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(667);this._appendStructure($r2,this._applyWithArgs("token","!=="),669);$vars.y=this._appendStructure($r2,this._apply("relExpr"),672);$r2.value=["binop","!==",$vars.x,$vars.y];return this._endStructure($r2);}),641);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("relExpr"),675);}),634);return this._endStructure($r0);},
"relExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(677, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(680);$vars.x=this._appendStructure($r1,this._apply("relExpr"),683);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(687);this._appendStructure($r2,this._applyWithArgs("token",">"),689);$vars.y=this._appendStructure($r2,this._apply("addExpr"),692);$r2.value=["binop",">",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(695);this._appendStructure($r2,this._applyWithArgs("token",">="),697);$vars.y=this._appendStructure($r2,this._apply("addExpr"),700);$r2.value=["binop",">=",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(703);this._appendStructure($r2,this._applyWithArgs("token","<"),705);$vars.y=this._appendStructure($r2,this._apply("addExpr"),708);$r2.value=["binop","<",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(711);this._appendStructure($r2,this._applyWithArgs("token","<="),713);$vars.y=this._appendStructure($r2,this._apply("addExpr"),716);$r2.value=["binop","<=",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(719);this._appendStructure($r2,this._applyWithArgs("token","instanceof"),721);$vars.y=this._appendStructure($r2,this._apply("addExpr"),724);$r2.value=["binop","instanceof",$vars.x,$vars.y];return this._endStructure($r2);}),685);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("addExpr"),727);}),678);return this._endStructure($r0);},
"addExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(729, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(732);$vars.x=this._appendStructure($r1,this._apply("addExpr"),735);this._appendStructure($r1,this._applyWithArgs("token","+"),737);$vars.y=this._appendStructure($r1,this._apply("mulExpr"),740);$r1.value=["binop","+",$vars.x,$vars.y];return this._endStructure($r1);},function(){var $r1=this._startStructure(743);$vars.x=this._appendStructure($r1,this._apply("addExpr"),746);this._appendStructure($r1,this._applyWithArgs("token","-"),748);$vars.y=this._appendStructure($r1,this._apply("mulExpr"),751);$r1.value=["binop","-",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("mulExpr"),754);}),730);return this._endStructure($r0);},
"mulExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(756, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(759);$vars.x=this._appendStructure($r1,this._apply("mulExpr"),762);this._appendStructure($r1,this._applyWithArgs("token","*"),764);$vars.y=this._appendStructure($r1,this._apply("unary"),767);$r1.value=["binop","*",$vars.x,$vars.y];return this._endStructure($r1);},function(){var $r1=this._startStructure(770);$vars.x=this._appendStructure($r1,this._apply("mulExpr"),773);this._appendStructure($r1,this._applyWithArgs("token","/"),775);$vars.y=this._appendStructure($r1,this._apply("unary"),778);$r1.value=["binop","/",$vars.x,$vars.y];return this._endStructure($r1);},function(){var $r1=this._startStructure(781);$vars.x=this._appendStructure($r1,this._apply("mulExpr"),784);this._appendStructure($r1,this._applyWithArgs("token","%"),786);$vars.y=this._appendStructure($r1,this._apply("unary"),789);$r1.value=["binop","%",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("unary"),792);}),757);return this._endStructure($r0);},
"unary":function(){var $elf=this,$vars={},$r0=this._startStructure(794, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(797);this._appendStructure($r1,this._applyWithArgs("token","-"),799);$vars.p=this._appendStructure($r1,this._apply("postfix"),802);$r1.value=["unop","-",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(805);this._appendStructure($r1,this._applyWithArgs("token","+"),807);$vars.p=this._appendStructure($r1,this._apply("postfix"),810);$r1.value=["unop","+",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(813);this._appendStructure($r1,this._applyWithArgs("token","++"),815);$vars.p=this._appendStructure($r1,this._apply("postfix"),818);$r1.value=["preop","++",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(821);this._appendStructure($r1,this._applyWithArgs("token","--"),823);$vars.p=this._appendStructure($r1,this._apply("postfix"),826);$r1.value=["preop","--",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(829);this._appendStructure($r1,this._applyWithArgs("token","!"),831);$vars.p=this._appendStructure($r1,this._apply("unary"),834);$r1.value=["unop","!",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(837);this._appendStructure($r1,this._applyWithArgs("token","void"),839);$vars.p=this._appendStructure($r1,this._apply("unary"),842);$r1.value=["unop","void",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(845);this._appendStructure($r1,this._applyWithArgs("token","delete"),847);$vars.p=this._appendStructure($r1,this._apply("unary"),850);$r1.value=["unop","delete",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(853);this._appendStructure($r1,this._applyWithArgs("token","typeof"),855);$vars.p=this._appendStructure($r1,this._apply("unary"),858);$r1.value=["unop","typeof",$vars.p];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("postfix"),861);}),795);return this._endStructure($r0);},
"postfix":function(){var $elf=this,$vars={},$r0=this._startStructure(863, true);$vars.p=this._appendStructure($r0,this._apply("primExpr"),866);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(870);this._appendStructure($r1,this._apply("spacesNoNl"),872);this._appendStructure($r1,this._applyWithArgs("token","++"),874);$r1.value=["postop","++",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(877);this._appendStructure($r1,this._apply("spacesNoNl"),879);this._appendStructure($r1,this._applyWithArgs("token","--"),881);$r1.value=["postop","--",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(884);this._appendStructure($r1,this._apply("empty"),886);$r1.value=$vars.p;return this._endStructure($r1);}),868);return this._endStructure($r0);},
"primExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(889, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(892);$vars.p=this._appendStructure($r1,this._apply("primExpr"),895);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(899);this._appendStructure($r2,this._applyWithArgs("token","["),901);$vars.i=this._appendStructure($r2,this._apply("expr"),904);this._appendStructure($r2,this._applyWithArgs("token","]"),906);$r2.value=["getp",$vars.i,$vars.p];return this._endStructure($r2);},function(){var $r2=this._startStructure(909);this._appendStructure($r2,this._applyWithArgs("token","."),911);$vars.m=this._appendStructure($r2,this._applyWithArgs("token","name"),914);this._appendStructure($r2,this._applyWithArgs("token","("),916);$vars.as=this._appendStructure($r2,this._applyWithArgs("listOf","expr",","),919);this._appendStructure($r2,this._applyWithArgs("token",")"),923);$r2.value=["send",$vars.m,$vars.p].concat($vars.as);return this._endStructure($r2);},function(){var $r2=this._startStructure(926);this._appendStructure($r2,this._applyWithArgs("token","."),928);$vars.f=this._appendStructure($r2,this._applyWithArgs("token","name"),931);$r2.value=["getp",["string",$vars.f],$vars.p];return this._endStructure($r2);},function(){var $r2=this._startStructure(934);this._appendStructure($r2,this._applyWithArgs("token","("),936);$vars.as=this._appendStructure($r2,this._applyWithArgs("listOf","expr",","),939);this._appendStructure($r2,this._applyWithArgs("token",")"),943);$r2.value=["call",$vars.p].concat($vars.as);return this._endStructure($r2);}),897);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("primExprHd"),946);}),890);return this._endStructure($r0);},
"primExprHd":function(){var $elf=this,$vars={},$r0=this._startStructure(948, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(951);this._appendStructure($r1,this._applyWithArgs("token","("),953);$vars.e=this._appendStructure($r1,this._apply("expr"),956);this._appendStructure($r1,this._applyWithArgs("token",")"),958);$r1.value=$vars.e;return this._endStructure($r1);},function(){var $r1=this._startStructure(961);this._appendStructure($r1,this._applyWithArgs("token","this"),963);$r1.value=["this"];return this._endStructure($r1);},function(){var $r1=this._startStructure(966);$vars.n=this._appendStructure($r1,this._applyWithArgs("token","name"),969);$r1.value=["get",$vars.n];return this._endStructure($r1);},function(){var $r1=this._startStructure(972);$vars.n=this._appendStructure($r1,this._applyWithArgs("token","number"),975);$r1.value=["number",$vars.n];return this._endStructure($r1);},function(){var $r1=this._startStructure(978);$vars.s=this._appendStructure($r1,this._applyWithArgs("token","string"),981);$r1.value=["string",$vars.s];return this._endStructure($r1);},function(){var $r1=this._startStructure(984);this._appendStructure($r1,this._applyWithArgs("token","function"),986);$r1.value=this._appendStructure($r1,this._apply("funcRest"),988);return this._endStructure($r1);},function(){var $r1=this._startStructure(990);this._appendStructure($r1,this._applyWithArgs("token","new"),992);$vars.e=this._appendStructure($r1,this._apply("primExpr"),995);$r1.value=["new",$vars.e];return this._endStructure($r1);},function(){var $r1=this._startStructure(998);this._appendStructure($r1,this._applyWithArgs("token","["),1000);$vars.es=this._appendStructure($r1,this._applyWithArgs("enum","expr",","),1003);this._appendStructure($r1,this._applyWithArgs("token","]"),1007);$r1.value=["arr"].concat($vars.es);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("json"),1010);},function(){return this._forwardStructure(this._apply("re"),1012);}),949);return this._endStructure($r0);},
"json":function(){var $elf=this,$vars={},$r0=this._startStructure(1014, true);this._appendStructure($r0,this._applyWithArgs("token","{"),1016);$vars.bs=this._appendStructure($r0,this._applyWithArgs("enum","jsonBinding",","),1019);this._appendStructure($r0,this._applyWithArgs("token","}"),1023);$r0.value=["json"].concat($vars.bs);return this._endStructure($r0);},
"jsonBinding":function(){var $elf=this,$vars={},$r0=this._startStructure(1026, true);$vars.n=this._appendStructure($r0,this._apply("jsonPropName"),1029);this._appendStructure($r0,this._applyWithArgs("token",":"),1031);$vars.v=this._appendStructure($r0,this._apply("expr"),1034);$r0.value=["binding",$vars.n,$vars.v];return this._endStructure($r0);},
"jsonPropName":function(){var $elf=this,$vars={},$r0=this._startStructure(1037, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._applyWithArgs("token","name"),1040);},function(){return this._forwardStructure(this._applyWithArgs("token","number"),1042);},function(){return this._forwardStructure(this._applyWithArgs("token","string"),1044);}),1038);return this._endStructure($r0);},
"re":function(){var $elf=this,$vars={},$r0=this._startStructure(1046, true);this._appendStructure($r0,this._apply("spaces"),1048);$vars.x=this._appendStructure($r0,this._consumedBy(function(){var $r1=this._startStructure(1053);this._appendStructure($r1,this.exactly("/"),1055);this._appendStructure($r1,this._apply("reBody"),1057);this._appendStructure($r1,this.exactly("/"),1059);$r1.value=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._apply("reFlag"),1063);}),1061);return this._endStructure($r1);}),1051);$r0.value=["regExpr",$vars.x];return this._endStructure($r0);},
"reBody":function(){var $elf=this,$vars={},$r0=this._startStructure(1066, true);this._appendStructure($r0,this._apply("re1stChar"),1068);$r0.value=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("reChar"),1072);}),1070);return this._endStructure($r0);},
"re1stChar":function(){var $elf=this,$vars={},$r0=this._startStructure(1074, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1077);this._appendStructure($r1,this._not(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this.exactly("*"),1083);},function(){return this._forwardStructure(this.exactly("\\"),1085);},function(){return this._forwardStructure(this.exactly("/"),1087);},function(){return this._forwardStructure(this.exactly("["),1089);}),1081);}),1079);$r1.value=this._appendStructure($r1,this._apply("reNonTerm"),1091);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("escapeChar"),1093);},function(){return this._forwardStructure(this._apply("reClass"),1095);}),1075);return this._endStructure($r0);},
"reChar":function(){var $elf=this,$vars={},$r0=this._startStructure(1097, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("re1stChar"),1100);},function(){return this._forwardStructure(this.exactly("*"),1102);}),1098);return this._endStructure($r0);},
"reNonTerm":function(){var $elf=this,$vars={},$r0=this._startStructure(1104, true);this._appendStructure($r0,this._not(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this.exactly("\n"),1110);},function(){return this._forwardStructure(this.exactly("\r"),1112);}),1108);}),1106);$r0.value=this._appendStructure($r0,this._apply("char"),1114);return this._endStructure($r0);},
"reClass":function(){var $elf=this,$vars={},$r0=this._startStructure(1116, true);this._appendStructure($r0,this.exactly("["),1118);this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("reClassChar"),1122);}),1120);$r0.value=this._appendStructure($r0,this.exactly("]"),1124);return this._endStructure($r0);},
"reClassChar":function(){var $elf=this,$vars={},$r0=this._startStructure(1126, true);this._appendStructure($r0,this._not(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this.exactly("["),1132);},function(){return this._forwardStructure(this.exactly("]"),1134);}),1130);}),1128);$r0.value=this._appendStructure($r0,this._apply("reChar"),1136);return this._endStructure($r0);},
"reFlag":function(){var $elf=this,$vars={},$r0=this._startStructure(1138, true);$r0.value=this._appendStructure($r0,this._apply("nameFirst"),1139);return this._endStructure($r0);},
"formal":function(){var $elf=this,$vars={},$r0=this._startStructure(1141, true);this._appendStructure($r0,this._apply("spaces"),1143);$r0.value=this._appendStructure($r0,this._applyWithArgs("token","name"),1145);return this._endStructure($r0);},
"funcRest":function(){var $elf=this,$vars={},$r0=this._startStructure(1147, true);this._appendStructure($r0,this._applyWithArgs("token","("),1149);$vars.fs=this._appendStructure($r0,this._applyWithArgs("listOf","formal",","),1152);this._appendStructure($r0,this._applyWithArgs("token",")"),1156);this._appendStructure($r0,this._applyWithArgs("token","{"),1158);$vars.body=this._appendStructure($r0,this._apply("srcElems"),1161);this._appendStructure($r0,this._applyWithArgs("token","}"),1163);$r0.value=["func",$vars.fs,$vars.body];return this._endStructure($r0);},
"sc":function(){var $elf=this,$vars={},$r0=this._startStructure(1166, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1169);this._appendStructure($r1,this._apply("spacesNoNl"),1171);$r1.value=this._appendStructure($r1,this._or(function(){return this._forwardStructure(this.exactly("\n"),1175);},function(){return this._forwardStructure(this._lookahead(function(){return this._forwardStructure(this.exactly("}"),1179);}),1177);},function(){return this._forwardStructure(this.end(),1181);}),1173);return this._endStructure($r1);},function(){return this._forwardStructure(this._applyWithArgs("token",";"),1183);}),1167);return this._endStructure($r0);},
"varBinder":function(){var $elf=this,$vars={},$r0=this._startStructure(1185, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._applyWithArgs("token","var"),1188);},function(){return this._forwardStructure(this._applyWithArgs("token","let"),1190);},function(){return this._forwardStructure(this._applyWithArgs("token","const"),1192);}),1186);return this._endStructure($r0);},
"varBinding":function(){var $elf=this,$vars={},$r0=this._startStructure(1194, true);$vars.n=this._appendStructure($r0,this._applyWithArgs("token","name"),1197);$vars.v=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1202);this._appendStructure($r1,this._applyWithArgs("token","="),1204);$r1.value=this._appendStructure($r1,this._apply("expr"),1206);return this._endStructure($r1);},function(){var $r1=this._startStructure(1208);this._appendStructure($r1,this._apply("empty"),1210);$r1.value=["get","undefined"];return this._endStructure($r1);}),1200);$r0.value=["assignVar",$vars.n,$vars.v,this._extractLocation($r0)];return this._endStructure($r0);},
"block":function(){var $elf=this,$vars={},$r0=this._startStructure(1214, true);this._appendStructure($r0,this._applyWithArgs("token","{"),1216);$vars.ss=this._appendStructure($r0,this._apply("srcElems"),1219);this._appendStructure($r0,this._applyWithArgs("token","}"),1221);$r0.value=["begin",$vars.ss];return this._endStructure($r0);},
"stmt":function(){var $elf=this,$vars={},$r0=this._startStructure(1224, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("block"),1227);},function(){var $r1=this._startStructure(1229);$vars.decl=this._appendStructure($r1,this._apply("varBinder"),1232);$vars.bs=this._appendStructure($r1,this._applyWithArgs("listOf","varBinding",","),1235);this._appendStructure($r1,this._apply("sc"),1239);$r1.value=["beginVars",$vars.decl].concat($vars.bs);return this._endStructure($r1);},function(){var $r1=this._startStructure(1242);this._appendStructure($r1,this._applyWithArgs("token","if"),1244);this._appendStructure($r1,this._applyWithArgs("token","("),1246);$vars.c=this._appendStructure($r1,this._apply("expr"),1249);this._appendStructure($r1,this._applyWithArgs("token",")"),1251);$vars.t=this._appendStructure($r1,this._apply("stmt"),1254);$vars.f=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1259);this._appendStructure($r2,this._applyWithArgs("token","else"),1261);$r2.value=this._appendStructure($r2,this._apply("stmt"),1263);return this._endStructure($r2);},function(){var $r2=this._startStructure(1265);this._appendStructure($r2,this._apply("empty"),1267);$r2.value=["get","undefined"];return this._endStructure($r2);}),1257);$r1.value=["if",$vars.c,$vars.t,$vars.f];return this._endStructure($r1);},function(){var $r1=this._startStructure(1271);this._appendStructure($r1,this._applyWithArgs("token","while"),1273);this._appendStructure($r1,this._applyWithArgs("token","("),1275);$vars.c=this._appendStructure($r1,this._apply("expr"),1278);this._appendStructure($r1,this._applyWithArgs("token",")"),1280);$vars.s=this._appendStructure($r1,this._apply("stmt"),1283);$r1.value=["while",$vars.c,$vars.s];return this._endStructure($r1);},function(){var $r1=this._startStructure(1286);this._appendStructure($r1,this._applyWithArgs("token","do"),1288);$vars.s=this._appendStructure($r1,this._apply("stmt"),1291);this._appendStructure($r1,this._applyWithArgs("token","while"),1293);this._appendStructure($r1,this._applyWithArgs("token","("),1295);$vars.c=this._appendStructure($r1,this._apply("expr"),1298);this._appendStructure($r1,this._applyWithArgs("token",")"),1300);this._appendStructure($r1,this._apply("sc"),1302);$r1.value=["doWhile",$vars.s,$vars.c];return this._endStructure($r1);},function(){var $r1=this._startStructure(1305);this._appendStructure($r1,this._applyWithArgs("token","for"),1307);this._appendStructure($r1,this._applyWithArgs("token","("),1309);$vars.i=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1314);$vars.decl=this._appendStructure($r2,this._apply("varBinder"),1317);$vars.bs=this._appendStructure($r2,this._applyWithArgs("listOf","varBinding",","),1320);$r2.value=["beginVars",$vars.decl].concat($vars.bs);return this._endStructure($r2);},function(){return this._forwardStructure(this._apply("expr"),1325);},function(){var $r2=this._startStructure(1327);this._appendStructure($r2,this._apply("empty"),1329);$r2.value=["get","undefined"];return this._endStructure($r2);}),1312);this._appendStructure($r1,this._applyWithArgs("token",";"),1332);$vars.c=this._appendStructure($r1,this._or(function(){return this._forwardStructure(this._apply("expr"),1337);},function(){var $r2=this._startStructure(1339);this._appendStructure($r2,this._apply("empty"),1341);$r2.value=["get","true"];return this._endStructure($r2);}),1335);this._appendStructure($r1,this._applyWithArgs("token",";"),1344);$vars.u=this._appendStructure($r1,this._or(function(){return this._forwardStructure(this._apply("expr"),1349);},function(){var $r2=this._startStructure(1351);this._appendStructure($r2,this._apply("empty"),1353);$r2.value=["get","undefined"];return this._endStructure($r2);}),1347);this._appendStructure($r1,this._applyWithArgs("token",")"),1356);$vars.s=this._appendStructure($r1,this._apply("stmt"),1359);$r1.value=["for",$vars.i,$vars.c,$vars.u,$vars.s];return this._endStructure($r1);},function(){var $r1=this._startStructure(1362);this._appendStructure($r1,this._applyWithArgs("token","for"),1364);this._appendStructure($r1,this._applyWithArgs("token","("),1366);$vars.v=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1371);$vars.decl=this._appendStructure($r2,this._apply("varBinder"),1374);$vars.n=this._appendStructure($r2,this._applyWithArgs("token","name"),1377);$r2.value=["beginVars",$vars.decl,["noAssignVar",$vars.n]];return this._endStructure($r2);},function(){return this._forwardStructure(this._apply("expr"),1380);}),1369);this._appendStructure($r1,this._applyWithArgs("token","in"),1382);$vars.e=this._appendStructure($r1,this._apply("expr"),1385);this._appendStructure($r1,this._applyWithArgs("token",")"),1387);$vars.s=this._appendStructure($r1,this._apply("stmt"),1390);$r1.value=["forIn",$vars.v,$vars.e,$vars.s];return this._endStructure($r1);},function(){var $r1=this._startStructure(1393);this._appendStructure($r1,this._applyWithArgs("token","switch"),1395);this._appendStructure($r1,this._applyWithArgs("token","("),1397);$vars.e=this._appendStructure($r1,this._apply("expr"),1400);this._appendStructure($r1,this._applyWithArgs("token",")"),1402);this._appendStructure($r1,this._applyWithArgs("token","{"),1404);$vars.cs=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._or(function(){var $r3=this._startStructure(1411);this._appendStructure($r3,this._applyWithArgs("token","case"),1413);$vars.c=this._appendStructure($r3,this._apply("expr"),1416);this._appendStructure($r3,this._applyWithArgs("token",":"),1418);$vars.cs=this._appendStructure($r3,this._apply("srcElems"),1421);$r3.value=["case",$vars.c,["begin",$vars.cs]];return this._endStructure($r3);},function(){var $r3=this._startStructure(1424);this._appendStructure($r3,this._applyWithArgs("token","default"),1426);this._appendStructure($r3,this._applyWithArgs("token",":"),1428);$vars.cs=this._appendStructure($r3,this._apply("srcElems"),1431);$r3.value=["default",["begin",$vars.cs]];return this._endStructure($r3);}),1409);}),1407);this._appendStructure($r1,this._applyWithArgs("token","}"),1434);$r1.value=["switch",$vars.e].concat($vars.cs);return this._endStructure($r1);},function(){var $r1=this._startStructure(1437);this._appendStructure($r1,this._applyWithArgs("token","break"),1439);this._appendStructure($r1,this._apply("sc"),1441);$r1.value=["break"];return this._endStructure($r1);},function(){var $r1=this._startStructure(1444);this._appendStructure($r1,this._applyWithArgs("token","continue"),1446);this._appendStructure($r1,this._apply("sc"),1448);$r1.value=["continue"];return this._endStructure($r1);},function(){var $r1=this._startStructure(1451);this._appendStructure($r1,this._applyWithArgs("token","throw"),1453);this._appendStructure($r1,this._apply("spacesNoNl"),1455);$vars.e=this._appendStructure($r1,this._apply("expr"),1458);this._appendStructure($r1,this._apply("sc"),1460);$r1.value=["throw",$vars.e];return this._endStructure($r1);},function(){var $r1=this._startStructure(1463);this._appendStructure($r1,this._applyWithArgs("token","try"),1465);$vars.t=this._appendStructure($r1,this._apply("block"),1468);this._appendStructure($r1,this._applyWithArgs("token","catch"),1470);this._appendStructure($r1,this._applyWithArgs("token","("),1472);$vars.e=this._appendStructure($r1,this._applyWithArgs("token","name"),1475);this._appendStructure($r1,this._applyWithArgs("token",")"),1477);$vars.c=this._appendStructure($r1,this._apply("block"),1480);$vars.f=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1485);this._appendStructure($r2,this._applyWithArgs("token","finally"),1487);$r2.value=this._appendStructure($r2,this._apply("block"),1489);return this._endStructure($r2);},function(){var $r2=this._startStructure(1491);this._appendStructure($r2,this._apply("empty"),1493);$r2.value=["get","undefined"];return this._endStructure($r2);}),1483);$r1.value=["try",$vars.t,$vars.e,$vars.c,$vars.f];return this._endStructure($r1);},function(){var $r1=this._startStructure(1497);this._appendStructure($r1,this._applyWithArgs("token","return"),1499);$vars.e=this._appendStructure($r1,this._or(function(){return this._forwardStructure(this._apply("expr"),1504);},function(){var $r2=this._startStructure(1506);this._appendStructure($r2,this._apply("empty"),1508);$r2.value=["get","undefined"];return this._endStructure($r2);}),1502);this._appendStructure($r1,this._apply("sc"),1511);$r1.value=["return",$vars.e];return this._endStructure($r1);},function(){var $r1=this._startStructure(1514);this._appendStructure($r1,this._applyWithArgs("token","with"),1516);this._appendStructure($r1,this._applyWithArgs("token","("),1518);$vars.x=this._appendStructure($r1,this._apply("expr"),1521);this._appendStructure($r1,this._applyWithArgs("token",")"),1523);$vars.s=this._appendStructure($r1,this._apply("stmt"),1526);$r1.value=["with",$vars.x,$vars.s];return this._endStructure($r1);},function(){var $r1=this._startStructure(1529);$vars.e=this._appendStructure($r1,this._apply("expr"),1532);this._appendStructure($r1,this._apply("sc"),1534);$r1.value=$vars.e;return this._endStructure($r1);},function(){var $r1=this._startStructure(1537);this._appendStructure($r1,this._applyWithArgs("token",";"),1539);$r1.value=["get","undefined"];return this._endStructure($r1);}),1225);return this._endStructure($r0);},
"srcElem":function(){var $elf=this,$vars={},$r0=this._startStructure(1542, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1545);this._appendStructure($r1,this._applyWithArgs("token","function"),1547);$vars.n=this._appendStructure($r1,this._applyWithArgs("token","name"),1550);$vars.f=this._appendStructure($r1,this._apply("funcRest"),1553);$r1.value=["assignVar",$vars.n,$vars.f];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("stmt"),1556);}),1543);return this._endStructure($r0);},
"srcElems":function(){var $elf=this,$vars={},$r0=this._startStructure(1558, true);$vars.ss=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("srcElem"),1563);}),1561);$r0.value=["beginTop"].concat($vars.ss);return this._endStructure($r0);},
"topLevel":function(){var $elf=this,$vars={},$r0=this._startStructure(1566, true);$vars.r=this._appendStructure($r0,this._apply("srcElems"),1569);this._appendStructure($r0,this._apply("spaces"),1571);this._appendStructure($r0,this.end(),1573);$r0.value=$vars.r;return this._endStructure($r0);}});(BSJSParser["hexDigits"]="0123456789abcdef");(BSJSParser["keywords"]=({}));(keywords=["break","case","catch","continue","default","delete","do","else","finally","for","function","if","in","instanceof","new","return","switch","this","throw","try","typeof","var","void","while","with","ometa","let","const"]);for(var idx=(0);(idx < keywords["length"]);idx++){(BSJSParser["keywords"][keywords[idx]]=true);}(BSJSParser["_isKeyword"]=(function (k){return this["keywords"].hasOwnProperty(k);}));let emitValue=(function (location,variable,expr){return ["$e(",location["start"],",",location["stop"],",\"",variable,"\",",expr,")"].join("");});let BSJSTranslator=objectThatDelegatesTo(OMeta,{
"trans":function(){var $elf=this,$vars={},$r0=this._startStructure(1577, true);this._appendStructure($r0,this._form(function(){var $r1=this._startStructure(1581);$vars.t=this._getStructureValue(this.anything());$r1.value=($vars.ans=this._appendStructure($r1,this._apply($vars.t),1586));return this._endStructure($r1);}),1579);$r0.value=$vars.ans;return this._endStructure($r0);},
"curlyTrans":function(){var $elf=this,$vars={},$r0=this._startStructure(1590, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1593);this._appendStructure($r1,this._form(function(){var $r2=this._startStructure(1597);this._appendStructure($r2,this.exactly("begin"),1599);$r2.value=($vars.r=this._appendStructure($r2,this._apply("curlyTrans"),1603));return this._endStructure($r2);}),1595);$r1.value=$vars.r;return this._endStructure($r1);},function(){var $r1=this._startStructure(1606);this._appendStructure($r1,this._form(function(){var $r2=this._startStructure(1610);this._appendStructure($r2,this.exactly("begin"),1612);$r2.value=($vars.rs=this._appendStructure($r2,this._many(function(){return this._forwardStructure(this._apply("trans"),1618);}),1616));return this._endStructure($r2);}),1608);$r1.value=(("{" + $vars.rs.join(";")) + ";}");return this._endStructure($r1);},function(){var $r1=this._startStructure(1621);$vars.r=this._appendStructure($r1,this._apply("trans"),1624);$r1.value=(("{" + $vars.r) + ";}");return this._endStructure($r1);}),1591);return this._endStructure($r0);},
"this":function(){var $elf=this,$vars={},$r0=this._startStructure(1627, true);$r0.value="this";return this._endStructure($r0);},
"break":function(){var $elf=this,$vars={},$r0=this._startStructure(1629, true);$r0.value="break";return this._endStructure($r0);},
"continue":function(){var $elf=this,$vars={},$r0=this._startStructure(1631, true);$r0.value="continue";return this._endStructure($r0);},
"number":function(){var $elf=this,$vars={},$r0=this._startStructure(1633, true);$vars.n=this._getStructureValue(this.anything());$r0.value=(("(" + $vars.n) + ")");return this._endStructure($r0);},
"string":function(){var $elf=this,$vars={},$r0=this._startStructure(1637, true);$vars.s=this._getStructureValue(this.anything());$r0.value=$vars.s.toProgramString();return this._endStructure($r0);},
"name":function(){var $elf=this,$vars={},$r0=this._startStructure(1641, true);$vars.s=this._getStructureValue(this.anything());$r0.value=$vars.s;return this._endStructure($r0);},
"regExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(1645, true);$vars.x=this._getStructureValue(this.anything());$r0.value=$vars.x;return this._endStructure($r0);},
"arr":function(){var $elf=this,$vars={},$r0=this._startStructure(1649, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1654);}),1652);$r0.value=(("[" + $vars.xs.join(",")) + "]");return this._endStructure($r0);},
"unop":function(){var $elf=this,$vars={},$r0=this._startStructure(1657, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1661);$r0.value=(((("(" + $vars.op) + " ") + $vars.x) + ")");return this._endStructure($r0);},
"getp":function(){var $elf=this,$vars={},$r0=this._startStructure(1664, true);$vars.fd=this._appendStructure($r0,this._apply("trans"),1667);$vars.x=this._appendStructure($r0,this._apply("trans"),1670);$r0.value=((($vars.x + "[") + $vars.fd) + "]");return this._endStructure($r0);},
"get":function(){var $elf=this,$vars={},$r0=this._startStructure(1673, true);$vars.x=this._getStructureValue(this.anything());$r0.value=$vars.x;return this._endStructure($r0);},
"set":function(){var $elf=this,$vars={},$r0=this._startStructure(1677, true);$vars.lhs=this._appendStructure($r0,this._apply("trans"),1680);$vars.rhs=this._appendStructure($r0,this._apply("trans"),1683);$vars.p=this._getStructureValue(this.anything());$r0.value=(((("(" + $vars.lhs) + "=") + emitValue($vars.p,$vars.lhs,$vars.rhs)) + ")");return this._endStructure($r0);},
"mset":function(){var $elf=this,$vars={},$r0=this._startStructure(1687, true);$vars.lhs=this._appendStructure($r0,this._apply("trans"),1690);$vars.op=this._getStructureValue(this.anything());$vars.rhs=this._appendStructure($r0,this._apply("trans"),1694);$vars.p=this._getStructureValue(this.anything());$r0.value=(((("(" + $vars.lhs) + "=") + emitValue($vars.p,$vars.lhs,(((($vars.lhs + " ") + $vars.op) + " ") + $vars.rhs))) + ")");return this._endStructure($r0);},
"binop":function(){var $elf=this,$vars={},$r0=this._startStructure(1698, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1702);$vars.y=this._appendStructure($r0,this._apply("trans"),1705);$r0.value=(((((("(" + $vars.x) + " ") + $vars.op) + " ") + $vars.y) + ")");return this._endStructure($r0);},
"preop":function(){var $elf=this,$vars={},$r0=this._startStructure(1708, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1712);$r0.value=($vars.op + $vars.x);return this._endStructure($r0);},
"postop":function(){var $elf=this,$vars={},$r0=this._startStructure(1715, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1719);$r0.value=($vars.x + $vars.op);return this._endStructure($r0);},
"return":function(){var $elf=this,$vars={},$r0=this._startStructure(1722, true);$vars.x=this._appendStructure($r0,this._apply("trans"),1725);$r0.value=("return " + $vars.x);return this._endStructure($r0);},
"with":function(){var $elf=this,$vars={},$r0=this._startStructure(1728, true);$vars.x=this._appendStructure($r0,this._apply("trans"),1731);$vars.s=this._appendStructure($r0,this._apply("curlyTrans"),1734);$r0.value=((("with(" + $vars.x) + ")") + $vars.s);return this._endStructure($r0);},
"if":function(){var $elf=this,$vars={},$r0=this._startStructure(1737, true);$vars.cond=this._appendStructure($r0,this._apply("trans"),1740);$vars.t=this._appendStructure($r0,this._apply("curlyTrans"),1743);$vars.e=this._appendStructure($r0,this._apply("curlyTrans"),1746);$r0.value=((((("if(" + $vars.cond) + ")") + $vars.t) + "else") + $vars.e);return this._endStructure($r0);},
"condExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(1749, true);$vars.cond=this._appendStructure($r0,this._apply("trans"),1752);$vars.t=this._appendStructure($r0,this._apply("trans"),1755);$vars.e=this._appendStructure($r0,this._apply("trans"),1758);$r0.value=(((((("(" + $vars.cond) + "?") + $vars.t) + ":") + $vars.e) + ")");return this._endStructure($r0);},
"while":function(){var $elf=this,$vars={},$r0=this._startStructure(1761, true);$vars.cond=this._appendStructure($r0,this._apply("trans"),1764);$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),1767);$r0.value=((("while(" + $vars.cond) + ")") + $vars.body);return this._endStructure($r0);},
"doWhile":function(){var $elf=this,$vars={},$r0=this._startStructure(1770, true);$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),1773);$vars.cond=this._appendStructure($r0,this._apply("trans"),1776);$r0.value=(((("do" + $vars.body) + "while(") + $vars.cond) + ")");return this._endStructure($r0);},
"for":function(){var $elf=this,$vars={},$r0=this._startStructure(1779, true);$vars.init=this._appendStructure($r0,this._apply("trans"),1782);$vars.cond=this._appendStructure($r0,this._apply("trans"),1785);$vars.upd=this._appendStructure($r0,this._apply("trans"),1788);$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),1791);$r0.value=((((((("for(" + $vars.init) + ";") + $vars.cond) + ";") + $vars.upd) + ")") + $vars.body);return this._endStructure($r0);},
"forIn":function(){var $elf=this,$vars={},$r0=this._startStructure(1794, true);$vars.x=this._appendStructure($r0,this._apply("trans"),1797);$vars.arr=this._appendStructure($r0,this._apply("trans"),1800);$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),1803);$r0.value=((((("for(" + $vars.x) + " in ") + $vars.arr) + ")") + $vars.body);return this._endStructure($r0);},
"beginTop":function(){var $elf=this,$vars={},$r0=this._startStructure(1806, true);$vars.xs=this._appendStructure($r0,this._many(function(){var $r1=this._startStructure(1811);$vars.x=this._appendStructure($r1,this._apply("trans"),1814);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1818);this._appendStructure($r2,this._or(function(){var $r3=this._startStructure(1821);$r3.value=this._pred(($vars.x[($vars.x["length"] - (1))] == "}"));return this._endStructure($r3);},function(){return this._forwardStructure(this.end(),1824);}),1820);$r2.value=$vars.x;return this._endStructure($r2);},function(){var $r2=this._startStructure(1827);this._appendStructure($r2,this._apply("empty"),1829);$r2.value=($vars.x + ";");return this._endStructure($r2);}),1816);return this._endStructure($r1);}),1809);$r0.value=$vars.xs.join("");return this._endStructure($r0);},
"begin":function(){var $elf=this,$vars={},$r0=this._startStructure(1833, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1836);$vars.x=this._appendStructure($r1,this._apply("trans"),1839);this._appendStructure($r1,this.end(),1841);$r1.value=$vars.x;return this._endStructure($r1);},function(){var $r1=this._startStructure(1844);$vars.xs=this._appendStructure($r1,this._many(function(){var $r2=this._startStructure(1849);$vars.x=this._appendStructure($r2,this._apply("trans"),1852);$r2.value=this._appendStructure($r2,this._or(function(){var $r3=this._startStructure(1856);this._appendStructure($r3,this._or(function(){var $r4=this._startStructure(1859);$r4.value=this._pred(($vars.x[($vars.x["length"] - (1))] == "}"));return this._endStructure($r4);},function(){return this._forwardStructure(this.end(),1862);}),1858);$r3.value=$vars.x;return this._endStructure($r3);},function(){var $r3=this._startStructure(1865);this._appendStructure($r3,this._apply("empty"),1867);$r3.value=($vars.x + ";");return this._endStructure($r3);}),1854);return this._endStructure($r2);}),1847);$r1.value=(("{" + $vars.xs.join("")) + "}");return this._endStructure($r1);}),1834);return this._endStructure($r0);},
"beginVars":function(){var $elf=this,$vars={},$r0=this._startStructure(1871, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1874);$vars.decl=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r1,this._apply("trans"),1878);this._appendStructure($r1,this.end(),1880);$r1.value=(($vars.decl + " ") + $vars.x);return this._endStructure($r1);},function(){var $r1=this._startStructure(1883);$vars.decl=this._getStructureValue(this.anything());$vars.xs=this._appendStructure($r1,this._many(function(){var $r2=this._startStructure(1888);$r2.value=($vars.x=this._appendStructure($r2,this._apply("trans"),1891));return this._endStructure($r2);}),1887);$r1.value=(($vars.decl + " ") + $vars.xs.join(","));return this._endStructure($r1);}),1872);return this._endStructure($r0);},
"func":function(){var $elf=this,$vars={},$r0=this._startStructure(1894, true);$vars.args=this._getStructureValue(this.anything());$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),1898);$r0.value=(((("(function (" + $vars.args.join(",")) + ")") + $vars.body) + ")");return this._endStructure($r0);},
"call":function(){var $elf=this,$vars={},$r0=this._startStructure(1901, true);$vars.fn=this._appendStructure($r0,this._apply("trans"),1904);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1909);}),1907);$r0.value=((($vars.fn + "(") + $vars.args.join(",")) + ")");return this._endStructure($r0);},
"send":function(){var $elf=this,$vars={},$r0=this._startStructure(1912, true);$vars.msg=this._getStructureValue(this.anything());$vars.recv=this._appendStructure($r0,this._apply("trans"),1916);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1921);}),1919);$r0.value=((((($vars.recv + ".") + $vars.msg) + "(") + $vars.args.join(",")) + ")");return this._endStructure($r0);},
"new":function(){var $elf=this,$vars={},$r0=this._startStructure(1924, true);$vars.x=this._appendStructure($r0,this._apply("trans"),1927);$r0.value=("new " + $vars.x);return this._endStructure($r0);},
"assignVar":function(){var $elf=this,$vars={},$r0=this._startStructure(1930, true);$vars.name=this._getStructureValue(this.anything());$vars.val=this._appendStructure($r0,this._apply("trans"),1934);$vars.p=this._getStructureValue(this.anything());$r0.value=(($vars.name + "=") + emitValue($vars.p,$vars.name,$vars.val));return this._endStructure($r0);},
"noAssignVar":function(){var $elf=this,$vars={},$r0=this._startStructure(1938, true);$vars.name=this._getStructureValue(this.anything());$r0.value=$vars.name;return this._endStructure($r0);},
"throw":function(){var $elf=this,$vars={},$r0=this._startStructure(1942, true);$vars.x=this._appendStructure($r0,this._apply("trans"),1945);$r0.value=("throw " + $vars.x);return this._endStructure($r0);},
"try":function(){var $elf=this,$vars={},$r0=this._startStructure(1948, true);$vars.x=this._appendStructure($r0,this._apply("curlyTrans"),1951);$vars.name=this._getStructureValue(this.anything());$vars.c=this._appendStructure($r0,this._apply("curlyTrans"),1955);$vars.f=this._appendStructure($r0,this._apply("curlyTrans"),1958);$r0.value=((((((("try " + $vars.x) + "catch(") + $vars.name) + ")") + $vars.c) + "finally") + $vars.f);return this._endStructure($r0);},
"json":function(){var $elf=this,$vars={},$r0=this._startStructure(1961, true);$vars.props=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1966);}),1964);$r0.value=(("({" + $vars.props.join(",")) + "})");return this._endStructure($r0);},
"binding":function(){var $elf=this,$vars={},$r0=this._startStructure(1969, true);$vars.name=this._getStructureValue(this.anything());$vars.val=this._appendStructure($r0,this._apply("trans"),1973);$r0.value=(($vars.name.toProgramString() + ": ") + $vars.val);return this._endStructure($r0);},
"switch":function(){var $elf=this,$vars={},$r0=this._startStructure(1976, true);$vars.x=this._appendStructure($r0,this._apply("trans"),1979);$vars.cases=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1984);}),1982);$r0.value=(((("switch(" + $vars.x) + "){") + $vars.cases.join(";")) + "}");return this._endStructure($r0);},
"case":function(){var $elf=this,$vars={},$r0=this._startStructure(1987, true);$vars.x=this._appendStructure($r0,this._apply("trans"),1990);$vars.y=this._appendStructure($r0,this._apply("trans"),1993);$r0.value=((("case " + $vars.x) + ": ") + $vars.y);return this._endStructure($r0);},
"default":function(){var $elf=this,$vars={},$r0=this._startStructure(1996, true);$vars.y=this._appendStructure($r0,this._apply("trans"),1999);$r0.value=("default: " + $vars.y);return this._endStructure($r0);}})
