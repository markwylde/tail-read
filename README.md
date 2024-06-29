# Tail Read
Read the contents of a file and keep it open, streaming changes.

```javascript
import tailRead from 'tail-read';

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
