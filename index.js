'use strict';

const defaultOptions = {
    delimiter: ':',
    trailing: '\n',
};

class Decoder {
    constructor(opts) {
        const options = opts || {};
        this.delimiter = options.delimiter || defaultOptions.delimiter;
        this.trailing = options.trailing || defaultOptions.trailing;

        //Initialize a blank decoder

        //String, may be 'initial', 'header', 'data', 'endOfData', 'complete'
        this.state = 'initial';
        //Int
        this.dataSize = 0;
        //Int
        this.dataPos = 0;
        //Uint8Array buffer
        this.data = null;
        //Array of Uint8Array buffers
        this.messages = [];
    }

    //Reset state and data, does not clear messages
    reset() {
        this.state = 'initial';
        this.dataSize = 0;
        this.dataPos = 0;
        this.data = null;
    }

    //Clear out the message cache
    clearMessages() {
        this.messages = [];
    }

    getData() {
        return this.data;
    }

    getMessages() {
        return this.messages;
    }

    getLatestMessage() {
        return this.messages[this.messages.length - 1];
    }

    addHeaderDigit(digit) {
        this.dataSize = this.dataSize * 16 + digit;
    }

    //Update the decoders current state and check appropriate transitions
    transitionState(toState) {
        const stateError = new Error(`Incorrect state transition: ${this.state} to ${toState}`);
        switch (toState) {
            case 'initial':
                throw stateError;
                break;
            case 'header':
                if (this.state !== 'initial') throw stateError;
                break;
            case 'data':
                if (this.state !== 'header') throw stateError;
                break;
            case 'endOfData':
                if (this.state !== 'data' && this.state !== 'header') throw stateError;
                break;
            case 'complete':
                if (this.state !== 'endOfData') throw stateError;
                break;
            default:
                throw new Error(`${toState} is not a valid NetstringPlus Decoder state`);
        }
        this.state = toState;
    }

    //Reads byte and determines state transitions/data additions
    pumpByte(b) {
        const strByte = String.fromCharCode(b);
        switch (this.state) {
            case 'initial':
            case 'header':
                const n = asciiHexDigit(strByte);
                if (strByte === this.delimiter) {
                    if (this.state == 'initial') {
                        throw new Error('Netstring header is empty');
                    } else if (this.dataSize === 0) {
                        this.dataPos = 0;
                        this.transitionState('endOfData');
                    } else {
                        this.dataPos = 0;
                        this.data = Buffer.from(new ArrayBuffer(this.dataSize));
                        this.transitionState('data');
                    }
                } else if (n < 0) throw new Error(`Invalid header character '${strByte}'`);
                else {
                    this.addHeaderDigit(n);
                    if (this.state === 'initial') this.transitionState('header');
                }
                break;

            case 'data':
                this.data[this.dataPos++] = b;
                if (this.dataPos === this.dataSize) this.transitionState('endOfData');
                break;

            case 'endOfData':
                if (strByte !== this.trailing) throw new Error(`Too much data in netstring, character is ${strByte}`);
                else this.transitionState('complete');
                break;

            case 'complete':
                throw new Error("Decoder is already complete");

        }
    }

    //Main decoder method
    pumpArray(array, start = 0, end = null, count = null) {
        let i = 0;
        if (end == null) end = array.length;

        while (start < end && (count == null || i < count)) {
            const b = array[start];

            // If the decoder is already complete, get a fresh state.
            if (this.state === 'complete') {
                this.reset();
            }

            this.pumpByte(b);
            start++;

            if (this.state === 'complete') {
                this.messages.push(this.data);
                i++;
            }
        }
    }
}

class Encoder {
    constructor(opts) {
        const options = opts || {};
        this.delimiter = options.delimiter || defaultOptions.delimiter;
        this.trailing = options.trailing || defaultOptions.trailing;
    }

    encode(payload) {
        // Headers are in hexadecimal.
        var headerBytes = encodeUtf8(payload.length.toString(16) + this.delimiter);
        var bytes = concatBytes(headerBytes, payload, encodeUtf8(this.trailing));
        return bytes;
    }
}

/* Utilities */

// Encode to a utf8 string, then to a byte array.
function encodeUtf8(s) {
    var utf8Str = unescape(encodeURIComponent(s))
    return utf8ToBytes(utf8Str);
}

function utf8ToBytes(s) {
    var buf = new ArrayBuffer(s.length);
    var bufView = new Uint8Array(buf);
    for (var i = 0; i < s.length; i++) {
        bufView[i] = s.charCodeAt(i);
    }
    return bufView;
}

/** 
 * Return a new Uint8Array that is the concatenation
 * of the arguments.
 */
function concatBytes() {
    var length = 0;
    for (i in arguments) {
        length += arguments[i].length;
    }

    var newArray = new Uint8Array(length);
    var offset = 0;
    for (i in arguments) {
        newArray.set(arguments[i], offset);
        offset += arguments[i].length;
    }
    return newArray;
}

function char(c) {
    return c.toString().charCodeAt(0);
}

//Converts hex char to decimal, or returns -1 if not in in hex range
//Header chars should all be in the hex range
function asciiHexDigit(c) {
    c = char(c);
    if (char('0') <= c && c <= char('9')) {
        return c - char('0');
    } else if (char('A') <= c && c <= char('F')) {
        return c - char('A') + 10;
    } else if (char('a') <= c && c <= char('f')) {
        return c - char('a') + 10;
    } else {
        return -1;
    }
}


module.exports = {
    Decoder: Decoder,
    Encoder: Encoder,
};