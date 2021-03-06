const fs = require('fs');
const test = require('tape');
const tailRead = require('../');

test('will not output incomplete line', t => {
  t.plan(1);

  fs.writeFileSync('/tmp/test.txt', 'one');

  const tail = tailRead('/tmp/test.txt');

  tail.on('line', function (data) {
    t.fail();
  });

  setTimeout(() => {
    tail.close();
    t.pass();
  }, 100);
});

test('can tail a file', t => {
  t.plan(1);

  fs.writeFileSync('/tmp/test.txt', 'one\ntwo\n');

  const tail = tailRead('/tmp/test.txt');

  const lines = [];
  tail.on('line', function (data) {
    lines.push(data.toString('utf8'));
    if (lines.length === 2) {
      t.deepEqual(lines, ['one', 'two']);
      tail.close();
    }
  });
});

test('can tail a file with custom delimiter', t => {
  t.plan(1);

  fs.writeFileSync('/tmp/test.txt', 'one-two-');

  const tail = tailRead('/tmp/test.txt', Buffer.from('-'));

  const lines = [];
  tail.on('line', function (data) {
    lines.push(data.toString('utf8'));
    if (lines.length === 2) {
      t.deepEqual(lines, ['one', 'two']);
      tail.close();
    }
  });
});

test('can tail a file with added data', t => {
  t.plan(3);

  fs.writeFileSync('/tmp/test.txt', 'one\n');
  const interval = setInterval(() => {
    fs.writeFileSync('/tmp/test.txt', 'two\n', { flag: 'a' });
  }, 30);

  const tail = tailRead('/tmp/test.txt');

  const lines = [];
  tail.on('line', function (data, lineNumber, bufferPosition) {
    lines.push(data.toString('utf8'));
    if (lines.length > 1) {
      t.deepEqual(lines, ['one', 'two']);
      t.equal(lineNumber, 2);
      t.equal(bufferPosition, 8);
      clearInterval(interval);
      tail.close();
    }
  });
});

test('tail then close immediatly', t => {
  t.plan(1);

  fs.writeFileSync('/tmp/test.txt', 'one\n');
  const interval = setInterval(() => {
    fs.writeFile('/tmp/test.txt', 'two\n', { flag: 'a' }, () => {});
  }, 30);

  const tail = tailRead('/tmp/test.txt');

  const lines = [];
  tail.on('line', function (data) {
    lines.push(data.toString('utf8'));
  });

  setTimeout(() => {
    clearInterval(interval);
    tail.close();
    t.pass();
  }, 300);
});

test('close before new line', t => {
  t.plan(1);

  fs.writeFileSync('/tmp/test.txt', 'one');

  const tail = tailRead('/tmp/test.txt');

  tail.close();

  t.pass();
});

test('close calls callback', t => {
  t.plan(1);

  fs.writeFileSync('/tmp/test.txt', 'one');

  const tail = tailRead('/tmp/test.txt');

  tail.close(t.pass);
});

test('low stress test', t => {
  t.plan(2);

  fs.writeFileSync('/tmp/test.txt', '');
  const writtenLines = [];

  const interval = setInterval(() => {
    const line = `hello at ${Date.now()}\n`;
    writtenLines.push(line);
    fs.writeFileSync('/tmp/test.txt', line, { flag: 'a' });
  }, 1);

  const tail = tailRead('/tmp/test.txt');

  const readLines = [];
  tail.on('line', function (data, lineNumber, bufferPosition) {
    readLines.push(data.toString('utf8') + '\n');
  });

  setTimeout(function () {
    clearInterval(interval);

    setTimeout(() => {
      tail.close();
      t.equal(writtenLines.length, readLines.length);
      t.deepEqual(writtenLines.sort(), readLines.sort());
    }, 30);
  }, 100);
});

test('high stress test', t => {
  t.plan(2);

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
  tail.on('line', function (data, lineNumber, bufferPosition) {
    readLines.push(data.toString('utf8') + '\n');
  });

  setTimeout(function () {
    intervals.forEach(interval => clearInterval(interval));

    setTimeout(() => {
      tail.close();

      t.equal(writtenLines.length, readLines.length);
      t.deepEqual(writtenLines.sort(), readLines.sort());
    }, 1000);
  }, 2000);
});
