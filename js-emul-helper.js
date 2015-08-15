const Gio = imports.gi.Gio;
const Mainloop = imports.mainloop;

log('server starting!');

let inputStream = new Gio.UnixInputStream({ fd: 0,
                                            close_fd: false, });
let outpuStream = new Gio.UnixOutputStream({ fd: 1,
                                             close_fd: false, });
let inputDataStream = Gio.DataInputStream.new(inputStream);

let sendEvent = function(event) {
  outpuStream.write_all(JSON.stringify({event: event}) + '\n', null);
};

let toFunction = function(code) {
  return eval('(function () {return function($e) {' + code + '};})()');
};

let runFunction = function(func) {
  let evs = [];
  let ev = function(start, stop, name, value) {
    if (evs.length > 1000) {
      let error = new Error('Infinite loop');
      error.evs = evs;
      throw error;
    }
    if (typeof value !== 'function') {
      sendEvent({ type: 'event', start: start, stop: stop, name: name, value: JSON.stringify(value) });
    }
    return value;
  };
  func(ev);
  return evs;
};

let handleCommand = function(cmd) {
  try {
    runFunction(toFunction(cmd.code));
  } catch (e) {
    let error = {};
    for (let i in e)
      error[i] = e[i];
    error.message = e.message;
    sendEvent({ type: 'error', error: error });
  }
};

let readLine = null, gotLine = null;
gotLine = function(stream, res) {
  let [data, length] = inputDataStream.read_line_finish(res);
  if (length > 0) {
    readLine();
    handleCommand(JSON.parse(data));
  } else
    Mainloop.quit('ui-helper');
};
readLine = function() {
  inputDataStream.read_line_async(0, null, gotLine.bind(this));
};

readLine();
Mainloop.run('ui-helper');
