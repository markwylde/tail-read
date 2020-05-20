const fs = require('fs');
const EventEmitter = require('events');

function streamFile (addCloseHook, path, eventEmitter, lastPosition = 0, chunks = '') {
  let more = false;
  let ended = false;
  let closing = false;

  function again () {
    if (closing) {
      return;
    }
    if (ended && more) {
      streamFile(addCloseHook, path, eventEmitter, lastPosition + stream.bytesRead, chunks);
    }
  }

  const watcher = fs.watch(path, function (event) {
    watcher.close();
    more = true;

    again();
  });

  addCloseHook(function (callback) {
    closing = true;
    watcher.close();
    stream.destroy();

    callback && callback();
  });

  const stream = fs.createReadStream(path, { start: lastPosition });

  stream.on('data', chunk => {
    chunks = chunks + chunk.toString('utf8');
    const chunkLines = chunks.split('\n');

    const complete = chunkLines.slice(0, -1);
    const remains = chunkLines.slice(-1);

    complete.forEach(line => {
      eventEmitter.emit('line', line);
    });

    chunks = remains;
  });

  stream.on('end', () => {
    ended = true;
    again();
  });
}

function tailFile (path) {
  const eventEmitter = new EventEmitter();

  let closeHook;
  function addCloseHook (fn) {
    closeHook = fn;
  }

  streamFile(addCloseHook, path, eventEmitter);

  return {
    _eventEmitter: eventEmitter,
    on: eventEmitter.addListener.bind(eventEmitter),
    off: eventEmitter.addListener.bind(eventEmitter),
    close: (callback) => closeHook(callback)
  };
}

module.exports = tailFile;
