const EventEmitter = require('events');
const Homey = require('homey');
const MiGateway = require('mimorelinks');
const UPDATE_GAP_SECONDS = 5
const POLL_INTERVAL = 500
const timestamp = () => Math.round(Date.now() / 1000)

class MiHub extends EventEmitter {
	constructor(log) {
		super()
		this.log = log;
	    this.log('Mi Homey initialized!');
        this.lastDeviceManualUpdateTime = {};
        this.lastRequestPromise = Promise.resolve();
        this.updateDevicesPollInterval();
        this.hubs;
        this.hubsList = Homey.ManagerSettings.get('gatewaysList') || [];
        this.MiInitialize(this.hubsList);
        this.lastDeviceManualUpdateTime = {};
        this.lastRequestPromise = Promise.resolve();
        this.updateDevicesPollInterval();
	}

    MiInitialize(gateways) {
        if (gateways.length > 0) {
            this.gatewaysList = [];
            gateways.forEach(gateway => {
                let data = { sid: gateway.sid, password: gateway.token }
                this.gatewaysList.push(data);
            })
            MiGateway.create(this.gatewaysList);
            MiGateway.start();
            this.hubs = true;
        } else {
            this.log('Please insert sid and token in settings on Manager Settings');
            if (MiGateway._start) {
                 MiGateway.stop();
            }
            this.hubs = false;
            this.updateDevicesPollInterval()
        }
    }
    getDevice(sid) {
        const device = MiGateway.getDeviceBySid(sid);
        return device
    }

    async getDevicesByModel(model) {
        return MiGateway.getDevicesByModel(model);
    }

    updateGateways(gateways) {
        this.MiInitialize(gateways);
        this.updateDevicesPollInterval();
    }

	updateDevicesPollInterval() {
	    clearInterval(this.interval);
	    if (this.hubs) {
	      this.devicesEmitter()
	      this.interval = setInterval(
	          () => this.devicesEmitter(),
	          POLL_INTERVAL
	      )
	    }
	}

	async devicesEmitter() {
        const devices = MiGateway.getDeviceList()
	    devices.forEach(device => {
	      const lastDeviceUpdateTime = this.lastDeviceManualUpdateTime[device.sid]
	      if (lastDeviceUpdateTime && (timestamp() - lastDeviceUpdateTime) <= UPDATE_GAP_SECONDS) {
	        return
	      }
          MiGateway.read(device.sid);
	      this.emit(`${device.sid}`, device);
	    })
	}
}

module.exports = MiHub