import { test } from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert';
import tailRead from '../index.js';

test('emits error for non-existent file', async (t) => {
  const tail = tailRead('/tmp/non-existent-file.txt');
  await new Promise((resolve) => {
    tail.on('error', (err) => {
      assert.ok(err instanceof Error);
      tail.close();
      resolve();
    });
  });
});

test('handles file permission errors', async (t) => {
  fs.writeFileSync('/tmp/no-read-permission.txt', 'test\n');
  fs.chmodSync('/tmp/no-read-permission.txt', 0o222);
  const tail = tailRead('/tmp/no-read-permission.txt');
  await new Promise((resolve) => {
    tail.on('error', (err) => {
      assert.ok(err instanceof Error);
      tail.close();
      resolve();
    });
  });
});

test('handles file truncation', async (t) => {
  fs.writeFileSync('/tmp/test.txt', 'one\ntwo\nthree\n');
  const tail = tailRead('/tmp/test.txt');
  const lines = [];
  await new Promise((resolve) => {
    tail.on('line', (data) => {
      lines.push(data.toString('utf8'));
      if (lines.length === 3) {
        assert.deepStrictEqual(lines, ['one', 'two', 'three']);
        fs.writeFileSync('/tmp/test.txt', 'new\n');
        setTimeout(() => {
          assert.deepStrictEqual(lines, ['one', 'two', 'three', 'new']);
          tail.close();
          resolve();
        }, 100);
      }
    });
  });
  await new Promise((resolve) => setTimeout(resolve, 500));
});

test('handles rapid file changes', async (t) => {
  fs.writeFileSync('/tmp/rapid-test.txt', '');
  const tail = tailRead('/tmp/rapid-test.txt');
  let lineCount = 0;
  tail.on('line', () => lineCount++);
  for (let i = 0; i < 1000; i++) {
    fs.appendFileSync('/tmp/rapid-test.txt', `line ${i}\n`);
  }
  await new Promise((resolve) => setTimeout(() => {
    assert.strictEqual(lineCount, 1000);
    tail.close();
    resolve();
  }, 1000));
});

test('will not output incomplete line', async (t) => {
  fs.writeFileSync('/tmp/test.txt', 'one');
  const tail = tailRead('/tmp/test.txt');
  await new Promise((resolve) => {
    tail.on('line', () => {
      assert.fail();
    });
    setTimeout(() => {
      tail.close();
      resolve();
    }, 100);
  });
});

test('can tail a file', async (t) => {
  fs.writeFileSync('/tmp/test.txt', 'one\ntwo\n');
  const tail = tailRead('/tmp/test.txt');
  const lines = [];
  await new Promise((resolve) => {
    tail.on('line', (data) => {
      lines.push(data.toString('utf8'));
      if (lines.length === 2) {
        assert.deepStrictEqual(lines, ['one', 'two']);
        tail.close();
        resolve();
      }
    });
  });
});

test('can tail a file with custom delimiter', async (t) => {
  fs.writeFileSync('/tmp/test.txt', 'one-two-');
  const tail = tailRead('/tmp/test.txt', Buffer.from('-'));
  const lines = [];
  await new Promise((resolve) => {
    tail.on('line', (data) => {
      lines.push(data.toString('utf8'));
      if (lines.length === 2) {
        assert.deepStrictEqual(lines, ['one', 'two']);
        tail.close();
        resolve();
      }
    });
  });
});

test('can tail a file with added data', async (t) => {
  fs.writeFileSync('/tmp/test.txt', 'one\n');
  const interval = setInterval(() => {
    fs.writeFileSync('/tmp/test.txt', 'two\n', { flag: 'a' });
  }, 30);
  const tail = tailRead('/tmp/test.txt');
  const lines = [];
  await new Promise((resolve) => {
    tail.on('line', (data, lineNumber, bufferPosition) => {
      lines.push(data.toString('utf8'));
      if (lines.length > 1) {
        assert.deepStrictEqual(lines, ['one', 'two']);
        assert.strictEqual(lineNumber, 2);
        assert.strictEqual(bufferPosition, 8);
        clearInterval(interval);
        tail.close();
        resolve();
      }
    });
  });
});

test('tail then close immediately', async (t) => {
  fs.writeFileSync('/tmp/test.txt', 'one\n');
  const interval = setInterval(() => {
    fs.writeFile('/tmp/test.txt', 'two\n', { flag: 'a' }, () => {});
  }, 30);
  const tail = tailRead('/tmp/test.txt');
  const lines = [];
  tail.on('line', (data) => {
    lines.push(data.toString('utf8'));
  });
  await new Promise((resolve) => setTimeout(() => {
    clearInterval(interval);
    tail.close();
    resolve();
  }, 300));
});

test('close before new line', async (t) => {
  fs.writeFileSync('/tmp/test.txt', 'one');
  const tail = tailRead('/tmp/test.txt');
  tail.close();
});

test('close calls callback', async (t) => {
  fs.writeFileSync('/tmp/test.txt', 'one');
  const tail = tailRead('/tmp/test.txt');
  await new Promise((resolve) => {
    tail.close(() => {
      resolve();
    });
  });
});

test('low stress test', async (t) => {
  fs.writeFileSync('/tmp/test.txt', '');
  const writtenLines = [];
  const interval = setInterval(() => {
    const line = `hello at ${Date.now()}\n`;
    writtenLines.push(line);
    fs.writeFileSync('/tmp/test.txt', line, { flag: 'a' });
  }, 1);
  const tail = tailRead('/tmp/test.txt');
  const readLines = [];
  tail.on('line', (data) => {
    readLines.push(data.toString('utf8') + '\n');
  });
  await new Promise((resolve) => setTimeout(() => {
    clearInterval(interval);
    setTimeout(() => {
      tail.close();
      assert.strictEqual(writtenLines.length, readLines.length);
      assert.deepStrictEqual(writtenLines.sort(), readLines.sort());
      resolve();
    }, 30);
  }, 100));
});

test('high stress test', async (t) => {
  fs.writeFileSync('/tmp/test.txt', '');
  const writtenLines = [];
  const intervals = [];
  for (let worker = 0; worker < 1000; worker++) {
    const interval = setInterval(() => {
      const line = `hello at ${Date.now()}\n`;
      writtenLines.push(line);
      fs.writeFileSync('/tmp/test.txt', line, { flag: 'a' });
    }, 1);
    intervals.push(interval);
  }
  const tail = tailRead('/tmp/test.txt');
  const readLines = [];
  tail.on('line', (data) => {
    readLines.push(data.toString('utf8') + '\n');
  });
  await new Promise((resolve) => setTimeout(() => {
    intervals.forEach((interval) => clearInterval(interval));
    setTimeout(() => {
      tail.close();
      assert.strictEqual(writtenLines.length, readLines.length);
      assert.deepStrictEqual(writtenLines.sort(), readLines.sort());
      resolve();
    }, 1000);
  }, 2000));
});
