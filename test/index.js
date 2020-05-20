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
  t.plan(1);

  fs.writeFileSync('/tmp/test.txt', 'one\n');
  const interval = setInterval(() => {
    fs.writeFileSync('/tmp/test.txt', 'two\n', { flag: 'a' });
  }, 30);

  const tail = tailRead('/tmp/test.txt');

  const lines = [];
  tail.on('line', function (data) {
    lines.push(data);
    if (lines.length > 1) {
      t.deepEqual(lines, ['one', 'two']);
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
