const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GtkSource = imports.gi.GtkSource;
const jsEmul = imports.jsEmul;

let loadFile = function(path) {
  let file = Gio.File.new_for_path(path);
  let [, source] = file.load_contents(null);
  return '' + source;
};

let translate = function(input) {
  let structure = jsEmul.BSJSParser.matchAllStructure(input, 'topLevel', undefined);
  let code = jsEmul.BSJSTranslator.match(structure.value, 'trans', undefined);
  return code;
};

let toFunction = function(code) {
  return eval('(function () {return function($e) {' + code + '};})()');
};

let runFunction = function(func) {
  let evs = [];
  let ev = function(start, stop, name, value) {
    if (evs.length > 10000)
      throw new Error('Infinite loop');
    if (typeof value !== 'function') {
      evs.push({ start: start, stop: stop, name: name, value: JSON.stringify(value) });
    }
    return value;
  };
  func(ev);
  return evs;
};

let indexToPosition = function(source, idx) {
  let lineNum = 0;
  for (let i = 0; i < idx; i++)
    if (source.charAt(i) == '\n')
      lineNum++;
  return lineNum;
};


let eventsToString = function(input, events) {
  let lines = [], currentLines = [], maxLine = -1, lastLine = -1;

  let eventToString = function(event) {
    return event.name + ' = ' + event.value;
  };

  let spaces = function(nb) {
    let s = '';
    for (let i = 0 ; i < nb; i++)
      s += ' ';
    return s;
  };

  let updateEventLine = function(line, text) {
    let s = 0;
    for (let i = 0; i <= maxLine; i++) {
      if (lines[i])
        s = Math.max(lines[i].length, s);
    }

    if (s == 0)
      return text;
    else if (lines[line])
      return lines[line] + spaces(s - lines[line].length) + ' | ' + text;
    else
      return spaces(s) + ' | ' + text;
  };

  let copyArray = function(array, len) {
    let ret = [];
    for (let i = 0; i < len; i++)
      ret[i] = array[i];
    return ret;
  };

  for (let i = 0; i < events.length; i++) {
    let ev = events[i];
    let line = indexToPosition(input, ev.start);
    if (line <= lastLine)
      lines = copyArray(currentLines, maxLine + 1);
    currentLines[line] = updateEventLine(line, eventToString(ev));
    lastLine = line;
    maxLine = Math.max(line, maxLine);
  }

  let s = '';
  for (let i = 0; i <= maxLine ; i++) {
    if (currentLines[i])
      s += currentLines[i];
    s += '\n';
  }
  return s;
};

let toTraces = function(input) {
  return eventsToString(input, runFunction(toFunction(translate(input))));
};

Gtk.init(null, null);

let createView = function(args) {
  let view = new GtkSource.View();
  view.monospace = args.monospace;
  view.visible = true;
  if (args.language) {
    let lang_manager = GtkSource.LanguageManager.get_default();
    view.buffer.set_language(lang_manager.get_language(args.language));
  }

  let scroll = new Gtk.ScrolledWindow();
  scroll.add(view);
  scroll.visible = true;

  return [view, scroll];
};

let paned = new Gtk.Paned();
let [v1, s1] = createView({ language: 'js' });
paned.add1(s1);
let [v2, s2] = createView({ language: 'js', monospace: true });
paned.add2(s2);
paned.show();

v1.buffer.connect('changed', function() {
  try {
    let b1 = v1.buffer;
    v2.buffer.set_text(toTraces(b1.get_text(b1.get_start_iter(),
                                            b1.get_end_iter(),
                                            false)),
                       -1);
  } catch (e) {
    log(e);
  }
});

let win = new Gtk.Window();
win.connect('destroy', Gtk.main_quit);
win.add(paned);
win.show();

const WIDTH = 800
win.resize(WIDTH, 600);
paned.position = WIDTH / 2;

v1.buffer.set_text(loadFile('example.js'), -1);

Gtk.main();
