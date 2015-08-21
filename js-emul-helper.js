const Gio = imports.gi.Gio;
const Mainloop = imports.mainloop;

log('starting!');

let inputStream = new Gio.UnixInputStream({ fd: 0,
                                            close_fd: false, });
let outpuStream = new Gio.UnixOutputStream({ fd: 1,
                                             close_fd: false, });
let inputDataStream = Gio.DataInputStream.new(inputStream);

let sendEvent = function(id, event) {
  outpuStream.write_all(JSON.stringify({id: id, event: event}) + '\n', null);
};

let toFunction = function(code) {
  return eval('(function () {return function($v, $e) {' + code + '};})()');
};

let runFunction = function(runId, func) {
  let v = function(start, stop, name, value) {
    if (typeof value !== 'function') {
      sendEvent(runId, { type: 'event', start: start, stop: stop, name: name, value: JSON.stringify(value) });
    }
    return value;
  };
  let events = {};
  let e = function(start, stop, name) {
    let id = name + '-' + start + '-' + stop;
    if (events[id] !== undefined)
      events[id]++
    else
      events[id] = 0;
    if (events[id] > 1000) {
      sendEvent(runId, { type: 'runtime-error', start: start, stop: stop, error: { message: 'Infinite loop' }});
      let err = new Error('Infinite loop');
      err.runtime = true;
      throw err;
    }
  };
  func(v, e);
};

let handleCommand = function(cmd) {
  try {
    runFunction(cmd.id, toFunction(cmd.code));
  } catch (e) {
    log('function error: ' + e);
    if (!e.runtime) {
      sendEvent(cmd.id, { type: 'error', error: { message: e.message }});
    }
  }
};

let readLine = null, gotLine = null;
gotLine = function(stream, res) {
  try {
    let [data, length] = inputDataStream.read_line_finish(res);
    if (length > 0) {
      readLine();
      handleCommand(JSON.parse(data));
    } else {
      throw new Error('Error reading input stream');
    }
  } catch (e) {
    log('quitting: ' + e.message);
    Mainloop.quit('js-emul-helper');
  }
};
readLine = function() {
  inputDataStream.read_line_async(0, null, gotLine.bind(this));
};

readLine();
Mainloop.run('js-emul-helper');
