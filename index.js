const fs = require('fs');
const EventEmitter = require('events');
const bsplit = require('buffer-split');

const newLineBuffer = Buffer.from('\n', 'utf8');

function tailFile (path) {
  const eventEmitter = new EventEmitter();

  let buffer = Buffer.alloc(0);
  let lastBytePosition = 0;
  let bufferPosition = 0;
  let lineCount = 0;
  let stream;
  let hasMore = false;

  function parseBuffer () {
    const lines = bsplit(buffer, newLineBuffer, true);
    buffer = Buffer.alloc(0);

    lines.forEach(line => {
      if (!line.includes(newLineBuffer)) {
        buffer = Buffer.concat([line]);
        return;
      }

      lineCount = lineCount + 1;
      bufferPosition = bufferPosition + line.length;
      eventEmitter.emit('line', line.slice(0, -newLineBuffer.length).toString('utf8'), lineCount, bufferPosition);
    });
  }

  function readNextData () {
    if (stream) {
      hasMore = true;
      return;
    }

    hasMore = false;

    stream = fs.createReadStream(path, { highWaterMark: 10000000, start: lastBytePosition });

    stream.on('data', chunk => {
      lastBytePosition = lastBytePosition + chunk.length;
      buffer = Buffer.concat([buffer, chunk]);
      parseBuffer();
    });

    stream.on('end', () => {
      stream = null;

      if (hasMore) {
        readNextData();
      }
    });
  }

  const watcher = fs.watch(path, { encoding: 'buffer' }, (eventType, filename) => {
    if (filename) {
      readNextData();
    }
  });

  setTimeout(readNextData);

  return {
    _eventEmitter: eventEmitter,
    on: eventEmitter.addListener.bind(eventEmitter),
    off: eventEmitter.removeListener.bind(eventEmitter),
    close: (callback) => {
      watcher.close();
      if (stream) {
        stream.on('end', callback || (() => {}));
        stream.close();
        return;
      }

      callback && callback();
    }
  };
}

module.exports = tailFile;
