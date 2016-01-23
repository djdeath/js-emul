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
"fromTo":function(){var $elf=this,$vars={},$r0=this._startStructure(132, true);$vars.x=this._getStructureValue(this.anything());$vars.y=this._getStructureValue(this.anything());$r0.value=this._appendStructure($r0,this._consumedBy(function(){var $r1=this._startStructure(138);this._appendStructure($r1,this.seq($vars.x),140);this._appendStructure($r1,this._many(function(){var $r2=this._startStructure(145);this._appendStructure($r2,this._not(function(){return this._forwardStructure(this.seq($vars.y),149);}),147);$r2.value=this._appendStructure($r2,this._apply("char"),152);return this._endStructure($r2);}),143);$r1.value=this._appendStructure($r1,this.seq($vars.y),154);return this._endStructure($r1);}),136);return this._endStructure($r0);},
"fromToOrEnd":function(){var $elf=this,$vars={},$r0=this._startStructure(157, true);$vars.x=this._getStructureValue(this.anything());$vars.y=this._getStructureValue(this.anything());$r0.value=this._appendStructure($r0,this._consumedBy(function(){var $r1=this._startStructure(163);this._appendStructure($r1,this.seq($vars.x),165);this._appendStructure($r1,this._many(function(){var $r2=this._startStructure(170);this._appendStructure($r2,this._not(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this.seq($vars.y),176);},function(){return this._forwardStructure(this.end(),179);}),174);}),172);$r2.value=this._appendStructure($r2,this._apply("char"),181);return this._endStructure($r2);}),168);$r1.value=this._appendStructure($r1,this._or(function(){return this._forwardStructure(this.seq($vars.y),185);},function(){return this._forwardStructure(this.end(),188);}),183);return this._endStructure($r1);}),161);return this._endStructure($r0);}})
let BSJSParser=objectThatDelegatesTo(BaseStrParser,{
"enum":function(){var $elf=this,$vars={},$r0=this._startStructure(191, true);$vars.r=this._getStructureValue(this.anything());$vars.d=this._getStructureValue(this.anything());$vars.v=this._appendStructure($r0,this._applyWithArgs("listOf",$vars.r,$vars.d),196);this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._applyWithArgs("token",","),202);},function(){return this._forwardStructure(this._apply("empty"),204);}),200);$r0.value=$vars.v;return this._endStructure($r0);},
"space":function(){var $elf=this,$vars={},$r0=this._startStructure(207, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(BaseStrParser._superApplyWithArgs(this,"space"),210);},function(){return this._forwardStructure(this._applyWithArgs("fromTo","//","\n"),212);},function(){return this._forwardStructure(this._applyWithArgs("fromTo","/*","*/"),216);}),208);return this._endStructure($r0);},
"nameFirst":function(){var $elf=this,$vars={},$r0=this._startStructure(220, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("letter"),223);},function(){return this._forwardStructure(this.exactly("$"),225);},function(){return this._forwardStructure(this.exactly("_"),227);}),221);return this._endStructure($r0);},
"nameRest":function(){var $elf=this,$vars={},$r0=this._startStructure(229, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("nameFirst"),232);},function(){return this._forwardStructure(this._apply("digit"),234);}),230);return this._endStructure($r0);},
"iName":function(){var $elf=this,$vars={},$r0=this._startStructure(236, true);$r0.value=this._appendStructure($r0,this._consumedBy(function(){var $r1=this._startStructure(239);this._appendStructure($r1,this._apply("nameFirst"),241);$r1.value=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._apply("nameRest"),245);}),243);return this._endStructure($r1);}),237);return this._endStructure($r0);},
"isKeyword":function(){var $elf=this,$vars={},$r0=this._startStructure(247, true);$vars.x=this._getStructureValue(this.anything());$r0.value=this._pred(BSJSParser._isKeyword($vars.x));return this._endStructure($r0);},
"name":function(){var $elf=this,$vars={},$r0=this._startStructure(252, true);$vars.n=this._appendStructure($r0,this._apply("iName"),255);this._appendStructure($r0,this._not(function(){return this._forwardStructure(this._applyWithArgs("isKeyword",$vars.n),259);}),257);$r0.value=["name",$vars.n];return this._endStructure($r0);},
"keyword":function(){var $elf=this,$vars={},$r0=this._startStructure(263, true);$vars.k=this._appendStructure($r0,this._apply("iName"),266);this._appendStructure($r0,this._applyWithArgs("isKeyword",$vars.k),268);$r0.value=[$vars.k,$vars.k];return this._endStructure($r0);},
"anyname":function(){var $elf=this,$vars={},$r0=this._startStructure(272, true);this._appendStructure($r0,this._apply("spaces"),274);$vars.n=this._appendStructure($r0,this._apply("iName"),277);$r0.value=$vars.n;return this._endStructure($r0);},
"hexDigit":function(){var $elf=this,$vars={},$r0=this._startStructure(280, true);$vars.x=this._appendStructure($r0,this._apply("char"),283);$vars.v=this["hexDigits"].indexOf($vars.x.toLowerCase());this._pred(($vars.v >= (0)));$r0.value=$vars.v;return this._endStructure($r0);},
"hexLit":function(){var $elf=this,$vars={},$r0=this._startStructure(290, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(293);$vars.n=this._appendStructure($r1,this._apply("hexLit"),296);$vars.d=this._appendStructure($r1,this._apply("hexDigit"),299);$r1.value=(($vars.n * (16)) + $vars.d);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("hexDigit"),302);}),291);return this._endStructure($r0);},
"number":function(){var $elf=this,$vars={},$r0=this._startStructure(304, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(307);this._appendStructure($r1,this.exactly("0"),308);this._appendStructure($r1,this.exactly("x"),308);"0x";$vars.n=this._appendStructure($r1,this._apply("hexLit"),310);$r1.value=["number",$vars.n];return this._endStructure($r1);},function(){var $r1=this._startStructure(313);$vars.f=this._appendStructure($r1,this._consumedBy(function(){var $r2=this._startStructure(318);this._appendStructure($r2,this._many1(function(){return this._forwardStructure(this._apply("digit"),322);}),320);$r2.value=this._appendStructure($r2,this._opt(function(){var $r3=this._startStructure(326);this._appendStructure($r3,this.exactly("."),328);$r3.value=this._appendStructure($r3,this._many1(function(){return this._forwardStructure(this._apply("digit"),332);}),330);return this._endStructure($r3);}),324);return this._endStructure($r2);}),316);$r1.value=["number",parseFloat($vars.f)];return this._endStructure($r1);}),305);return this._endStructure($r0);},
"escapeChar":function(){var $elf=this,$vars={},$r0=this._startStructure(335, true);$vars.s=this._appendStructure($r0,this._consumedBy(function(){var $r1=this._startStructure(340);this._appendStructure($r1,this.exactly("\\"),342);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(346);this._appendStructure($r2,this.exactly("u"),348);this._appendStructure($r2,this._apply("hexDigit"),350);this._appendStructure($r2,this._apply("hexDigit"),352);this._appendStructure($r2,this._apply("hexDigit"),354);$r2.value=this._appendStructure($r2,this._apply("hexDigit"),356);return this._endStructure($r2);},function(){var $r2=this._startStructure(358);this._appendStructure($r2,this.exactly("x"),360);this._appendStructure($r2,this._apply("hexDigit"),362);$r2.value=this._appendStructure($r2,this._apply("hexDigit"),364);return this._endStructure($r2);},function(){return this._forwardStructure(this._apply("char"),366);}),344);return this._endStructure($r1);}),338);$r0.value=unescape($vars.s);return this._endStructure($r0);},
"str":function(){var $elf=this,$vars={},$r0=this._startStructure(369, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(372);this._appendStructure($r1,this.exactly("\""),373);this._appendStructure($r1,this.exactly("\""),373);this._appendStructure($r1,this.exactly("\""),373);"\"\"\"";$vars.cs=this._appendStructure($r1,this._many(function(){var $r2=this._startStructure(377);this._appendStructure($r2,this._not(function(){var $r3=this._startStructure(381);this._appendStructure($r3,this.exactly("\""),382);this._appendStructure($r3,this.exactly("\""),382);this._appendStructure($r3,this.exactly("\""),382);$r3.value="\"\"\"";return this._endStructure($r3);}),379);$r2.value=this._appendStructure($r2,this._apply("char"),383);return this._endStructure($r2);}),375);this._appendStructure($r1,this.exactly("\""),373);this._appendStructure($r1,this.exactly("\""),373);this._appendStructure($r1,this.exactly("\""),373);"\"\"\"";$r1.value=["string",$vars.cs.join("")];return this._endStructure($r1);},function(){var $r1=this._startStructure(386);this._appendStructure($r1,this.exactly("\'"),388);$vars.cs=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this._apply("escapeChar"),395);},function(){var $r3=this._startStructure(397);this._appendStructure($r3,this._not(function(){return this._forwardStructure(this.exactly("\'"),401);}),399);$r3.value=this._appendStructure($r3,this._apply("char"),403);return this._endStructure($r3);}),393);}),391);this._appendStructure($r1,this.exactly("\'"),405);$r1.value=["string",$vars.cs.join("")];return this._endStructure($r1);},function(){var $r1=this._startStructure(408);this._appendStructure($r1,this.exactly("\""),410);$vars.cs=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this._apply("escapeChar"),417);},function(){var $r3=this._startStructure(419);this._appendStructure($r3,this._not(function(){return this._forwardStructure(this.exactly("\""),423);}),421);$r3.value=this._appendStructure($r3,this._apply("char"),425);return this._endStructure($r3);}),415);}),413);this._appendStructure($r1,this.exactly("\""),427);$r1.value=["string",$vars.cs.join("")];return this._endStructure($r1);},function(){var $r1=this._startStructure(430);this._appendStructure($r1,this._or(function(){return this._forwardStructure(this.exactly("#"),434);},function(){return this._forwardStructure(this.exactly("`"),436);}),432);$vars.n=this._appendStructure($r1,this._apply("iName"),439);$r1.value=["string",$vars.n];return this._endStructure($r1);}),370);return this._endStructure($r0);},
"special":function(){var $elf=this,$vars={},$r0=this._startStructure(442, true);$vars.s=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this.exactly("("),447);},function(){return this._forwardStructure(this.exactly(")"),449);},function(){return this._forwardStructure(this.exactly("{"),451);},function(){return this._forwardStructure(this.exactly("}"),453);},function(){return this._forwardStructure(this.exactly("["),455);},function(){return this._forwardStructure(this.exactly("]"),457);},function(){return this._forwardStructure(this.exactly(","),459);},function(){return this._forwardStructure(this.exactly(";"),461);},function(){return this._forwardStructure(this.exactly("?"),463);},function(){return this._forwardStructure(this.exactly(":"),465);},function(){var $r1=this._startStructure(467);this._appendStructure($r1,this.exactly("!"),468);this._appendStructure($r1,this.exactly("="),468);this._appendStructure($r1,this.exactly("="),468);$r1.value="!==";return this._endStructure($r1);},function(){var $r1=this._startStructure(469);this._appendStructure($r1,this.exactly("!"),470);this._appendStructure($r1,this.exactly("="),470);$r1.value="!=";return this._endStructure($r1);},function(){var $r1=this._startStructure(471);this._appendStructure($r1,this.exactly("="),472);this._appendStructure($r1,this.exactly("="),472);this._appendStructure($r1,this.exactly("="),472);$r1.value="===";return this._endStructure($r1);},function(){var $r1=this._startStructure(473);this._appendStructure($r1,this.exactly("="),474);this._appendStructure($r1,this.exactly("="),474);$r1.value="==";return this._endStructure($r1);},function(){var $r1=this._startStructure(475);this._appendStructure($r1,this.exactly("="),476);$r1.value="=";return this._endStructure($r1);},function(){var $r1=this._startStructure(477);this._appendStructure($r1,this.exactly(">"),478);this._appendStructure($r1,this.exactly(">"),478);this._appendStructure($r1,this.exactly("="),478);$r1.value=">>=";return this._endStructure($r1);},function(){var $r1=this._startStructure(479);this._appendStructure($r1,this.exactly(">"),480);this._appendStructure($r1,this.exactly(">"),480);this._appendStructure($r1,this.exactly(">"),480);$r1.value=">>>";return this._endStructure($r1);},function(){var $r1=this._startStructure(481);this._appendStructure($r1,this.exactly(">"),482);this._appendStructure($r1,this.exactly(">"),482);$r1.value=">>";return this._endStructure($r1);},function(){var $r1=this._startStructure(483);this._appendStructure($r1,this.exactly(">"),484);this._appendStructure($r1,this.exactly("="),484);$r1.value=">=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly(">"),485);},function(){var $r1=this._startStructure(487);this._appendStructure($r1,this.exactly("<"),488);this._appendStructure($r1,this.exactly("<"),488);this._appendStructure($r1,this.exactly("="),488);$r1.value="<<=";return this._endStructure($r1);},function(){var $r1=this._startStructure(489);this._appendStructure($r1,this.exactly("<"),490);this._appendStructure($r1,this.exactly("="),490);$r1.value="<=";return this._endStructure($r1);},function(){var $r1=this._startStructure(491);this._appendStructure($r1,this.exactly("<"),492);this._appendStructure($r1,this.exactly("<"),492);$r1.value="<<";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("<"),493);},function(){var $r1=this._startStructure(495);this._appendStructure($r1,this.exactly("+"),496);this._appendStructure($r1,this.exactly("+"),496);$r1.value="++";return this._endStructure($r1);},function(){var $r1=this._startStructure(497);this._appendStructure($r1,this.exactly("+"),498);this._appendStructure($r1,this.exactly("="),498);$r1.value="+=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("+"),499);},function(){var $r1=this._startStructure(501);this._appendStructure($r1,this.exactly("-"),502);this._appendStructure($r1,this.exactly("-"),502);$r1.value="--";return this._endStructure($r1);},function(){var $r1=this._startStructure(503);this._appendStructure($r1,this.exactly("-"),504);this._appendStructure($r1,this.exactly("="),504);$r1.value="-=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("-"),505);},function(){var $r1=this._startStructure(507);this._appendStructure($r1,this.exactly("*"),508);this._appendStructure($r1,this.exactly("="),508);$r1.value="*=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("*"),509);},function(){var $r1=this._startStructure(511);this._appendStructure($r1,this.exactly("/"),512);this._appendStructure($r1,this.exactly("="),512);$r1.value="/=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("/"),513);},function(){var $r1=this._startStructure(515);this._appendStructure($r1,this.exactly("%"),516);this._appendStructure($r1,this.exactly("="),516);$r1.value="%=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("%"),517);},function(){var $r1=this._startStructure(519);this._appendStructure($r1,this.exactly("|"),520);this._appendStructure($r1,this.exactly("="),520);$r1.value="|=";return this._endStructure($r1);},function(){var $r1=this._startStructure(521);this._appendStructure($r1,this.exactly("&"),522);this._appendStructure($r1,this.exactly("="),522);$r1.value="&=";return this._endStructure($r1);},function(){var $r1=this._startStructure(523);this._appendStructure($r1,this.exactly("&"),524);this._appendStructure($r1,this.exactly("&"),524);this._appendStructure($r1,this.exactly("="),524);$r1.value="&&=";return this._endStructure($r1);},function(){var $r1=this._startStructure(525);this._appendStructure($r1,this.exactly("&"),526);this._appendStructure($r1,this.exactly("&"),526);$r1.value="&&";return this._endStructure($r1);},function(){var $r1=this._startStructure(527);this._appendStructure($r1,this.exactly("|"),528);this._appendStructure($r1,this.exactly("|"),528);this._appendStructure($r1,this.exactly("="),528);$r1.value="||=";return this._endStructure($r1);},function(){var $r1=this._startStructure(529);this._appendStructure($r1,this.exactly("|"),530);this._appendStructure($r1,this.exactly("|"),530);$r1.value="||";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("."),531);},function(){return this._forwardStructure(this.exactly("!"),533);}),445);$r0.value=[$vars.s,$vars.s];return this._endStructure($r0);},
"tok":function(){var $elf=this,$vars={},$r0=this._startStructure(536, true);this._appendStructure($r0,this._apply("spaces"),538);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("name"),542);},function(){return this._forwardStructure(this._apply("keyword"),544);},function(){return this._forwardStructure(this._apply("number"),546);},function(){return this._forwardStructure(this._apply("str"),548);},function(){return this._forwardStructure(this._apply("special"),550);}),540);return this._endStructure($r0);},
"toks":function(){var $elf=this,$vars={},$r0=this._startStructure(552, true);$vars.ts=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("token"),557);}),555);this._appendStructure($r0,this._apply("spaces"),559);this._appendStructure($r0,this.end(),561);$r0.value=$vars.ts;return this._endStructure($r0);},
"token":function(){var $elf=this,$vars={},$r0=this._startStructure(564, true);$vars.tt=this._getStructureValue(this.anything());$vars.t=this._appendStructure($r0,this._apply("tok"),568);this._pred(($vars.t[(0)] == $vars.tt));$r0.value=$vars.t[(1)];return this._endStructure($r0);},
"spacesNoNl":function(){var $elf=this,$vars={},$r0=this._startStructure(573, true);$r0.value=this._appendStructure($r0,this._many(function(){var $r1=this._startStructure(576);this._appendStructure($r1,this._not(function(){return this._forwardStructure(this.exactly("\n"),580);}),578);$r1.value=this._appendStructure($r1,this._apply("space"),582);return this._endStructure($r1);}),574);return this._endStructure($r0);},
"expr":function(){var $elf=this,$vars={},$r0=this._startStructure(584, true);$vars.e=this._appendStructure($r0,this._apply("orExpr"),587);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(591);this._appendStructure($r1,this._applyWithArgs("token","?"),593);$vars.t=this._appendStructure($r1,this._apply("expr"),596);this._appendStructure($r1,this._applyWithArgs("token",":"),598);$vars.f=this._appendStructure($r1,this._apply("expr"),601);$r1.value=["condExpr",$vars.e,$vars.t,$vars.f];return this._endStructure($r1);},function(){var $r1=this._startStructure(604);this._appendStructure($r1,this._applyWithArgs("token","="),606);$vars.rhs=this._appendStructure($r1,this._apply("expr"),609);$r1.value=["set",$vars.e,$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(612);this._appendStructure($r1,this._applyWithArgs("token","+="),614);$vars.rhs=this._appendStructure($r1,this._apply("expr"),617);$r1.value=["mset",$vars.e,"+",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(620);this._appendStructure($r1,this._applyWithArgs("token","-="),622);$vars.rhs=this._appendStructure($r1,this._apply("expr"),625);$r1.value=["mset",$vars.e,"-",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(628);this._appendStructure($r1,this._applyWithArgs("token","*="),630);$vars.rhs=this._appendStructure($r1,this._apply("expr"),633);$r1.value=["mset",$vars.e,"*",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(636);this._appendStructure($r1,this._applyWithArgs("token","/="),638);$vars.rhs=this._appendStructure($r1,this._apply("expr"),641);$r1.value=["mset",$vars.e,"/",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(644);this._appendStructure($r1,this._applyWithArgs("token","%="),646);$vars.rhs=this._appendStructure($r1,this._apply("expr"),649);$r1.value=["mset",$vars.e,"%",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(652);this._appendStructure($r1,this._applyWithArgs("token","|="),654);$vars.rhs=this._appendStructure($r1,this._apply("expr"),657);$r1.value=["mset",$vars.e,"|",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(660);this._appendStructure($r1,this._applyWithArgs("token","&="),662);$vars.rhs=this._appendStructure($r1,this._apply("expr"),665);$r1.value=["mset",$vars.e,"&",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(668);this._appendStructure($r1,this._applyWithArgs("token","&&="),670);$vars.rhs=this._appendStructure($r1,this._apply("expr"),673);$r1.value=["mset",$vars.e,"&&",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(676);this._appendStructure($r1,this._applyWithArgs("token","||="),678);$vars.rhs=this._appendStructure($r1,this._apply("expr"),681);$r1.value=["mset",$vars.e,"||",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(684);this._appendStructure($r1,this._applyWithArgs("token",">>="),686);$vars.rhs=this._appendStructure($r1,this._apply("expr"),689);$r1.value=["mset",$vars.e,">>",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(692);this._appendStructure($r1,this._applyWithArgs("token","<<="),694);$vars.rhs=this._appendStructure($r1,this._apply("expr"),697);$r1.value=["mset",$vars.e,"<<",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(700);this._appendStructure($r1,this._apply("empty"),702);$r1.value=$vars.e;return this._endStructure($r1);}),589);return this._endStructure($r0);},
"orExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(705, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(708);$vars.x=this._appendStructure($r1,this._apply("orExpr"),711);this._appendStructure($r1,this._applyWithArgs("token","||"),713);$vars.y=this._appendStructure($r1,this._apply("andExpr"),716);$r1.value=["binop","||",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("andExpr"),719);}),706);return this._endStructure($r0);},
"andExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(721, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(724);$vars.x=this._appendStructure($r1,this._apply("andExpr"),727);this._appendStructure($r1,this._applyWithArgs("token","&&"),729);$vars.y=this._appendStructure($r1,this._apply("eqExpr"),732);$r1.value=["binop","&&",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("eqExpr"),735);}),722);return this._endStructure($r0);},
"eqExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(737, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(740);$vars.x=this._appendStructure($r1,this._apply("eqExpr"),743);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(747);this._appendStructure($r2,this._applyWithArgs("token","=="),749);$vars.y=this._appendStructure($r2,this._apply("relExpr"),752);$r2.value=["binop","==",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(755);this._appendStructure($r2,this._applyWithArgs("token","!="),757);$vars.y=this._appendStructure($r2,this._apply("relExpr"),760);$r2.value=["binop","!=",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(763);this._appendStructure($r2,this._applyWithArgs("token","==="),765);$vars.y=this._appendStructure($r2,this._apply("relExpr"),768);$r2.value=["binop","===",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(771);this._appendStructure($r2,this._applyWithArgs("token","!=="),773);$vars.y=this._appendStructure($r2,this._apply("relExpr"),776);$r2.value=["binop","!==",$vars.x,$vars.y];return this._endStructure($r2);}),745);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("relExpr"),779);}),738);return this._endStructure($r0);},
"relExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(781, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(784);$vars.x=this._appendStructure($r1,this._apply("relExpr"),787);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(791);this._appendStructure($r2,this._applyWithArgs("token",">"),793);$vars.y=this._appendStructure($r2,this._apply("addExpr"),796);$r2.value=["binop",">",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(799);this._appendStructure($r2,this._applyWithArgs("token",">="),801);$vars.y=this._appendStructure($r2,this._apply("addExpr"),804);$r2.value=["binop",">=",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(807);this._appendStructure($r2,this._applyWithArgs("token","<"),809);$vars.y=this._appendStructure($r2,this._apply("addExpr"),812);$r2.value=["binop","<",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(815);this._appendStructure($r2,this._applyWithArgs("token","<="),817);$vars.y=this._appendStructure($r2,this._apply("addExpr"),820);$r2.value=["binop","<=",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(823);this._appendStructure($r2,this._applyWithArgs("token","instanceof"),825);$vars.y=this._appendStructure($r2,this._apply("addExpr"),828);$r2.value=["binop","instanceof",$vars.x,$vars.y];return this._endStructure($r2);}),789);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("shiftExpr"),831);}),782);return this._endStructure($r0);},
"shiftExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(833, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(836);$vars.x=this._appendStructure($r1,this._apply("shiftExpr"),839);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(843);this._appendStructure($r2,this._applyWithArgs("token",">>"),845);$vars.y=this._appendStructure($r2,this._apply("addExpr"),848);$r2.value=["binop",">>",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(851);this._appendStructure($r2,this._applyWithArgs("token","<<"),853);$vars.y=this._appendStructure($r2,this._apply("addExpr"),856);$r2.value=["binop","<<",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(859);this._appendStructure($r2,this._applyWithArgs("token",">>>"),861);$vars.y=this._appendStructure($r2,this._apply("addExpr"),864);$r2.value=["binop",">>>",$vars.x,$vars.y];return this._endStructure($r2);}),841);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("addExpr"),867);}),834);return this._endStructure($r0);},
"addExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(869, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(872);$vars.x=this._appendStructure($r1,this._apply("addExpr"),875);this._appendStructure($r1,this._applyWithArgs("token","+"),877);$vars.y=this._appendStructure($r1,this._apply("mulExpr"),880);$r1.value=["binop","+",$vars.x,$vars.y];return this._endStructure($r1);},function(){var $r1=this._startStructure(883);$vars.x=this._appendStructure($r1,this._apply("addExpr"),886);this._appendStructure($r1,this._applyWithArgs("token","-"),888);$vars.y=this._appendStructure($r1,this._apply("mulExpr"),891);$r1.value=["binop","-",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("mulExpr"),894);}),870);return this._endStructure($r0);},
"mulExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(896, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(899);$vars.x=this._appendStructure($r1,this._apply("mulExpr"),902);this._appendStructure($r1,this._applyWithArgs("token","*"),904);$vars.y=this._appendStructure($r1,this._apply("unary"),907);$r1.value=["binop","*",$vars.x,$vars.y];return this._endStructure($r1);},function(){var $r1=this._startStructure(910);$vars.x=this._appendStructure($r1,this._apply("mulExpr"),913);this._appendStructure($r1,this._applyWithArgs("token","/"),915);$vars.y=this._appendStructure($r1,this._apply("unary"),918);$r1.value=["binop","/",$vars.x,$vars.y];return this._endStructure($r1);},function(){var $r1=this._startStructure(921);$vars.x=this._appendStructure($r1,this._apply("mulExpr"),924);this._appendStructure($r1,this._applyWithArgs("token","%"),926);$vars.y=this._appendStructure($r1,this._apply("unary"),929);$r1.value=["binop","%",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("unary"),932);}),897);return this._endStructure($r0);},
"unary":function(){var $elf=this,$vars={},$r0=this._startStructure(934, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(937);this._appendStructure($r1,this._applyWithArgs("token","-"),939);$vars.p=this._appendStructure($r1,this._apply("postfix"),942);$r1.value=["unop","-",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(945);this._appendStructure($r1,this._applyWithArgs("token","+"),947);$vars.p=this._appendStructure($r1,this._apply("postfix"),950);$r1.value=["unop","+",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(953);this._appendStructure($r1,this._applyWithArgs("token","++"),955);$vars.p=this._appendStructure($r1,this._apply("postfix"),958);$r1.value=["preop","++",$vars.p,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(961);this._appendStructure($r1,this._applyWithArgs("token","--"),963);$vars.p=this._appendStructure($r1,this._apply("postfix"),966);$r1.value=["preop","--",$vars.p,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(969);this._appendStructure($r1,this._applyWithArgs("token","!"),971);$vars.p=this._appendStructure($r1,this._apply("unary"),974);$r1.value=["unop","!",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(977);this._appendStructure($r1,this._applyWithArgs("token","void"),979);$vars.p=this._appendStructure($r1,this._apply("unary"),982);$r1.value=["unop","void",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(985);this._appendStructure($r1,this._applyWithArgs("token","delete"),987);$vars.p=this._appendStructure($r1,this._apply("unary"),990);$r1.value=["unop","delete",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(993);this._appendStructure($r1,this._applyWithArgs("token","typeof"),995);$vars.p=this._appendStructure($r1,this._apply("unary"),998);$r1.value=["unop","typeof",$vars.p];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("postfix"),1001);}),935);return this._endStructure($r0);},
"postfix":function(){var $elf=this,$vars={},$r0=this._startStructure(1003, true);$vars.p=this._appendStructure($r0,this._apply("primExpr"),1006);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1010);this._appendStructure($r1,this._apply("spacesNoNl"),1012);this._appendStructure($r1,this._applyWithArgs("token","++"),1014);$r1.value=["postop","++",$vars.p,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(1017);this._appendStructure($r1,this._apply("spacesNoNl"),1019);this._appendStructure($r1,this._applyWithArgs("token","--"),1021);$r1.value=["postop","--",$vars.p,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(1024);this._appendStructure($r1,this._apply("empty"),1026);$r1.value=$vars.p;return this._endStructure($r1);}),1008);return this._endStructure($r0);},
"primExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(1029, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1032);$vars.p=this._appendStructure($r1,this._apply("primExpr"),1035);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1039);this._appendStructure($r2,this._applyWithArgs("token","["),1041);$vars.i=this._appendStructure($r2,this._apply("expr"),1044);this._appendStructure($r2,this._applyWithArgs("token","]"),1046);$r2.value=["getp",$vars.i,$vars.p];return this._endStructure($r2);},function(){var $r2=this._startStructure(1049);this._appendStructure($r2,this._applyWithArgs("token","."),1051);$vars.m=this._appendStructure($r2,this._apply("anyname"),1054);this._appendStructure($r2,this._applyWithArgs("token","("),1056);$vars.as=this._appendStructure($r2,this._applyWithArgs("listOf","expr",","),1059);this._appendStructure($r2,this._applyWithArgs("token",")"),1063);$r2.value=["send",$vars.m,$vars.p].concat($vars.as);return this._endStructure($r2);},function(){var $r2=this._startStructure(1066);this._appendStructure($r2,this._applyWithArgs("token","."),1068);$vars.f=this._appendStructure($r2,this._apply("anyname"),1071);$r2.value=["getp",["string",$vars.f],$vars.p];return this._endStructure($r2);},function(){var $r2=this._startStructure(1074);this._appendStructure($r2,this._applyWithArgs("token","("),1076);$vars.as=this._appendStructure($r2,this._applyWithArgs("listOf","expr",","),1079);this._appendStructure($r2,this._applyWithArgs("token",")"),1083);$r2.value=["call",$vars.p].concat($vars.as).concat(this._extractLocation($r2));return this._endStructure($r2);}),1037);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("primExprHd"),1086);}),1030);return this._endStructure($r0);},
"primExprHd":function(){var $elf=this,$vars={},$r0=this._startStructure(1088, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1091);this._appendStructure($r1,this._applyWithArgs("token","("),1093);$vars.e=this._appendStructure($r1,this._apply("expr"),1096);this._appendStructure($r1,this._applyWithArgs("token",")"),1098);$r1.value=$vars.e;return this._endStructure($r1);},function(){var $r1=this._startStructure(1101);this._appendStructure($r1,this._applyWithArgs("token","this"),1103);$r1.value=["this"];return this._endStructure($r1);},function(){var $r1=this._startStructure(1106);$vars.n=this._appendStructure($r1,this._applyWithArgs("token","name"),1109);$r1.value=["get",$vars.n];return this._endStructure($r1);},function(){var $r1=this._startStructure(1112);$vars.n=this._appendStructure($r1,this._applyWithArgs("token","number"),1115);$r1.value=["number",$vars.n];return this._endStructure($r1);},function(){var $r1=this._startStructure(1118);$vars.s=this._appendStructure($r1,this._applyWithArgs("token","string"),1121);$r1.value=["string",$vars.s];return this._endStructure($r1);},function(){var $r1=this._startStructure(1124);this._appendStructure($r1,this._applyWithArgs("token","function"),1126);$r1.value=this._appendStructure($r1,this._apply("funcRest"),1128);return this._endStructure($r1);},function(){var $r1=this._startStructure(1130);this._appendStructure($r1,this._applyWithArgs("token","new"),1132);$vars.e=this._appendStructure($r1,this._apply("primExpr"),1135);$r1.value=["new",$vars.e];return this._endStructure($r1);},function(){var $r1=this._startStructure(1138);this._appendStructure($r1,this._applyWithArgs("token","["),1140);$vars.es=this._appendStructure($r1,this._applyWithArgs("enum","expr",","),1143);this._appendStructure($r1,this._applyWithArgs("token","]"),1147);$r1.value=["arr"].concat($vars.es);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("json"),1150);},function(){return this._forwardStructure(this._apply("re"),1152);}),1089);return this._endStructure($r0);},
"json":function(){var $elf=this,$vars={},$r0=this._startStructure(1154, true);this._appendStructure($r0,this._applyWithArgs("token","{"),1156);$vars.bs=this._appendStructure($r0,this._applyWithArgs("enum","jsonBinding",","),1159);this._appendStructure($r0,this._applyWithArgs("token","}"),1163);$r0.value=["json"].concat($vars.bs);return this._endStructure($r0);},
"jsonBinding":function(){var $elf=this,$vars={},$r0=this._startStructure(1166, true);$vars.n=this._appendStructure($r0,this._apply("jsonPropName"),1169);this._appendStructure($r0,this._applyWithArgs("token",":"),1171);$vars.v=this._appendStructure($r0,this._apply("expr"),1174);$r0.value=["binding",$vars.n,$vars.v];return this._endStructure($r0);},
"jsonPropName":function(){var $elf=this,$vars={},$r0=this._startStructure(1177, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._applyWithArgs("token","name"),1180);},function(){return this._forwardStructure(this._applyWithArgs("token","number"),1182);},function(){return this._forwardStructure(this._applyWithArgs("token","string"),1184);}),1178);return this._endStructure($r0);},
"re":function(){var $elf=this,$vars={},$r0=this._startStructure(1186, true);this._appendStructure($r0,this._apply("spaces"),1188);$vars.x=this._appendStructure($r0,this._consumedBy(function(){var $r1=this._startStructure(1193);this._appendStructure($r1,this.exactly("/"),1195);this._appendStructure($r1,this._apply("reBody"),1197);this._appendStructure($r1,this.exactly("/"),1199);$r1.value=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._apply("reFlag"),1203);}),1201);return this._endStructure($r1);}),1191);$r0.value=["regExpr",$vars.x];return this._endStructure($r0);},
"reBody":function(){var $elf=this,$vars={},$r0=this._startStructure(1206, true);this._appendStructure($r0,this._apply("re1stChar"),1208);$r0.value=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("reChar"),1212);}),1210);return this._endStructure($r0);},
"re1stChar":function(){var $elf=this,$vars={},$r0=this._startStructure(1214, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1217);this._appendStructure($r1,this._not(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this.exactly("*"),1223);},function(){return this._forwardStructure(this.exactly("\\"),1225);},function(){return this._forwardStructure(this.exactly("/"),1227);},function(){return this._forwardStructure(this.exactly("["),1229);}),1221);}),1219);$r1.value=this._appendStructure($r1,this._apply("reNonTerm"),1231);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("escapeChar"),1233);},function(){return this._forwardStructure(this._apply("reClass"),1235);}),1215);return this._endStructure($r0);},
"reChar":function(){var $elf=this,$vars={},$r0=this._startStructure(1237, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("re1stChar"),1240);},function(){return this._forwardStructure(this.exactly("*"),1242);}),1238);return this._endStructure($r0);},
"reNonTerm":function(){var $elf=this,$vars={},$r0=this._startStructure(1244, true);this._appendStructure($r0,this._not(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this.exactly("\n"),1250);},function(){return this._forwardStructure(this.exactly("\r"),1252);}),1248);}),1246);$r0.value=this._appendStructure($r0,this._apply("char"),1254);return this._endStructure($r0);},
"reClass":function(){var $elf=this,$vars={},$r0=this._startStructure(1256, true);this._appendStructure($r0,this.exactly("["),1258);this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("reClassChar"),1262);}),1260);$r0.value=this._appendStructure($r0,this.exactly("]"),1264);return this._endStructure($r0);},
"reClassChar":function(){var $elf=this,$vars={},$r0=this._startStructure(1266, true);this._appendStructure($r0,this._not(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this.exactly("["),1272);},function(){return this._forwardStructure(this.exactly("]"),1274);}),1270);}),1268);$r0.value=this._appendStructure($r0,this._apply("reChar"),1276);return this._endStructure($r0);},
"reFlag":function(){var $elf=this,$vars={},$r0=this._startStructure(1278, true);$r0.value=this._appendStructure($r0,this._apply("nameFirst"),1279);return this._endStructure($r0);},
"formal":function(){var $elf=this,$vars={},$r0=this._startStructure(1281, true);this._appendStructure($r0,this._apply("spaces"),1283);$r0.value=this._appendStructure($r0,this._applyWithArgs("token","name"),1285);return this._endStructure($r0);},
"funcRest":function(){var $elf=this,$vars={},$r0=this._startStructure(1287, true);this._appendStructure($r0,this._applyWithArgs("token","("),1289);$vars.fs=this._appendStructure($r0,this._applyWithArgs("listOf","formal",","),1292);this._appendStructure($r0,this._applyWithArgs("token",")"),1296);this._appendStructure($r0,this._applyWithArgs("token","{"),1298);$vars.body=this._appendStructure($r0,this._apply("srcElems"),1301);this._appendStructure($r0,this._applyWithArgs("token","}"),1303);$r0.value=["func",$vars.fs,$vars.body];return this._endStructure($r0);},
"sc":function(){var $elf=this,$vars={},$r0=this._startStructure(1306, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1309);this._appendStructure($r1,this._apply("spacesNoNl"),1311);$r1.value=this._appendStructure($r1,this._or(function(){return this._forwardStructure(this.exactly("\n"),1315);},function(){return this._forwardStructure(this._lookahead(function(){return this._forwardStructure(this.exactly("}"),1319);}),1317);},function(){return this._forwardStructure(this.end(),1321);}),1313);return this._endStructure($r1);},function(){return this._forwardStructure(this._applyWithArgs("token",";"),1323);}),1307);return this._endStructure($r0);},
"varBinder":function(){var $elf=this,$vars={},$r0=this._startStructure(1325, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._applyWithArgs("token","var"),1328);},function(){return this._forwardStructure(this._applyWithArgs("token","let"),1330);},function(){return this._forwardStructure(this._applyWithArgs("token","const"),1332);}),1326);return this._endStructure($r0);},
"varBinding":function(){var $elf=this,$vars={},$r0=this._startStructure(1334, true);$vars.n=this._appendStructure($r0,this._applyWithArgs("token","name"),1337);$vars.v=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1342);this._appendStructure($r1,this._applyWithArgs("token","="),1344);$r1.value=this._appendStructure($r1,this._apply("expr"),1346);return this._endStructure($r1);},function(){var $r1=this._startStructure(1348);this._appendStructure($r1,this._apply("empty"),1350);$r1.value=["get","undefined"];return this._endStructure($r1);}),1340);$r0.value=["assignVar",$vars.n,$vars.v,this._extractLocation($r0)];return this._endStructure($r0);},
"block":function(){var $elf=this,$vars={},$r0=this._startStructure(1354, true);this._appendStructure($r0,this._applyWithArgs("token","{"),1356);$vars.ss=this._appendStructure($r0,this._apply("srcElems"),1359);this._appendStructure($r0,this._applyWithArgs("token","}"),1361);$r0.value=["begin",$vars.ss];return this._endStructure($r0);},
"stmt":function(){var $elf=this,$vars={},$r0=this._startStructure(1364, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("block"),1367);},function(){var $r1=this._startStructure(1369);$vars.decl=this._appendStructure($r1,this._apply("varBinder"),1372);$vars.bs=this._appendStructure($r1,this._applyWithArgs("listOf","varBinding",","),1375);this._appendStructure($r1,this._apply("sc"),1379);$r1.value=["beginVars",$vars.decl].concat($vars.bs);return this._endStructure($r1);},function(){var $r1=this._startStructure(1382);this._appendStructure($r1,this._applyWithArgs("token","if"),1384);this._appendStructure($r1,this._applyWithArgs("token","("),1386);$vars.c=this._appendStructure($r1,this._apply("expr"),1389);this._appendStructure($r1,this._applyWithArgs("token",")"),1391);$vars.t=this._appendStructure($r1,this._apply("stmt"),1394);$vars.f=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1399);this._appendStructure($r2,this._applyWithArgs("token","else"),1401);$r2.value=this._appendStructure($r2,this._apply("stmt"),1403);return this._endStructure($r2);},function(){var $r2=this._startStructure(1405);this._appendStructure($r2,this._apply("empty"),1407);$r2.value=["get","undefined"];return this._endStructure($r2);}),1397);$r1.value=["if",$vars.c,$vars.t,$vars.f];return this._endStructure($r1);},function(){var $r1=this._startStructure(1411);this._appendStructure($r1,this._applyWithArgs("token","while"),1413);this._appendStructure($r1,this._applyWithArgs("token","("),1415);$vars.c=this._appendStructure($r1,this._apply("expr"),1418);this._appendStructure($r1,this._applyWithArgs("token",")"),1420);$vars.s=this._appendStructure($r1,this._apply("stmt"),1423);$r1.value=["while",$vars.c,["begin",$vars.s,["emitEvent","while",this._extractLocation($r1)]]];return this._endStructure($r1);},function(){var $r1=this._startStructure(1426);this._appendStructure($r1,this._applyWithArgs("token","do"),1428);$vars.s=this._appendStructure($r1,this._apply("stmt"),1431);this._appendStructure($r1,this._applyWithArgs("token","while"),1433);this._appendStructure($r1,this._applyWithArgs("token","("),1435);$vars.c=this._appendStructure($r1,this._apply("expr"),1438);this._appendStructure($r1,this._applyWithArgs("token",")"),1440);this._appendStructure($r1,this._apply("sc"),1442);$r1.value=["doWhile",["begin",$vars.s,["emitEvent","doWhile",this._extractLocation($r1)]],$vars.c];return this._endStructure($r1);},function(){var $r1=this._startStructure(1445);this._appendStructure($r1,this._applyWithArgs("token","for"),1447);this._appendStructure($r1,this._applyWithArgs("token","("),1449);$vars.i=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1454);$vars.decl=this._appendStructure($r2,this._apply("varBinder"),1457);$vars.bs=this._appendStructure($r2,this._applyWithArgs("listOf","varBinding",","),1460);$r2.value=["beginVars",$vars.decl].concat($vars.bs);return this._endStructure($r2);},function(){return this._forwardStructure(this._apply("expr"),1465);},function(){var $r2=this._startStructure(1467);this._appendStructure($r2,this._apply("empty"),1469);$r2.value=["get","undefined"];return this._endStructure($r2);}),1452);this._appendStructure($r1,this._applyWithArgs("token",";"),1472);$vars.c=this._appendStructure($r1,this._or(function(){return this._forwardStructure(this._apply("expr"),1477);},function(){var $r2=this._startStructure(1479);this._appendStructure($r2,this._apply("empty"),1481);$r2.value=["get","true"];return this._endStructure($r2);}),1475);this._appendStructure($r1,this._applyWithArgs("token",";"),1484);$vars.u=this._appendStructure($r1,this._or(function(){return this._forwardStructure(this._apply("expr"),1489);},function(){var $r2=this._startStructure(1491);this._appendStructure($r2,this._apply("empty"),1493);$r2.value=["get","undefined"];return this._endStructure($r2);}),1487);this._appendStructure($r1,this._applyWithArgs("token",")"),1496);$vars.s=this._appendStructure($r1,this._apply("stmt"),1499);$r1.value=["for",$vars.i,$vars.c,$vars.u,["begin",$vars.s,["emitEvent","for",this._extractLocation($r1)]]];return this._endStructure($r1);},function(){var $r1=this._startStructure(1502);this._appendStructure($r1,this._applyWithArgs("token","for"),1504);this._appendStructure($r1,this._applyWithArgs("token","("),1506);$vars.v=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1511);$vars.decl=this._appendStructure($r2,this._apply("varBinder"),1514);$vars.n=this._appendStructure($r2,this._applyWithArgs("token","name"),1517);$r2.value=["beginVars",$vars.decl,["noAssignVar",$vars.n]];return this._endStructure($r2);},function(){return this._forwardStructure(this._apply("expr"),1520);}),1509);this._appendStructure($r1,this._applyWithArgs("token","in"),1522);$vars.e=this._appendStructure($r1,this._apply("expr"),1525);this._appendStructure($r1,this._applyWithArgs("token",")"),1527);$vars.s=this._appendStructure($r1,this._apply("stmt"),1530);$r1.value=["forIn",$vars.v,$vars.e,["begin",$vars.s,["emitEvent","forIn",this._extractLocation($r1)]]];return this._endStructure($r1);},function(){var $r1=this._startStructure(1533);this._appendStructure($r1,this._applyWithArgs("token","switch"),1535);this._appendStructure($r1,this._applyWithArgs("token","("),1537);$vars.e=this._appendStructure($r1,this._apply("expr"),1540);this._appendStructure($r1,this._applyWithArgs("token",")"),1542);this._appendStructure($r1,this._applyWithArgs("token","{"),1544);$vars.cs=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._or(function(){var $r3=this._startStructure(1551);this._appendStructure($r3,this._applyWithArgs("token","case"),1553);$vars.c=this._appendStructure($r3,this._apply("expr"),1556);this._appendStructure($r3,this._applyWithArgs("token",":"),1558);$vars.cs=this._appendStructure($r3,this._apply("srcElems"),1561);$r3.value=["case",$vars.c,["begin",$vars.cs]];return this._endStructure($r3);},function(){var $r3=this._startStructure(1564);this._appendStructure($r3,this._applyWithArgs("token","default"),1566);this._appendStructure($r3,this._applyWithArgs("token",":"),1568);$vars.cs=this._appendStructure($r3,this._apply("srcElems"),1571);$r3.value=["default",["begin",$vars.cs]];return this._endStructure($r3);}),1549);}),1547);this._appendStructure($r1,this._applyWithArgs("token","}"),1574);$r1.value=["switch",$vars.e].concat($vars.cs);return this._endStructure($r1);},function(){var $r1=this._startStructure(1577);this._appendStructure($r1,this._applyWithArgs("token","break"),1579);this._appendStructure($r1,this._apply("sc"),1581);$r1.value=["break"];return this._endStructure($r1);},function(){var $r1=this._startStructure(1584);this._appendStructure($r1,this._applyWithArgs("token","continue"),1586);this._appendStructure($r1,this._apply("sc"),1588);$r1.value=["continue"];return this._endStructure($r1);},function(){var $r1=this._startStructure(1591);this._appendStructure($r1,this._applyWithArgs("token","throw"),1593);this._appendStructure($r1,this._apply("spacesNoNl"),1595);$vars.e=this._appendStructure($r1,this._apply("expr"),1598);this._appendStructure($r1,this._apply("sc"),1600);$r1.value=["throw",$vars.e];return this._endStructure($r1);},function(){var $r1=this._startStructure(1603);this._appendStructure($r1,this._applyWithArgs("token","try"),1605);$vars.t=this._appendStructure($r1,this._apply("block"),1608);this._appendStructure($r1,this._applyWithArgs("token","catch"),1610);this._appendStructure($r1,this._applyWithArgs("token","("),1612);$vars.e=this._appendStructure($r1,this._applyWithArgs("token","name"),1615);this._appendStructure($r1,this._applyWithArgs("token",")"),1617);$vars.c=this._appendStructure($r1,this._apply("block"),1620);$vars.f=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1625);this._appendStructure($r2,this._applyWithArgs("token","finally"),1627);$r2.value=this._appendStructure($r2,this._apply("block"),1629);return this._endStructure($r2);},function(){var $r2=this._startStructure(1631);this._appendStructure($r2,this._apply("empty"),1633);$r2.value=["get","undefined"];return this._endStructure($r2);}),1623);$r1.value=["try",$vars.t,$vars.e,$vars.c,$vars.f];return this._endStructure($r1);},function(){var $r1=this._startStructure(1637);this._appendStructure($r1,this._applyWithArgs("token","return"),1639);$vars.e=this._appendStructure($r1,this._or(function(){return this._forwardStructure(this._apply("expr"),1644);},function(){var $r2=this._startStructure(1646);this._appendStructure($r2,this._apply("empty"),1648);$r2.value=["get","undefined"];return this._endStructure($r2);}),1642);this._appendStructure($r1,this._apply("sc"),1651);$r1.value=["return",$vars.e,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(1654);this._appendStructure($r1,this._applyWithArgs("token","with"),1656);this._appendStructure($r1,this._applyWithArgs("token","("),1658);$vars.x=this._appendStructure($r1,this._apply("expr"),1661);this._appendStructure($r1,this._applyWithArgs("token",")"),1663);$vars.s=this._appendStructure($r1,this._apply("stmt"),1666);$r1.value=["with",$vars.x,$vars.s];return this._endStructure($r1);},function(){var $r1=this._startStructure(1669);$vars.e=this._appendStructure($r1,this._apply("expr"),1672);this._appendStructure($r1,this._apply("sc"),1674);$r1.value=$vars.e;return this._endStructure($r1);},function(){var $r1=this._startStructure(1677);this._appendStructure($r1,this._applyWithArgs("token",";"),1679);$r1.value=["get","undefined"];return this._endStructure($r1);}),1365);return this._endStructure($r0);},
"srcElem":function(){var $elf=this,$vars={},$r0=this._startStructure(1682, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1685);this._appendStructure($r1,this._applyWithArgs("token","function"),1687);$vars.n=this._appendStructure($r1,this._applyWithArgs("token","name"),1690);$vars.f=this._appendStructure($r1,this._apply("funcRest"),1693);$r1.value=["assignVar",$vars.n,$vars.f,this._extractLocation($r1)];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("stmt"),1696);}),1683);return this._endStructure($r0);},
"srcElems":function(){var $elf=this,$vars={},$r0=this._startStructure(1698, true);$vars.ss=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("srcElem"),1703);}),1701);$r0.value=["beginTop"].concat($vars.ss);return this._endStructure($r0);},
"topLevel":function(){var $elf=this,$vars={},$r0=this._startStructure(1706, true);$vars.r=this._appendStructure($r0,this._apply("srcElems"),1709);this._appendStructure($r0,this._apply("spaces"),1711);this._appendStructure($r0,this.end(),1713);$r0.value=$vars.r;return this._endStructure($r0);}});(BSJSParser["hexDigits"]="0123456789abcdef");(BSJSParser["keywords"]=({}));(keywords=["break","case","catch","continue","default","delete","do","else","finally","for","function","if","in","instanceof","new","return","switch","this","throw","try","typeof","var","void","while","with","ometa","let","const"]);for(var idx=(0);(idx < keywords["length"]);idx++){(BSJSParser["keywords"][keywords[idx]]=true);}(BSJSParser["_isKeyword"]=(function (k){return this["keywords"].hasOwnProperty(k);}))
let emitValue=(function (location,variable,expr){return ["$v(",location["start"],",",location["stop"],",",variable.toProgramString(),",",expr,")"].join("");});let emitValueBefore=(function (expr,opExpr,loc){return ["(function(){",opExpr,";var $r=",expr,";return ",emitValue(loc,expr,"$r"),";})()"].join("");});let BSJSTranslator=objectThatDelegatesTo(OMeta,{
"trans":function(){var $elf=this,$vars={},$r0=this._startStructure(1717, true);this._appendStructure($r0,this._form(function(){var $r1=this._startStructure(1721);$vars.t=this._getStructureValue(this.anything());$r1.value=($vars.ans=this._appendStructure($r1,this._apply($vars.t),1726));return this._endStructure($r1);}),1719);$r0.value=$vars.ans;return this._endStructure($r0);},
"curlyTrans":function(){var $elf=this,$vars={},$r0=this._startStructure(1730, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1733);this._appendStructure($r1,this._form(function(){var $r2=this._startStructure(1737);this._appendStructure($r2,this.exactly("begin"),1739);$r2.value=($vars.r=this._appendStructure($r2,this._apply("curlyTrans"),1743));return this._endStructure($r2);}),1735);$r1.value=$vars.r;return this._endStructure($r1);},function(){var $r1=this._startStructure(1746);this._appendStructure($r1,this._form(function(){var $r2=this._startStructure(1750);this._appendStructure($r2,this.exactly("begin"),1752);$r2.value=($vars.rs=this._appendStructure($r2,this._many(function(){return this._forwardStructure(this._apply("trans"),1758);}),1756));return this._endStructure($r2);}),1748);$r1.value=(("{" + $vars.rs.join(";")) + ";}");return this._endStructure($r1);},function(){var $r1=this._startStructure(1761);$vars.r=this._appendStructure($r1,this._apply("trans"),1764);$r1.value=(("{" + $vars.r) + ";}");return this._endStructure($r1);}),1731);return this._endStructure($r0);},
"this":function(){var $elf=this,$vars={},$r0=this._startStructure(1767, true);$r0.value="this";return this._endStructure($r0);},
"break":function(){var $elf=this,$vars={},$r0=this._startStructure(1769, true);$r0.value="break";return this._endStructure($r0);},
"continue":function(){var $elf=this,$vars={},$r0=this._startStructure(1771, true);$r0.value="continue";return this._endStructure($r0);},
"number":function(){var $elf=this,$vars={},$r0=this._startStructure(1773, true);$vars.n=this._getStructureValue(this.anything());$r0.value=(("(" + $vars.n) + ")");return this._endStructure($r0);},
"string":function(){var $elf=this,$vars={},$r0=this._startStructure(1777, true);$vars.s=this._getStructureValue(this.anything());$r0.value=$vars.s.toProgramString();return this._endStructure($r0);},
"name":function(){var $elf=this,$vars={},$r0=this._startStructure(1781, true);$vars.s=this._getStructureValue(this.anything());$r0.value=$vars.s;return this._endStructure($r0);},
"regExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(1785, true);$vars.x=this._getStructureValue(this.anything());$r0.value=$vars.x;return this._endStructure($r0);},
"arr":function(){var $elf=this,$vars={},$r0=this._startStructure(1789, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1794);}),1792);$r0.value=(("[" + $vars.xs.join(",")) + "]");return this._endStructure($r0);},
"unop":function(){var $elf=this,$vars={},$r0=this._startStructure(1797, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1801);$r0.value=(((("(" + $vars.op) + " ") + $vars.x) + ")");return this._endStructure($r0);},
"getp":function(){var $elf=this,$vars={},$r0=this._startStructure(1804, true);$vars.fd=this._appendStructure($r0,this._apply("trans"),1807);$vars.x=this._appendStructure($r0,this._apply("trans"),1810);$r0.value=((($vars.x + "[") + $vars.fd) + "]");return this._endStructure($r0);},
"get":function(){var $elf=this,$vars={},$r0=this._startStructure(1813, true);$vars.x=this._getStructureValue(this.anything());$r0.value=$vars.x;return this._endStructure($r0);},
"set":function(){var $elf=this,$vars={},$r0=this._startStructure(1817, true);$vars.lhs=this._appendStructure($r0,this._apply("trans"),1820);$vars.rhs=this._appendStructure($r0,this._apply("trans"),1823);$vars.l=this._getStructureValue(this.anything());$r0.value=(((("(" + $vars.lhs) + "=") + emitValue($vars.l,$vars.lhs,$vars.rhs)) + ")");return this._endStructure($r0);},
"mset":function(){var $elf=this,$vars={},$r0=this._startStructure(1827, true);$vars.lhs=this._appendStructure($r0,this._apply("trans"),1830);$vars.op=this._getStructureValue(this.anything());$vars.rhs=this._appendStructure($r0,this._apply("trans"),1834);$vars.l=this._getStructureValue(this.anything());$r0.value=(((("(" + $vars.lhs) + "=") + emitValue($vars.l,$vars.lhs,(((($vars.lhs + " ") + $vars.op) + " ") + $vars.rhs))) + ")");return this._endStructure($r0);},
"binop":function(){var $elf=this,$vars={},$r0=this._startStructure(1838, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1842);$vars.y=this._appendStructure($r0,this._apply("trans"),1845);$r0.value=(((((("(" + $vars.x) + " ") + $vars.op) + " ") + $vars.y) + ")");return this._endStructure($r0);},
"preop":function(){var $elf=this,$vars={},$r0=this._startStructure(1848, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1852);$vars.l=this._getStructureValue(this.anything());$r0.value=((($vars.op + $vars.x) + ",") + emitValue($vars.l,$vars.x,$vars.x));return this._endStructure($r0);},
"postop":function(){var $elf=this,$vars={},$r0=this._startStructure(1856, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1860);$vars.l=this._getStructureValue(this.anything());$r0.value=emitValueBefore($vars.x,($vars.x + $vars.op),$vars.l);return this._endStructure($r0);},
"return":function(){var $elf=this,$vars={},$r0=this._startStructure(1864, true);$vars.x=this._appendStructure($r0,this._apply("trans"),1867);$vars.l=this._getStructureValue(this.anything());$r0.value=("return " + emitValue($vars.l,"return",$vars.x));return this._endStructure($r0);},
"with":function(){var $elf=this,$vars={},$r0=this._startStructure(1871, true);$vars.x=this._appendStructure($r0,this._apply("trans"),1874);$vars.s=this._appendStructure($r0,this._apply("curlyTrans"),1877);$r0.value=((("with(" + $vars.x) + ")") + $vars.s);return this._endStructure($r0);},
"if":function(){var $elf=this,$vars={},$r0=this._startStructure(1880, true);$vars.cond=this._appendStructure($r0,this._apply("trans"),1883);$vars.t=this._appendStructure($r0,this._apply("curlyTrans"),1886);$vars.e=this._appendStructure($r0,this._apply("curlyTrans"),1889);$r0.value=((((("if(" + $vars.cond) + ")") + $vars.t) + "else") + $vars.e);return this._endStructure($r0);},
"condExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(1892, true);$vars.cond=this._appendStructure($r0,this._apply("trans"),1895);$vars.t=this._appendStructure($r0,this._apply("trans"),1898);$vars.e=this._appendStructure($r0,this._apply("trans"),1901);$r0.value=(((((("(" + $vars.cond) + "?") + $vars.t) + ":") + $vars.e) + ")");return this._endStructure($r0);},
"while":function(){var $elf=this,$vars={},$r0=this._startStructure(1904, true);$vars.cond=this._appendStructure($r0,this._apply("trans"),1907);$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),1910);$r0.value=((("while(" + $vars.cond) + ")") + $vars.body);return this._endStructure($r0);},
"doWhile":function(){var $elf=this,$vars={},$r0=this._startStructure(1913, true);$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),1916);$vars.cond=this._appendStructure($r0,this._apply("trans"),1919);$r0.value=(((("do" + $vars.body) + "while(") + $vars.cond) + ")");return this._endStructure($r0);},
"for":function(){var $elf=this,$vars={},$r0=this._startStructure(1922, true);$vars.init=this._appendStructure($r0,this._apply("trans"),1925);$vars.cond=this._appendStructure($r0,this._apply("trans"),1928);$vars.upd=this._appendStructure($r0,this._apply("trans"),1931);$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),1934);$r0.value=((((((("for(" + $vars.init) + ";") + $vars.cond) + ";") + $vars.upd) + ")") + $vars.body);return this._endStructure($r0);},
"forIn":function(){var $elf=this,$vars={},$r0=this._startStructure(1937, true);$vars.x=this._appendStructure($r0,this._apply("trans"),1940);$vars.arr=this._appendStructure($r0,this._apply("trans"),1943);$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),1946);$r0.value=((((("for(" + $vars.x) + " in ") + $vars.arr) + ")") + $vars.body);return this._endStructure($r0);},
"beginTop":function(){var $elf=this,$vars={},$r0=this._startStructure(1949, true);$vars.xs=this._appendStructure($r0,this._many(function(){var $r1=this._startStructure(1954);$vars.x=this._appendStructure($r1,this._apply("trans"),1957);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1961);this._appendStructure($r2,this._or(function(){var $r3=this._startStructure(1964);$r3.value=this._pred(($vars.x[($vars.x["length"] - (1))] == "}"));return this._endStructure($r3);},function(){return this._forwardStructure(this.end(),1967);}),1963);$r2.value=$vars.x;return this._endStructure($r2);},function(){var $r2=this._startStructure(1970);this._appendStructure($r2,this._apply("empty"),1972);$r2.value=($vars.x + ";");return this._endStructure($r2);}),1959);return this._endStructure($r1);}),1952);$r0.value=$vars.xs.join("");return this._endStructure($r0);},
"begin":function(){var $elf=this,$vars={},$r0=this._startStructure(1976, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1979);$vars.x=this._appendStructure($r1,this._apply("trans"),1982);this._appendStructure($r1,this.end(),1984);$r1.value=$vars.x;return this._endStructure($r1);},function(){var $r1=this._startStructure(1987);$vars.xs=this._appendStructure($r1,this._many(function(){var $r2=this._startStructure(1992);$vars.x=this._appendStructure($r2,this._apply("trans"),1995);$r2.value=this._appendStructure($r2,this._or(function(){var $r3=this._startStructure(1999);this._appendStructure($r3,this._or(function(){var $r4=this._startStructure(2002);$r4.value=this._pred(($vars.x[($vars.x["length"] - (1))] == "}"));return this._endStructure($r4);},function(){return this._forwardStructure(this.end(),2005);}),2001);$r3.value=$vars.x;return this._endStructure($r3);},function(){var $r3=this._startStructure(2008);this._appendStructure($r3,this._apply("empty"),2010);$r3.value=($vars.x + ";");return this._endStructure($r3);}),1997);return this._endStructure($r2);}),1990);$r1.value=(("{" + $vars.xs.join("")) + "}");return this._endStructure($r1);}),1977);return this._endStructure($r0);},
"beginVars":function(){var $elf=this,$vars={},$r0=this._startStructure(2014, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(2017);$vars.decl=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r1,this._apply("trans"),2021);this._appendStructure($r1,this.end(),2023);$r1.value=(($vars.decl + " ") + $vars.x);return this._endStructure($r1);},function(){var $r1=this._startStructure(2026);$vars.decl=this._getStructureValue(this.anything());$vars.xs=this._appendStructure($r1,this._many(function(){var $r2=this._startStructure(2031);$r2.value=($vars.x=this._appendStructure($r2,this._apply("trans"),2034));return this._endStructure($r2);}),2030);$r1.value=(($vars.decl + " ") + $vars.xs.join(","));return this._endStructure($r1);}),2015);return this._endStructure($r0);},
"func":function(){var $elf=this,$vars={},$r0=this._startStructure(2037, true);$vars.args=this._getStructureValue(this.anything());$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),2041);$r0.value=(((("(function (" + $vars.args.join(",")) + ")") + $vars.body) + ")");return this._endStructure($r0);},
"call":function(){var $elf=this,$vars={},$r0=this._startStructure(2044, true);$vars.fn=this._appendStructure($r0,this._apply("trans"),2047);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),2052);}),2050);$vars.l=this._getStructureValue(this.anything());$r0.value=(($vars.fn == "log")?((($vars.fn + "(") + emitValue($vars.l,$vars.fn,$vars.args.join(","))) + ")"):((($vars.fn + "(") + $vars.args.join(",")) + ")"));return this._endStructure($r0);},
"send":function(){var $elf=this,$vars={},$r0=this._startStructure(2056, true);$vars.msg=this._getStructureValue(this.anything());$vars.recv=this._appendStructure($r0,this._apply("trans"),2060);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),2065);}),2063);$r0.value=((((($vars.recv + ".") + $vars.msg) + "(") + $vars.args.join(",")) + ")");return this._endStructure($r0);},
"new":function(){var $elf=this,$vars={},$r0=this._startStructure(2068, true);$vars.x=this._appendStructure($r0,this._apply("trans"),2071);$r0.value=("new " + $vars.x);return this._endStructure($r0);},
"assignVar":function(){var $elf=this,$vars={},$r0=this._startStructure(2074, true);$vars.name=this._getStructureValue(this.anything());$vars.val=this._appendStructure($r0,this._apply("trans"),2078);$vars.l=this._getStructureValue(this.anything());$r0.value=(($vars.name + "=") + emitValue($vars.l,$vars.name,$vars.val));return this._endStructure($r0);},
"noAssignVar":function(){var $elf=this,$vars={},$r0=this._startStructure(2082, true);$vars.name=this._getStructureValue(this.anything());$r0.value=$vars.name;return this._endStructure($r0);},
"throw":function(){var $elf=this,$vars={},$r0=this._startStructure(2086, true);$vars.x=this._appendStructure($r0,this._apply("trans"),2089);$r0.value=("throw " + $vars.x);return this._endStructure($r0);},
"try":function(){var $elf=this,$vars={},$r0=this._startStructure(2092, true);$vars.x=this._appendStructure($r0,this._apply("curlyTrans"),2095);$vars.name=this._getStructureValue(this.anything());$vars.c=this._appendStructure($r0,this._apply("curlyTrans"),2099);$vars.f=this._appendStructure($r0,this._apply("curlyTrans"),2102);$r0.value=((((((("try " + $vars.x) + "catch(") + $vars.name) + ")") + $vars.c) + "finally") + $vars.f);return this._endStructure($r0);},
"json":function(){var $elf=this,$vars={},$r0=this._startStructure(2105, true);$vars.props=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),2110);}),2108);$r0.value=(("({" + $vars.props.join(",")) + "})");return this._endStructure($r0);},
"binding":function(){var $elf=this,$vars={},$r0=this._startStructure(2113, true);$vars.name=this._getStructureValue(this.anything());$vars.val=this._appendStructure($r0,this._apply("trans"),2117);$r0.value=(($vars.name.toProgramString() + ": ") + $vars.val);return this._endStructure($r0);},
"switch":function(){var $elf=this,$vars={},$r0=this._startStructure(2120, true);$vars.x=this._appendStructure($r0,this._apply("trans"),2123);$vars.cases=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),2128);}),2126);$r0.value=(((("switch(" + $vars.x) + "){") + $vars.cases.join(";")) + "}");return this._endStructure($r0);},
"case":function(){var $elf=this,$vars={},$r0=this._startStructure(2131, true);$vars.x=this._appendStructure($r0,this._apply("trans"),2134);$vars.y=this._appendStructure($r0,this._apply("trans"),2137);$r0.value=((("case " + $vars.x) + ": ") + $vars.y);return this._endStructure($r0);},
"default":function(){var $elf=this,$vars={},$r0=this._startStructure(2140, true);$vars.y=this._appendStructure($r0,this._apply("trans"),2143);$r0.value=("default: " + $vars.y);return this._endStructure($r0);},
"emitEvent":function(){var $elf=this,$vars={},$r0=this._startStructure(2146, true);$vars.name=this._getStructureValue(this.anything());$vars.l=this._getStructureValue(this.anything());$r0.value=(((((("$e(" + $vars.l["start"]) + ",") + $vars.l["stop"]) + ",\"") + $vars.name) + "\")");return this._endStructure($r0);}})

