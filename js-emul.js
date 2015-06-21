const Gtk = imports.gi.Gtk;
const GtkSource = imports.gi.GtkSource;
const jsEmul = imports.jsEmul;

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
    evs.push({ start: start, stop: stop, name: name, value: '' + value });
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
  let lines = [], maxLine = -1, maxLineLength = 0;

  let eventToString = function(event) {
    return event.name + ' = ' + event.value;
  };

  let spaces = function(nb) {
    let s = '';
    for (let i = 0 ; i < nb; i++)
      s += ' ';
    return s;
  };

  let updateEventLine = function(line, event) {
    if (line)
      return line + spaces(maxLineLength - line.length) + ' | ' + eventToString(event)
    else
      return spaces(maxLineLength) + ' | ' + eventToString(event);

  };

  for (let i = 0; i < events.length; i++) {
    let ev = events[i];
    let line = indexToPosition(input, ev.start);
    if (maxLine < line)
      lines[line] = eventToString(ev);
    else
      lines[line] = updateEventLine(lines[line], ev);
    maxLineLength = Math.max(maxLineLength, lines[line].length);
    maxLine = line;
  }
  log(lines.length);
  let s = '';
  for (let i = 0; i <= maxLine ; i++) {
    if (lines[i])
      s += lines[i];
    s += '\n';
  }
  return s;
};

let toTraces = function(input) {
  try {
    return eventsToString(input, runFunction(toFunction(translate(input))));
  } catch (e) {
    return e.message;
  }
};

Gtk.init(null, null);

let createView = function(language) {
  let view = new GtkSource.View();
  view.monospace = true;
  view.visible = true;
  if (language) {
    let lang_manager = GtkSource.LanguageManager.get_default();
    view.buffer.set_language(lang_manager.get_language(language));
  }

  let scroll = new Gtk.ScrolledWindow();
  scroll.add(view);
  scroll.visible = true;

  return [view, scroll];
};

let paned = new Gtk.Paned();
let [v1, s1] = createView('js');
paned.add1(s1);
let [v2, s2] = createView('js');
paned.add2(s2);
paned.show();

v1.buffer.connect('changed', function() {
  let b1 = v1.buffer;
  v2.buffer.set_text(toTraces(b1.get_text(b1.get_start_iter(),
                                          b1.get_end_iter(),
                                          false)),
                     -1);
});

let win = new Gtk.Window();
win.connect('destroy', Gtk.main_quit);
win.add(paned);
win.show();

const WIDTH = 800
win.resize(WIDTH, 600);
paned.position = WIDTH / 2;

Gtk.main();
