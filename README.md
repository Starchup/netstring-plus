# Netstring Plus

A netstring+ encoder/decoder, based on the C# implementation: https://github.com/mtstickney/sync/tree/sync.dotnetstringplus.master/NetstringPlus

#### Installation

npm install netstring-plus


#### Example

```
const netstring = require('netstring-plus');

const options = {
	delimiter: ':', //default value, separates header from payload
	trailing: '\n' //default value, signifies end of payload
};
const decoder = new netstring.Decoder(options);
const encoder = new netstring.Encoder(options);

//Read netstring data
socket.on('data', (data) => {
	decoder.pumpArray(data);
	if(decoder.state === 'complete')
	{
		//Do something with data
		const byteArray = decoder.getLatestMessage();
	}
})

//Frame netstring data
const message = Encoder.encode(SOME_DATA);
socket.write(new Buffer(message.buffer));
```