const fs = require('fs');
const EventEmitter = require('events');
const bsplit = require('buffer-split');

const newLineBuffer = Buffer.from('\n', 'utf8');

function tailFile (path) {
  const eventEmitter = new EventEmitter();
  let lastBytePosition = 0;
  let chunks = Buffer.alloc(0);
  let lineCount = 0;
  let bufferPosition = 0;
  let stream;

  function readNextData () {
    stream = fs.createReadStream(path, { start: lastBytePosition });
    stream.on('data', chunk => {
      chunks = Buffer.concat([chunks, chunk]);

      const chunkLines = bsplit(chunks, newLineBuffer);

      const complete = chunkLines.slice(0, -1);
      const remains = chunkLines.slice(-1);

      complete.forEach(line => {
        lineCount = lineCount + 1;
        bufferPosition = bufferPosition + line.length + newLineBuffer.length;
        eventEmitter.emit('line', line.toString('utf8'), lineCount, bufferPosition);
      });

      chunks = remains[0];
    });

    stream.on('end', () => {
      lastBytePosition = lastBytePosition + stream.bytesRead;
      stream = null;
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
