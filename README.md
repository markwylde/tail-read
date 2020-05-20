# Tail Read
[![Build Status](https://travis-ci.org/markwylde/tail-read.svg?branch=master)](https://travis-ci.org/markwylde/tail-read)
[![David DM](https://david-dm.org/markwylde/tail-read.svg)](https://david-dm.org/markwylde/tail-read)
![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/markwylde/tail-read)
[![GitHub package.json version](https://img.shields.io/github/package-json/v/markwylde/tail-read)](https://github.com/markwylde/tail-read/releases)
[![GitHub](https://img.shields.io/github/license/markwylde/tail-read)](https://github.com/markwylde/tail-read/blob/master/LICENSE)

Read the contents of a file and keep it open, streaming changes.

```javascript
const tailRead = require('tail-read');

const tail = tailRead('./test.txt');

tail.on('line', function(data, lineNumber, bufferPosition) {
  console.log('Appended data: ', data)
  console.log('Line number: ', lineNumber)
  console.log('Buffer position: ', bufferPosition)
});

setTimeout(function () {
  tail.close()
  console.log('closed')
}, 5000)
```
