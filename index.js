var SerialPort = require('serialport').SerialPort;

var SB_MSG_START    = 0x7F,
    SB_MSG_END      = 0x7E,
    SB_MSG_ESCAPE   = 0x7D,
    SB_MSG_XOR      = 0x20;

var S_CONNECTING	= 1,
	S_READY			= 2;

var NOP = function() {};

module.exports = function(device, options) {
	var port 		= new SerialPort(device, options),
		inBuffer    = new Buffer(65536),
	    parseState  = 0,
	    inLen       = 0,
	    readyState	= S_CONNECTING;

	port.on('open', function() {
		readyState = S_READY;
		iface.onready();
	});

	port.on('data', function(data) {
		for (var i = 0, l = data.length; i < l; ++i) {
		    var b = data.readUInt8(i);
		    if (b === SB_MSG_START) {
		        parseState = 1;
		        inLen = 0;
		    } else {
		        if (parseState === 1) {
		            if (b === SB_MSG_END) {
		            	parseState = 0;
		            	iface.onpacket(inBuffer.slice(0, inLen));
					} else if (b === SB_MSG_ESCAPE) {
		                parseState = 2;
		            } else {
		                inBuffer.writeUInt8(b, inLen++);
		            }
		        } else if (parseState === 2) {
		            inBuffer.writeUInt8(b ^ SB_MSG_XOR, inLen++);
		            parseState = 1;
		        }
		    }
		}
	});

	var iface = {
		onready: NOP,
		onpacket: NOP,
		send: function(buffer) {
			//console.log("send", buffer);
			//console.log("  encoded:", encode(buffer));
			if (readyState !== S_READY) {
				throw new Error("serial port not ready");
			}
			port.write(encode(buffer));	
		},
		close: function() {}
	};

	return iface;
}

// TODO: use a buffer pool rather than allocating for each message
function encode(inBuffer) {
	var outBuffer = new Buffer((inBuffer.length * 2) + 2);
	var ip = 0, op = 0;
	outBuffer.writeUInt8(SB_MSG_START, op++);
	while (ip < inBuffer.length) {
	    var b = inBuffer.readUInt8(ip++);
	    if (b === SB_MSG_START || b === SB_MSG_END || b === SB_MSG_ESCAPE) {
	        outBuffer.writeUInt8(SB_MSG_ESCAPE, op++);
	        outBuffer.writeUInt8(SB_MSG_XOR ^ b, op++);
	    } else {
	        outBuffer.writeUInt8(b, op++);
	    }
	}
	outBuffer.writeUInt8(SB_MSG_END, op++);
	return outBuffer.slice(0, op);
}