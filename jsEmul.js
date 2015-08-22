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
"special":function(){var $elf=this,$vars={},$r0=this._startStructure(409, true);$vars.s=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this.exactly("("),414);},function(){return this._forwardStructure(this.exactly(")"),416);},function(){return this._forwardStructure(this.exactly("{"),418);},function(){return this._forwardStructure(this.exactly("}"),420);},function(){return this._forwardStructure(this.exactly("["),422);},function(){return this._forwardStructure(this.exactly("]"),424);},function(){return this._forwardStructure(this.exactly(","),426);},function(){return this._forwardStructure(this.exactly(";"),428);},function(){return this._forwardStructure(this.exactly("?"),430);},function(){return this._forwardStructure(this.exactly(":"),432);},function(){var $r1=this._startStructure(434);this._appendStructure($r1,this.exactly("!"),435);this._appendStructure($r1,this.exactly("="),435);this._appendStructure($r1,this.exactly("="),435);$r1.value="!==";return this._endStructure($r1);},function(){var $r1=this._startStructure(436);this._appendStructure($r1,this.exactly("!"),437);this._appendStructure($r1,this.exactly("="),437);$r1.value="!=";return this._endStructure($r1);},function(){var $r1=this._startStructure(438);this._appendStructure($r1,this.exactly("="),439);this._appendStructure($r1,this.exactly("="),439);this._appendStructure($r1,this.exactly("="),439);$r1.value="===";return this._endStructure($r1);},function(){var $r1=this._startStructure(440);this._appendStructure($r1,this.exactly("="),441);this._appendStructure($r1,this.exactly("="),441);$r1.value="==";return this._endStructure($r1);},function(){var $r1=this._startStructure(442);this._appendStructure($r1,this.exactly("="),443);$r1.value="=";return this._endStructure($r1);},function(){var $r1=this._startStructure(444);this._appendStructure($r1,this.exactly(">"),445);this._appendStructure($r1,this.exactly(">"),445);this._appendStructure($r1,this.exactly("="),445);$r1.value=">>=";return this._endStructure($r1);},function(){var $r1=this._startStructure(446);this._appendStructure($r1,this.exactly(">"),447);this._appendStructure($r1,this.exactly(">"),447);this._appendStructure($r1,this.exactly(">"),447);$r1.value=">>>";return this._endStructure($r1);},function(){var $r1=this._startStructure(448);this._appendStructure($r1,this.exactly(">"),449);this._appendStructure($r1,this.exactly(">"),449);$r1.value=">>";return this._endStructure($r1);},function(){var $r1=this._startStructure(450);this._appendStructure($r1,this.exactly(">"),451);this._appendStructure($r1,this.exactly("="),451);$r1.value=">=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly(">"),452);},function(){var $r1=this._startStructure(454);this._appendStructure($r1,this.exactly("<"),455);this._appendStructure($r1,this.exactly("<"),455);this._appendStructure($r1,this.exactly("="),455);$r1.value="<<=";return this._endStructure($r1);},function(){var $r1=this._startStructure(456);this._appendStructure($r1,this.exactly("<"),457);this._appendStructure($r1,this.exactly("="),457);$r1.value="<=";return this._endStructure($r1);},function(){var $r1=this._startStructure(458);this._appendStructure($r1,this.exactly("<"),459);this._appendStructure($r1,this.exactly("<"),459);$r1.value="<<";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("<"),460);},function(){var $r1=this._startStructure(462);this._appendStructure($r1,this.exactly("+"),463);this._appendStructure($r1,this.exactly("+"),463);$r1.value="++";return this._endStructure($r1);},function(){var $r1=this._startStructure(464);this._appendStructure($r1,this.exactly("+"),465);this._appendStructure($r1,this.exactly("="),465);$r1.value="+=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("+"),466);},function(){var $r1=this._startStructure(468);this._appendStructure($r1,this.exactly("-"),469);this._appendStructure($r1,this.exactly("-"),469);$r1.value="--";return this._endStructure($r1);},function(){var $r1=this._startStructure(470);this._appendStructure($r1,this.exactly("-"),471);this._appendStructure($r1,this.exactly("="),471);$r1.value="-=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("-"),472);},function(){var $r1=this._startStructure(474);this._appendStructure($r1,this.exactly("*"),475);this._appendStructure($r1,this.exactly("="),475);$r1.value="*=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("*"),476);},function(){var $r1=this._startStructure(478);this._appendStructure($r1,this.exactly("/"),479);this._appendStructure($r1,this.exactly("="),479);$r1.value="/=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("/"),480);},function(){var $r1=this._startStructure(482);this._appendStructure($r1,this.exactly("%"),483);this._appendStructure($r1,this.exactly("="),483);$r1.value="%=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("%"),484);},function(){var $r1=this._startStructure(486);this._appendStructure($r1,this.exactly("&"),487);this._appendStructure($r1,this.exactly("&"),487);this._appendStructure($r1,this.exactly("="),487);$r1.value="&&=";return this._endStructure($r1);},function(){var $r1=this._startStructure(488);this._appendStructure($r1,this.exactly("&"),489);this._appendStructure($r1,this.exactly("&"),489);$r1.value="&&";return this._endStructure($r1);},function(){var $r1=this._startStructure(490);this._appendStructure($r1,this.exactly("|"),491);this._appendStructure($r1,this.exactly("|"),491);this._appendStructure($r1,this.exactly("="),491);$r1.value="||=";return this._endStructure($r1);},function(){var $r1=this._startStructure(492);this._appendStructure($r1,this.exactly("|"),493);this._appendStructure($r1,this.exactly("|"),493);$r1.value="||";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("."),494);},function(){return this._forwardStructure(this.exactly("!"),496);}),412);$r0.value=[$vars.s,$vars.s];return this._endStructure($r0);},
"tok":function(){var $elf=this,$vars={},$r0=this._startStructure(499, true);this._appendStructure($r0,this._apply("spaces"),501);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("name"),505);},function(){return this._forwardStructure(this._apply("keyword"),507);},function(){return this._forwardStructure(this._apply("number"),509);},function(){return this._forwardStructure(this._apply("str"),511);},function(){return this._forwardStructure(this._apply("special"),513);}),503);return this._endStructure($r0);},
"toks":function(){var $elf=this,$vars={},$r0=this._startStructure(515, true);$vars.ts=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("token"),520);}),518);this._appendStructure($r0,this._apply("spaces"),522);this._appendStructure($r0,this.end(),524);$r0.value=$vars.ts;return this._endStructure($r0);},
"token":function(){var $elf=this,$vars={},$r0=this._startStructure(527, true);$vars.tt=this._getStructureValue(this.anything());$vars.t=this._appendStructure($r0,this._apply("tok"),531);this._pred(($vars.t[(0)] == $vars.tt));$r0.value=$vars.t[(1)];return this._endStructure($r0);},
"spacesNoNl":function(){var $elf=this,$vars={},$r0=this._startStructure(536, true);$r0.value=this._appendStructure($r0,this._many(function(){var $r1=this._startStructure(539);this._appendStructure($r1,this._not(function(){return this._forwardStructure(this.exactly("\n"),543);}),541);$r1.value=this._appendStructure($r1,this._apply("space"),545);return this._endStructure($r1);}),537);return this._endStructure($r0);},
"expr":function(){var $elf=this,$vars={},$r0=this._startStructure(547, true);$vars.e=this._appendStructure($r0,this._apply("orExpr"),550);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(554);this._appendStructure($r1,this._applyWithArgs("token","?"),556);$vars.t=this._appendStructure($r1,this._apply("expr"),559);this._appendStructure($r1,this._applyWithArgs("token",":"),561);$vars.f=this._appendStructure($r1,this._apply("expr"),564);$r1.value=["condExpr",$vars.e,$vars.t,$vars.f];return this._endStructure($r1);},function(){var $r1=this._startStructure(567);this._appendStructure($r1,this._applyWithArgs("token","="),569);$vars.rhs=this._appendStructure($r1,this._apply("expr"),572);$r1.value=["set",$vars.e,$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(575);this._appendStructure($r1,this._applyWithArgs("token","+="),577);$vars.rhs=this._appendStructure($r1,this._apply("expr"),580);$r1.value=["mset",$vars.e,"+",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(583);this._appendStructure($r1,this._applyWithArgs("token","-="),585);$vars.rhs=this._appendStructure($r1,this._apply("expr"),588);$r1.value=["mset",$vars.e,"-",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(591);this._appendStructure($r1,this._applyWithArgs("token","*="),593);$vars.rhs=this._appendStructure($r1,this._apply("expr"),596);$r1.value=["mset",$vars.e,"*",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(599);this._appendStructure($r1,this._applyWithArgs("token","/="),601);$vars.rhs=this._appendStructure($r1,this._apply("expr"),604);$r1.value=["mset",$vars.e,"/",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(607);this._appendStructure($r1,this._applyWithArgs("token","%="),609);$vars.rhs=this._appendStructure($r1,this._apply("expr"),612);$r1.value=["mset",$vars.e,"%",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(615);this._appendStructure($r1,this._applyWithArgs("token","&&="),617);$vars.rhs=this._appendStructure($r1,this._apply("expr"),620);$r1.value=["mset",$vars.e,"&&",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(623);this._appendStructure($r1,this._applyWithArgs("token","||="),625);$vars.rhs=this._appendStructure($r1,this._apply("expr"),628);$r1.value=["mset",$vars.e,"||",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(631);this._appendStructure($r1,this._applyWithArgs("token",">>="),633);$vars.rhs=this._appendStructure($r1,this._apply("expr"),636);$r1.value=["mset",$vars.e,">>",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(639);this._appendStructure($r1,this._applyWithArgs("token","<<="),641);$vars.rhs=this._appendStructure($r1,this._apply("expr"),644);$r1.value=["mset",$vars.e,"<<",$vars.rhs,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(647);this._appendStructure($r1,this._apply("empty"),649);$r1.value=$vars.e;return this._endStructure($r1);}),552);return this._endStructure($r0);},
"orExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(652, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(655);$vars.x=this._appendStructure($r1,this._apply("orExpr"),658);this._appendStructure($r1,this._applyWithArgs("token","||"),660);$vars.y=this._appendStructure($r1,this._apply("andExpr"),663);$r1.value=["binop","||",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("andExpr"),666);}),653);return this._endStructure($r0);},
"andExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(668, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(671);$vars.x=this._appendStructure($r1,this._apply("andExpr"),674);this._appendStructure($r1,this._applyWithArgs("token","&&"),676);$vars.y=this._appendStructure($r1,this._apply("eqExpr"),679);$r1.value=["binop","&&",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("eqExpr"),682);}),669);return this._endStructure($r0);},
"eqExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(684, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(687);$vars.x=this._appendStructure($r1,this._apply("eqExpr"),690);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(694);this._appendStructure($r2,this._applyWithArgs("token","=="),696);$vars.y=this._appendStructure($r2,this._apply("relExpr"),699);$r2.value=["binop","==",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(702);this._appendStructure($r2,this._applyWithArgs("token","!="),704);$vars.y=this._appendStructure($r2,this._apply("relExpr"),707);$r2.value=["binop","!=",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(710);this._appendStructure($r2,this._applyWithArgs("token","==="),712);$vars.y=this._appendStructure($r2,this._apply("relExpr"),715);$r2.value=["binop","===",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(718);this._appendStructure($r2,this._applyWithArgs("token","!=="),720);$vars.y=this._appendStructure($r2,this._apply("relExpr"),723);$r2.value=["binop","!==",$vars.x,$vars.y];return this._endStructure($r2);}),692);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("relExpr"),726);}),685);return this._endStructure($r0);},
"relExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(728, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(731);$vars.x=this._appendStructure($r1,this._apply("relExpr"),734);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(738);this._appendStructure($r2,this._applyWithArgs("token",">"),740);$vars.y=this._appendStructure($r2,this._apply("addExpr"),743);$r2.value=["binop",">",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(746);this._appendStructure($r2,this._applyWithArgs("token",">="),748);$vars.y=this._appendStructure($r2,this._apply("addExpr"),751);$r2.value=["binop",">=",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(754);this._appendStructure($r2,this._applyWithArgs("token","<"),756);$vars.y=this._appendStructure($r2,this._apply("addExpr"),759);$r2.value=["binop","<",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(762);this._appendStructure($r2,this._applyWithArgs("token","<="),764);$vars.y=this._appendStructure($r2,this._apply("addExpr"),767);$r2.value=["binop","<=",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(770);this._appendStructure($r2,this._applyWithArgs("token","instanceof"),772);$vars.y=this._appendStructure($r2,this._apply("addExpr"),775);$r2.value=["binop","instanceof",$vars.x,$vars.y];return this._endStructure($r2);}),736);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("shiftExpr"),778);}),729);return this._endStructure($r0);},
"shiftExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(780, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(783);$vars.x=this._appendStructure($r1,this._apply("shiftExpr"),786);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(790);this._appendStructure($r2,this._applyWithArgs("token",">>"),792);$vars.y=this._appendStructure($r2,this._apply("addExpr"),795);$r2.value=["binop",">>",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(798);this._appendStructure($r2,this._applyWithArgs("token","<<"),800);$vars.y=this._appendStructure($r2,this._apply("addExpr"),803);$r2.value=["binop","<<",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(806);this._appendStructure($r2,this._applyWithArgs("token",">>>"),808);$vars.y=this._appendStructure($r2,this._apply("addExpr"),811);$r2.value=["binop",">>>",$vars.x,$vars.y];return this._endStructure($r2);}),788);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("addExpr"),814);}),781);return this._endStructure($r0);},
"addExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(816, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(819);$vars.x=this._appendStructure($r1,this._apply("addExpr"),822);this._appendStructure($r1,this._applyWithArgs("token","+"),824);$vars.y=this._appendStructure($r1,this._apply("mulExpr"),827);$r1.value=["binop","+",$vars.x,$vars.y];return this._endStructure($r1);},function(){var $r1=this._startStructure(830);$vars.x=this._appendStructure($r1,this._apply("addExpr"),833);this._appendStructure($r1,this._applyWithArgs("token","-"),835);$vars.y=this._appendStructure($r1,this._apply("mulExpr"),838);$r1.value=["binop","-",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("mulExpr"),841);}),817);return this._endStructure($r0);},
"mulExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(843, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(846);$vars.x=this._appendStructure($r1,this._apply("mulExpr"),849);this._appendStructure($r1,this._applyWithArgs("token","*"),851);$vars.y=this._appendStructure($r1,this._apply("unary"),854);$r1.value=["binop","*",$vars.x,$vars.y];return this._endStructure($r1);},function(){var $r1=this._startStructure(857);$vars.x=this._appendStructure($r1,this._apply("mulExpr"),860);this._appendStructure($r1,this._applyWithArgs("token","/"),862);$vars.y=this._appendStructure($r1,this._apply("unary"),865);$r1.value=["binop","/",$vars.x,$vars.y];return this._endStructure($r1);},function(){var $r1=this._startStructure(868);$vars.x=this._appendStructure($r1,this._apply("mulExpr"),871);this._appendStructure($r1,this._applyWithArgs("token","%"),873);$vars.y=this._appendStructure($r1,this._apply("unary"),876);$r1.value=["binop","%",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("unary"),879);}),844);return this._endStructure($r0);},
"unary":function(){var $elf=this,$vars={},$r0=this._startStructure(881, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(884);this._appendStructure($r1,this._applyWithArgs("token","-"),886);$vars.p=this._appendStructure($r1,this._apply("postfix"),889);$r1.value=["unop","-",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(892);this._appendStructure($r1,this._applyWithArgs("token","+"),894);$vars.p=this._appendStructure($r1,this._apply("postfix"),897);$r1.value=["unop","+",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(900);this._appendStructure($r1,this._applyWithArgs("token","++"),902);$vars.p=this._appendStructure($r1,this._apply("postfix"),905);$r1.value=["preop","++",$vars.p,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(908);this._appendStructure($r1,this._applyWithArgs("token","--"),910);$vars.p=this._appendStructure($r1,this._apply("postfix"),913);$r1.value=["preop","--",$vars.p,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(916);this._appendStructure($r1,this._applyWithArgs("token","!"),918);$vars.p=this._appendStructure($r1,this._apply("unary"),921);$r1.value=["unop","!",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(924);this._appendStructure($r1,this._applyWithArgs("token","void"),926);$vars.p=this._appendStructure($r1,this._apply("unary"),929);$r1.value=["unop","void",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(932);this._appendStructure($r1,this._applyWithArgs("token","delete"),934);$vars.p=this._appendStructure($r1,this._apply("unary"),937);$r1.value=["unop","delete",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(940);this._appendStructure($r1,this._applyWithArgs("token","typeof"),942);$vars.p=this._appendStructure($r1,this._apply("unary"),945);$r1.value=["unop","typeof",$vars.p];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("postfix"),948);}),882);return this._endStructure($r0);},
"postfix":function(){var $elf=this,$vars={},$r0=this._startStructure(950, true);$vars.p=this._appendStructure($r0,this._apply("primExpr"),953);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(957);this._appendStructure($r1,this._apply("spacesNoNl"),959);this._appendStructure($r1,this._applyWithArgs("token","++"),961);$r1.value=["postop","++",$vars.p,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(964);this._appendStructure($r1,this._apply("spacesNoNl"),966);this._appendStructure($r1,this._applyWithArgs("token","--"),968);$r1.value=["postop","--",$vars.p,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(971);this._appendStructure($r1,this._apply("empty"),973);$r1.value=$vars.p;return this._endStructure($r1);}),955);return this._endStructure($r0);},
"primExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(976, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(979);$vars.p=this._appendStructure($r1,this._apply("primExpr"),982);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(986);this._appendStructure($r2,this._applyWithArgs("token","["),988);$vars.i=this._appendStructure($r2,this._apply("expr"),991);this._appendStructure($r2,this._applyWithArgs("token","]"),993);$r2.value=["getp",$vars.i,$vars.p];return this._endStructure($r2);},function(){var $r2=this._startStructure(996);this._appendStructure($r2,this._applyWithArgs("token","."),998);$vars.m=this._appendStructure($r2,this._apply("anyname"),1001);this._appendStructure($r2,this._applyWithArgs("token","("),1003);$vars.as=this._appendStructure($r2,this._applyWithArgs("listOf","expr",","),1006);this._appendStructure($r2,this._applyWithArgs("token",")"),1010);$r2.value=["send",$vars.m,$vars.p].concat($vars.as);return this._endStructure($r2);},function(){var $r2=this._startStructure(1013);this._appendStructure($r2,this._applyWithArgs("token","."),1015);$vars.f=this._appendStructure($r2,this._apply("anyname"),1018);$r2.value=["getp",["string",$vars.f],$vars.p];return this._endStructure($r2);},function(){var $r2=this._startStructure(1021);this._appendStructure($r2,this._applyWithArgs("token","("),1023);$vars.as=this._appendStructure($r2,this._applyWithArgs("listOf","expr",","),1026);this._appendStructure($r2,this._applyWithArgs("token",")"),1030);$r2.value=["call",$vars.p].concat($vars.as).concat(this._extractLocation($r2));return this._endStructure($r2);}),984);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("primExprHd"),1033);}),977);return this._endStructure($r0);},
"primExprHd":function(){var $elf=this,$vars={},$r0=this._startStructure(1035, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1038);this._appendStructure($r1,this._applyWithArgs("token","("),1040);$vars.e=this._appendStructure($r1,this._apply("expr"),1043);this._appendStructure($r1,this._applyWithArgs("token",")"),1045);$r1.value=$vars.e;return this._endStructure($r1);},function(){var $r1=this._startStructure(1048);this._appendStructure($r1,this._applyWithArgs("token","this"),1050);$r1.value=["this"];return this._endStructure($r1);},function(){var $r1=this._startStructure(1053);$vars.n=this._appendStructure($r1,this._applyWithArgs("token","name"),1056);$r1.value=["get",$vars.n];return this._endStructure($r1);},function(){var $r1=this._startStructure(1059);$vars.n=this._appendStructure($r1,this._applyWithArgs("token","number"),1062);$r1.value=["number",$vars.n];return this._endStructure($r1);},function(){var $r1=this._startStructure(1065);$vars.s=this._appendStructure($r1,this._applyWithArgs("token","string"),1068);$r1.value=["string",$vars.s];return this._endStructure($r1);},function(){var $r1=this._startStructure(1071);this._appendStructure($r1,this._applyWithArgs("token","function"),1073);$r1.value=this._appendStructure($r1,this._apply("funcRest"),1075);return this._endStructure($r1);},function(){var $r1=this._startStructure(1077);this._appendStructure($r1,this._applyWithArgs("token","new"),1079);$vars.e=this._appendStructure($r1,this._apply("primExpr"),1082);$r1.value=["new",$vars.e];return this._endStructure($r1);},function(){var $r1=this._startStructure(1085);this._appendStructure($r1,this._applyWithArgs("token","["),1087);$vars.es=this._appendStructure($r1,this._applyWithArgs("enum","expr",","),1090);this._appendStructure($r1,this._applyWithArgs("token","]"),1094);$r1.value=["arr"].concat($vars.es);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("json"),1097);},function(){return this._forwardStructure(this._apply("re"),1099);}),1036);return this._endStructure($r0);},
"json":function(){var $elf=this,$vars={},$r0=this._startStructure(1101, true);this._appendStructure($r0,this._applyWithArgs("token","{"),1103);$vars.bs=this._appendStructure($r0,this._applyWithArgs("enum","jsonBinding",","),1106);this._appendStructure($r0,this._applyWithArgs("token","}"),1110);$r0.value=["json"].concat($vars.bs);return this._endStructure($r0);},
"jsonBinding":function(){var $elf=this,$vars={},$r0=this._startStructure(1113, true);$vars.n=this._appendStructure($r0,this._apply("jsonPropName"),1116);this._appendStructure($r0,this._applyWithArgs("token",":"),1118);$vars.v=this._appendStructure($r0,this._apply("expr"),1121);$r0.value=["binding",$vars.n,$vars.v];return this._endStructure($r0);},
"jsonPropName":function(){var $elf=this,$vars={},$r0=this._startStructure(1124, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._applyWithArgs("token","name"),1127);},function(){return this._forwardStructure(this._applyWithArgs("token","number"),1129);},function(){return this._forwardStructure(this._applyWithArgs("token","string"),1131);}),1125);return this._endStructure($r0);},
"re":function(){var $elf=this,$vars={},$r0=this._startStructure(1133, true);this._appendStructure($r0,this._apply("spaces"),1135);$vars.x=this._appendStructure($r0,this._consumedBy(function(){var $r1=this._startStructure(1140);this._appendStructure($r1,this.exactly("/"),1142);this._appendStructure($r1,this._apply("reBody"),1144);this._appendStructure($r1,this.exactly("/"),1146);$r1.value=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._apply("reFlag"),1150);}),1148);return this._endStructure($r1);}),1138);$r0.value=["regExpr",$vars.x];return this._endStructure($r0);},
"reBody":function(){var $elf=this,$vars={},$r0=this._startStructure(1153, true);this._appendStructure($r0,this._apply("re1stChar"),1155);$r0.value=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("reChar"),1159);}),1157);return this._endStructure($r0);},
"re1stChar":function(){var $elf=this,$vars={},$r0=this._startStructure(1161, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1164);this._appendStructure($r1,this._not(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this.exactly("*"),1170);},function(){return this._forwardStructure(this.exactly("\\"),1172);},function(){return this._forwardStructure(this.exactly("/"),1174);},function(){return this._forwardStructure(this.exactly("["),1176);}),1168);}),1166);$r1.value=this._appendStructure($r1,this._apply("reNonTerm"),1178);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("escapeChar"),1180);},function(){return this._forwardStructure(this._apply("reClass"),1182);}),1162);return this._endStructure($r0);},
"reChar":function(){var $elf=this,$vars={},$r0=this._startStructure(1184, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("re1stChar"),1187);},function(){return this._forwardStructure(this.exactly("*"),1189);}),1185);return this._endStructure($r0);},
"reNonTerm":function(){var $elf=this,$vars={},$r0=this._startStructure(1191, true);this._appendStructure($r0,this._not(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this.exactly("\n"),1197);},function(){return this._forwardStructure(this.exactly("\r"),1199);}),1195);}),1193);$r0.value=this._appendStructure($r0,this._apply("char"),1201);return this._endStructure($r0);},
"reClass":function(){var $elf=this,$vars={},$r0=this._startStructure(1203, true);this._appendStructure($r0,this.exactly("["),1205);this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("reClassChar"),1209);}),1207);$r0.value=this._appendStructure($r0,this.exactly("]"),1211);return this._endStructure($r0);},
"reClassChar":function(){var $elf=this,$vars={},$r0=this._startStructure(1213, true);this._appendStructure($r0,this._not(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this.exactly("["),1219);},function(){return this._forwardStructure(this.exactly("]"),1221);}),1217);}),1215);$r0.value=this._appendStructure($r0,this._apply("reChar"),1223);return this._endStructure($r0);},
"reFlag":function(){var $elf=this,$vars={},$r0=this._startStructure(1225, true);$r0.value=this._appendStructure($r0,this._apply("nameFirst"),1226);return this._endStructure($r0);},
"formal":function(){var $elf=this,$vars={},$r0=this._startStructure(1228, true);this._appendStructure($r0,this._apply("spaces"),1230);$r0.value=this._appendStructure($r0,this._applyWithArgs("token","name"),1232);return this._endStructure($r0);},
"funcRest":function(){var $elf=this,$vars={},$r0=this._startStructure(1234, true);this._appendStructure($r0,this._applyWithArgs("token","("),1236);$vars.fs=this._appendStructure($r0,this._applyWithArgs("listOf","formal",","),1239);this._appendStructure($r0,this._applyWithArgs("token",")"),1243);this._appendStructure($r0,this._applyWithArgs("token","{"),1245);$vars.body=this._appendStructure($r0,this._apply("srcElems"),1248);this._appendStructure($r0,this._applyWithArgs("token","}"),1250);$r0.value=["func",$vars.fs,$vars.body];return this._endStructure($r0);},
"sc":function(){var $elf=this,$vars={},$r0=this._startStructure(1253, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1256);this._appendStructure($r1,this._apply("spacesNoNl"),1258);$r1.value=this._appendStructure($r1,this._or(function(){return this._forwardStructure(this.exactly("\n"),1262);},function(){return this._forwardStructure(this._lookahead(function(){return this._forwardStructure(this.exactly("}"),1266);}),1264);},function(){return this._forwardStructure(this.end(),1268);}),1260);return this._endStructure($r1);},function(){return this._forwardStructure(this._applyWithArgs("token",";"),1270);}),1254);return this._endStructure($r0);},
"varBinder":function(){var $elf=this,$vars={},$r0=this._startStructure(1272, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._applyWithArgs("token","var"),1275);},function(){return this._forwardStructure(this._applyWithArgs("token","let"),1277);},function(){return this._forwardStructure(this._applyWithArgs("token","const"),1279);}),1273);return this._endStructure($r0);},
"varBinding":function(){var $elf=this,$vars={},$r0=this._startStructure(1281, true);$vars.n=this._appendStructure($r0,this._applyWithArgs("token","name"),1284);$vars.v=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1289);this._appendStructure($r1,this._applyWithArgs("token","="),1291);$r1.value=this._appendStructure($r1,this._apply("expr"),1293);return this._endStructure($r1);},function(){var $r1=this._startStructure(1295);this._appendStructure($r1,this._apply("empty"),1297);$r1.value=["get","undefined"];return this._endStructure($r1);}),1287);$r0.value=["assignVar",$vars.n,$vars.v,this._extractLocation($r0)];return this._endStructure($r0);},
"block":function(){var $elf=this,$vars={},$r0=this._startStructure(1301, true);this._appendStructure($r0,this._applyWithArgs("token","{"),1303);$vars.ss=this._appendStructure($r0,this._apply("srcElems"),1306);this._appendStructure($r0,this._applyWithArgs("token","}"),1308);$r0.value=["begin",$vars.ss];return this._endStructure($r0);},
"stmt":function(){var $elf=this,$vars={},$r0=this._startStructure(1311, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("block"),1314);},function(){var $r1=this._startStructure(1316);$vars.decl=this._appendStructure($r1,this._apply("varBinder"),1319);$vars.bs=this._appendStructure($r1,this._applyWithArgs("listOf","varBinding",","),1322);this._appendStructure($r1,this._apply("sc"),1326);$r1.value=["beginVars",$vars.decl].concat($vars.bs);return this._endStructure($r1);},function(){var $r1=this._startStructure(1329);this._appendStructure($r1,this._applyWithArgs("token","if"),1331);this._appendStructure($r1,this._applyWithArgs("token","("),1333);$vars.c=this._appendStructure($r1,this._apply("expr"),1336);this._appendStructure($r1,this._applyWithArgs("token",")"),1338);$vars.t=this._appendStructure($r1,this._apply("stmt"),1341);$vars.f=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1346);this._appendStructure($r2,this._applyWithArgs("token","else"),1348);$r2.value=this._appendStructure($r2,this._apply("stmt"),1350);return this._endStructure($r2);},function(){var $r2=this._startStructure(1352);this._appendStructure($r2,this._apply("empty"),1354);$r2.value=["get","undefined"];return this._endStructure($r2);}),1344);$r1.value=["if",$vars.c,$vars.t,$vars.f];return this._endStructure($r1);},function(){var $r1=this._startStructure(1358);this._appendStructure($r1,this._applyWithArgs("token","while"),1360);this._appendStructure($r1,this._applyWithArgs("token","("),1362);$vars.c=this._appendStructure($r1,this._apply("expr"),1365);this._appendStructure($r1,this._applyWithArgs("token",")"),1367);$vars.s=this._appendStructure($r1,this._apply("stmt"),1370);$r1.value=["while",$vars.c,["begin",$vars.s,["emitEvent","while",this._extractLocation($r1)]]];return this._endStructure($r1);},function(){var $r1=this._startStructure(1373);this._appendStructure($r1,this._applyWithArgs("token","do"),1375);$vars.s=this._appendStructure($r1,this._apply("stmt"),1378);this._appendStructure($r1,this._applyWithArgs("token","while"),1380);this._appendStructure($r1,this._applyWithArgs("token","("),1382);$vars.c=this._appendStructure($r1,this._apply("expr"),1385);this._appendStructure($r1,this._applyWithArgs("token",")"),1387);this._appendStructure($r1,this._apply("sc"),1389);$r1.value=["doWhile",["begin",$vars.s,["emitEvent","doWhile",this._extractLocation($r1)]],$vars.c];return this._endStructure($r1);},function(){var $r1=this._startStructure(1392);this._appendStructure($r1,this._applyWithArgs("token","for"),1394);this._appendStructure($r1,this._applyWithArgs("token","("),1396);$vars.i=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1401);$vars.decl=this._appendStructure($r2,this._apply("varBinder"),1404);$vars.bs=this._appendStructure($r2,this._applyWithArgs("listOf","varBinding",","),1407);$r2.value=["beginVars",$vars.decl].concat($vars.bs);return this._endStructure($r2);},function(){return this._forwardStructure(this._apply("expr"),1412);},function(){var $r2=this._startStructure(1414);this._appendStructure($r2,this._apply("empty"),1416);$r2.value=["get","undefined"];return this._endStructure($r2);}),1399);this._appendStructure($r1,this._applyWithArgs("token",";"),1419);$vars.c=this._appendStructure($r1,this._or(function(){return this._forwardStructure(this._apply("expr"),1424);},function(){var $r2=this._startStructure(1426);this._appendStructure($r2,this._apply("empty"),1428);$r2.value=["get","true"];return this._endStructure($r2);}),1422);this._appendStructure($r1,this._applyWithArgs("token",";"),1431);$vars.u=this._appendStructure($r1,this._or(function(){return this._forwardStructure(this._apply("expr"),1436);},function(){var $r2=this._startStructure(1438);this._appendStructure($r2,this._apply("empty"),1440);$r2.value=["get","undefined"];return this._endStructure($r2);}),1434);this._appendStructure($r1,this._applyWithArgs("token",")"),1443);$vars.s=this._appendStructure($r1,this._apply("stmt"),1446);$r1.value=["for",$vars.i,$vars.c,$vars.u,["begin",$vars.s,["emitEvent","for",this._extractLocation($r1)]]];return this._endStructure($r1);},function(){var $r1=this._startStructure(1449);this._appendStructure($r1,this._applyWithArgs("token","for"),1451);this._appendStructure($r1,this._applyWithArgs("token","("),1453);$vars.v=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1458);$vars.decl=this._appendStructure($r2,this._apply("varBinder"),1461);$vars.n=this._appendStructure($r2,this._applyWithArgs("token","name"),1464);$r2.value=["beginVars",$vars.decl,["noAssignVar",$vars.n]];return this._endStructure($r2);},function(){return this._forwardStructure(this._apply("expr"),1467);}),1456);this._appendStructure($r1,this._applyWithArgs("token","in"),1469);$vars.e=this._appendStructure($r1,this._apply("expr"),1472);this._appendStructure($r1,this._applyWithArgs("token",")"),1474);$vars.s=this._appendStructure($r1,this._apply("stmt"),1477);$r1.value=["forIn",$vars.v,$vars.e,["begin",$vars.s,["emitEvent","forIn",this._extractLocation($r1)]]];return this._endStructure($r1);},function(){var $r1=this._startStructure(1480);this._appendStructure($r1,this._applyWithArgs("token","switch"),1482);this._appendStructure($r1,this._applyWithArgs("token","("),1484);$vars.e=this._appendStructure($r1,this._apply("expr"),1487);this._appendStructure($r1,this._applyWithArgs("token",")"),1489);this._appendStructure($r1,this._applyWithArgs("token","{"),1491);$vars.cs=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._or(function(){var $r3=this._startStructure(1498);this._appendStructure($r3,this._applyWithArgs("token","case"),1500);$vars.c=this._appendStructure($r3,this._apply("expr"),1503);this._appendStructure($r3,this._applyWithArgs("token",":"),1505);$vars.cs=this._appendStructure($r3,this._apply("srcElems"),1508);$r3.value=["case",$vars.c,["begin",$vars.cs]];return this._endStructure($r3);},function(){var $r3=this._startStructure(1511);this._appendStructure($r3,this._applyWithArgs("token","default"),1513);this._appendStructure($r3,this._applyWithArgs("token",":"),1515);$vars.cs=this._appendStructure($r3,this._apply("srcElems"),1518);$r3.value=["default",["begin",$vars.cs]];return this._endStructure($r3);}),1496);}),1494);this._appendStructure($r1,this._applyWithArgs("token","}"),1521);$r1.value=["switch",$vars.e].concat($vars.cs);return this._endStructure($r1);},function(){var $r1=this._startStructure(1524);this._appendStructure($r1,this._applyWithArgs("token","break"),1526);this._appendStructure($r1,this._apply("sc"),1528);$r1.value=["break"];return this._endStructure($r1);},function(){var $r1=this._startStructure(1531);this._appendStructure($r1,this._applyWithArgs("token","continue"),1533);this._appendStructure($r1,this._apply("sc"),1535);$r1.value=["continue"];return this._endStructure($r1);},function(){var $r1=this._startStructure(1538);this._appendStructure($r1,this._applyWithArgs("token","throw"),1540);this._appendStructure($r1,this._apply("spacesNoNl"),1542);$vars.e=this._appendStructure($r1,this._apply("expr"),1545);this._appendStructure($r1,this._apply("sc"),1547);$r1.value=["throw",$vars.e];return this._endStructure($r1);},function(){var $r1=this._startStructure(1550);this._appendStructure($r1,this._applyWithArgs("token","try"),1552);$vars.t=this._appendStructure($r1,this._apply("block"),1555);this._appendStructure($r1,this._applyWithArgs("token","catch"),1557);this._appendStructure($r1,this._applyWithArgs("token","("),1559);$vars.e=this._appendStructure($r1,this._applyWithArgs("token","name"),1562);this._appendStructure($r1,this._applyWithArgs("token",")"),1564);$vars.c=this._appendStructure($r1,this._apply("block"),1567);$vars.f=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1572);this._appendStructure($r2,this._applyWithArgs("token","finally"),1574);$r2.value=this._appendStructure($r2,this._apply("block"),1576);return this._endStructure($r2);},function(){var $r2=this._startStructure(1578);this._appendStructure($r2,this._apply("empty"),1580);$r2.value=["get","undefined"];return this._endStructure($r2);}),1570);$r1.value=["try",$vars.t,$vars.e,$vars.c,$vars.f];return this._endStructure($r1);},function(){var $r1=this._startStructure(1584);this._appendStructure($r1,this._applyWithArgs("token","return"),1586);$vars.e=this._appendStructure($r1,this._or(function(){return this._forwardStructure(this._apply("expr"),1591);},function(){var $r2=this._startStructure(1593);this._appendStructure($r2,this._apply("empty"),1595);$r2.value=["get","undefined"];return this._endStructure($r2);}),1589);this._appendStructure($r1,this._apply("sc"),1598);$r1.value=["return",$vars.e,this._extractLocation($r1)];return this._endStructure($r1);},function(){var $r1=this._startStructure(1601);this._appendStructure($r1,this._applyWithArgs("token","with"),1603);this._appendStructure($r1,this._applyWithArgs("token","("),1605);$vars.x=this._appendStructure($r1,this._apply("expr"),1608);this._appendStructure($r1,this._applyWithArgs("token",")"),1610);$vars.s=this._appendStructure($r1,this._apply("stmt"),1613);$r1.value=["with",$vars.x,$vars.s];return this._endStructure($r1);},function(){var $r1=this._startStructure(1616);$vars.e=this._appendStructure($r1,this._apply("expr"),1619);this._appendStructure($r1,this._apply("sc"),1621);$r1.value=$vars.e;return this._endStructure($r1);},function(){var $r1=this._startStructure(1624);this._appendStructure($r1,this._applyWithArgs("token",";"),1626);$r1.value=["get","undefined"];return this._endStructure($r1);}),1312);return this._endStructure($r0);},
"srcElem":function(){var $elf=this,$vars={},$r0=this._startStructure(1629, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1632);this._appendStructure($r1,this._applyWithArgs("token","function"),1634);$vars.n=this._appendStructure($r1,this._applyWithArgs("token","name"),1637);$vars.f=this._appendStructure($r1,this._apply("funcRest"),1640);$r1.value=["assignVar",$vars.n,$vars.f,this._extractLocation($r1)];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("stmt"),1643);}),1630);return this._endStructure($r0);},
"srcElems":function(){var $elf=this,$vars={},$r0=this._startStructure(1645, true);$vars.ss=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("srcElem"),1650);}),1648);$r0.value=["beginTop"].concat($vars.ss);return this._endStructure($r0);},
"topLevel":function(){var $elf=this,$vars={},$r0=this._startStructure(1653, true);$vars.r=this._appendStructure($r0,this._apply("srcElems"),1656);this._appendStructure($r0,this._apply("spaces"),1658);this._appendStructure($r0,this.end(),1660);$r0.value=$vars.r;return this._endStructure($r0);}});(BSJSParser["hexDigits"]="0123456789abcdef");(BSJSParser["keywords"]=({}));(keywords=["break","case","catch","continue","default","delete","do","else","finally","for","function","if","in","instanceof","new","return","switch","this","throw","try","typeof","var","void","while","with","ometa","let","const"]);for(var idx=(0);(idx < keywords["length"]);idx++){(BSJSParser["keywords"][keywords[idx]]=true);}(BSJSParser["_isKeyword"]=(function (k){return this["keywords"].hasOwnProperty(k);}))
let emitValue=(function (location,variable,expr){return ["$v(",location["start"],",",location["stop"],",",variable.toProgramString(),",",expr,")"].join("");});let emitValueBefore=(function (expr,opExpr,loc){return ["(function(){",opExpr,";var $r=",expr,";return ",emitValue(loc,expr,"$r"),";})()"].join("");});let BSJSTranslator=objectThatDelegatesTo(OMeta,{
"trans":function(){var $elf=this,$vars={},$r0=this._startStructure(1664, true);this._appendStructure($r0,this._form(function(){var $r1=this._startStructure(1668);$vars.t=this._getStructureValue(this.anything());$r1.value=($vars.ans=this._appendStructure($r1,this._apply($vars.t),1673));return this._endStructure($r1);}),1666);$r0.value=$vars.ans;return this._endStructure($r0);},
"curlyTrans":function(){var $elf=this,$vars={},$r0=this._startStructure(1677, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1680);this._appendStructure($r1,this._form(function(){var $r2=this._startStructure(1684);this._appendStructure($r2,this.exactly("begin"),1686);$r2.value=($vars.r=this._appendStructure($r2,this._apply("curlyTrans"),1690));return this._endStructure($r2);}),1682);$r1.value=$vars.r;return this._endStructure($r1);},function(){var $r1=this._startStructure(1693);this._appendStructure($r1,this._form(function(){var $r2=this._startStructure(1697);this._appendStructure($r2,this.exactly("begin"),1699);$r2.value=($vars.rs=this._appendStructure($r2,this._many(function(){return this._forwardStructure(this._apply("trans"),1705);}),1703));return this._endStructure($r2);}),1695);$r1.value=(("{" + $vars.rs.join(";")) + ";}");return this._endStructure($r1);},function(){var $r1=this._startStructure(1708);$vars.r=this._appendStructure($r1,this._apply("trans"),1711);$r1.value=(("{" + $vars.r) + ";}");return this._endStructure($r1);}),1678);return this._endStructure($r0);},
"this":function(){var $elf=this,$vars={},$r0=this._startStructure(1714, true);$r0.value="this";return this._endStructure($r0);},
"break":function(){var $elf=this,$vars={},$r0=this._startStructure(1716, true);$r0.value="break";return this._endStructure($r0);},
"continue":function(){var $elf=this,$vars={},$r0=this._startStructure(1718, true);$r0.value="continue";return this._endStructure($r0);},
"number":function(){var $elf=this,$vars={},$r0=this._startStructure(1720, true);$vars.n=this._getStructureValue(this.anything());$r0.value=(("(" + $vars.n) + ")");return this._endStructure($r0);},
"string":function(){var $elf=this,$vars={},$r0=this._startStructure(1724, true);$vars.s=this._getStructureValue(this.anything());$r0.value=$vars.s.toProgramString();return this._endStructure($r0);},
"name":function(){var $elf=this,$vars={},$r0=this._startStructure(1728, true);$vars.s=this._getStructureValue(this.anything());$r0.value=$vars.s;return this._endStructure($r0);},
"regExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(1732, true);$vars.x=this._getStructureValue(this.anything());$r0.value=$vars.x;return this._endStructure($r0);},
"arr":function(){var $elf=this,$vars={},$r0=this._startStructure(1736, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1741);}),1739);$r0.value=(("[" + $vars.xs.join(",")) + "]");return this._endStructure($r0);},
"unop":function(){var $elf=this,$vars={},$r0=this._startStructure(1744, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1748);$r0.value=(((("(" + $vars.op) + " ") + $vars.x) + ")");return this._endStructure($r0);},
"getp":function(){var $elf=this,$vars={},$r0=this._startStructure(1751, true);$vars.fd=this._appendStructure($r0,this._apply("trans"),1754);$vars.x=this._appendStructure($r0,this._apply("trans"),1757);$r0.value=((($vars.x + "[") + $vars.fd) + "]");return this._endStructure($r0);},
"get":function(){var $elf=this,$vars={},$r0=this._startStructure(1760, true);$vars.x=this._getStructureValue(this.anything());$r0.value=$vars.x;return this._endStructure($r0);},
"set":function(){var $elf=this,$vars={},$r0=this._startStructure(1764, true);$vars.lhs=this._appendStructure($r0,this._apply("trans"),1767);$vars.rhs=this._appendStructure($r0,this._apply("trans"),1770);$vars.l=this._getStructureValue(this.anything());$r0.value=(((("(" + $vars.lhs) + "=") + emitValue($vars.l,$vars.lhs,$vars.rhs)) + ")");return this._endStructure($r0);},
"mset":function(){var $elf=this,$vars={},$r0=this._startStructure(1774, true);$vars.lhs=this._appendStructure($r0,this._apply("trans"),1777);$vars.op=this._getStructureValue(this.anything());$vars.rhs=this._appendStructure($r0,this._apply("trans"),1781);$vars.l=this._getStructureValue(this.anything());$r0.value=(((("(" + $vars.lhs) + "=") + emitValue($vars.l,$vars.lhs,(((($vars.lhs + " ") + $vars.op) + " ") + $vars.rhs))) + ")");return this._endStructure($r0);},
"binop":function(){var $elf=this,$vars={},$r0=this._startStructure(1785, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1789);$vars.y=this._appendStructure($r0,this._apply("trans"),1792);$r0.value=(((((("(" + $vars.x) + " ") + $vars.op) + " ") + $vars.y) + ")");return this._endStructure($r0);},
"preop":function(){var $elf=this,$vars={},$r0=this._startStructure(1795, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1799);$vars.l=this._getStructureValue(this.anything());$r0.value=((($vars.op + $vars.x) + ",") + emitValue($vars.l,$vars.x,$vars.x));return this._endStructure($r0);},
"postop":function(){var $elf=this,$vars={},$r0=this._startStructure(1803, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1807);$vars.l=this._getStructureValue(this.anything());$r0.value=emitValueBefore($vars.x,($vars.x + $vars.op),$vars.l);return this._endStructure($r0);},
"return":function(){var $elf=this,$vars={},$r0=this._startStructure(1811, true);$vars.x=this._appendStructure($r0,this._apply("trans"),1814);$vars.l=this._getStructureValue(this.anything());$r0.value=("return " + emitValue($vars.l,"return",$vars.x));return this._endStructure($r0);},
"with":function(){var $elf=this,$vars={},$r0=this._startStructure(1818, true);$vars.x=this._appendStructure($r0,this._apply("trans"),1821);$vars.s=this._appendStructure($r0,this._apply("curlyTrans"),1824);$r0.value=((("with(" + $vars.x) + ")") + $vars.s);return this._endStructure($r0);},
"if":function(){var $elf=this,$vars={},$r0=this._startStructure(1827, true);$vars.cond=this._appendStructure($r0,this._apply("trans"),1830);$vars.t=this._appendStructure($r0,this._apply("curlyTrans"),1833);$vars.e=this._appendStructure($r0,this._apply("curlyTrans"),1836);$r0.value=((((("if(" + $vars.cond) + ")") + $vars.t) + "else") + $vars.e);return this._endStructure($r0);},
"condExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(1839, true);$vars.cond=this._appendStructure($r0,this._apply("trans"),1842);$vars.t=this._appendStructure($r0,this._apply("trans"),1845);$vars.e=this._appendStructure($r0,this._apply("trans"),1848);$r0.value=(((((("(" + $vars.cond) + "?") + $vars.t) + ":") + $vars.e) + ")");return this._endStructure($r0);},
"while":function(){var $elf=this,$vars={},$r0=this._startStructure(1851, true);$vars.cond=this._appendStructure($r0,this._apply("trans"),1854);$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),1857);$r0.value=((("while(" + $vars.cond) + ")") + $vars.body);return this._endStructure($r0);},
"doWhile":function(){var $elf=this,$vars={},$r0=this._startStructure(1860, true);$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),1863);$vars.cond=this._appendStructure($r0,this._apply("trans"),1866);$r0.value=(((("do" + $vars.body) + "while(") + $vars.cond) + ")");return this._endStructure($r0);},
"for":function(){var $elf=this,$vars={},$r0=this._startStructure(1869, true);$vars.init=this._appendStructure($r0,this._apply("trans"),1872);$vars.cond=this._appendStructure($r0,this._apply("trans"),1875);$vars.upd=this._appendStructure($r0,this._apply("trans"),1878);$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),1881);$r0.value=((((((("for(" + $vars.init) + ";") + $vars.cond) + ";") + $vars.upd) + ")") + $vars.body);return this._endStructure($r0);},
"forIn":function(){var $elf=this,$vars={},$r0=this._startStructure(1884, true);$vars.x=this._appendStructure($r0,this._apply("trans"),1887);$vars.arr=this._appendStructure($r0,this._apply("trans"),1890);$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),1893);$r0.value=((((("for(" + $vars.x) + " in ") + $vars.arr) + ")") + $vars.body);return this._endStructure($r0);},
"beginTop":function(){var $elf=this,$vars={},$r0=this._startStructure(1896, true);$vars.xs=this._appendStructure($r0,this._many(function(){var $r1=this._startStructure(1901);$vars.x=this._appendStructure($r1,this._apply("trans"),1904);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1908);this._appendStructure($r2,this._or(function(){var $r3=this._startStructure(1911);$r3.value=this._pred(($vars.x[($vars.x["length"] - (1))] == "}"));return this._endStructure($r3);},function(){return this._forwardStructure(this.end(),1914);}),1910);$r2.value=$vars.x;return this._endStructure($r2);},function(){var $r2=this._startStructure(1917);this._appendStructure($r2,this._apply("empty"),1919);$r2.value=($vars.x + ";");return this._endStructure($r2);}),1906);return this._endStructure($r1);}),1899);$r0.value=$vars.xs.join("");return this._endStructure($r0);},
"begin":function(){var $elf=this,$vars={},$r0=this._startStructure(1923, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1926);$vars.x=this._appendStructure($r1,this._apply("trans"),1929);this._appendStructure($r1,this.end(),1931);$r1.value=$vars.x;return this._endStructure($r1);},function(){var $r1=this._startStructure(1934);$vars.xs=this._appendStructure($r1,this._many(function(){var $r2=this._startStructure(1939);$vars.x=this._appendStructure($r2,this._apply("trans"),1942);$r2.value=this._appendStructure($r2,this._or(function(){var $r3=this._startStructure(1946);this._appendStructure($r3,this._or(function(){var $r4=this._startStructure(1949);$r4.value=this._pred(($vars.x[($vars.x["length"] - (1))] == "}"));return this._endStructure($r4);},function(){return this._forwardStructure(this.end(),1952);}),1948);$r3.value=$vars.x;return this._endStructure($r3);},function(){var $r3=this._startStructure(1955);this._appendStructure($r3,this._apply("empty"),1957);$r3.value=($vars.x + ";");return this._endStructure($r3);}),1944);return this._endStructure($r2);}),1937);$r1.value=(("{" + $vars.xs.join("")) + "}");return this._endStructure($r1);}),1924);return this._endStructure($r0);},
"beginVars":function(){var $elf=this,$vars={},$r0=this._startStructure(1961, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1964);$vars.decl=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r1,this._apply("trans"),1968);this._appendStructure($r1,this.end(),1970);$r1.value=(($vars.decl + " ") + $vars.x);return this._endStructure($r1);},function(){var $r1=this._startStructure(1973);$vars.decl=this._getStructureValue(this.anything());$vars.xs=this._appendStructure($r1,this._many(function(){var $r2=this._startStructure(1978);$r2.value=($vars.x=this._appendStructure($r2,this._apply("trans"),1981));return this._endStructure($r2);}),1977);$r1.value=(($vars.decl + " ") + $vars.xs.join(","));return this._endStructure($r1);}),1962);return this._endStructure($r0);},
"func":function(){var $elf=this,$vars={},$r0=this._startStructure(1984, true);$vars.args=this._getStructureValue(this.anything());$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),1988);$r0.value=(((("(function (" + $vars.args.join(",")) + ")") + $vars.body) + ")");return this._endStructure($r0);},
"call":function(){var $elf=this,$vars={},$r0=this._startStructure(1991, true);$vars.fn=this._appendStructure($r0,this._apply("trans"),1994);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1999);}),1997);$vars.l=this._getStructureValue(this.anything());$r0.value=(($vars.fn == "log")?((($vars.fn + "(") + emitValue($vars.l,$vars.fn,$vars.args.join(","))) + ")"):((($vars.fn + "(") + $vars.args.join(",")) + ")"));return this._endStructure($r0);},
"send":function(){var $elf=this,$vars={},$r0=this._startStructure(2003, true);$vars.msg=this._getStructureValue(this.anything());$vars.recv=this._appendStructure($r0,this._apply("trans"),2007);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),2012);}),2010);$r0.value=((((($vars.recv + ".") + $vars.msg) + "(") + $vars.args.join(",")) + ")");return this._endStructure($r0);},
"new":function(){var $elf=this,$vars={},$r0=this._startStructure(2015, true);$vars.x=this._appendStructure($r0,this._apply("trans"),2018);$r0.value=("new " + $vars.x);return this._endStructure($r0);},
"assignVar":function(){var $elf=this,$vars={},$r0=this._startStructure(2021, true);$vars.name=this._getStructureValue(this.anything());$vars.val=this._appendStructure($r0,this._apply("trans"),2025);$vars.l=this._getStructureValue(this.anything());$r0.value=(($vars.name + "=") + emitValue($vars.l,$vars.name,$vars.val));return this._endStructure($r0);},
"noAssignVar":function(){var $elf=this,$vars={},$r0=this._startStructure(2029, true);$vars.name=this._getStructureValue(this.anything());$r0.value=$vars.name;return this._endStructure($r0);},
"throw":function(){var $elf=this,$vars={},$r0=this._startStructure(2033, true);$vars.x=this._appendStructure($r0,this._apply("trans"),2036);$r0.value=("throw " + $vars.x);return this._endStructure($r0);},
"try":function(){var $elf=this,$vars={},$r0=this._startStructure(2039, true);$vars.x=this._appendStructure($r0,this._apply("curlyTrans"),2042);$vars.name=this._getStructureValue(this.anything());$vars.c=this._appendStructure($r0,this._apply("curlyTrans"),2046);$vars.f=this._appendStructure($r0,this._apply("curlyTrans"),2049);$r0.value=((((((("try " + $vars.x) + "catch(") + $vars.name) + ")") + $vars.c) + "finally") + $vars.f);return this._endStructure($r0);},
"json":function(){var $elf=this,$vars={},$r0=this._startStructure(2052, true);$vars.props=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),2057);}),2055);$r0.value=(("({" + $vars.props.join(",")) + "})");return this._endStructure($r0);},
"binding":function(){var $elf=this,$vars={},$r0=this._startStructure(2060, true);$vars.name=this._getStructureValue(this.anything());$vars.val=this._appendStructure($r0,this._apply("trans"),2064);$r0.value=(($vars.name.toProgramString() + ": ") + $vars.val);return this._endStructure($r0);},
"switch":function(){var $elf=this,$vars={},$r0=this._startStructure(2067, true);$vars.x=this._appendStructure($r0,this._apply("trans"),2070);$vars.cases=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),2075);}),2073);$r0.value=(((("switch(" + $vars.x) + "){") + $vars.cases.join(";")) + "}");return this._endStructure($r0);},
"case":function(){var $elf=this,$vars={},$r0=this._startStructure(2078, true);$vars.x=this._appendStructure($r0,this._apply("trans"),2081);$vars.y=this._appendStructure($r0,this._apply("trans"),2084);$r0.value=((("case " + $vars.x) + ": ") + $vars.y);return this._endStructure($r0);},
"default":function(){var $elf=this,$vars={},$r0=this._startStructure(2087, true);$vars.y=this._appendStructure($r0,this._apply("trans"),2090);$r0.value=("default: " + $vars.y);return this._endStructure($r0);},
"emitEvent":function(){var $elf=this,$vars={},$r0=this._startStructure(2093, true);$vars.name=this._getStructureValue(this.anything());$vars.l=this._getStructureValue(this.anything());$r0.value=(((((("$e(" + $vars.l["start"]) + ",") + $vars.l["stop"]) + ",\"") + $vars.name) + "\")");return this._endStructure($r0);}})

