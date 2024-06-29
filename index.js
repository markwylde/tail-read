import fs from 'fs';
import EventEmitter from 'events';

function tailRead(filePath, delimiter = Buffer.from('\n')) {
  const emitter = new EventEmitter();
  let watcher;
  let buffer = Buffer.alloc(0);
  let lineNumber = 0;
  let bufferPosition = 0;
  let fileSize = 0;
  let reading = false;
  let closed = false;
  let errorEmitted = false;

  function readFile() {
    if (reading || closed) return;
    reading = true;

    fs.stat(filePath, (err, stats) => {
      if (err) {
        reading = false;
        handleError(err);
        return;
      }

      if (stats.size < fileSize) {
        // File has been truncated
        fileSize = 0;
        buffer = Buffer.alloc(0);
        lineNumber = 0;
        bufferPosition = 0;
        emitter.emit('truncate');
      }

      if (stats.size > fileSize) {
        const stream = fs.createReadStream(filePath, { start: fileSize });
        stream.on('error', handleError);
        stream.on('data', (chunk) => {
          processData(chunk);
          fileSize += chunk.length;
        });
        stream.on('end', () => {
          reading = false;
          if (stats.size > fileSize && !closed) {
            setImmediate(readFile);
          }
        });
      } else {
        reading = false;
      }
    });
  }

  function processData(data) {
    buffer = Buffer.concat([buffer, data]);
    let delimiterIndex;

    while ((delimiterIndex = buffer.indexOf(delimiter)) !== -1) {
      const line = buffer.slice(0, delimiterIndex);
      buffer = buffer.slice(delimiterIndex + delimiter.length);
      lineNumber++;
      bufferPosition += line.length + delimiter.length;
      emitter.emit('line', line.toString(), lineNumber, bufferPosition);
    }
  }

  function watchFile() {
    if (closed) return;

    try {
      watcher = fs.watch(filePath, (eventType) => {
        if (eventType === 'change' && !closed) {
          readFile();
        }
      });
      watcher.on('error', handleError);

      if (closed) {
        watcher.close();
      }
    } catch (err) {
      handleError(err);
    }
  }

  function handleError(err) {
    if (!closed && !errorEmitted) {
      errorEmitted = true;
      emitter.emit('error', err);
    }
  }

  process.nextTick(() => {
    if (!closed) {
      readFile();
      watchFile();
    }
  });

  emitter.close = (callback) => {
    closed = true;
    if (watcher) {
      watcher.close();
    }
    if (callback) {
      process.nextTick(callback);
    }
  };

  return emitter;
}

export default tailRead;
