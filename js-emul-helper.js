const Gio = imports.gi.Gio;
const Mainloop = imports.mainloop;

const helperProcess = imports.helperProcess;

log('starting!');

let sendEvent = null;

let toFunction = function(code) {
  return eval('(function () {return function($v, $e) {' + code + '};})()');
};

let runFunction = function(runId, func) {
  let v = function(start, stop, name, value) {
    if (typeof value !== 'function') {
      sendEvent(runId, { type: 'event', start: start, stop: stop, name: name, value: value });
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

/**/

let sendCommand = helperProcess.startListener(
  function(message) {
    try {
      runFunction(message.id, toFunction(message.code));
    } catch (e) {
      log('function error: ' + e);
      if (!e.runtime) {
        sendEvent(message.id, { type: 'error', error: { message: e.message }});
      }
    }
  },
  function(error) {
    log(error.message);
    Mainloop.quit('js-emul-helper');
  });

sendEvent = function(id, event) {
  sendCommand({id: id, event: event});
};


Mainloop.run('js-emul-helper');
