const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

/* Call this from the UI. */
let startServer = function(binary, eventCallback, errorCallback) {
  const _DEBUG_IO = false;
  let _debugIo = function(pre, data) {
    if (_DEBUG_IO) log(pre + data);
  };

  let [success, pid, inputFd, outputFd, errorFd] =
      GLib.spawn_async_with_pipes(null,
                                  [binary],
                                  GLib.get_environ(),
                                  GLib.SpawnFlags.DEFAULT,
                                  null);
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

/* Call this from the helper. */
let startListener = function(messageCallback, errorCallback) {
  let inputStream = new Gio.UnixInputStream({ fd: 0,
                                              close_fd: false, });
  let outpuStream = new Gio.UnixOutputStream({ fd: 1,
                                               close_fd: false, });
  let inputDataStream = Gio.DataInputStream.new(inputStream);

  let readLine = null, gotLine = null;
  gotLine = function(stream, res) {
    try {
      let [data, length] = inputDataStream.read_line_finish(res);
      if (length > 0) {
        readLine();
        messageCallback(JSON.parse(data));
      } else {
        throw new Error('Error reading input stream');
      }
    } catch (e) {
      errorCallback(e);
    }
  };
  readLine = function() {
    inputDataStream.read_line_async(0, null, gotLine.bind(this));
  };
  readLine();

  let sendCommand = function(cmd) {
    outpuStream.write_all(JSON.stringify(cmd) + '\n', null);
  };

  return sendCommand;
};
