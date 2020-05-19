const fs = require('fs')
const test = require('tape')
const tailRead = require('../')

test('can tail a file', t => {
  t.plan(1)

  fs.writeFileSync('/tmp/test.txt', 'one\n')

  const tail = tailRead('/tmp/test.txt');

  tail.on('line', function(data) {
    t.equal(data, 'one')
    tail.close()
  });
})

test('close before new line', t => {
  t.plan(1)

  fs.writeFileSync('/tmp/test.txt', 'one')

  const tail = tailRead('/tmp/test.txt');

  tail.close()

  t.pass()
})
