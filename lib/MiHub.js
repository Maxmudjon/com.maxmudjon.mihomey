const EventEmitter = require('events');
EventEmitter.defaultMaxListeners = 150;
const Homey = require('homey');
const MiGateway = require('mimorelinks');

class MiHub extends EventEmitter {
	constructor(log) {
		super()
        this.setMaxListeners(150)
		this.log = log;
	    this.log('Mi Hub initialized!');
        this.hubs;
        this.hubsList = Homey.ManagerSettings.get('gatewaysList') || [];
        this.MiInitialize(this.hubsList);
        this.gateways;
	}

    MiInitialize(gateways) {
        var that = this;
        if (gateways.length > 0) {
            this.gatewaysList = [];
            gateways.forEach(gateway => {
                let data = { sid:gateway.sid, password:gateway.token.toUpperCase() }
                this.gatewaysList.push(data);
            })
            if (MiGateway._start) {
                 MiGateway.stop();
                 this.log('Stop running Mi Gateway!')
            }
            MiGateway.create(this.gatewaysList, {onMessage (msg) {that.devicesReport(msg)}});
            MiGateway.start();
            this.gateways = MiGateway._miAqara.gatewayHelper.gateways
            this.hubs = true;

        } else {
            this.log('Please insert sid and token in settings on Manager Settings');
            if (MiGateway._start) {
                MiGateway.stop();
                this.log('Mi Hub stopped!!!')
            }
            this.hubs = false;
        }
    }

    async getDevice(sid) {
        const device = MiGateway.getDeviceBySid(sid);
        return device
    }

    async getDevicesByModel(modelTypes) {
        const devices = MiGateway.getDeviceList()
        return devices.filter(device => modelTypes.includes(device.model))
    }

    updateGateways(gateways) {
        this.log("updateGateways: ", gateways)
        this.MiInitialize(gateways);
    }

    devicesReport(data) {
        const devices = MiGateway.getDeviceList()
        if (data.cmd == 'report') {
            devices.forEach(device => {
                if(data.sid == device.sid) {
                    this.emit(`${device.sid}`, device)
                }
            })
        } else if (data.cmd == 'read_ack') {
            devices.forEach(device => {
                if(data.sid == device.sid) {
                    this.emit(`${device.sid}`, device)
                }
            })
        }
    }

    async sendWrite(sid, data) {
        MiGateway.change({"sid":sid,"data":data})
    }
}

module.exports = MiHub