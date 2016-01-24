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
"binDigit":function(){var $elf=this,$vars={},$r0=this._startStructure(304, true);$vars.x=this._appendStructure($r0,this._apply("char"),307);this._pred((($vars.x == "0") || ($vars.x == "1")));$r0.value=$vars.x;return this._endStructure($r0);},
"number":function(){var $elf=this,$vars={},$r0=this._startStructure(312, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(315);this._appendStructure($r1,this.exactly("0"),316);this._appendStructure($r1,this.exactly("x"),316);"0x";$vars.n=this._appendStructure($r1,this._apply("hexLit"),318);$r1.value=["number",$vars.n];return this._endStructure($r1);},function(){var $r1=this._startStructure(321);this._appendStructure($r1,this.exactly("0"),322);this._appendStructure($r1,this.exactly("b"),322);"0b";$vars.b=this._appendStructure($r1,this._consumedBy(function(){return this._forwardStructure(this._many1(function(){return this._forwardStructure(this._apply("binDigit"),328);}),326);}),324);$r1.value=["number",parseInt($vars.b,(2))];return this._endStructure($r1);},function(){var $r1=this._startStructure(331);$vars.f=this._appendStructure($r1,this._consumedBy(function(){var $r2=this._startStructure(336);this._appendStructure($r2,this._many1(function(){return this._forwardStructure(this._apply("digit"),340);}),338);$r2.value=this._appendStructure($r2,this._opt(function(){var $r3=this._startStructure(344);this._appendStructure($r3,this.exactly("."),346);$r3.value=this._appendStructure($r3,this._many1(function(){return this._forwardStructure(this._apply("digit"),350);}),348);return this._endStructure($r3);}),342);return this._endStructure($r2);}),334);$r1.value=["number",parseFloat($vars.f)];return this._endStructure($r1);}),313);return this._endStructure($r0);},
"escapeChar":function(){var $elf=this,$vars={},$r0=this._startStructure(353, true);$vars.s=this._appendStructure($r0,this._consumedBy(function(){var $r1=this._startStructure(358);this._appendStructure($r1,this.exactly("\\"),360);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(364);this._appendStructure($r2,this.exactly("u"),366);this._appendStructure($r2,this._apply("hexDigit"),368);this._appendStructure($r2,this._apply("hexDigit"),370);this._appendStructure($r2,this._apply("hexDigit"),372);$r2.value=this._appendStructure($r2,this._apply("hexDigit"),374);return this._endStructure($r2);},function(){var $r2=this._startStructure(376);this._appendStructure($r2,this.exactly("x"),378);this._appendStructure($r2,this._apply("hexDigit"),380);$r2.value=this._appendStructure($r2,this._apply("hexDigit"),382);return this._endStructure($r2);},function(){return this._forwardStructure(this._apply("char"),384);}),362);return this._endStructure($r1);}),356);$r0.value=unescape($vars.s);return this._endStructure($r0);},
"str":function(){var $elf=this,$vars={},$r0=this._startStructure(387, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(390);this._appendStructure($r1,this.exactly("\""),391);this._appendStructure($r1,this.exactly("\""),391);this._appendStructure($r1,this.exactly("\""),391);"\"\"\"";$vars.cs=this._appendStructure($r1,this._many(function(){var $r2=this._startStructure(395);this._appendStructure($r2,this._not(function(){var $r3=this._startStructure(399);this._appendStructure($r3,this.exactly("\""),400);this._appendStructure($r3,this.exactly("\""),400);this._appendStructure($r3,this.exactly("\""),400);$r3.value="\"\"\"";return this._endStructure($r3);}),397);$r2.value=this._appendStructure($r2,this._apply("char"),401);return this._endStructure($r2);}),393);this._appendStructure($r1,this.exactly("\""),391);this._appendStructure($r1,this.exactly("\""),391);this._appendStructure($r1,this.exactly("\""),391);"\"\"\"";$r1.value=["string",$vars.cs.join("")];return this._endStructure($r1);},function(){var $r1=this._startStructure(404);this._appendStructure($r1,this.exactly("\'"),406);$vars.cs=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this._apply("escapeChar"),413);},function(){var $r3=this._startStructure(415);this._appendStructure($r3,this._not(function(){return this._forwardStructure(this.exactly("\'"),419);}),417);$r3.value=this._appendStructure($r3,this._apply("char"),421);return this._endStructure($r3);}),411);}),409);this._appendStructure($r1,this.exactly("\'"),423);$r1.value=["string",$vars.cs.join("")];return this._endStructure($r1);},function(){var $r1=this._startStructure(426);this._appendStructure($r1,this.exactly("\""),428);$vars.cs=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this._apply("escapeChar"),435);},function(){var $r3=this._startStructure(437);this._appendStructure($r3,this._not(function(){return this._forwardStructure(this.exactly("\""),441);}),439);$r3.value=this._appendStructure($r3,this._apply("char"),443);return this._endStructure($r3);}),433);}),431);this._appendStructure($r1,this.exactly("\""),445);$r1.value=["string",$vars.cs.join("")];return this._endStructure($r1);},function(){var $r1=this._startStructure(448);this._appendStructure($r1,this._or(function(){return this._forwardStructure(this.exactly("#"),452);},function(){return this._forwardStructure(this.exactly("`"),454);}),450);$vars.n=this._appendStructure($r1,this._apply("iName"),457);$r1.value=["string",$vars.n];return this._endStructure($r1);}),388);return this._endStructure($r0);},
"special":function(){var $elf=this,$vars={},$r0=this._startStructure(460, true);$vars.s=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this.exactly("("),465);},function(){return this._forwardStructure(this.exactly(")"),467);},function(){return this._forwardStructure(this.exactly("{"),469);},function(){return this._forwardStructure(this.exactly("}"),471);},function(){return this._forwardStructure(this.exactly("["),473);},function(){return this._forwardStructure(this.exactly("]"),475);},function(){return this._forwardStructure(this.exactly(","),477);},function(){return this._forwardStructure(this.exactly(";"),479);},function(){return this._forwardStructure(this.exactly("?"),481);},function(){return this._forwardStructure(this.exactly(":"),483);},function(){var $r1=this._startStructure(485);this._appendStructure($r1,this.exactly("!"),486);this._appendStructure($r1,this.exactly("="),486);this._appendStructure($r1,this.exactly("="),486);$r1.value="!==";return this._endStructure($r1);},function(){var $r1=this._startStructure(487);this._appendStructure($r1,this.exactly("!"),488);this._appendStructure($r1,this.exactly("="),488);$r1.value="!=";return this._endStructure($r1);},function(){var $r1=this._startStructure(489);this._appendStructure($r1,this.exactly("="),490);this._appendStructure($r1,this.exactly("="),490);this._appendStructure($r1,this.exactly("="),490);$r1.value="===";return this._endStructure($r1);},function(){var $r1=this._startStructure(491);this._appendStructure($r1,this.exactly("="),492);this._appendStructure($r1,this.exactly("="),492);$r1.value="==";return this._endStructure($r1);},function(){var $r1=this._startStructure(493);this._appendStructure($r1,this.exactly("="),494);$r1.value="=";return this._endStructure($r1);},function(){var $r1=this._startStructure(495);this._appendStructure($r1,this.exactly(">"),496);this._appendStructure($r1,this.exactly(">"),496);this._appendStructure($r1,this.exactly("="),496);$r1.value=">>=";return this._endStructure($r1);},function(){var $r1=this._startStructure(497);this._appendStructure($r1,this.exactly(">"),498);this._appendStructure($r1,this.exactly(">"),498);this._appendStructure($r1,this.exactly(">"),498);$r1.value=">>>";return this._endStructure($r1);},function(){var $r1=this._startStructure(499);this._appendStructure($r1,this.exactly(">"),500);this._appendStructure($r1,this.exactly(">"),500);$r1.value=">>";return this._endStructure($r1);},function(){var $r1=this._startStructure(501);this._appendStructure($r1,this.exactly(">"),502);this._appendStructure($r1,this.exactly("="),502);$r1.value=">=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly(">"),503);},function(){var $r1=this._startStructure(505);this._appendStructure($r1,this.exactly("<"),506);this._appendStructure($r1,this.exactly("<"),506);this._appendStructure($r1,this.exactly("="),506);$r1.value="<<=";return this._endStructure($r1);},function(){var $r1=this._startStructure(507);this._appendStructure($r1,this.exactly("<"),508);this._appendStructure($r1,this.exactly("="),508);$r1.value="<=";return this._endStructure($r1);},function(){var $r1=this._startStructure(509);this._appendStructure($r1,this.exactly("<"),510);this._appendStructure($r1,this.exactly("<"),510);$r1.value="<<";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("<"),511);},function(){var $r1=this._startStructure(513);this._appendStructure($r1,this.exactly("+"),514);this._appendStructure($r1,this.exactly("+"),514);$r1.value="++";return this._endStructure($r1);},function(){var $r1=this._startStructure(515);this._appendStructure($r1,this.exactly("+"),516);this._appendStructure($r1,this.exactly("="),516);$r1.value="+=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("+"),517);},function(){var $r1=this._startStructure(519);this._appendStructure($r1,this.exactly("-"),520);this._appendStructure($r1,this.exactly("-"),520);$r1.value="--";return this._endStructure($r1);},function(){var $r1=this._startStructure(521);this._appendStructure($r1,this.exactly("-"),522);this._appendStructure($r1,this.exactly("="),522);$r1.value="-=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("-"),523);},function(){var $r1=this._startStructure(525);this._appendStructure($r1,this.exactly("*"),526);this._appendStructure($r1,this.exactly("="),526);$r1.value="*=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("*"),527);},function(){var $r1=this._startStructure(529);this._appendStructure($r1,this.exactly("/"),530);this._appendStructure($r1,this.exactly("="),530);$r1.value="/=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("/"),531);},function(){var $r1=this._startStructure(533);this._appendStructure($r1,this.exactly("%"),534);this._appendStructure($r1,this.exactly("="),534);$r1.value="%=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("%"),535);},function(){var $r1=this._startStructure(537);this._appendStructure($r1,this.exactly("|"),538);this._appendStructure($r1,this.exactly("="),538);$r1.value="|=";return this._endStructure($r1);},function(){var $r1=this._startStructure(539);this._appendStructure($r1,this.exactly("&"),540);this._appendStructure($r1,this.exactly("="),540);$r1.value="&=";return this._endStructure($r1);},function(){var $r1=this._startStructure(541);this._appendStructure($r1,this.exactly("&"),542);this._appendStructure($r1,this.exactly("&"),542);this._appendStructure($r1,this.exactly("="),542);$r1.value="&&=";return this._endStructure($r1);},function(){var $r1=this._startStructure(543);this._appendStructure($r1,this.exactly("&"),544);this._appendStructure($r1,this.exactly("&"),544);$r1.value="&&";return this._endStructure($r1);},function(){var $r1=this._startStructure(545);this._appendStructure($r1,this.exactly("|"),546);this._appendStructure($r1,this.exactly("|"),546);this._appendStructure($r1,this.exactly("="),546);$r1.value="||=";return this._endStructure($r1);},function(){var $r1=this._startStructure(547);this._appendStructure($r1,this.exactly("|"),548);this._appendStructure($r1,this.exactly("|"),548);$r1.value="||";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("."),549);},function(){return this._forwardStructure(this.exactly("!"),551);}),463);$r0.value=[$vars.s,$vars.s];return this._endStructure($r0);},
"tok":function(){var $elf=this,$vars={},$r0=this._startStructure(554, true);this._appendStructure($r0,this._apply("spaces"),556);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("name"),560);},function(){return this._forwardStructure(this._apply("keyword"),562);},function(){return this._forwardStructure(this._apply("number"),564);},function(){return this._forwardStructure(this._apply("str"),566);},function(){return this._forwardStructure(this._apply("special"),568);}),558);return this._endStructure($r0);},
"toks":function(){var $elf=this,$vars={},$r0=this._startStructure(570, true);$vars.ts=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("token"),575);}),573);this._appendStructure($r0,this._apply("spaces"),577);this._appendStructure($r0,this.end(),579);$r0.value=$vars.ts;return this._endStructure($r0);},
"token":function(){var $elf=this,$vars={},$r0=this._startStructure(582, true);$vars.tt=this._getStructureValue(this.anything());$vars.t=this._appendStructure($r0,this._apply("tok"),586);this._pred(($vars.t[(0)] == $vars.tt));$r0.value=$vars.t[(1)];return this._endStructure($r0);},
"spacesNoNl":function(){var $elf=this,$vars={},$r0=this._startStructure(591, true);$r0.value=this._appendStructure($r0,this._many(function(){var $r1=this._startStructure(594);this._appendStructure($r1,this._not(function(){return this._forwardStructure(this.exactly("\n"),598);}),596);$r1.value=this._appendStructure($r1,this._apply("space"),600);return this._endStructure($r1);}),592);return this._endStructure($r0);},
"expr":function(){var $elf=this,$vars={},$r0=this._startStructure(602, true);$vars.e=this._appendStructure($r0,this._apply("orExpr"),605);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(609);this._appendStructure($r1,this._applyWithArgs("token","?"),611);$vars.t=this._appendStructure($r1,this._apply("expr"),614);this._appendStructure($r1,this._applyWithArgs("token",":"),616);$vars.f=this._appendStructure($r1,this._apply("expr"),619);$r1.value=["condExpr",$vars.e,$vars.t,$vars.f];return this._endStructure($r1);},function(){var $r1=this._startStructure(622);this._appendStructure($r1,this._applyWithArgs("token","="),624);$vars.rhs=this._appendStructure($r1,this._apply("expr"),627);$r1.value=["set",$vars.e,$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(630);this._appendStructure($r1,this._applyWithArgs("token","+="),632);$vars.rhs=this._appendStructure($r1,this._apply("expr"),635);$r1.value=["mset",$vars.e,"+",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(638);this._appendStructure($r1,this._applyWithArgs("token","-="),640);$vars.rhs=this._appendStructure($r1,this._apply("expr"),643);$r1.value=["mset",$vars.e,"-",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(646);this._appendStructure($r1,this._applyWithArgs("token","*="),648);$vars.rhs=this._appendStructure($r1,this._apply("expr"),651);$r1.value=["mset",$vars.e,"*",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(654);this._appendStructure($r1,this._applyWithArgs("token","/="),656);$vars.rhs=this._appendStructure($r1,this._apply("expr"),659);$r1.value=["mset",$vars.e,"/",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(662);this._appendStructure($r1,this._applyWithArgs("token","%="),664);$vars.rhs=this._appendStructure($r1,this._apply("expr"),667);$r1.value=["mset",$vars.e,"%",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(670);this._appendStructure($r1,this._applyWithArgs("token","|="),672);$vars.rhs=this._appendStructure($r1,this._apply("expr"),675);$r1.value=["mset",$vars.e,"|",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(678);this._appendStructure($r1,this._applyWithArgs("token","&="),680);$vars.rhs=this._appendStructure($r1,this._apply("expr"),683);$r1.value=["mset",$vars.e,"&",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(686);this._appendStructure($r1,this._applyWithArgs("token","&&="),688);$vars.rhs=this._appendStructure($r1,this._apply("expr"),691);$r1.value=["mset",$vars.e,"&&",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(694);this._appendStructure($r1,this._applyWithArgs("token","||="),696);$vars.rhs=this._appendStructure($r1,this._apply("expr"),699);$r1.value=["mset",$vars.e,"||",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(702);this._appendStructure($r1,this._applyWithArgs("token",">>="),704);$vars.rhs=this._appendStructure($r1,this._apply("expr"),707);$r1.value=["mset",$vars.e,">>",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(710);this._appendStructure($r1,this._applyWithArgs("token","<<="),712);$vars.rhs=this._appendStructure($r1,this._apply("expr"),715);$r1.value=["mset",$vars.e,"<<",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(718);this._appendStructure($r1,this._apply("empty"),720);$r1.value=$vars.e;return this._endStructure($r1);}),607);return this._endStructure($r0);},
"orExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(723, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(726);$vars.x=this._appendStructure($r1,this._apply("orExpr"),729);this._appendStructure($r1,this._applyWithArgs("token","||"),731);$vars.y=this._appendStructure($r1,this._apply("andExpr"),734);$r1.value=["binop","||",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("andExpr"),737);}),724);return this._endStructure($r0);},
"andExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(739, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(742);$vars.x=this._appendStructure($r1,this._apply("andExpr"),745);this._appendStructure($r1,this._applyWithArgs("token","&&"),747);$vars.y=this._appendStructure($r1,this._apply("eqExpr"),750);$r1.value=["binop","&&",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("eqExpr"),753);}),740);return this._endStructure($r0);},
"eqExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(755, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(758);$vars.x=this._appendStructure($r1,this._apply("eqExpr"),761);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(765);this._appendStructure($r2,this._applyWithArgs("token","=="),767);$vars.y=this._appendStructure($r2,this._apply("relExpr"),770);$r2.value=["binop","==",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(773);this._appendStructure($r2,this._applyWithArgs("token","!="),775);$vars.y=this._appendStructure($r2,this._apply("relExpr"),778);$r2.value=["binop","!=",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(781);this._appendStructure($r2,this._applyWithArgs("token","==="),783);$vars.y=this._appendStructure($r2,this._apply("relExpr"),786);$r2.value=["binop","===",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(789);this._appendStructure($r2,this._applyWithArgs("token","!=="),791);$vars.y=this._appendStructure($r2,this._apply("relExpr"),794);$r2.value=["binop","!==",$vars.x,$vars.y];return this._endStructure($r2);}),763);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("relExpr"),797);}),756);return this._endStructure($r0);},
"relExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(799, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(802);$vars.x=this._appendStructure($r1,this._apply("relExpr"),805);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(809);this._appendStructure($r2,this._applyWithArgs("token",">"),811);$vars.y=this._appendStructure($r2,this._apply("addExpr"),814);$r2.value=["binop",">",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(817);this._appendStructure($r2,this._applyWithArgs("token",">="),819);$vars.y=this._appendStructure($r2,this._apply("addExpr"),822);$r2.value=["binop",">=",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(825);this._appendStructure($r2,this._applyWithArgs("token","<"),827);$vars.y=this._appendStructure($r2,this._apply("addExpr"),830);$r2.value=["binop","<",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(833);this._appendStructure($r2,this._applyWithArgs("token","<="),835);$vars.y=this._appendStructure($r2,this._apply("addExpr"),838);$r2.value=["binop","<=",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(841);this._appendStructure($r2,this._applyWithArgs("token","instanceof"),843);$vars.y=this._appendStructure($r2,this._apply("addExpr"),846);$r2.value=["binop","instanceof",$vars.x,$vars.y];return this._endStructure($r2);}),807);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("shiftExpr"),849);}),800);return this._endStructure($r0);},
"shiftExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(851, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(854);$vars.x=this._appendStructure($r1,this._apply("shiftExpr"),857);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(861);this._appendStructure($r2,this._applyWithArgs("token",">>"),863);$vars.y=this._appendStructure($r2,this._apply("addExpr"),866);$r2.value=["binop",">>",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(869);this._appendStructure($r2,this._applyWithArgs("token","<<"),871);$vars.y=this._appendStructure($r2,this._apply("addExpr"),874);$r2.value=["binop","<<",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(877);this._appendStructure($r2,this._applyWithArgs("token",">>>"),879);$vars.y=this._appendStructure($r2,this._apply("addExpr"),882);$r2.value=["binop",">>>",$vars.x,$vars.y];return this._endStructure($r2);}),859);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("addExpr"),885);}),852);return this._endStructure($r0);},
"addExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(887, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(890);$vars.x=this._appendStructure($r1,this._apply("addExpr"),893);this._appendStructure($r1,this._applyWithArgs("token","+"),895);$vars.y=this._appendStructure($r1,this._apply("mulExpr"),898);$r1.value=["binop","+",$vars.x,$vars.y];return this._endStructure($r1);},function(){var $r1=this._startStructure(901);$vars.x=this._appendStructure($r1,this._apply("addExpr"),904);this._appendStructure($r1,this._applyWithArgs("token","-"),906);$vars.y=this._appendStructure($r1,this._apply("mulExpr"),909);$r1.value=["binop","-",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("mulExpr"),912);}),888);return this._endStructure($r0);},
"mulExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(914, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(917);$vars.x=this._appendStructure($r1,this._apply("mulExpr"),920);this._appendStructure($r1,this._applyWithArgs("token","*"),922);$vars.y=this._appendStructure($r1,this._apply("unary"),925);$r1.value=["binop","*",$vars.x,$vars.y];return this._endStructure($r1);},function(){var $r1=this._startStructure(928);$vars.x=this._appendStructure($r1,this._apply("mulExpr"),931);this._appendStructure($r1,this._applyWithArgs("token","/"),933);$vars.y=this._appendStructure($r1,this._apply("unary"),936);$r1.value=["binop","/",$vars.x,$vars.y];return this._endStructure($r1);},function(){var $r1=this._startStructure(939);$vars.x=this._appendStructure($r1,this._apply("mulExpr"),942);this._appendStructure($r1,this._applyWithArgs("token","%"),944);$vars.y=this._appendStructure($r1,this._apply("unary"),947);$r1.value=["binop","%",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("unary"),950);}),915);return this._endStructure($r0);},
"unary":function(){var $elf=this,$vars={},$r0=this._startStructure(952, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(955);this._appendStructure($r1,this._applyWithArgs("token","-"),957);$vars.p=this._appendStructure($r1,this._apply("postfix"),960);$r1.value=["unop","-",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(963);this._appendStructure($r1,this._applyWithArgs("token","+"),965);$vars.p=this._appendStructure($r1,this._apply("postfix"),968);$r1.value=["unop","+",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(971);this._appendStructure($r1,this._applyWithArgs("token","++"),973);$vars.p=this._appendStructure($r1,this._apply("postfix"),976);$r1.value=["preop","++",$vars.p,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(979);this._appendStructure($r1,this._applyWithArgs("token","--"),981);$vars.p=this._appendStructure($r1,this._apply("postfix"),984);$r1.value=["preop","--",$vars.p,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(987);this._appendStructure($r1,this._applyWithArgs("token","!"),989);$vars.p=this._appendStructure($r1,this._apply("unary"),992);$r1.value=["unop","!",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(995);this._appendStructure($r1,this._applyWithArgs("token","void"),997);$vars.p=this._appendStructure($r1,this._apply("unary"),1000);$r1.value=["unop","void",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(1003);this._appendStructure($r1,this._applyWithArgs("token","delete"),1005);$vars.p=this._appendStructure($r1,this._apply("unary"),1008);$r1.value=["unop","delete",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(1011);this._appendStructure($r1,this._applyWithArgs("token","typeof"),1013);$vars.p=this._appendStructure($r1,this._apply("unary"),1016);$r1.value=["unop","typeof",$vars.p];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("postfix"),1019);}),953);return this._endStructure($r0);},
"postfix":function(){var $elf=this,$vars={},$r0=this._startStructure(1021, true);$vars.p=this._appendStructure($r0,this._apply("primExpr"),1024);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1028);this._appendStructure($r1,this._apply("spacesNoNl"),1030);this._appendStructure($r1,this._applyWithArgs("token","++"),1032);$r1.value=["postop","++",$vars.p,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(1035);this._appendStructure($r1,this._apply("spacesNoNl"),1037);this._appendStructure($r1,this._applyWithArgs("token","--"),1039);$r1.value=["postop","--",$vars.p,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(1042);this._appendStructure($r1,this._apply("empty"),1044);$r1.value=$vars.p;return this._endStructure($r1);}),1026);return this._endStructure($r0);},
"primExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(1047, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1050);$vars.p=this._appendStructure($r1,this._apply("primExpr"),1053);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1057);this._appendStructure($r2,this._applyWithArgs("token","["),1059);$vars.i=this._appendStructure($r2,this._apply("expr"),1062);this._appendStructure($r2,this._applyWithArgs("token","]"),1064);$r2.value=["getp",$vars.i,$vars.p];return this._endStructure($r2);},function(){var $r2=this._startStructure(1067);this._appendStructure($r2,this._applyWithArgs("token","."),1069);$vars.m=this._appendStructure($r2,this._apply("anyname"),1072);this._appendStructure($r2,this._applyWithArgs("token","("),1074);$vars.as=this._appendStructure($r2,this._applyWithArgs("listOf","expr",","),1077);this._appendStructure($r2,this._applyWithArgs("token",")"),1081);$r2.value=["send",$vars.m,$vars.p].concat($vars.as);return this._endStructure($r2);},function(){var $r2=this._startStructure(1084);this._appendStructure($r2,this._applyWithArgs("token","."),1086);$vars.f=this._appendStructure($r2,this._apply("anyname"),1089);$r2.value=["getp",["string",$vars.f],$vars.p];return this._endStructure($r2);},function(){var $r2=this._startStructure(1092);this._appendStructure($r2,this._applyWithArgs("token","("),1094);$vars.as=this._appendStructure($r2,this._applyWithArgs("listOf","expr",","),1097);this._appendStructure($r2,this._applyWithArgs("token",")"),1101);$r2.value=["call",$vars.p].concat($vars.as).concat(this._extractLocation($r2));return this._endStructure($r2);}),1055);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("primExprHd"),1104);}),1048);return this._endStructure($r0);},
"primExprHd":function(){var $elf=this,$vars={},$r0=this._startStructure(1106, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1109);this._appendStructure($r1,this._applyWithArgs("token","("),1111);$vars.e=this._appendStructure($r1,this._apply("expr"),1114);this._appendStructure($r1,this._applyWithArgs("token",")"),1116);$r1.value=$vars.e;return this._endStructure($r1);},function(){var $r1=this._startStructure(1119);this._appendStructure($r1,this._applyWithArgs("token","this"),1121);$r1.value=["this"];return this._endStructure($r1);},function(){var $r1=this._startStructure(1124);$vars.n=this._appendStructure($r1,this._applyWithArgs("token","name"),1127);$r1.value=["get",$vars.n];return this._endStructure($r1);},function(){var $r1=this._startStructure(1130);$vars.n=this._appendStructure($r1,this._applyWithArgs("token","number"),1133);$r1.value=["number",$vars.n];return this._endStructure($r1);},function(){var $r1=this._startStructure(1136);$vars.s=this._appendStructure($r1,this._applyWithArgs("token","string"),1139);$r1.value=["string",$vars.s];return this._endStructure($r1);},function(){var $r1=this._startStructure(1142);this._appendStructure($r1,this._applyWithArgs("token","function"),1144);$r1.value=this._appendStructure($r1,this._apply("funcRest"),1146);return this._endStructure($r1);},function(){var $r1=this._startStructure(1148);this._appendStructure($r1,this._applyWithArgs("token","new"),1150);$vars.e=this._appendStructure($r1,this._apply("primExpr"),1153);$r1.value=["new",$vars.e];return this._endStructure($r1);},function(){var $r1=this._startStructure(1156);this._appendStructure($r1,this._applyWithArgs("token","["),1158);$vars.es=this._appendStructure($r1,this._applyWithArgs("enum","expr",","),1161);this._appendStructure($r1,this._applyWithArgs("token","]"),1165);$r1.value=["arr"].concat($vars.es);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("json"),1168);},function(){return this._forwardStructure(this._apply("re"),1170);}),1107);return this._endStructure($r0);},
"json":function(){var $elf=this,$vars={},$r0=this._startStructure(1172, true);this._appendStructure($r0,this._applyWithArgs("token","{"),1174);$vars.bs=this._appendStructure($r0,this._applyWithArgs("enum","jsonBinding",","),1177);this._appendStructure($r0,this._applyWithArgs("token","}"),1181);$r0.value=["json"].concat($vars.bs);return this._endStructure($r0);},
"jsonBinding":function(){var $elf=this,$vars={},$r0=this._startStructure(1184, true);$vars.n=this._appendStructure($r0,this._apply("jsonPropName"),1187);this._appendStructure($r0,this._applyWithArgs("token",":"),1189);$vars.v=this._appendStructure($r0,this._apply("expr"),1192);$r0.value=["binding",$vars.n,$vars.v];return this._endStructure($r0);},
"jsonPropName":function(){var $elf=this,$vars={},$r0=this._startStructure(1195, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._applyWithArgs("token","name"),1198);},function(){return this._forwardStructure(this._applyWithArgs("token","number"),1200);},function(){return this._forwardStructure(this._applyWithArgs("token","string"),1202);}),1196);return this._endStructure($r0);},
"re":function(){var $elf=this,$vars={},$r0=this._startStructure(1204, true);this._appendStructure($r0,this._apply("spaces"),1206);$vars.x=this._appendStructure($r0,this._consumedBy(function(){var $r1=this._startStructure(1211);this._appendStructure($r1,this.exactly("/"),1213);this._appendStructure($r1,this._apply("reBody"),1215);this._appendStructure($r1,this.exactly("/"),1217);$r1.value=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._apply("reFlag"),1221);}),1219);return this._endStructure($r1);}),1209);$r0.value=["regExpr",$vars.x];return this._endStructure($r0);},
"reBody":function(){var $elf=this,$vars={},$r0=this._startStructure(1224, true);this._appendStructure($r0,this._apply("re1stChar"),1226);$r0.value=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("reChar"),1230);}),1228);return this._endStructure($r0);},
"re1stChar":function(){var $elf=this,$vars={},$r0=this._startStructure(1232, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1235);this._appendStructure($r1,this._not(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this.exactly("*"),1241);},function(){return this._forwardStructure(this.exactly("\\"),1243);},function(){return this._forwardStructure(this.exactly("/"),1245);},function(){return this._forwardStructure(this.exactly("["),1247);}),1239);}),1237);$r1.value=this._appendStructure($r1,this._apply("reNonTerm"),1249);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("escapeChar"),1251);},function(){return this._forwardStructure(this._apply("reClass"),1253);}),1233);return this._endStructure($r0);},
"reChar":function(){var $elf=this,$vars={},$r0=this._startStructure(1255, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("re1stChar"),1258);},function(){return this._forwardStructure(this.exactly("*"),1260);}),1256);return this._endStructure($r0);},
"reNonTerm":function(){var $elf=this,$vars={},$r0=this._startStructure(1262, true);this._appendStructure($r0,this._not(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this.exactly("\n"),1268);},function(){return this._forwardStructure(this.exactly("\r"),1270);}),1266);}),1264);$r0.value=this._appendStructure($r0,this._apply("char"),1272);return this._endStructure($r0);},
"reClass":function(){var $elf=this,$vars={},$r0=this._startStructure(1274, true);this._appendStructure($r0,this.exactly("["),1276);this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("reClassChar"),1280);}),1278);$r0.value=this._appendStructure($r0,this.exactly("]"),1282);return this._endStructure($r0);},
"reClassChar":function(){var $elf=this,$vars={},$r0=this._startStructure(1284, true);this._appendStructure($r0,this._not(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this.exactly("["),1290);},function(){return this._forwardStructure(this.exactly("]"),1292);}),1288);}),1286);$r0.value=this._appendStructure($r0,this._apply("reChar"),1294);return this._endStructure($r0);},
"reFlag":function(){var $elf=this,$vars={},$r0=this._startStructure(1296, true);$r0.value=this._appendStructure($r0,this._apply("nameFirst"),1297);return this._endStructure($r0);},
"formal":function(){var $elf=this,$vars={},$r0=this._startStructure(1299, true);this._appendStructure($r0,this._apply("spaces"),1301);$r0.value=this._appendStructure($r0,this._applyWithArgs("token","name"),1303);return this._endStructure($r0);},
"funcRest":function(){var $elf=this,$vars={},$r0=this._startStructure(1305, true);this._appendStructure($r0,this._applyWithArgs("token","("),1307);$vars.fs=this._appendStructure($r0,this._applyWithArgs("listOf","formal",","),1310);this._appendStructure($r0,this._applyWithArgs("token",")"),1314);this._appendStructure($r0,this._applyWithArgs("token","{"),1316);$vars.body=this._appendStructure($r0,this._apply("srcElems"),1319);this._appendStructure($r0,this._applyWithArgs("token","}"),1321);$r0.value=["func",$vars.fs,$vars.body];return this._endStructure($r0);},
"sc":function(){var $elf=this,$vars={},$r0=this._startStructure(1324, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1327);this._appendStructure($r1,this._apply("spacesNoNl"),1329);$r1.value=this._appendStructure($r1,this._or(function(){return this._forwardStructure(this.exactly("\n"),1333);},function(){return this._forwardStructure(this._lookahead(function(){return this._forwardStructure(this.exactly("}"),1337);}),1335);},function(){return this._forwardStructure(this.end(),1339);}),1331);return this._endStructure($r1);},function(){return this._forwardStructure(this._applyWithArgs("token",";"),1341);}),1325);return this._endStructure($r0);},
"varBinder":function(){var $elf=this,$vars={},$r0=this._startStructure(1343, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._applyWithArgs("token","var"),1346);},function(){return this._forwardStructure(this._applyWithArgs("token","let"),1348);},function(){return this._forwardStructure(this._applyWithArgs("token","const"),1350);}),1344);return this._endStructure($r0);},
"varBinding":function(){var $elf=this,$vars={},$r0=this._startStructure(1352, true);$vars.n=this._appendStructure($r0,this._applyWithArgs("token","name"),1355);$vars.v=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1360);this._appendStructure($r1,this._applyWithArgs("token","="),1362);$r1.value=this._appendStructure($r1,this._apply("expr"),1364);return this._endStructure($r1);},function(){var $r1=this._startStructure(1366);this._appendStructure($r1,this._apply("empty"),1368);$r1.value=["get","undefined"];return this._endStructure($r1);}),1358);$r0.value=["assignVar",$vars.n,$vars.v,this._extractLocation($r0)];return this._endStructure($r0);},
"block":function(){var $elf=this,$vars={},$r0=this._startStructure(1372, true);this._appendStructure($r0,this._applyWithArgs("token","{"),1374);$vars.ss=this._appendStructure($r0,this._apply("srcElems"),1377);this._appendStructure($r0,this._applyWithArgs("token","}"),1379);$r0.value=["begin",$vars.ss];return this._endStructure($r0);},
"stmt":function(){var $elf=this,$vars={},$r0=this._startStructure(1382, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("block"),1385);},function(){var $r1=this._startStructure(1387);$vars.decl=this._appendStructure($r1,this._apply("varBinder"),1390);$vars.bs=this._appendStructure($r1,this._applyWithArgs("listOf","varBinding",","),1393);this._appendStructure($r1,this._apply("sc"),1397);$r1.value=["beginVars",$vars.decl].concat($vars.bs);return this._endStructure($r1);},function(){var $r1=this._startStructure(1400);this._appendStructure($r1,this._applyWithArgs("token","if"),1402);this._appendStructure($r1,this._applyWithArgs("token","("),1404);$vars.c=this._appendStructure($r1,this._apply("expr"),1407);this._appendStructure($r1,this._applyWithArgs("token",")"),1409);$vars.t=this._appendStructure($r1,this._apply("stmt"),1412);$vars.f=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1417);this._appendStructure($r2,this._applyWithArgs("token","else"),1419);$r2.value=this._appendStructure($r2,this._apply("stmt"),1421);return this._endStructure($r2);},function(){var $r2=this._startStructure(1423);this._appendStructure($r2,this._apply("empty"),1425);$r2.value=["get","undefined"];return this._endStructure($r2);}),1415);$r1.value=["if",$vars.c,$vars.t,$vars.f];return this._endStructure($r1);},function(){var $r1=this._startStructure(1429);this._appendStructure($r1,this._applyWithArgs("token","while"),1431);this._appendStructure($r1,this._applyWithArgs("token","("),1433);$vars.c=this._appendStructure($r1,this._apply("expr"),1436);this._appendStructure($r1,this._applyWithArgs("token",")"),1438);$vars.s=this._appendStructure($r1,this._apply("stmt"),1441);$r1.value=["while",$vars.c,["begin",$vars.s,["emitEvent","while",this._extractLocation($r1)]]];return this._endStructure($r1);},function(){var $r1=this._startStructure(1444);this._appendStructure($r1,this._applyWithArgs("token","do"),1446);$vars.s=this._appendStructure($r1,this._apply("stmt"),1449);this._appendStructure($r1,this._applyWithArgs("token","while"),1451);this._appendStructure($r1,this._applyWithArgs("token","("),1453);$vars.c=this._appendStructure($r1,this._apply("expr"),1456);this._appendStructure($r1,this._applyWithArgs("token",")"),1458);this._appendStructure($r1,this._apply("sc"),1460);$r1.value=["doWhile",["begin",$vars.s,["emitEvent","doWhile",this._extractLocation($r1)]],$vars.c];return this._endStructure($r1);},function(){var $r1=this._startStructure(1463);this._appendStructure($r1,this._applyWithArgs("token","for"),1465);this._appendStructure($r1,this._applyWithArgs("token","("),1467);$vars.i=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1472);$vars.decl=this._appendStructure($r2,this._apply("varBinder"),1475);$vars.bs=this._appendStructure($r2,this._applyWithArgs("listOf","varBinding",","),1478);$r2.value=["beginVars",$vars.decl].concat($vars.bs);return this._endStructure($r2);},function(){return this._forwardStructure(this._apply("expr"),1483);},function(){var $r2=this._startStructure(1485);this._appendStructure($r2,this._apply("empty"),1487);$r2.value=["get","undefined"];return this._endStructure($r2);}),1470);this._appendStructure($r1,this._applyWithArgs("token",";"),1490);$vars.c=this._appendStructure($r1,this._or(function(){return this._forwardStructure(this._apply("expr"),1495);},function(){var $r2=this._startStructure(1497);this._appendStructure($r2,this._apply("empty"),1499);$r2.value=["get","true"];return this._endStructure($r2);}),1493);this._appendStructure($r1,this._applyWithArgs("token",";"),1502);$vars.u=this._appendStructure($r1,this._or(function(){return this._forwardStructure(this._apply("expr"),1507);},function(){var $r2=this._startStructure(1509);this._appendStructure($r2,this._apply("empty"),1511);$r2.value=["get","undefined"];return this._endStructure($r2);}),1505);this._appendStructure($r1,this._applyWithArgs("token",")"),1514);$vars.s=this._appendStructure($r1,this._apply("stmt"),1517);$r1.value=["for",$vars.i,$vars.c,$vars.u,["begin",$vars.s,["emitEvent","for",this._extractLocation($r1)]]];return this._endStructure($r1);},function(){var $r1=this._startStructure(1520);this._appendStructure($r1,this._applyWithArgs("token","for"),1522);this._appendStructure($r1,this._applyWithArgs("token","("),1524);$vars.v=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1529);$vars.decl=this._appendStructure($r2,this._apply("varBinder"),1532);$vars.n=this._appendStructure($r2,this._applyWithArgs("token","name"),1535);$r2.value=["beginVars",$vars.decl,["noAssignVar",$vars.n]];return this._endStructure($r2);},function(){return this._forwardStructure(this._apply("expr"),1538);}),1527);this._appendStructure($r1,this._applyWithArgs("token","in"),1540);$vars.e=this._appendStructure($r1,this._apply("expr"),1543);this._appendStructure($r1,this._applyWithArgs("token",")"),1545);$vars.s=this._appendStructure($r1,this._apply("stmt"),1548);$r1.value=["forIn",$vars.v,$vars.e,["begin",$vars.s,["emitEvent","forIn",this._extractLocation($r1)]]];return this._endStructure($r1);},function(){var $r1=this._startStructure(1551);this._appendStructure($r1,this._applyWithArgs("token","switch"),1553);this._appendStructure($r1,this._applyWithArgs("token","("),1555);$vars.e=this._appendStructure($r1,this._apply("expr"),1558);this._appendStructure($r1,this._applyWithArgs("token",")"),1560);this._appendStructure($r1,this._applyWithArgs("token","{"),1562);$vars.cs=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._or(function(){var $r3=this._startStructure(1569);this._appendStructure($r3,this._applyWithArgs("token","case"),1571);$vars.c=this._appendStructure($r3,this._apply("expr"),1574);this._appendStructure($r3,this._applyWithArgs("token",":"),1576);$vars.cs=this._appendStructure($r3,this._apply("srcElems"),1579);$r3.value=["case",$vars.c,["begin",$vars.cs]];return this._endStructure($r3);},function(){var $r3=this._startStructure(1582);this._appendStructure($r3,this._applyWithArgs("token","default"),1584);this._appendStructure($r3,this._applyWithArgs("token",":"),1586);$vars.cs=this._appendStructure($r3,this._apply("srcElems"),1589);$r3.value=["default",["begin",$vars.cs]];return this._endStructure($r3);}),1567);}),1565);this._appendStructure($r1,this._applyWithArgs("token","}"),1592);$r1.value=["switch",$vars.e].concat($vars.cs);return this._endStructure($r1);},function(){var $r1=this._startStructure(1595);this._appendStructure($r1,this._applyWithArgs("token","break"),1597);this._appendStructure($r1,this._apply("sc"),1599);$r1.value=["break"];return this._endStructure($r1);},function(){var $r1=this._startStructure(1602);this._appendStructure($r1,this._applyWithArgs("token","continue"),1604);this._appendStructure($r1,this._apply("sc"),1606);$r1.value=["continue"];return this._endStructure($r1);},function(){var $r1=this._startStructure(1609);this._appendStructure($r1,this._applyWithArgs("token","throw"),1611);this._appendStructure($r1,this._apply("spacesNoNl"),1613);$vars.e=this._appendStructure($r1,this._apply("expr"),1616);this._appendStructure($r1,this._apply("sc"),1618);$r1.value=["throw",$vars.e];return this._endStructure($r1);},function(){var $r1=this._startStructure(1621);this._appendStructure($r1,this._applyWithArgs("token","try"),1623);$vars.t=this._appendStructure($r1,this._apply("block"),1626);this._appendStructure($r1,this._applyWithArgs("token","catch"),1628);this._appendStructure($r1,this._applyWithArgs("token","("),1630);$vars.e=this._appendStructure($r1,this._applyWithArgs("token","name"),1633);this._appendStructure($r1,this._applyWithArgs("token",")"),1635);$vars.c=this._appendStructure($r1,this._apply("block"),1638);$vars.f=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1643);this._appendStructure($r2,this._applyWithArgs("token","finally"),1645);$r2.value=this._appendStructure($r2,this._apply("block"),1647);return this._endStructure($r2);},function(){var $r2=this._startStructure(1649);this._appendStructure($r2,this._apply("empty"),1651);$r2.value=["get","undefined"];return this._endStructure($r2);}),1641);$r1.value=["try",$vars.t,$vars.e,$vars.c,$vars.f];return this._endStructure($r1);},function(){var $r1=this._startStructure(1655);this._appendStructure($r1,this._applyWithArgs("token","return"),1657);$vars.e=this._appendStructure($r1,this._or(function(){return this._forwardStructure(this._apply("expr"),1662);},function(){var $r2=this._startStructure(1664);this._appendStructure($r2,this._apply("empty"),1666);$r2.value=["get","undefined"];return this._endStructure($r2);}),1660);this._appendStructure($r1,this._apply("sc"),1669);$r1.value=["return",$vars.e,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(1672);this._appendStructure($r1,this._applyWithArgs("token","with"),1674);this._appendStructure($r1,this._applyWithArgs("token","("),1676);$vars.x=this._appendStructure($r1,this._apply("expr"),1679);this._appendStructure($r1,this._applyWithArgs("token",")"),1681);$vars.s=this._appendStructure($r1,this._apply("stmt"),1684);$r1.value=["with",$vars.x,$vars.s];return this._endStructure($r1);},function(){var $r1=this._startStructure(1687);$vars.e=this._appendStructure($r1,this._apply("expr"),1690);this._appendStructure($r1,this._apply("sc"),1692);$r1.value=$vars.e;return this._endStructure($r1);},function(){var $r1=this._startStructure(1695);this._appendStructure($r1,this._applyWithArgs("token",";"),1697);$r1.value=["get","undefined"];return this._endStructure($r1);}),1383);return this._endStructure($r0);},
"srcElem":function(){var $elf=this,$vars={},$r0=this._startStructure(1700, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1703);this._appendStructure($r1,this._applyWithArgs("token","function"),1705);$vars.n=this._appendStructure($r1,this._applyWithArgs("token","name"),1708);$vars.f=this._appendStructure($r1,this._apply("funcRest"),1711);$r1.value=["assignVar",$vars.n,$vars.f,this._extractLocation($r1)];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("stmt"),1714);}),1701);return this._endStructure($r0);},
"srcElems":function(){var $elf=this,$vars={},$r0=this._startStructure(1716, true);$vars.ss=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("srcElem"),1721);}),1719);$r0.value=["beginTop"].concat($vars.ss);return this._endStructure($r0);},
"topLevel":function(){var $elf=this,$vars={},$r0=this._startStructure(1724, true);$vars.r=this._appendStructure($r0,this._apply("srcElems"),1727);this._appendStructure($r0,this._apply("spaces"),1729);this._appendStructure($r0,this.end(),1731);$r0.value=$vars.r;return this._endStructure($r0);}});(BSJSParser["hexDigits"]="0123456789abcdef");(BSJSParser["keywords"]=({}));(keywords=["break","case","catch","continue","default","delete","do","else","finally","for","function","if","in","instanceof","new","return","switch","this","throw","try","typeof","var","void","while","with","ometa","let","const"]);for(var idx=(0);(idx < keywords["length"]);idx++){(BSJSParser["keywords"][keywords[idx]]=true);}(BSJSParser["_isKeyword"]=(function (k){return this["keywords"].hasOwnProperty(k);}))
let emitValue=(function (location,variable,expr){return ["$v(",location["start"],",",location["stop"],",",variable.toProgramString(),",",expr,")"].join("");});let emitValueBefore=(function (expr,opExpr,loc){return ["(function(){",opExpr,";var $r=",expr,";return ",emitValue(loc,expr,"$r"),";})()"].join("");});let BSJSTranslator=objectThatDelegatesTo(OMeta,{
"trans":function(){var $elf=this,$vars={},$r0=this._startStructure(1735, true);this._appendStructure($r0,this._form(function(){var $r1=this._startStructure(1739);$vars.t=this._getStructureValue(this.anything());$r1.value=($vars.ans=this._appendStructure($r1,this._apply($vars.t),1744));return this._endStructure($r1);}),1737);$r0.value=$vars.ans;return this._endStructure($r0);},
"curlyTrans":function(){var $elf=this,$vars={},$r0=this._startStructure(1748, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1751);this._appendStructure($r1,this._form(function(){var $r2=this._startStructure(1755);this._appendStructure($r2,this.exactly("begin"),1757);$r2.value=($vars.r=this._appendStructure($r2,this._apply("curlyTrans"),1761));return this._endStructure($r2);}),1753);$r1.value=$vars.r;return this._endStructure($r1);},function(){var $r1=this._startStructure(1764);this._appendStructure($r1,this._form(function(){var $r2=this._startStructure(1768);this._appendStructure($r2,this.exactly("begin"),1770);$r2.value=($vars.rs=this._appendStructure($r2,this._many(function(){return this._forwardStructure(this._apply("trans"),1776);}),1774));return this._endStructure($r2);}),1766);$r1.value=(("{" + $vars.rs.join(";")) + ";}");return this._endStructure($r1);},function(){var $r1=this._startStructure(1779);$vars.r=this._appendStructure($r1,this._apply("trans"),1782);$r1.value=(("{" + $vars.r) + ";}");return this._endStructure($r1);}),1749);return this._endStructure($r0);},
"this":function(){var $elf=this,$vars={},$r0=this._startStructure(1785, true);$r0.value="this";return this._endStructure($r0);},
"break":function(){var $elf=this,$vars={},$r0=this._startStructure(1787, true);$r0.value="break";return this._endStructure($r0);},
"continue":function(){var $elf=this,$vars={},$r0=this._startStructure(1789, true);$r0.value="continue";return this._endStructure($r0);},
"number":function(){var $elf=this,$vars={},$r0=this._startStructure(1791, true);$vars.n=this._getStructureValue(this.anything());$r0.value=(("(" + $vars.n) + ")");return this._endStructure($r0);},
"string":function(){var $elf=this,$vars={},$r0=this._startStructure(1795, true);$vars.s=this._getStructureValue(this.anything());$r0.value=$vars.s.toProgramString();return this._endStructure($r0);},
"name":function(){var $elf=this,$vars={},$r0=this._startStructure(1799, true);$vars.s=this._getStructureValue(this.anything());$r0.value=$vars.s;return this._endStructure($r0);},
"regExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(1803, true);$vars.x=this._getStructureValue(this.anything());$r0.value=$vars.x;return this._endStructure($r0);},
"arr":function(){var $elf=this,$vars={},$r0=this._startStructure(1807, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1812);}),1810);$r0.value=(("[" + $vars.xs.join(",")) + "]");return this._endStructure($r0);},
"unop":function(){var $elf=this,$vars={},$r0=this._startStructure(1815, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1819);$r0.value=(((("(" + $vars.op) + " ") + $vars.x) + ")");return this._endStructure($r0);},
"getp":function(){var $elf=this,$vars={},$r0=this._startStructure(1822, true);$vars.fd=this._appendStructure($r0,this._apply("trans"),1825);$vars.x=this._appendStructure($r0,this._apply("trans"),1828);$r0.value=((($vars.x + "[") + $vars.fd) + "]");return this._endStructure($r0);},
"get":function(){var $elf=this,$vars={},$r0=this._startStructure(1831, true);$vars.x=this._getStructureValue(this.anything());$r0.value=$vars.x;return this._endStructure($r0);},
"set":function(){var $elf=this,$vars={},$r0=this._startStructure(1835, true);$vars.lhs=this._appendStructure($r0,this._apply("trans"),1838);$vars.rhs=this._appendStructure($r0,this._apply("trans"),1841);$vars.l=this._getStructureValue(this.anything());$r0.value=(((("(" + $vars.lhs) + "=") + emitValue($vars.l,$vars.lhs,$vars.rhs)) + ")");return this._endStructure($r0);},
"mset":function(){var $elf=this,$vars={},$r0=this._startStructure(1845, true);$vars.lhs=this._appendStructure($r0,this._apply("trans"),1848);$vars.op=this._getStructureValue(this.anything());$vars.rhs=this._appendStructure($r0,this._apply("trans"),1852);$vars.l=this._getStructureValue(this.anything());$r0.value=(((("(" + $vars.lhs) + "=") + emitValue($vars.l,$vars.lhs,(((($vars.lhs + " ") + $vars.op) + " ") + $vars.rhs))) + ")");return this._endStructure($r0);},
"binop":function(){var $elf=this,$vars={},$r0=this._startStructure(1856, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1860);$vars.y=this._appendStructure($r0,this._apply("trans"),1863);$r0.value=(((((("(" + $vars.x) + " ") + $vars.op) + " ") + $vars.y) + ")");return this._endStructure($r0);},
"preop":function(){var $elf=this,$vars={},$r0=this._startStructure(1866, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1870);$vars.l=this._getStructureValue(this.anything());$r0.value=((($vars.op + $vars.x) + ",") + emitValue($vars.l,$vars.x,$vars.x));return this._endStructure($r0);},
"postop":function(){var $elf=this,$vars={},$r0=this._startStructure(1874, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1878);$vars.l=this._getStructureValue(this.anything());$r0.value=emitValueBefore($vars.x,($vars.x + $vars.op),$vars.l);return this._endStructure($r0);},
"return":function(){var $elf=this,$vars={},$r0=this._startStructure(1882, true);$vars.x=this._appendStructure($r0,this._apply("trans"),1885);$vars.l=this._getStructureValue(this.anything());$r0.value=("return " + emitValue($vars.l,"return",$vars.x));return this._endStructure($r0);},
"with":function(){var $elf=this,$vars={},$r0=this._startStructure(1889, true);$vars.x=this._appendStructure($r0,this._apply("trans"),1892);$vars.s=this._appendStructure($r0,this._apply("curlyTrans"),1895);$r0.value=((("with(" + $vars.x) + ")") + $vars.s);return this._endStructure($r0);},
"if":function(){var $elf=this,$vars={},$r0=this._startStructure(1898, true);$vars.cond=this._appendStructure($r0,this._apply("trans"),1901);$vars.t=this._appendStructure($r0,this._apply("curlyTrans"),1904);$vars.e=this._appendStructure($r0,this._apply("curlyTrans"),1907);$r0.value=((((("if(" + $vars.cond) + ")") + $vars.t) + "else") + $vars.e);return this._endStructure($r0);},
"condExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(1910, true);$vars.cond=this._appendStructure($r0,this._apply("trans"),1913);$vars.t=this._appendStructure($r0,this._apply("trans"),1916);$vars.e=this._appendStructure($r0,this._apply("trans"),1919);$r0.value=(((((("(" + $vars.cond) + "?") + $vars.t) + ":") + $vars.e) + ")");return this._endStructure($r0);},
"while":function(){var $elf=this,$vars={},$r0=this._startStructure(1922, true);$vars.cond=this._appendStructure($r0,this._apply("trans"),1925);$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),1928);$r0.value=((("while(" + $vars.cond) + ")") + $vars.body);return this._endStructure($r0);},
"doWhile":function(){var $elf=this,$vars={},$r0=this._startStructure(1931, true);$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),1934);$vars.cond=this._appendStructure($r0,this._apply("trans"),1937);$r0.value=(((("do" + $vars.body) + "while(") + $vars.cond) + ")");return this._endStructure($r0);},
"for":function(){var $elf=this,$vars={},$r0=this._startStructure(1940, true);$vars.init=this._appendStructure($r0,this._apply("trans"),1943);$vars.cond=this._appendStructure($r0,this._apply("trans"),1946);$vars.upd=this._appendStructure($r0,this._apply("trans"),1949);$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),1952);$r0.value=((((((("for(" + $vars.init) + ";") + $vars.cond) + ";") + $vars.upd) + ")") + $vars.body);return this._endStructure($r0);},
"forIn":function(){var $elf=this,$vars={},$r0=this._startStructure(1955, true);$vars.x=this._appendStructure($r0,this._apply("trans"),1958);$vars.arr=this._appendStructure($r0,this._apply("trans"),1961);$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),1964);$r0.value=((((("for(" + $vars.x) + " in ") + $vars.arr) + ")") + $vars.body);return this._endStructure($r0);},
"beginTop":function(){var $elf=this,$vars={},$r0=this._startStructure(1967, true);$vars.xs=this._appendStructure($r0,this._many(function(){var $r1=this._startStructure(1972);$vars.x=this._appendStructure($r1,this._apply("trans"),1975);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1979);this._appendStructure($r2,this._or(function(){var $r3=this._startStructure(1982);$r3.value=this._pred(($vars.x[($vars.x["length"] - (1))] == "}"));return this._endStructure($r3);},function(){return this._forwardStructure(this.end(),1985);}),1981);$r2.value=$vars.x;return this._endStructure($r2);},function(){var $r2=this._startStructure(1988);this._appendStructure($r2,this._apply("empty"),1990);$r2.value=($vars.x + ";");return this._endStructure($r2);}),1977);return this._endStructure($r1);}),1970);$r0.value=$vars.xs.join("");return this._endStructure($r0);},
"begin":function(){var $elf=this,$vars={},$r0=this._startStructure(1994, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1997);$vars.x=this._appendStructure($r1,this._apply("trans"),2000);this._appendStructure($r1,this.end(),2002);$r1.value=$vars.x;return this._endStructure($r1);},function(){var $r1=this._startStructure(2005);$vars.xs=this._appendStructure($r1,this._many(function(){var $r2=this._startStructure(2010);$vars.x=this._appendStructure($r2,this._apply("trans"),2013);$r2.value=this._appendStructure($r2,this._or(function(){var $r3=this._startStructure(2017);this._appendStructure($r3,this._or(function(){var $r4=this._startStructure(2020);$r4.value=this._pred(($vars.x[($vars.x["length"] - (1))] == "}"));return this._endStructure($r4);},function(){return this._forwardStructure(this.end(),2023);}),2019);$r3.value=$vars.x;return this._endStructure($r3);},function(){var $r3=this._startStructure(2026);this._appendStructure($r3,this._apply("empty"),2028);$r3.value=($vars.x + ";");return this._endStructure($r3);}),2015);return this._endStructure($r2);}),2008);$r1.value=(("{" + $vars.xs.join("")) + "}");return this._endStructure($r1);}),1995);return this._endStructure($r0);},
"beginVars":function(){var $elf=this,$vars={},$r0=this._startStructure(2032, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(2035);$vars.decl=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r1,this._apply("trans"),2039);this._appendStructure($r1,this.end(),2041);$r1.value=(($vars.decl + " ") + $vars.x);return this._endStructure($r1);},function(){var $r1=this._startStructure(2044);$vars.decl=this._getStructureValue(this.anything());$vars.xs=this._appendStructure($r1,this._many(function(){var $r2=this._startStructure(2049);$r2.value=($vars.x=this._appendStructure($r2,this._apply("trans"),2052));return this._endStructure($r2);}),2048);$r1.value=(($vars.decl + " ") + $vars.xs.join(","));return this._endStructure($r1);}),2033);return this._endStructure($r0);},
"func":function(){var $elf=this,$vars={},$r0=this._startStructure(2055, true);$vars.args=this._getStructureValue(this.anything());$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),2059);$r0.value=(((("(function (" + $vars.args.join(",")) + ")") + $vars.body) + ")");return this._endStructure($r0);},
"call":function(){var $elf=this,$vars={},$r0=this._startStructure(2062, true);$vars.fn=this._appendStructure($r0,this._apply("trans"),2065);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),2070);}),2068);$vars.l=this._getStructureValue(this.anything());$r0.value=(($vars.fn == "log")?((($vars.fn + "(") + emitValue($vars.l,$vars.fn,$vars.args.join(","))) + ")"):((($vars.fn + "(") + $vars.args.join(",")) + ")"));return this._endStructure($r0);},
"send":function(){var $elf=this,$vars={},$r0=this._startStructure(2074, true);$vars.msg=this._getStructureValue(this.anything());$vars.recv=this._appendStructure($r0,this._apply("trans"),2078);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),2083);}),2081);$r0.value=((((($vars.recv + ".") + $vars.msg) + "(") + $vars.args.join(",")) + ")");return this._endStructure($r0);},
"new":function(){var $elf=this,$vars={},$r0=this._startStructure(2086, true);$vars.x=this._appendStructure($r0,this._apply("trans"),2089);$r0.value=("new " + $vars.x);return this._endStructure($r0);},
"assignVar":function(){var $elf=this,$vars={},$r0=this._startStructure(2092, true);$vars.name=this._getStructureValue(this.anything());$vars.val=this._appendStructure($r0,this._apply("trans"),2096);$vars.l=this._getStructureValue(this.anything());$r0.value=(($vars.name + "=") + emitValue($vars.l,$vars.name,$vars.val));return this._endStructure($r0);},
"noAssignVar":function(){var $elf=this,$vars={},$r0=this._startStructure(2100, true);$vars.name=this._getStructureValue(this.anything());$r0.value=$vars.name;return this._endStructure($r0);},
"throw":function(){var $elf=this,$vars={},$r0=this._startStructure(2104, true);$vars.x=this._appendStructure($r0,this._apply("trans"),2107);$r0.value=("throw " + $vars.x);return this._endStructure($r0);},
"try":function(){var $elf=this,$vars={},$r0=this._startStructure(2110, true);$vars.x=this._appendStructure($r0,this._apply("curlyTrans"),2113);$vars.name=this._getStructureValue(this.anything());$vars.c=this._appendStructure($r0,this._apply("curlyTrans"),2117);$vars.f=this._appendStructure($r0,this._apply("curlyTrans"),2120);$r0.value=((((((("try " + $vars.x) + "catch(") + $vars.name) + ")") + $vars.c) + "finally") + $vars.f);return this._endStructure($r0);},
"json":function(){var $elf=this,$vars={},$r0=this._startStructure(2123, true);$vars.props=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),2128);}),2126);$r0.value=(("({" + $vars.props.join(",")) + "})");return this._endStructure($r0);},
"binding":function(){var $elf=this,$vars={},$r0=this._startStructure(2131, true);$vars.name=this._getStructureValue(this.anything());$vars.val=this._appendStructure($r0,this._apply("trans"),2135);$r0.value=(($vars.name.toProgramString() + ": ") + $vars.val);return this._endStructure($r0);},
"switch":function(){var $elf=this,$vars={},$r0=this._startStructure(2138, true);$vars.x=this._appendStructure($r0,this._apply("trans"),2141);$vars.cases=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),2146);}),2144);$r0.value=(((("switch(" + $vars.x) + "){") + $vars.cases.join(";")) + "}");return this._endStructure($r0);},
"case":function(){var $elf=this,$vars={},$r0=this._startStructure(2149, true);$vars.x=this._appendStructure($r0,this._apply("trans"),2152);$vars.y=this._appendStructure($r0,this._apply("trans"),2155);$r0.value=((("case " + $vars.x) + ": ") + $vars.y);return this._endStructure($r0);},
"default":function(){var $elf=this,$vars={},$r0=this._startStructure(2158, true);$vars.y=this._appendStructure($r0,this._apply("trans"),2161);$r0.value=("default: " + $vars.y);return this._endStructure($r0);},
"emitEvent":function(){var $elf=this,$vars={},$r0=this._startStructure(2164, true);$vars.name=this._getStructureValue(this.anything());$vars.l=this._getStructureValue(this.anything());$r0.value=(((((("$e(" + $vars.l["start"]) + ",") + $vars.l["stop"]) + ",\"") + $vars.name) + "\")");return this._endStructure($r0);}})

