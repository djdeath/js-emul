const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GtkSource = imports.gi.GtkSource;
const Mainloop = imports.mainloop;

const helperProcess = imports.helperProcess;
const jsEmul = imports.jsEmul;
const Utils = imports.Utils;

let filename = ARGV.length < 1 ? (GLib.getenv('HOME') + '/.jsEmul') : ARGV[0];

/**/

Gtk.init(null, null);

let lang_manager = GtkSource.LanguageManager.get_default();
let builder = new Gtk.Builder();
builder.add_from_file('js-emul-ui.ui');

let $ = function(id) { return builder.get_object(id); };

/**/

let getAppState = function() {
  return { numbersInHexa: $('numbers-hexa').active,
           numbersInBinary: $('numbers-binary').active };
};

/**/

let translate = function(input) {
  let structure = jsEmul.BSJSParser.matchAllStructure(input, 'topLevel', undefined);
  let code = jsEmul.BSJSTranslator.match(structure.value, 'trans', undefined);
  return code;
};

let indexToLine = function(source, idx) {
  let lineNum = 0;
  for (let i = 0; i < idx; i++)
    if (source.charAt(i) == '\n')
      lineNum++;
  return lineNum;
};

let eventsToString = function(input, events) {
  let lines = [], currentLines = [], maxLine = -1, lastLine = -1;
  let appState = getAppState();

  let splitString = function(str) {
    let offset = str.length % 4;
    let ret = str.substr(0, offset);
    let arr = str.substr(offset).match(/.{1,4}/g);
    if (arr) {
      ret += (ret.length > 0) ? (' ' + arr[0]) : arr[0];
      for (let i = 1; i < arr.length; i++)
        ret += ' ' + arr[i];
    }
    return ret;
  };

  let valueToString = function(value) {
    let ret = '<error>';
    if (typeof value == 'number') {
      ret = value;
      if (appState.numbersInHexa)
        ret += ' | 0x' + splitString(value.toString(16));
      if (appState.numbersInBinary)
        ret += ' | 0b' + splitString(value.toString(2));
    } else {
      ret = JSON.stringify(value);
    }
    return ret;
  };

  let eventToString = function(event) {
    switch (event.type) {
    case 'event':
      return event.name + ' = ' + valueToString(event.value);
    case 'runtime-error':
    case 'error':
      return 'Error: ' + event.error.message;
    }
    return 'FIXME: Unknown event type!'
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

  $('error-label').label = '';
  for (let i = 0; i < events.length ; i++) {
    let ev = events[i];
    if (ev.type == 'error') {
      $('error-label').label = eventToString(ev)
      continue;
    }

    let line = indexToLine(input, Math.round((ev.start + ev.stop) / 2));
    if (line <= lastLine)
      lines = copyArray(currentLines, maxLine + 1);
    if (ev.type == 'runtime-error')
      currentLines[line] = eventToString(ev);
    else
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

/**/

let setLanguage = function(view, lang) {
  view.buffer.set_language(lang_manager.get_language(lang));
};

let v1 = $('source-view1');
let b1 = v1.buffer;
setLanguage(v1, 'js');

let v2 = $('source-view2');
let b2 = v2.buffer;
setLanguage(v2, 'js');

let addHighlightTag = function(buffer) {
  let tag_table = buffer.get_tag_table();

  let addTag = function(name, color) {
    let tag = new Gtk.TextTag({ name: name,
                                background: color });
    tag_table.add(tag);
  };

  addTag('highlight', '#d9edf7');
  addTag('error', '#f2dede');
};
addHighlightTag(v1.buffer);
addHighlightTag(v2.buffer);

let removeHighlights = function(buffer, name) {
  let tag = buffer.get_tag_table().lookup(name);
  if (tag)
    buffer.remove_tag(tag, buffer.get_start_iter(), buffer.get_end_iter());
};

let highlightTillEnd = function(buffer, name, offset) {
  buffer.apply_tag_by_name(name,
                           buffer.get_iter_at_offset(offset),
                           buffer.get_end_iter());
};

let highlightRegion = function(buffer, name, start, stop) {
  buffer.apply_tag_by_name(name,
                           buffer.get_iter_at_offset(start),
                           buffer.get_iter_at_offset(stop));
};

let highlightLine = function(buffer, name, line) {
  buffer.apply_tag_by_name(name,
                           buffer.get_iter_at_line(line),
                           buffer.get_iter_at_line(line + 1));
};

let genMoveLineCursorFunc = function(from, to) {
  return function() {
    let fromIter = from.get_iter_at_offset(from.cursor_position);
    removeHighlights(from, 'highlight');
    removeHighlights(to, 'highlight');
    highlightLine(from, 'highlight', fromIter.get_line());
    highlightLine(to, 'highlight', fromIter.get_line());
  };
};

v1.buffer.connect('notify::cursor-position', genMoveLineCursorFunc(v1.buffer, v2.buffer));
v2.buffer.connect('notify::cursor-position', genMoveLineCursorFunc(v2.buffer, v1.buffer));

let win = $('window');
win.connect('destroy', Gtk.main_quit);
win.show();

const WIDTH = 800
win.resize(WIDTH, 600);
$('paned').position = WIDTH / 2;

/**/

let _codeId = 0;
let _events = [];
let _rerenderTimeoutId = 0;

let filterEvents = function(events) {
  let filteredEvents = events;
  if ($('replay-events-button').active) {
    nbEvents = Math.min(Math.floor($('events-scale').adjustment.value), events.length);
    filteredEvents = [];
    let mapEvents = {};
    for (let i = nbEvents - 1; i >= 0; i--) {
      let ev = events[i];
      let key = ev.start + '-' + ev.stop;
      if (!mapEvents[key]) {
        mapEvents[key] = ev;
        filteredEvents.unshift(ev);
      }
    }
  }
  return filteredEvents;
};

let _rerenderEvents = function() {
  let events = filterEvents(_events);
  let lastEvent = events.length > 0 ? events[events.length - 1] : null;

  let input = b1.get_text(b1.get_start_iter(),
                          b1.get_end_iter(),
                          false);
  v2.buffer.set_text(eventsToString(input, events), -1);
  $('events-scale').adjustment.upper = _events.length;
  $('events-scale').adjustment.value = Math.min($('events-scale').adjustment.value, _events.length);
  if ($('replay-events-button').active && lastEvent && lastEvent.start !== undefined) {
    removeHighlights(b1, 'highlight');
    removeHighlights(b2, 'highlight');
    highlightRegion(b1, 'highlight', lastEvent.start, lastEvent.stop);
    highlightLine(b2, 'highlight', indexToLine(input, lastEvent.start));
  }

  _rerenderTimeoutId = 0;
  return false;
};

let renderEvents = function() {
  if (_rerenderTimeoutId != 0)
    Mainloop.source_remove(_rerenderTimeoutId);
  _rerenderTimeoutId = Mainloop.timeout_add(50, _rerenderEvents);
};

let addEvent = function(error, cmd) {
  if (error) {
    log('Server error: ' + error);
    return;
  }
  // Discard events from a previous run.
  if (cmd.id != _codeId)
    return;

  _events.push(cmd.event);
  renderEvents();
};

let resetEvents = function() {
  _events = [];
  $('events-scale').adjustment.upper = 0;
};

let sendCommand = null;
let restartHelper = function() {
  sendCommand = helperProcess.startServer('./js-emul-helper',
                                          addEvent,
                                          restartHelper);
};

restartHelper();

v1.buffer.connect('changed', function() {
  let input = b1.get_text(b1.get_start_iter(),
                          b1.get_end_iter(),
                          false);
  try {
    resetEvents();
    renderEvents();
    let translatedCode = translate(input);
    removeHighlights(b1, 'error');
    sendCommand({ code: translatedCode, id: ++_codeId });
    Utils.delayedSaveFile(filename, input);
  } catch (e) {
    log(e);
    if (e.idx)
      highlightTillEnd(b1, 'error', e.idx);
    $('error-label').label = 'Translation error: ' + e + ' line: ' + indexToLine(input, e.idx);
  }
});

let refreshUi = function() {
  $('events-scale').sensitive = $('replay-events-button').active;
  _rerenderEvents();
};

$('replay-events-button').connect('toggled', refreshUi);
$('numbers-hexa').connect('toggled', refreshUi);
$('numbers-binary').connect('toggled', refreshUi);
$('events-scale').adjustment.connect('value-changed', _rerenderEvents);
$('close-button').connect('clicked', Gtk.main_quit);

/**/

refreshUi();
v1.buffer.set_text(Utils.loadFile(filename), -1);

Gtk.main();
