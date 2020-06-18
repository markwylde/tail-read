const fs = require('fs');
const test = require('tape');
const tailRead = require('../');

test('can tail a file', t => {
  t.plan(1);

  fs.writeFileSync('/tmp/test.txt', 'one\n');

  const tail = tailRead('/tmp/test.txt');

  tail.on('line', function (data) {
    t.equal(data, 'one');
    tail.close();
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
    lines.push(data);
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
    lines.push(data);
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
    readLines.push(data + '\n');
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
    readLines.push(data + '\n');
  });

  setTimeout(function () {
    intervals.forEach(interval => clearInterval(interval));

    setTimeout(() => {
      tail.close();

      t.equal(writtenLines.length, readLines.length);
      t.deepEqual(writtenLines.sort(), readLines.sort());
    }, 100);
  }, 1000);
});
