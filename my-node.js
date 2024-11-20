
const Modbus = require('jsmodbus')

/* [
	{
		"deviceId": "1",
		"ipAddress": "10.192.88.11",
		"port": 502,
		"unitId": 1,
		"startingRegister": 0,
		"quantityOfRegisters": 10,
		"scanInterval": 5000
	},
	{
		"deviceId": "2",
		"ipAddress": "10.192.88.11",
		"port": 503,
		"unitId": 2,
		"startingRegister": 0,
		"quantityOfRegisters": 5,
		"scanInterval": 3000
	}
] */

module.exports = function (RED) {


	function MyModbusNode(config) {
		RED.nodes.createNode(this, config);
		var node = this;

		const activeConnections = {}; // To store active connections

		node.on('input', function (msg) {
			const devices = msg.payload; // Assuming payload is an array of device configurations

			if (msg.topic) {
				console.log("Star Conections");
				devices.forEach(device => {
					const { ipAddress, port, unitId, startingRegister, quantityOfRegisters, scanInterval, deviceId } = device;
	
					if (!activeConnections[deviceId]) {
						createModbusConnection(device);
					}				
				});	
			} else {
				console.log("Stop Conections");
				// Disconnect devices
				Object.keys(activeConnections).forEach(deviceId => {
					clearInterval(activeConnections[deviceId].interval);
					activeConnections[deviceId].socket.end();
					delete activeConnections[deviceId];
					console.log(`Disconnected from device ${deviceId}`);
				});
			}

			

			

		});

		function createModbusConnection(device) {
			const { ipAddress, port, unitId, startingRegister, quantityOfRegisters, scanInterval, deviceId } = device;
			const net = require('net')
			const socket = new net.Socket();
			const client = new Modbus.client.TCP(socket, unitId);
			const options = {
				'host': ipAddress,
				'port': port
			};

			socket.connect(options);

			// Initial read and periodic reads, and store active Conections
			activeConnections[deviceId] = {
				client,
				socket,
				interval: setInterval(() => readRegistersForDevice(client, device), scanInterval)
			};

		}

		// Function to read registers for a specific device
		function readRegistersForDevice(client, deviceConfig) {
			client.readHoldingRegisters(deviceConfig.startingRegister, deviceConfig.quantityOfRegisters)
				.then(function (resp) {
					console.log(`Received data from ${deviceConfig.ipAddress}:${deviceConfig.port}:`, resp.response._body.valuesAsArray);

					const msg = {
						payload: {
							deviceId: deviceConfig.deviceId,
							data: resp.response._body.valuesAsArray
						}
					}

					node.send(msg);
				})
				.catch(function (err) {
					console.error(`Error reading registers from ${deviceConfig.ipAddress}:${deviceConfig.port}:`, err);
					// Handle errors, e.g., reconnect
				});
		}

	}

	RED.nodes.registerType("my-node", MyModbusNode);
};
