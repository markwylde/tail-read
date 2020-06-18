const ts = require('tail-stream');
const bsplit = require('buffer-split');

const EventEmitter = require('events');

const defaultNewLineBuffer = Buffer.from('\n', 'utf8');

function tailFile (path, newLineBuffer = defaultNewLineBuffer) {
  const eventEmitter = new EventEmitter();

  let buffer = Buffer.alloc(0);
  let bufferPosition = 0;
  let lineCount = 0;

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

  const stream = ts.createReadStream(path, {
    beginAt: 0,
    onMove: 'follow',
    detectTruncate: true,
    onTruncate: 'end',
    endOnError: false
  });

  stream.on('data', chunk => {
    buffer = Buffer.concat([buffer, chunk]);
    parseBuffer();
  });

  return {
    _eventEmitter: eventEmitter,
    on: eventEmitter.addListener.bind(eventEmitter),
    off: eventEmitter.removeListener.bind(eventEmitter),
    close: (callback) => {
      stream.on('end', callback || (() => {}));
      stream.end();
    }
  };
}

module.exports = tailFile;
