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
"name":function(){var $elf=this,$vars={},$r0=this._startStructure(219, true);$vars.n=this._appendStructure($r0,this._apply("iName"),222);this._appendStructure($r0,this._not(function(){return this._forwardStructure(this._applyWithArgs("isKeyword",$vars.n),226);}),224);$r0.value=["name",$vars.n];return this._endStructure($r0);},
"keyword":function(){var $elf=this,$vars={},$r0=this._startStructure(230, true);$vars.k=this._appendStructure($r0,this._apply("iName"),233);this._appendStructure($r0,this._applyWithArgs("isKeyword",$vars.k),235);$r0.value=[$vars.k,$vars.k];return this._endStructure($r0);},
"anyname":function(){var $elf=this,$vars={},$r0=this._startStructure(239, true);this._appendStructure($r0,this._apply("spaces"),241);$vars.n=this._appendStructure($r0,this._apply("iName"),244);$r0.value=$vars.n;return this._endStructure($r0);},
"hexDigit":function(){var $elf=this,$vars={},$r0=this._startStructure(247, true);$vars.x=this._appendStructure($r0,this._apply("char"),250);$vars.v=this["hexDigits"].indexOf($vars.x.toLowerCase());this._pred(($vars.v >= (0)));$r0.value=$vars.v;return this._endStructure($r0);},
"hexLit":function(){var $elf=this,$vars={},$r0=this._startStructure(257, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(260);$vars.n=this._appendStructure($r1,this._apply("hexLit"),263);$vars.d=this._appendStructure($r1,this._apply("hexDigit"),266);$r1.value=(($vars.n * (16)) + $vars.d);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("hexDigit"),269);}),258);return this._endStructure($r0);},
"number":function(){var $elf=this,$vars={},$r0=this._startStructure(271, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(274);this._appendStructure($r1,this.exactly("0"),275);this._appendStructure($r1,this.exactly("x"),275);"0x";$vars.n=this._appendStructure($r1,this._apply("hexLit"),277);$r1.value=["number",$vars.n];return this._endStructure($r1);},function(){var $r1=this._startStructure(280);$vars.f=this._appendStructure($r1,this._consumedBy(function(){var $r2=this._startStructure(285);this._appendStructure($r2,this._many1(function(){return this._forwardStructure(this._apply("digit"),289);}),287);$r2.value=this._appendStructure($r2,this._opt(function(){var $r3=this._startStructure(293);this._appendStructure($r3,this.exactly("."),295);$r3.value=this._appendStructure($r3,this._many1(function(){return this._forwardStructure(this._apply("digit"),299);}),297);return this._endStructure($r3);}),291);return this._endStructure($r2);}),283);$r1.value=["number",parseFloat($vars.f)];return this._endStructure($r1);}),272);return this._endStructure($r0);},
"escapeChar":function(){var $elf=this,$vars={},$r0=this._startStructure(302, true);$vars.s=this._appendStructure($r0,this._consumedBy(function(){var $r1=this._startStructure(307);this._appendStructure($r1,this.exactly("\\"),309);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(313);this._appendStructure($r2,this.exactly("u"),315);this._appendStructure($r2,this._apply("hexDigit"),317);this._appendStructure($r2,this._apply("hexDigit"),319);this._appendStructure($r2,this._apply("hexDigit"),321);$r2.value=this._appendStructure($r2,this._apply("hexDigit"),323);return this._endStructure($r2);},function(){var $r2=this._startStructure(325);this._appendStructure($r2,this.exactly("x"),327);this._appendStructure($r2,this._apply("hexDigit"),329);$r2.value=this._appendStructure($r2,this._apply("hexDigit"),331);return this._endStructure($r2);},function(){return this._forwardStructure(this._apply("char"),333);}),311);return this._endStructure($r1);}),305);$r0.value=unescape($vars.s);return this._endStructure($r0);},
"str":function(){var $elf=this,$vars={},$r0=this._startStructure(336, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(339);this._appendStructure($r1,this.exactly("\""),340);this._appendStructure($r1,this.exactly("\""),340);this._appendStructure($r1,this.exactly("\""),340);"\"\"\"";$vars.cs=this._appendStructure($r1,this._many(function(){var $r2=this._startStructure(344);this._appendStructure($r2,this._not(function(){var $r3=this._startStructure(348);this._appendStructure($r3,this.exactly("\""),349);this._appendStructure($r3,this.exactly("\""),349);this._appendStructure($r3,this.exactly("\""),349);$r3.value="\"\"\"";return this._endStructure($r3);}),346);$r2.value=this._appendStructure($r2,this._apply("char"),350);return this._endStructure($r2);}),342);this._appendStructure($r1,this.exactly("\""),340);this._appendStructure($r1,this.exactly("\""),340);this._appendStructure($r1,this.exactly("\""),340);"\"\"\"";$r1.value=["string",$vars.cs.join("")];return this._endStructure($r1);},function(){var $r1=this._startStructure(353);this._appendStructure($r1,this.exactly("\'"),355);$vars.cs=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this._apply("escapeChar"),362);},function(){var $r3=this._startStructure(364);this._appendStructure($r3,this._not(function(){return this._forwardStructure(this.exactly("\'"),368);}),366);$r3.value=this._appendStructure($r3,this._apply("char"),370);return this._endStructure($r3);}),360);}),358);this._appendStructure($r1,this.exactly("\'"),372);$r1.value=["string",$vars.cs.join("")];return this._endStructure($r1);},function(){var $r1=this._startStructure(375);this._appendStructure($r1,this.exactly("\""),377);$vars.cs=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this._apply("escapeChar"),384);},function(){var $r3=this._startStructure(386);this._appendStructure($r3,this._not(function(){return this._forwardStructure(this.exactly("\""),390);}),388);$r3.value=this._appendStructure($r3,this._apply("char"),392);return this._endStructure($r3);}),382);}),380);this._appendStructure($r1,this.exactly("\""),394);$r1.value=["string",$vars.cs.join("")];return this._endStructure($r1);},function(){var $r1=this._startStructure(397);this._appendStructure($r1,this._or(function(){return this._forwardStructure(this.exactly("#"),401);},function(){return this._forwardStructure(this.exactly("`"),403);}),399);$vars.n=this._appendStructure($r1,this._apply("iName"),406);$r1.value=["string",$vars.n];return this._endStructure($r1);}),337);return this._endStructure($r0);},
"special":function(){var $elf=this,$vars={},$r0=this._startStructure(409, true);$vars.s=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this.exactly("("),414);},function(){return this._forwardStructure(this.exactly(")"),416);},function(){return this._forwardStructure(this.exactly("{"),418);},function(){return this._forwardStructure(this.exactly("}"),420);},function(){return this._forwardStructure(this.exactly("["),422);},function(){return this._forwardStructure(this.exactly("]"),424);},function(){return this._forwardStructure(this.exactly(","),426);},function(){return this._forwardStructure(this.exactly(";"),428);},function(){return this._forwardStructure(this.exactly("?"),430);},function(){return this._forwardStructure(this.exactly(":"),432);},function(){var $r1=this._startStructure(434);this._appendStructure($r1,this.exactly("!"),435);this._appendStructure($r1,this.exactly("="),435);this._appendStructure($r1,this.exactly("="),435);$r1.value="!==";return this._endStructure($r1);},function(){var $r1=this._startStructure(436);this._appendStructure($r1,this.exactly("!"),437);this._appendStructure($r1,this.exactly("="),437);$r1.value="!=";return this._endStructure($r1);},function(){var $r1=this._startStructure(438);this._appendStructure($r1,this.exactly("="),439);this._appendStructure($r1,this.exactly("="),439);this._appendStructure($r1,this.exactly("="),439);$r1.value="===";return this._endStructure($r1);},function(){var $r1=this._startStructure(440);this._appendStructure($r1,this.exactly("="),441);this._appendStructure($r1,this.exactly("="),441);$r1.value="==";return this._endStructure($r1);},function(){var $r1=this._startStructure(442);this._appendStructure($r1,this.exactly("="),443);$r1.value="=";return this._endStructure($r1);},function(){var $r1=this._startStructure(444);this._appendStructure($r1,this.exactly(">"),445);this._appendStructure($r1,this.exactly("="),445);$r1.value=">=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly(">"),446);},function(){var $r1=this._startStructure(448);this._appendStructure($r1,this.exactly("<"),449);this._appendStructure($r1,this.exactly("="),449);$r1.value="<=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("<"),450);},function(){var $r1=this._startStructure(452);this._appendStructure($r1,this.exactly("+"),453);this._appendStructure($r1,this.exactly("+"),453);$r1.value="++";return this._endStructure($r1);},function(){var $r1=this._startStructure(454);this._appendStructure($r1,this.exactly("+"),455);this._appendStructure($r1,this.exactly("="),455);$r1.value="+=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("+"),456);},function(){var $r1=this._startStructure(458);this._appendStructure($r1,this.exactly("-"),459);this._appendStructure($r1,this.exactly("-"),459);$r1.value="--";return this._endStructure($r1);},function(){var $r1=this._startStructure(460);this._appendStructure($r1,this.exactly("-"),461);this._appendStructure($r1,this.exactly("="),461);$r1.value="-=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("-"),462);},function(){var $r1=this._startStructure(464);this._appendStructure($r1,this.exactly("*"),465);this._appendStructure($r1,this.exactly("="),465);$r1.value="*=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("*"),466);},function(){var $r1=this._startStructure(468);this._appendStructure($r1,this.exactly("/"),469);this._appendStructure($r1,this.exactly("="),469);$r1.value="/=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("/"),470);},function(){var $r1=this._startStructure(472);this._appendStructure($r1,this.exactly("%"),473);this._appendStructure($r1,this.exactly("="),473);$r1.value="%=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("%"),474);},function(){var $r1=this._startStructure(476);this._appendStructure($r1,this.exactly("&"),477);this._appendStructure($r1,this.exactly("&"),477);this._appendStructure($r1,this.exactly("="),477);$r1.value="&&=";return this._endStructure($r1);},function(){var $r1=this._startStructure(478);this._appendStructure($r1,this.exactly("&"),479);this._appendStructure($r1,this.exactly("&"),479);$r1.value="&&";return this._endStructure($r1);},function(){var $r1=this._startStructure(480);this._appendStructure($r1,this.exactly("|"),481);this._appendStructure($r1,this.exactly("|"),481);this._appendStructure($r1,this.exactly("="),481);$r1.value="||=";return this._endStructure($r1);},function(){var $r1=this._startStructure(482);this._appendStructure($r1,this.exactly("|"),483);this._appendStructure($r1,this.exactly("|"),483);$r1.value="||";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("."),484);},function(){return this._forwardStructure(this.exactly("!"),486);}),412);$r0.value=[$vars.s,$vars.s];return this._endStructure($r0);},
"tok":function(){var $elf=this,$vars={},$r0=this._startStructure(489, true);this._appendStructure($r0,this._apply("spaces"),491);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("name"),495);},function(){return this._forwardStructure(this._apply("keyword"),497);},function(){return this._forwardStructure(this._apply("number"),499);},function(){return this._forwardStructure(this._apply("str"),501);},function(){return this._forwardStructure(this._apply("special"),503);}),493);return this._endStructure($r0);},
"toks":function(){var $elf=this,$vars={},$r0=this._startStructure(505, true);$vars.ts=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("token"),510);}),508);this._appendStructure($r0,this._apply("spaces"),512);this._appendStructure($r0,this.end(),514);$r0.value=$vars.ts;return this._endStructure($r0);},
"token":function(){var $elf=this,$vars={},$r0=this._startStructure(517, true);$vars.tt=this._getStructureValue(this.anything());$vars.t=this._appendStructure($r0,this._apply("tok"),521);this._pred(($vars.t[(0)] == $vars.tt));$r0.value=$vars.t[(1)];return this._endStructure($r0);},
"spacesNoNl":function(){var $elf=this,$vars={},$r0=this._startStructure(526, true);$r0.value=this._appendStructure($r0,this._many(function(){var $r1=this._startStructure(529);this._appendStructure($r1,this._not(function(){return this._forwardStructure(this.exactly("\n"),533);}),531);$r1.value=this._appendStructure($r1,this._apply("space"),535);return this._endStructure($r1);}),527);return this._endStructure($r0);},
"expr":function(){var $elf=this,$vars={},$r0=this._startStructure(537, true);$vars.e=this._appendStructure($r0,this._apply("orExpr"),540);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(544);this._appendStructure($r1,this._applyWithArgs("token","?"),546);$vars.t=this._appendStructure($r1,this._apply("expr"),549);this._appendStructure($r1,this._applyWithArgs("token",":"),551);$vars.f=this._appendStructure($r1,this._apply("expr"),554);$r1.value=["condExpr",$vars.e,$vars.t,$vars.f];return this._endStructure($r1);},function(){var $r1=this._startStructure(557);this._appendStructure($r1,this._applyWithArgs("token","="),559);$vars.rhs=this._appendStructure($r1,this._apply("expr"),562);$r1.value=["set",$vars.e,$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(565);this._appendStructure($r1,this._applyWithArgs("token","+="),567);$vars.rhs=this._appendStructure($r1,this._apply("expr"),570);$r1.value=["mset",$vars.e,"+",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(573);this._appendStructure($r1,this._applyWithArgs("token","-="),575);$vars.rhs=this._appendStructure($r1,this._apply("expr"),578);$r1.value=["mset",$vars.e,"-",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(581);this._appendStructure($r1,this._applyWithArgs("token","*="),583);$vars.rhs=this._appendStructure($r1,this._apply("expr"),586);$r1.value=["mset",$vars.e,"*",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(589);this._appendStructure($r1,this._applyWithArgs("token","/="),591);$vars.rhs=this._appendStructure($r1,this._apply("expr"),594);$r1.value=["mset",$vars.e,"/",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(597);this._appendStructure($r1,this._applyWithArgs("token","%="),599);$vars.rhs=this._appendStructure($r1,this._apply("expr"),602);$r1.value=["mset",$vars.e,"%",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(605);this._appendStructure($r1,this._applyWithArgs("token","&&="),607);$vars.rhs=this._appendStructure($r1,this._apply("expr"),610);$r1.value=["mset",$vars.e,"&&",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(613);this._appendStructure($r1,this._applyWithArgs("token","||="),615);$vars.rhs=this._appendStructure($r1,this._apply("expr"),618);$r1.value=["mset",$vars.e,"||",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(621);this._appendStructure($r1,this._apply("empty"),623);$r1.value=$vars.e;return this._endStructure($r1);}),542);return this._endStructure($r0);},
"orExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(626, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(629);$vars.x=this._appendStructure($r1,this._apply("orExpr"),632);this._appendStructure($r1,this._applyWithArgs("token","||"),634);$vars.y=this._appendStructure($r1,this._apply("andExpr"),637);$r1.value=["binop","||",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("andExpr"),640);}),627);return this._endStructure($r0);},
"andExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(642, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(645);$vars.x=this._appendStructure($r1,this._apply("andExpr"),648);this._appendStructure($r1,this._applyWithArgs("token","&&"),650);$vars.y=this._appendStructure($r1,this._apply("eqExpr"),653);$r1.value=["binop","&&",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("eqExpr"),656);}),643);return this._endStructure($r0);},
"eqExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(658, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(661);$vars.x=this._appendStructure($r1,this._apply("eqExpr"),664);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(668);this._appendStructure($r2,this._applyWithArgs("token","=="),670);$vars.y=this._appendStructure($r2,this._apply("relExpr"),673);$r2.value=["binop","==",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(676);this._appendStructure($r2,this._applyWithArgs("token","!="),678);$vars.y=this._appendStructure($r2,this._apply("relExpr"),681);$r2.value=["binop","!=",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(684);this._appendStructure($r2,this._applyWithArgs("token","==="),686);$vars.y=this._appendStructure($r2,this._apply("relExpr"),689);$r2.value=["binop","===",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(692);this._appendStructure($r2,this._applyWithArgs("token","!=="),694);$vars.y=this._appendStructure($r2,this._apply("relExpr"),697);$r2.value=["binop","!==",$vars.x,$vars.y];return this._endStructure($r2);}),666);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("relExpr"),700);}),659);return this._endStructure($r0);},
"relExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(702, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(705);$vars.x=this._appendStructure($r1,this._apply("relExpr"),708);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(712);this._appendStructure($r2,this._applyWithArgs("token",">"),714);$vars.y=this._appendStructure($r2,this._apply("addExpr"),717);$r2.value=["binop",">",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(720);this._appendStructure($r2,this._applyWithArgs("token",">="),722);$vars.y=this._appendStructure($r2,this._apply("addExpr"),725);$r2.value=["binop",">=",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(728);this._appendStructure($r2,this._applyWithArgs("token","<"),730);$vars.y=this._appendStructure($r2,this._apply("addExpr"),733);$r2.value=["binop","<",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(736);this._appendStructure($r2,this._applyWithArgs("token","<="),738);$vars.y=this._appendStructure($r2,this._apply("addExpr"),741);$r2.value=["binop","<=",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(744);this._appendStructure($r2,this._applyWithArgs("token","instanceof"),746);$vars.y=this._appendStructure($r2,this._apply("addExpr"),749);$r2.value=["binop","instanceof",$vars.x,$vars.y];return this._endStructure($r2);}),710);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("addExpr"),752);}),703);return this._endStructure($r0);},
"addExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(754, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(757);$vars.x=this._appendStructure($r1,this._apply("addExpr"),760);this._appendStructure($r1,this._applyWithArgs("token","+"),762);$vars.y=this._appendStructure($r1,this._apply("mulExpr"),765);$r1.value=["binop","+",$vars.x,$vars.y];return this._endStructure($r1);},function(){var $r1=this._startStructure(768);$vars.x=this._appendStructure($r1,this._apply("addExpr"),771);this._appendStructure($r1,this._applyWithArgs("token","-"),773);$vars.y=this._appendStructure($r1,this._apply("mulExpr"),776);$r1.value=["binop","-",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("mulExpr"),779);}),755);return this._endStructure($r0);},
"mulExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(781, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(784);$vars.x=this._appendStructure($r1,this._apply("mulExpr"),787);this._appendStructure($r1,this._applyWithArgs("token","*"),789);$vars.y=this._appendStructure($r1,this._apply("unary"),792);$r1.value=["binop","*",$vars.x,$vars.y];return this._endStructure($r1);},function(){var $r1=this._startStructure(795);$vars.x=this._appendStructure($r1,this._apply("mulExpr"),798);this._appendStructure($r1,this._applyWithArgs("token","/"),800);$vars.y=this._appendStructure($r1,this._apply("unary"),803);$r1.value=["binop","/",$vars.x,$vars.y];return this._endStructure($r1);},function(){var $r1=this._startStructure(806);$vars.x=this._appendStructure($r1,this._apply("mulExpr"),809);this._appendStructure($r1,this._applyWithArgs("token","%"),811);$vars.y=this._appendStructure($r1,this._apply("unary"),814);$r1.value=["binop","%",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("unary"),817);}),782);return this._endStructure($r0);},
"unary":function(){var $elf=this,$vars={},$r0=this._startStructure(819, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(822);this._appendStructure($r1,this._applyWithArgs("token","-"),824);$vars.p=this._appendStructure($r1,this._apply("postfix"),827);$r1.value=["unop","-",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(830);this._appendStructure($r1,this._applyWithArgs("token","+"),832);$vars.p=this._appendStructure($r1,this._apply("postfix"),835);$r1.value=["unop","+",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(838);this._appendStructure($r1,this._applyWithArgs("token","++"),840);$vars.p=this._appendStructure($r1,this._apply("postfix"),843);$r1.value=["preop","++",$vars.p,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(846);this._appendStructure($r1,this._applyWithArgs("token","--"),848);$vars.p=this._appendStructure($r1,this._apply("postfix"),851);$r1.value=["preop","--",$vars.p,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(854);this._appendStructure($r1,this._applyWithArgs("token","!"),856);$vars.p=this._appendStructure($r1,this._apply("unary"),859);$r1.value=["unop","!",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(862);this._appendStructure($r1,this._applyWithArgs("token","void"),864);$vars.p=this._appendStructure($r1,this._apply("unary"),867);$r1.value=["unop","void",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(870);this._appendStructure($r1,this._applyWithArgs("token","delete"),872);$vars.p=this._appendStructure($r1,this._apply("unary"),875);$r1.value=["unop","delete",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(878);this._appendStructure($r1,this._applyWithArgs("token","typeof"),880);$vars.p=this._appendStructure($r1,this._apply("unary"),883);$r1.value=["unop","typeof",$vars.p];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("postfix"),886);}),820);return this._endStructure($r0);},
"postfix":function(){var $elf=this,$vars={},$r0=this._startStructure(888, true);$vars.p=this._appendStructure($r0,this._apply("primExpr"),891);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(895);this._appendStructure($r1,this._apply("spacesNoNl"),897);this._appendStructure($r1,this._applyWithArgs("token","++"),899);$r1.value=["postop","++",$vars.p,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(902);this._appendStructure($r1,this._apply("spacesNoNl"),904);this._appendStructure($r1,this._applyWithArgs("token","--"),906);$r1.value=["postop","--",$vars.p,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(909);this._appendStructure($r1,this._apply("empty"),911);$r1.value=$vars.p;return this._endStructure($r1);}),893);return this._endStructure($r0);},
"primExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(914, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(917);$vars.p=this._appendStructure($r1,this._apply("primExpr"),920);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(924);this._appendStructure($r2,this._applyWithArgs("token","["),926);$vars.i=this._appendStructure($r2,this._apply("expr"),929);this._appendStructure($r2,this._applyWithArgs("token","]"),931);$r2.value=["getp",$vars.i,$vars.p];return this._endStructure($r2);},function(){var $r2=this._startStructure(934);this._appendStructure($r2,this._applyWithArgs("token","."),936);$vars.m=this._appendStructure($r2,this._apply("anyname"),939);this._appendStructure($r2,this._applyWithArgs("token","("),941);$vars.as=this._appendStructure($r2,this._applyWithArgs("listOf","expr",","),944);this._appendStructure($r2,this._applyWithArgs("token",")"),948);$r2.value=["send",$vars.m,$vars.p].concat($vars.as);return this._endStructure($r2);},function(){var $r2=this._startStructure(951);this._appendStructure($r2,this._applyWithArgs("token","."),953);$vars.f=this._appendStructure($r2,this._apply("anyname"),956);$r2.value=["getp",["string",$vars.f],$vars.p];return this._endStructure($r2);},function(){var $r2=this._startStructure(959);this._appendStructure($r2,this._applyWithArgs("token","("),961);$vars.as=this._appendStructure($r2,this._applyWithArgs("listOf","expr",","),964);this._appendStructure($r2,this._applyWithArgs("token",")"),968);$r2.value=["call",$vars.p].concat($vars.as).concat(this._extractLocation($r2));return this._endStructure($r2);}),922);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("primExprHd"),971);}),915);return this._endStructure($r0);},
"primExprHd":function(){var $elf=this,$vars={},$r0=this._startStructure(973, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(976);this._appendStructure($r1,this._applyWithArgs("token","("),978);$vars.e=this._appendStructure($r1,this._apply("expr"),981);this._appendStructure($r1,this._applyWithArgs("token",")"),983);$r1.value=$vars.e;return this._endStructure($r1);},function(){var $r1=this._startStructure(986);this._appendStructure($r1,this._applyWithArgs("token","this"),988);$r1.value=["this"];return this._endStructure($r1);},function(){var $r1=this._startStructure(991);$vars.n=this._appendStructure($r1,this._applyWithArgs("token","name"),994);$r1.value=["get",$vars.n];return this._endStructure($r1);},function(){var $r1=this._startStructure(997);$vars.n=this._appendStructure($r1,this._applyWithArgs("token","number"),1000);$r1.value=["number",$vars.n];return this._endStructure($r1);},function(){var $r1=this._startStructure(1003);$vars.s=this._appendStructure($r1,this._applyWithArgs("token","string"),1006);$r1.value=["string",$vars.s];return this._endStructure($r1);},function(){var $r1=this._startStructure(1009);this._appendStructure($r1,this._applyWithArgs("token","function"),1011);$r1.value=this._appendStructure($r1,this._apply("funcRest"),1013);return this._endStructure($r1);},function(){var $r1=this._startStructure(1015);this._appendStructure($r1,this._applyWithArgs("token","new"),1017);$vars.e=this._appendStructure($r1,this._apply("primExpr"),1020);$r1.value=["new",$vars.e];return this._endStructure($r1);},function(){var $r1=this._startStructure(1023);this._appendStructure($r1,this._applyWithArgs("token","["),1025);$vars.es=this._appendStructure($r1,this._applyWithArgs("enum","expr",","),1028);this._appendStructure($r1,this._applyWithArgs("token","]"),1032);$r1.value=["arr"].concat($vars.es);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("json"),1035);},function(){return this._forwardStructure(this._apply("re"),1037);}),974);return this._endStructure($r0);},
"json":function(){var $elf=this,$vars={},$r0=this._startStructure(1039, true);this._appendStructure($r0,this._applyWithArgs("token","{"),1041);$vars.bs=this._appendStructure($r0,this._applyWithArgs("enum","jsonBinding",","),1044);this._appendStructure($r0,this._applyWithArgs("token","}"),1048);$r0.value=["json"].concat($vars.bs);return this._endStructure($r0);},
"jsonBinding":function(){var $elf=this,$vars={},$r0=this._startStructure(1051, true);$vars.n=this._appendStructure($r0,this._apply("jsonPropName"),1054);this._appendStructure($r0,this._applyWithArgs("token",":"),1056);$vars.v=this._appendStructure($r0,this._apply("expr"),1059);$r0.value=["binding",$vars.n,$vars.v];return this._endStructure($r0);},
"jsonPropName":function(){var $elf=this,$vars={},$r0=this._startStructure(1062, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._applyWithArgs("token","name"),1065);},function(){return this._forwardStructure(this._applyWithArgs("token","number"),1067);},function(){return this._forwardStructure(this._applyWithArgs("token","string"),1069);}),1063);return this._endStructure($r0);},
"re":function(){var $elf=this,$vars={},$r0=this._startStructure(1071, true);this._appendStructure($r0,this._apply("spaces"),1073);$vars.x=this._appendStructure($r0,this._consumedBy(function(){var $r1=this._startStructure(1078);this._appendStructure($r1,this.exactly("/"),1080);this._appendStructure($r1,this._apply("reBody"),1082);this._appendStructure($r1,this.exactly("/"),1084);$r1.value=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._apply("reFlag"),1088);}),1086);return this._endStructure($r1);}),1076);$r0.value=["regExpr",$vars.x];return this._endStructure($r0);},
"reBody":function(){var $elf=this,$vars={},$r0=this._startStructure(1091, true);this._appendStructure($r0,this._apply("re1stChar"),1093);$r0.value=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("reChar"),1097);}),1095);return this._endStructure($r0);},
"re1stChar":function(){var $elf=this,$vars={},$r0=this._startStructure(1099, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1102);this._appendStructure($r1,this._not(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this.exactly("*"),1108);},function(){return this._forwardStructure(this.exactly("\\"),1110);},function(){return this._forwardStructure(this.exactly("/"),1112);},function(){return this._forwardStructure(this.exactly("["),1114);}),1106);}),1104);$r1.value=this._appendStructure($r1,this._apply("reNonTerm"),1116);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("escapeChar"),1118);},function(){return this._forwardStructure(this._apply("reClass"),1120);}),1100);return this._endStructure($r0);},
"reChar":function(){var $elf=this,$vars={},$r0=this._startStructure(1122, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("re1stChar"),1125);},function(){return this._forwardStructure(this.exactly("*"),1127);}),1123);return this._endStructure($r0);},
"reNonTerm":function(){var $elf=this,$vars={},$r0=this._startStructure(1129, true);this._appendStructure($r0,this._not(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this.exactly("\n"),1135);},function(){return this._forwardStructure(this.exactly("\r"),1137);}),1133);}),1131);$r0.value=this._appendStructure($r0,this._apply("char"),1139);return this._endStructure($r0);},
"reClass":function(){var $elf=this,$vars={},$r0=this._startStructure(1141, true);this._appendStructure($r0,this.exactly("["),1143);this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("reClassChar"),1147);}),1145);$r0.value=this._appendStructure($r0,this.exactly("]"),1149);return this._endStructure($r0);},
"reClassChar":function(){var $elf=this,$vars={},$r0=this._startStructure(1151, true);this._appendStructure($r0,this._not(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this.exactly("["),1157);},function(){return this._forwardStructure(this.exactly("]"),1159);}),1155);}),1153);$r0.value=this._appendStructure($r0,this._apply("reChar"),1161);return this._endStructure($r0);},
"reFlag":function(){var $elf=this,$vars={},$r0=this._startStructure(1163, true);$r0.value=this._appendStructure($r0,this._apply("nameFirst"),1164);return this._endStructure($r0);},
"formal":function(){var $elf=this,$vars={},$r0=this._startStructure(1166, true);this._appendStructure($r0,this._apply("spaces"),1168);$r0.value=this._appendStructure($r0,this._applyWithArgs("token","name"),1170);return this._endStructure($r0);},
"funcRest":function(){var $elf=this,$vars={},$r0=this._startStructure(1172, true);this._appendStructure($r0,this._applyWithArgs("token","("),1174);$vars.fs=this._appendStructure($r0,this._applyWithArgs("listOf","formal",","),1177);this._appendStructure($r0,this._applyWithArgs("token",")"),1181);this._appendStructure($r0,this._applyWithArgs("token","{"),1183);$vars.body=this._appendStructure($r0,this._apply("srcElems"),1186);this._appendStructure($r0,this._applyWithArgs("token","}"),1188);$r0.value=["func",$vars.fs,$vars.body];return this._endStructure($r0);},
"sc":function(){var $elf=this,$vars={},$r0=this._startStructure(1191, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1194);this._appendStructure($r1,this._apply("spacesNoNl"),1196);$r1.value=this._appendStructure($r1,this._or(function(){return this._forwardStructure(this.exactly("\n"),1200);},function(){return this._forwardStructure(this._lookahead(function(){return this._forwardStructure(this.exactly("}"),1204);}),1202);},function(){return this._forwardStructure(this.end(),1206);}),1198);return this._endStructure($r1);},function(){return this._forwardStructure(this._applyWithArgs("token",";"),1208);}),1192);return this._endStructure($r0);},
"varBinder":function(){var $elf=this,$vars={},$r0=this._startStructure(1210, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._applyWithArgs("token","var"),1213);},function(){return this._forwardStructure(this._applyWithArgs("token","let"),1215);},function(){return this._forwardStructure(this._applyWithArgs("token","const"),1217);}),1211);return this._endStructure($r0);},
"varBinding":function(){var $elf=this,$vars={},$r0=this._startStructure(1219, true);$vars.n=this._appendStructure($r0,this._applyWithArgs("token","name"),1222);$vars.v=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1227);this._appendStructure($r1,this._applyWithArgs("token","="),1229);$r1.value=this._appendStructure($r1,this._apply("expr"),1231);return this._endStructure($r1);},function(){var $r1=this._startStructure(1233);this._appendStructure($r1,this._apply("empty"),1235);$r1.value=["get","undefined"];return this._endStructure($r1);}),1225);$r0.value=["assignVar",$vars.n,$vars.v,this._extractLocation($r0)];return this._endStructure($r0);},
"block":function(){var $elf=this,$vars={},$r0=this._startStructure(1239, true);this._appendStructure($r0,this._applyWithArgs("token","{"),1241);$vars.ss=this._appendStructure($r0,this._apply("srcElems"),1244);this._appendStructure($r0,this._applyWithArgs("token","}"),1246);$r0.value=["begin",$vars.ss];return this._endStructure($r0);},
"stmt":function(){var $elf=this,$vars={},$r0=this._startStructure(1249, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("block"),1252);},function(){var $r1=this._startStructure(1254);$vars.decl=this._appendStructure($r1,this._apply("varBinder"),1257);$vars.bs=this._appendStructure($r1,this._applyWithArgs("listOf","varBinding",","),1260);this._appendStructure($r1,this._apply("sc"),1264);$r1.value=["beginVars",$vars.decl].concat($vars.bs);return this._endStructure($r1);},function(){var $r1=this._startStructure(1267);this._appendStructure($r1,this._applyWithArgs("token","if"),1269);this._appendStructure($r1,this._applyWithArgs("token","("),1271);$vars.c=this._appendStructure($r1,this._apply("expr"),1274);this._appendStructure($r1,this._applyWithArgs("token",")"),1276);$vars.t=this._appendStructure($r1,this._apply("stmt"),1279);$vars.f=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1284);this._appendStructure($r2,this._applyWithArgs("token","else"),1286);$r2.value=this._appendStructure($r2,this._apply("stmt"),1288);return this._endStructure($r2);},function(){var $r2=this._startStructure(1290);this._appendStructure($r2,this._apply("empty"),1292);$r2.value=["get","undefined"];return this._endStructure($r2);}),1282);$r1.value=["if",$vars.c,$vars.t,$vars.f];return this._endStructure($r1);},function(){var $r1=this._startStructure(1296);this._appendStructure($r1,this._applyWithArgs("token","while"),1298);this._appendStructure($r1,this._applyWithArgs("token","("),1300);$vars.c=this._appendStructure($r1,this._apply("expr"),1303);this._appendStructure($r1,this._applyWithArgs("token",")"),1305);$vars.s=this._appendStructure($r1,this._apply("stmt"),1308);$r1.value=["while",$vars.c,["begin",$vars.s,["emitEvent","while",this._extractLocation($r1)]]];return this._endStructure($r1);},function(){var $r1=this._startStructure(1311);this._appendStructure($r1,this._applyWithArgs("token","do"),1313);$vars.s=this._appendStructure($r1,this._apply("stmt"),1316);this._appendStructure($r1,this._applyWithArgs("token","while"),1318);this._appendStructure($r1,this._applyWithArgs("token","("),1320);$vars.c=this._appendStructure($r1,this._apply("expr"),1323);this._appendStructure($r1,this._applyWithArgs("token",")"),1325);this._appendStructure($r1,this._apply("sc"),1327);$r1.value=["doWhile",["begin",$vars.s,["emitEvent","doWhile",this._extractLocation($r1)]],$vars.c];return this._endStructure($r1);},function(){var $r1=this._startStructure(1330);this._appendStructure($r1,this._applyWithArgs("token","for"),1332);this._appendStructure($r1,this._applyWithArgs("token","("),1334);$vars.i=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1339);$vars.decl=this._appendStructure($r2,this._apply("varBinder"),1342);$vars.bs=this._appendStructure($r2,this._applyWithArgs("listOf","varBinding",","),1345);$r2.value=["beginVars",$vars.decl].concat($vars.bs);return this._endStructure($r2);},function(){return this._forwardStructure(this._apply("expr"),1350);},function(){var $r2=this._startStructure(1352);this._appendStructure($r2,this._apply("empty"),1354);$r2.value=["get","undefined"];return this._endStructure($r2);}),1337);this._appendStructure($r1,this._applyWithArgs("token",";"),1357);$vars.c=this._appendStructure($r1,this._or(function(){return this._forwardStructure(this._apply("expr"),1362);},function(){var $r2=this._startStructure(1364);this._appendStructure($r2,this._apply("empty"),1366);$r2.value=["get","true"];return this._endStructure($r2);}),1360);this._appendStructure($r1,this._applyWithArgs("token",";"),1369);$vars.u=this._appendStructure($r1,this._or(function(){return this._forwardStructure(this._apply("expr"),1374);},function(){var $r2=this._startStructure(1376);this._appendStructure($r2,this._apply("empty"),1378);$r2.value=["get","undefined"];return this._endStructure($r2);}),1372);this._appendStructure($r1,this._applyWithArgs("token",")"),1381);$vars.s=this._appendStructure($r1,this._apply("stmt"),1384);$r1.value=["for",$vars.i,$vars.c,$vars.u,["begin",$vars.s,["emitEvent","for",this._extractLocation($r1)]]];return this._endStructure($r1);},function(){var $r1=this._startStructure(1387);this._appendStructure($r1,this._applyWithArgs("token","for"),1389);this._appendStructure($r1,this._applyWithArgs("token","("),1391);$vars.v=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1396);$vars.decl=this._appendStructure($r2,this._apply("varBinder"),1399);$vars.n=this._appendStructure($r2,this._applyWithArgs("token","name"),1402);$r2.value=["beginVars",$vars.decl,["noAssignVar",$vars.n]];return this._endStructure($r2);},function(){return this._forwardStructure(this._apply("expr"),1405);}),1394);this._appendStructure($r1,this._applyWithArgs("token","in"),1407);$vars.e=this._appendStructure($r1,this._apply("expr"),1410);this._appendStructure($r1,this._applyWithArgs("token",")"),1412);$vars.s=this._appendStructure($r1,this._apply("stmt"),1415);$r1.value=["forIn",$vars.v,$vars.e,["begin",$vars.s,["emitEvent","forIn",this._extractLocation($r1)]]];return this._endStructure($r1);},function(){var $r1=this._startStructure(1418);this._appendStructure($r1,this._applyWithArgs("token","switch"),1420);this._appendStructure($r1,this._applyWithArgs("token","("),1422);$vars.e=this._appendStructure($r1,this._apply("expr"),1425);this._appendStructure($r1,this._applyWithArgs("token",")"),1427);this._appendStructure($r1,this._applyWithArgs("token","{"),1429);$vars.cs=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._or(function(){var $r3=this._startStructure(1436);this._appendStructure($r3,this._applyWithArgs("token","case"),1438);$vars.c=this._appendStructure($r3,this._apply("expr"),1441);this._appendStructure($r3,this._applyWithArgs("token",":"),1443);$vars.cs=this._appendStructure($r3,this._apply("srcElems"),1446);$r3.value=["case",$vars.c,["begin",$vars.cs]];return this._endStructure($r3);},function(){var $r3=this._startStructure(1449);this._appendStructure($r3,this._applyWithArgs("token","default"),1451);this._appendStructure($r3,this._applyWithArgs("token",":"),1453);$vars.cs=this._appendStructure($r3,this._apply("srcElems"),1456);$r3.value=["default",["begin",$vars.cs]];return this._endStructure($r3);}),1434);}),1432);this._appendStructure($r1,this._applyWithArgs("token","}"),1459);$r1.value=["switch",$vars.e].concat($vars.cs);return this._endStructure($r1);},function(){var $r1=this._startStructure(1462);this._appendStructure($r1,this._applyWithArgs("token","break"),1464);this._appendStructure($r1,this._apply("sc"),1466);$r1.value=["break"];return this._endStructure($r1);},function(){var $r1=this._startStructure(1469);this._appendStructure($r1,this._applyWithArgs("token","continue"),1471);this._appendStructure($r1,this._apply("sc"),1473);$r1.value=["continue"];return this._endStructure($r1);},function(){var $r1=this._startStructure(1476);this._appendStructure($r1,this._applyWithArgs("token","throw"),1478);this._appendStructure($r1,this._apply("spacesNoNl"),1480);$vars.e=this._appendStructure($r1,this._apply("expr"),1483);this._appendStructure($r1,this._apply("sc"),1485);$r1.value=["throw",$vars.e];return this._endStructure($r1);},function(){var $r1=this._startStructure(1488);this._appendStructure($r1,this._applyWithArgs("token","try"),1490);$vars.t=this._appendStructure($r1,this._apply("block"),1493);this._appendStructure($r1,this._applyWithArgs("token","catch"),1495);this._appendStructure($r1,this._applyWithArgs("token","("),1497);$vars.e=this._appendStructure($r1,this._applyWithArgs("token","name"),1500);this._appendStructure($r1,this._applyWithArgs("token",")"),1502);$vars.c=this._appendStructure($r1,this._apply("block"),1505);$vars.f=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1510);this._appendStructure($r2,this._applyWithArgs("token","finally"),1512);$r2.value=this._appendStructure($r2,this._apply("block"),1514);return this._endStructure($r2);},function(){var $r2=this._startStructure(1516);this._appendStructure($r2,this._apply("empty"),1518);$r2.value=["get","undefined"];return this._endStructure($r2);}),1508);$r1.value=["try",$vars.t,$vars.e,$vars.c,$vars.f];return this._endStructure($r1);},function(){var $r1=this._startStructure(1522);this._appendStructure($r1,this._applyWithArgs("token","return"),1524);$vars.e=this._appendStructure($r1,this._or(function(){return this._forwardStructure(this._apply("expr"),1529);},function(){var $r2=this._startStructure(1531);this._appendStructure($r2,this._apply("empty"),1533);$r2.value=["get","undefined"];return this._endStructure($r2);}),1527);this._appendStructure($r1,this._apply("sc"),1536);$r1.value=["return",$vars.e,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(1539);this._appendStructure($r1,this._applyWithArgs("token","with"),1541);this._appendStructure($r1,this._applyWithArgs("token","("),1543);$vars.x=this._appendStructure($r1,this._apply("expr"),1546);this._appendStructure($r1,this._applyWithArgs("token",")"),1548);$vars.s=this._appendStructure($r1,this._apply("stmt"),1551);$r1.value=["with",$vars.x,$vars.s];return this._endStructure($r1);},function(){var $r1=this._startStructure(1554);$vars.e=this._appendStructure($r1,this._apply("expr"),1557);this._appendStructure($r1,this._apply("sc"),1559);$r1.value=$vars.e;return this._endStructure($r1);},function(){var $r1=this._startStructure(1562);this._appendStructure($r1,this._applyWithArgs("token",";"),1564);$r1.value=["get","undefined"];return this._endStructure($r1);}),1250);return this._endStructure($r0);},
"srcElem":function(){var $elf=this,$vars={},$r0=this._startStructure(1567, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1570);this._appendStructure($r1,this._applyWithArgs("token","function"),1572);$vars.n=this._appendStructure($r1,this._applyWithArgs("token","name"),1575);$vars.f=this._appendStructure($r1,this._apply("funcRest"),1578);$r1.value=["assignVar",$vars.n,$vars.f,this._extractLocation($r1)];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("stmt"),1581);}),1568);return this._endStructure($r0);},
"srcElems":function(){var $elf=this,$vars={},$r0=this._startStructure(1583, true);$vars.ss=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("srcElem"),1588);}),1586);$r0.value=["beginTop"].concat($vars.ss);return this._endStructure($r0);},
"topLevel":function(){var $elf=this,$vars={},$r0=this._startStructure(1591, true);$vars.r=this._appendStructure($r0,this._apply("srcElems"),1594);this._appendStructure($r0,this._apply("spaces"),1596);this._appendStructure($r0,this.end(),1598);$r0.value=$vars.r;return this._endStructure($r0);}});(BSJSParser["hexDigits"]="0123456789abcdef");(BSJSParser["keywords"]=({}));(keywords=["break","case","catch","continue","default","delete","do","else","finally","for","function","if","in","instanceof","new","return","switch","this","throw","try","typeof","var","void","while","with","ometa","let","const"]);for(var idx=(0);(idx < keywords["length"]);idx++){(BSJSParser["keywords"][keywords[idx]]=true);}(BSJSParser["_isKeyword"]=(function (k){return this["keywords"].hasOwnProperty(k);}))
let emitValue=(function (location,variable,expr){return ["$v(",location["start"],",",location["stop"],",",variable.toProgramString(),",",expr,")"].join("");});let emitValueBefore=(function (expr,opExpr,loc){return ["(function(){",opExpr,";var $r=",expr,";return ",emitValue(loc,expr,"$r"),";})()"].join("");});let BSJSTranslator=objectThatDelegatesTo(OMeta,{
"trans":function(){var $elf=this,$vars={},$r0=this._startStructure(1602, true);this._appendStructure($r0,this._form(function(){var $r1=this._startStructure(1606);$vars.t=this._getStructureValue(this.anything());$r1.value=($vars.ans=this._appendStructure($r1,this._apply($vars.t),1611));return this._endStructure($r1);}),1604);$r0.value=$vars.ans;return this._endStructure($r0);},
"curlyTrans":function(){var $elf=this,$vars={},$r0=this._startStructure(1615, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1618);this._appendStructure($r1,this._form(function(){var $r2=this._startStructure(1622);this._appendStructure($r2,this.exactly("begin"),1624);$r2.value=($vars.r=this._appendStructure($r2,this._apply("curlyTrans"),1628));return this._endStructure($r2);}),1620);$r1.value=$vars.r;return this._endStructure($r1);},function(){var $r1=this._startStructure(1631);this._appendStructure($r1,this._form(function(){var $r2=this._startStructure(1635);this._appendStructure($r2,this.exactly("begin"),1637);$r2.value=($vars.rs=this._appendStructure($r2,this._many(function(){return this._forwardStructure(this._apply("trans"),1643);}),1641));return this._endStructure($r2);}),1633);$r1.value=(("{" + $vars.rs.join(";")) + ";}");return this._endStructure($r1);},function(){var $r1=this._startStructure(1646);$vars.r=this._appendStructure($r1,this._apply("trans"),1649);$r1.value=(("{" + $vars.r) + ";}");return this._endStructure($r1);}),1616);return this._endStructure($r0);},
"this":function(){var $elf=this,$vars={},$r0=this._startStructure(1652, true);$r0.value="this";return this._endStructure($r0);},
"break":function(){var $elf=this,$vars={},$r0=this._startStructure(1654, true);$r0.value="break";return this._endStructure($r0);},
"continue":function(){var $elf=this,$vars={},$r0=this._startStructure(1656, true);$r0.value="continue";return this._endStructure($r0);},
"number":function(){var $elf=this,$vars={},$r0=this._startStructure(1658, true);$vars.n=this._getStructureValue(this.anything());$r0.value=(("(" + $vars.n) + ")");return this._endStructure($r0);},
"string":function(){var $elf=this,$vars={},$r0=this._startStructure(1662, true);$vars.s=this._getStructureValue(this.anything());$r0.value=$vars.s.toProgramString();return this._endStructure($r0);},
"name":function(){var $elf=this,$vars={},$r0=this._startStructure(1666, true);$vars.s=this._getStructureValue(this.anything());$r0.value=$vars.s;return this._endStructure($r0);},
"regExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(1670, true);$vars.x=this._getStructureValue(this.anything());$r0.value=$vars.x;return this._endStructure($r0);},
"arr":function(){var $elf=this,$vars={},$r0=this._startStructure(1674, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1679);}),1677);$r0.value=(("[" + $vars.xs.join(",")) + "]");return this._endStructure($r0);},
"unop":function(){var $elf=this,$vars={},$r0=this._startStructure(1682, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1686);$r0.value=(((("(" + $vars.op) + " ") + $vars.x) + ")");return this._endStructure($r0);},
"getp":function(){var $elf=this,$vars={},$r0=this._startStructure(1689, true);$vars.fd=this._appendStructure($r0,this._apply("trans"),1692);$vars.x=this._appendStructure($r0,this._apply("trans"),1695);$r0.value=((($vars.x + "[") + $vars.fd) + "]");return this._endStructure($r0);},
"get":function(){var $elf=this,$vars={},$r0=this._startStructure(1698, true);$vars.x=this._getStructureValue(this.anything());$r0.value=$vars.x;return this._endStructure($r0);},
"set":function(){var $elf=this,$vars={},$r0=this._startStructure(1702, true);$vars.lhs=this._appendStructure($r0,this._apply("trans"),1705);$vars.rhs=this._appendStructure($r0,this._apply("trans"),1708);$vars.l=this._getStructureValue(this.anything());$r0.value=(((("(" + $vars.lhs) + "=") + emitValue($vars.l,$vars.lhs,$vars.rhs)) + ")");return this._endStructure($r0);},
"mset":function(){var $elf=this,$vars={},$r0=this._startStructure(1712, true);$vars.lhs=this._appendStructure($r0,this._apply("trans"),1715);$vars.op=this._getStructureValue(this.anything());$vars.rhs=this._appendStructure($r0,this._apply("trans"),1719);$vars.l=this._getStructureValue(this.anything());$r0.value=(((("(" + $vars.lhs) + "=") + emitValue($vars.l,$vars.lhs,(((($vars.lhs + " ") + $vars.op) + " ") + $vars.rhs))) + ")");return this._endStructure($r0);},
"binop":function(){var $elf=this,$vars={},$r0=this._startStructure(1723, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1727);$vars.y=this._appendStructure($r0,this._apply("trans"),1730);$r0.value=(((((("(" + $vars.x) + " ") + $vars.op) + " ") + $vars.y) + ")");return this._endStructure($r0);},
"preop":function(){var $elf=this,$vars={},$r0=this._startStructure(1733, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1737);$vars.l=this._getStructureValue(this.anything());$r0.value=((($vars.op + $vars.x) + ",") + emitValue($vars.l,$vars.x,$vars.x));return this._endStructure($r0);},
"postop":function(){var $elf=this,$vars={},$r0=this._startStructure(1741, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1745);$vars.l=this._getStructureValue(this.anything());$r0.value=emitValueBefore($vars.x,($vars.x + $vars.op),$vars.l);return this._endStructure($r0);},
"return":function(){var $elf=this,$vars={},$r0=this._startStructure(1749, true);$vars.x=this._appendStructure($r0,this._apply("trans"),1752);$vars.l=this._getStructureValue(this.anything());$r0.value=("return " + emitValue($vars.l,"return",$vars.x));return this._endStructure($r0);},
"with":function(){var $elf=this,$vars={},$r0=this._startStructure(1756, true);$vars.x=this._appendStructure($r0,this._apply("trans"),1759);$vars.s=this._appendStructure($r0,this._apply("curlyTrans"),1762);$r0.value=((("with(" + $vars.x) + ")") + $vars.s);return this._endStructure($r0);},
"if":function(){var $elf=this,$vars={},$r0=this._startStructure(1765, true);$vars.cond=this._appendStructure($r0,this._apply("trans"),1768);$vars.t=this._appendStructure($r0,this._apply("curlyTrans"),1771);$vars.e=this._appendStructure($r0,this._apply("curlyTrans"),1774);$r0.value=((((("if(" + $vars.cond) + ")") + $vars.t) + "else") + $vars.e);return this._endStructure($r0);},
"condExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(1777, true);$vars.cond=this._appendStructure($r0,this._apply("trans"),1780);$vars.t=this._appendStructure($r0,this._apply("trans"),1783);$vars.e=this._appendStructure($r0,this._apply("trans"),1786);$r0.value=(((((("(" + $vars.cond) + "?") + $vars.t) + ":") + $vars.e) + ")");return this._endStructure($r0);},
"while":function(){var $elf=this,$vars={},$r0=this._startStructure(1789, true);$vars.cond=this._appendStructure($r0,this._apply("trans"),1792);$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),1795);$r0.value=((("while(" + $vars.cond) + ")") + $vars.body);return this._endStructure($r0);},
"doWhile":function(){var $elf=this,$vars={},$r0=this._startStructure(1798, true);$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),1801);$vars.cond=this._appendStructure($r0,this._apply("trans"),1804);$r0.value=(((("do" + $vars.body) + "while(") + $vars.cond) + ")");return this._endStructure($r0);},
"for":function(){var $elf=this,$vars={},$r0=this._startStructure(1807, true);$vars.init=this._appendStructure($r0,this._apply("trans"),1810);$vars.cond=this._appendStructure($r0,this._apply("trans"),1813);$vars.upd=this._appendStructure($r0,this._apply("trans"),1816);$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),1819);$r0.value=((((((("for(" + $vars.init) + ";") + $vars.cond) + ";") + $vars.upd) + ")") + $vars.body);return this._endStructure($r0);},
"forIn":function(){var $elf=this,$vars={},$r0=this._startStructure(1822, true);$vars.x=this._appendStructure($r0,this._apply("trans"),1825);$vars.arr=this._appendStructure($r0,this._apply("trans"),1828);$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),1831);$r0.value=((((("for(" + $vars.x) + " in ") + $vars.arr) + ")") + $vars.body);return this._endStructure($r0);},
"beginTop":function(){var $elf=this,$vars={},$r0=this._startStructure(1834, true);$vars.xs=this._appendStructure($r0,this._many(function(){var $r1=this._startStructure(1839);$vars.x=this._appendStructure($r1,this._apply("trans"),1842);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1846);this._appendStructure($r2,this._or(function(){var $r3=this._startStructure(1849);$r3.value=this._pred(($vars.x[($vars.x["length"] - (1))] == "}"));return this._endStructure($r3);},function(){return this._forwardStructure(this.end(),1852);}),1848);$r2.value=$vars.x;return this._endStructure($r2);},function(){var $r2=this._startStructure(1855);this._appendStructure($r2,this._apply("empty"),1857);$r2.value=($vars.x + ";");return this._endStructure($r2);}),1844);return this._endStructure($r1);}),1837);$r0.value=$vars.xs.join("");return this._endStructure($r0);},
"begin":function(){var $elf=this,$vars={},$r0=this._startStructure(1861, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1864);$vars.x=this._appendStructure($r1,this._apply("trans"),1867);this._appendStructure($r1,this.end(),1869);$r1.value=$vars.x;return this._endStructure($r1);},function(){var $r1=this._startStructure(1872);$vars.xs=this._appendStructure($r1,this._many(function(){var $r2=this._startStructure(1877);$vars.x=this._appendStructure($r2,this._apply("trans"),1880);$r2.value=this._appendStructure($r2,this._or(function(){var $r3=this._startStructure(1884);this._appendStructure($r3,this._or(function(){var $r4=this._startStructure(1887);$r4.value=this._pred(($vars.x[($vars.x["length"] - (1))] == "}"));return this._endStructure($r4);},function(){return this._forwardStructure(this.end(),1890);}),1886);$r3.value=$vars.x;return this._endStructure($r3);},function(){var $r3=this._startStructure(1893);this._appendStructure($r3,this._apply("empty"),1895);$r3.value=($vars.x + ";");return this._endStructure($r3);}),1882);return this._endStructure($r2);}),1875);$r1.value=(("{" + $vars.xs.join("")) + "}");return this._endStructure($r1);}),1862);return this._endStructure($r0);},
"beginVars":function(){var $elf=this,$vars={},$r0=this._startStructure(1899, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1902);$vars.decl=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r1,this._apply("trans"),1906);this._appendStructure($r1,this.end(),1908);$r1.value=(($vars.decl + " ") + $vars.x);return this._endStructure($r1);},function(){var $r1=this._startStructure(1911);$vars.decl=this._getStructureValue(this.anything());$vars.xs=this._appendStructure($r1,this._many(function(){var $r2=this._startStructure(1916);$r2.value=($vars.x=this._appendStructure($r2,this._apply("trans"),1919));return this._endStructure($r2);}),1915);$r1.value=(($vars.decl + " ") + $vars.xs.join(","));return this._endStructure($r1);}),1900);return this._endStructure($r0);},
"func":function(){var $elf=this,$vars={},$r0=this._startStructure(1922, true);$vars.args=this._getStructureValue(this.anything());$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),1926);$r0.value=(((("(function (" + $vars.args.join(",")) + ")") + $vars.body) + ")");return this._endStructure($r0);},
"call":function(){var $elf=this,$vars={},$r0=this._startStructure(1929, true);$vars.fn=this._appendStructure($r0,this._apply("trans"),1932);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1937);}),1935);$vars.l=this._getStructureValue(this.anything());$r0.value=(($vars.fn == "log")?((($vars.fn + "(") + emitValue($vars.l,$vars.fn,$vars.args.join(","))) + ")"):((($vars.fn + "(") + $vars.args.join(",")) + ")"));return this._endStructure($r0);},
"send":function(){var $elf=this,$vars={},$r0=this._startStructure(1941, true);$vars.msg=this._getStructureValue(this.anything());$vars.recv=this._appendStructure($r0,this._apply("trans"),1945);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1950);}),1948);$r0.value=((((($vars.recv + ".") + $vars.msg) + "(") + $vars.args.join(",")) + ")");return this._endStructure($r0);},
"new":function(){var $elf=this,$vars={},$r0=this._startStructure(1953, true);$vars.x=this._appendStructure($r0,this._apply("trans"),1956);$r0.value=("new " + $vars.x);return this._endStructure($r0);},
"assignVar":function(){var $elf=this,$vars={},$r0=this._startStructure(1959, true);$vars.name=this._getStructureValue(this.anything());$vars.val=this._appendStructure($r0,this._apply("trans"),1963);$vars.l=this._getStructureValue(this.anything());$r0.value=(($vars.name + "=") + emitValue($vars.l,$vars.name,$vars.val));return this._endStructure($r0);},
"noAssignVar":function(){var $elf=this,$vars={},$r0=this._startStructure(1967, true);$vars.name=this._getStructureValue(this.anything());$r0.value=$vars.name;return this._endStructure($r0);},
"throw":function(){var $elf=this,$vars={},$r0=this._startStructure(1971, true);$vars.x=this._appendStructure($r0,this._apply("trans"),1974);$r0.value=("throw " + $vars.x);return this._endStructure($r0);},
"try":function(){var $elf=this,$vars={},$r0=this._startStructure(1977, true);$vars.x=this._appendStructure($r0,this._apply("curlyTrans"),1980);$vars.name=this._getStructureValue(this.anything());$vars.c=this._appendStructure($r0,this._apply("curlyTrans"),1984);$vars.f=this._appendStructure($r0,this._apply("curlyTrans"),1987);$r0.value=((((((("try " + $vars.x) + "catch(") + $vars.name) + ")") + $vars.c) + "finally") + $vars.f);return this._endStructure($r0);},
"json":function(){var $elf=this,$vars={},$r0=this._startStructure(1990, true);$vars.props=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1995);}),1993);$r0.value=(("({" + $vars.props.join(",")) + "})");return this._endStructure($r0);},
"binding":function(){var $elf=this,$vars={},$r0=this._startStructure(1998, true);$vars.name=this._getStructureValue(this.anything());$vars.val=this._appendStructure($r0,this._apply("trans"),2002);$r0.value=(($vars.name.toProgramString() + ": ") + $vars.val);return this._endStructure($r0);},
"switch":function(){var $elf=this,$vars={},$r0=this._startStructure(2005, true);$vars.x=this._appendStructure($r0,this._apply("trans"),2008);$vars.cases=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),2013);}),2011);$r0.value=(((("switch(" + $vars.x) + "){") + $vars.cases.join(";")) + "}");return this._endStructure($r0);},
"case":function(){var $elf=this,$vars={},$r0=this._startStructure(2016, true);$vars.x=this._appendStructure($r0,this._apply("trans"),2019);$vars.y=this._appendStructure($r0,this._apply("trans"),2022);$r0.value=((("case " + $vars.x) + ": ") + $vars.y);return this._endStructure($r0);},
"default":function(){var $elf=this,$vars={},$r0=this._startStructure(2025, true);$vars.y=this._appendStructure($r0,this._apply("trans"),2028);$r0.value=("default: " + $vars.y);return this._endStructure($r0);},
"emitEvent":function(){var $elf=this,$vars={},$r0=this._startStructure(2031, true);$vars.name=this._getStructureValue(this.anything());$vars.l=this._getStructureValue(this.anything());$r0.value=(((((("$e(" + $vars.l["start"]) + ",") + $vars.l["stop"]) + ",\"") + $vars.name) + "\")");return this._endStructure($r0);}})

