const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GtkSource = imports.gi.GtkSource;
const Mainloop = imports.mainloop;

const jsEmul = imports.jsEmul;

if (ARGV.length < 1)
  throw new Error("Need at least one argument");

let loadFile = function(path) {
  let file = Gio.File.new_for_path(path);
  let [, source] = file.load_contents(null);
  return '' + source;
};

/*
  TODO: make this a lib...
 */

const _DEBUG_IO = false;
let _debugIo = function(pre, data) {
  if (_DEBUG_IO) log(pre + data);
};

let _readLine = function(stream, process) {
  stream.read_line_async(0, null, function(stream, res) {
    try {
      let [data, length] = stream.read_line_finish(res);
      if (length > 0) {
        _readLine(stream, process);
        process(data);
      } else
        log('Server gone');
    } catch (error) {
      log('Server connection error : ' + error);
    }
  });
};

let _outputStream = null;

let sendCommand = function(cmd) {
  let data = JSON.stringify(cmd);
  _debugIo('OUT: ', data);
  _outputStream.write_all(data + '\n', null);
};

let startHelper = function(callback) {
  let [success, pid, inputFd, outputFd, errorFd] =
      GLib.spawn_async_with_pipes(null,
                                  ['./js-emul-helper'],
                                  GLib.get_environ(),
                                  GLib.SpawnFlags.DEFAULT,
                                  null);
  let _inputStream = new Gio.UnixInputStream({ fd: outputFd,
                                               close_fd: true, });
  let _errorStream = new Gio.UnixInputStream({ fd: errorFd,
                                               close_fd: true, });
  _outputStream = new Gio.UnixOutputStream({ fd: inputFd,
                                             close_fd: true, });

  _readLine(Gio.DataInputStream.new(_inputStream), function(data) {
    try {
      _debugIo('IN: ', data);
      let cmd = JSON.parse(data);

      if (cmd.error) {
        let error = new Error();
        for (let i in cmd.error)
          error[i] = cmd.error[i];
        callback(error);
      }
      else
        callback(null, cmd);
    } catch (error) {
      log('Client: ' + error);
      log(error.stack);
    }
  }.bind(this));
  _readLine(Gio.DataInputStream.new(_errorStream), function(data) {
    log('Server: ' + data);
  }.bind(this));

};

/**/

let translate = function(input) {
  let structure = jsEmul.BSJSParser.matchAllStructure(input, 'topLevel', undefined);
  let code = jsEmul.BSJSTranslator.match(structure.value, 'trans', undefined);
  return code;
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
    let line = indexToPosition(input, Math.round((ev.start + ev.stop) / 2));
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
  try {
    return eventsToString(input, runFunction(toFunction(translate(input))));
  } catch (e) {
    if (e.evs)
      return eventsToString(input, e.evs);
    throw e;
  }
};

/**/

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
let [v1, s1] = createView({ language: 'js', monospace: true });
let b1 = v1.buffer;
paned.add1(s1);
let [v2, s2] = createView({ language: 'js', monospace: true });
let b2 = v2.buffer;
paned.add2(s2);
paned.show();

let addHighlightTag = function(buffer) {
  let tag_table = buffer.get_tag_table();
  let tag = new Gtk.TextTag({ name: 'highlight',
                              background: '#fde5f6' });
  tag_table.add(tag);
};
addHighlightTag(v1.buffer);
addHighlightTag(v2.buffer);

let highlightLine = function(buffer, line) {
  buffer.remove_tag_by_name('highlight', buffer.get_start_iter(), buffer.get_end_iter());
  buffer.apply_tag_by_name('highlight',
                           buffer.get_iter_at_line(line),
                           buffer.get_iter_at_line(line + 1));
};

let genMoveLineCursorFunc = function(from, to) {
  return function() {
    let fromIter = from.get_iter_at_offset(from.cursor_position);
    highlightLine(from, fromIter.get_line());
    highlightLine(to, fromIter.get_line());
  };
};

v1.buffer.connect('notify::cursor-position', genMoveLineCursorFunc(v1.buffer, v2.buffer));
v2.buffer.connect('notify::cursor-position', genMoveLineCursorFunc(v2.buffer, v1.buffer));

let win = new Gtk.Window();
win.connect('destroy', Gtk.main_quit);
win.add(paned);
win.show();

const WIDTH = 800
win.resize(WIDTH, 600);
paned.position = WIDTH / 2;

/**/

let _events = [];
let _rerenderTimeoutId = 0;
let _rerenderEvents = function() {
  let input = b1.get_text(b1.get_start_iter(),
                          b1.get_end_iter(),
                          false);
  v2.buffer.set_text(eventsToString(input, _events), -1);

  _rerenderTimeoutId = 0;
  return false;
};

let addEvent = function(error, cmd) {
  if (error) {
    log('Server error: ' + error);
    return;
  }
  _events.push(cmd.event);

  if (_rerenderTimeoutId != 0)
    Mainloop.source_remove(_rerenderTimeoutId);
  _rerenderTimeoutId = Mainloop.timeout_add(50, _rerenderEvents);
};

startHelper(addEvent)

v1.buffer.connect('changed', function() {
  try {
    let input = b1.get_text(b1.get_start_iter(),
                            b1.get_end_iter(),
                            false);
    _events = [];
    sendCommand({ code: translate(input) });
  } catch (e) {
    log('Translation error: ' + e);
  }
});

/**/

v1.buffer.set_text(loadFile(ARGV[0]), -1);

Gtk.main();
