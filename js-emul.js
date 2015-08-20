const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GtkSource = imports.gi.GtkSource;
const Mainloop = imports.mainloop;

const jsEmul = imports.jsEmul;
const Utils = imports.Utils;

if (ARGV.length < 1)
  throw new Error("Need at least one argument");

/*
  TODO: make this a lib...
 */
let startHelper = function(eventCallback, errorCallback) {
  const _DEBUG_IO = false;
  let _debugIo = function(pre, data) {
    if (_DEBUG_IO) log(pre + data);
  };

  let [success, pid, inputFd, outputFd, errorFd] =
      GLib.spawn_async_with_pipes(null,
                                  ['./js-emul-helper'],
                                  GLib.get_environ(),
                                  GLib.SpawnFlags.DEFAULT,
                                  null);
  log('input: ' + inputFd);
  log('output: ' + outputFd);
  log('error: ' + errorFd);
  let _inputStream = new Gio.UnixInputStream({ fd: outputFd,
                                               close_fd: true, });
  let _errorStream = new Gio.UnixInputStream({ fd: errorFd,
                                               close_fd: true, });
  let _outputStream = new Gio.UnixOutputStream({ fd: inputFd,
                                                 close_fd: true, });

  let _shutdownServer = function() {
    try {
      _inputStream.close(null);
      _outputStream.close(null);
      _errorStream.close(null);
      GLib.spawn_close_pid(pid);
    } catch (e) {}
    errorCallback();
  };

  let _readLine = function(stream, process) {
    stream.read_line_async(0, null, function(stream, res) {
      try {
        let [data, length] = stream.read_line_finish(res);
        if (length > 0) {
          _readLine(stream, process);
          process(data);
        } else {
          log('Server read error : ' + stream.base_stream.fd);
          //_readLine(stream, process);
          _shutdownServer();
        }
      } catch (error) {
        log('Server connection error : ' + error);
        _shutdownServer();
      }
    });
  };

  _readLine(Gio.DataInputStream.new(_inputStream), function(data) {
    try {
      _debugIo('IN: ', data);
      let cmd = JSON.parse(data);

      if (cmd.error) {
        let error = new Error();
        for (let i in cmd.error)
          error[i] = cmd.error[i];
        eventCallback(error);
      }
      else
        eventCallback(null, cmd);
    } catch (error) {
      log('Client: ' + error);
      log(error.stack);
    }
  }.bind(this));
  _readLine(Gio.DataInputStream.new(_errorStream), function(data) {
    log('Server: ' + data);
  }.bind(this));

  let sendCommand = function(cmd) {
    let data = JSON.stringify(cmd);
    _debugIo('OUT: ', data);
    _outputStream.write_all(data + '\n', null);
  };

  return sendCommand;
};

/**/

Gtk.init(null, null);

let errorLabel = new Gtk.Label({ visible: true });

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
    switch (event.type) {
    case 'event':
      return event.name + ' = ' + event.value;
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

  errorLabel.label = '';
  for (let i = 0; i < events.length; i++) {
    let ev = events[i];
    if (ev.type == 'error') {
      errorLabel.label = eventToString(ev)
      continue;
    }

    let line = indexToPosition(input, Math.round((ev.start + ev.stop) / 2));
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

let createView = function(args) {
  let view = new GtkSource.View();
  view.monospace = args.monospace;
  view.show_line_numbers = args.show_line_numbers;
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
let [v1, s1] = createView({ language: 'js', monospace: true, show_line_numbers: true });
let b1 = v1.buffer;
paned.add1(s1);
let [v2, s2] = createView({ language: 'js', monospace: true, show_line_numbers: false });
let b2 = v2.buffer;
paned.add2(s2);
paned.show();

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

let win = new Gtk.Window();
win.connect('destroy', Gtk.main_quit);

let box = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, visible: true });
win.add(box);

box.pack_start(paned, true, true, 0);
box.pack_start(errorLabel, false, false, 0);

win.show();

const WIDTH = 800
win.resize(WIDTH, 600);
paned.position = WIDTH / 2;

/**/

let _codeId = 0;
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

let sendCommand = null;
let restartHelper = function() {
  sendCommand = startHelper(addEvent, restartHelper);
};

restartHelper();

v1.buffer.connect('changed', function() {
  let input = b1.get_text(b1.get_start_iter(),
                          b1.get_end_iter(),
                          false);
  try {
    _events = [];
    renderEvents();
    let translatedCode = translate(input);
    removeHighlights(b1, 'error');
    sendCommand({ code: translatedCode, id: ++_codeId });
    Utils.delayedSaveFile(ARGV[0], input);
  } catch (e) {
    log(e);
    if (e.idx)
      highlightTillEnd(b1, 'error', e.idx);
    errorLabel.label = 'Translation error: ' + e + ' line: ' + indexToPosition(input, e.idx);
  }
});

/**/

v1.buffer.set_text(Utils.loadFile(ARGV[0]), -1);

Gtk.main();
