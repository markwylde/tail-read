# Tail Read
Read the contents of a file and keep it open, streaming changes.

```javascript
const tailRead = require('tail-read');

const tail = tailRead('./test.txt');

tail.on('line', function(data) {
  console.log(data)
});

setTimeout(function () {
  tail.close()
  console.log('closed')
}, 5000)
```
