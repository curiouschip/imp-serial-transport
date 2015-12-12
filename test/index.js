var create = require('../');

var transport = create("/dev/tty.usbserial-A901JW58", {
    baudrate: 115200
});

transport.onpacket = function(buffer) {
	console.log("received", buffer.length);
}

transport.onready = function() {
	transport.send(new Uint8Array([
		0x05, 0x01,
		0x00, 0x01,
		0x00, 0x00,
		0x00, 0x00
	]));
}
