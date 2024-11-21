
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
					const { disp_id} = device;
	
					if (!activeConnections[disp_id]) {
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
			const { disp_id, disp_nombre, disp_direccion_ip, disp_port, disp_instrumentos } = device;
			const net = require('net')
			const socket = new net.Socket();
			const options = {
				'host': disp_direccion_ip,
				'port': disp_port
			};


			


			disp_instrumentos.forEach(instrument => {
				const { inst_id, inst_nombre, inst_modbus_id, inst_inicio,  inst_cantidad, inst_periodo_scan_ms, inst_puntos } = instrument;

				const client = new Modbus.client.TCP(socket, inst_modbus_id);

				activeConnections[disp_id] = {
					client,
					socket,
					interval: setInterval(() => readRegistersForDevice(disp_id, disp_nombre, client, instrument), inst_periodo_scan_ms)
				};
							
			});	

			

			socket.connect(options);

		}

		// Function to read registers for a specific device
		function readRegistersForDevice(disp_id, disp_nombre, client, instrument) {

			const { inst_id, inst_nombre, inst_modbus_id, inst_inicio,  inst_cantidad, inst_periodo_scan_ms, inst_puntos } = instrument;
			
			client.readHoldingRegisters(instrument.inst_inicio, instrument.inst_cantidad)
				.then(function (resp) {
					console.log(`Received data from ${disp_nombre}:${instrument.inst_nombre}:`, resp.response._body.valuesAsArray);

					const msg = {
						payload: {
							disp_id: disp_id,
							disp_nombre: disp_nombre,
							inst_id: inst_id,
							inst_nombre: inst_nombre,
							data: resp.response._body.valuesAsArray
						}
					}

					node.send(msg);
				})
				.catch(function (err) {
					console.error(`Error reading registers from ${instrument.ipAddress}:${instrument.port}:`, err);
					// Handle errors, e.g., reconnect
				});
		}

	}

	RED.nodes.registerType("my-node", MyModbusNode);
};
