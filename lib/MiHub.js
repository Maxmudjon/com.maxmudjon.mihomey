const EventEmitter = require('events')
const dgram = require('dgram');
const utils = require('./utils');
const Gateway = require('./Gateway');
const Device = require('./Device');
const UPDATE_GAP_SECONDS = 5
const POLL_INTERVAL = 500
const timestamp = () => Math.round(Date.now() / 1000)

const defaultConfig = {
    iv: Buffer.from([0x17, 0x99, 0x6d, 0x09, 0x3d, 0x28, 0xdd, 0xb3, 0xba, 0x69, 0x5a, 0x2e, 0x6f, 0x58, 0x56, 0x2e]),
    multicastAddress: '224.0.0.50',
    multicastPort: 4321,
    serverPort: 9898,
    bindAddress: ''
};

class MiHub extends EventEmitter {
	constructor(log, auth) {
		super()
		this.log = log
	    this.auth = auth
	    this.log('Mi Gateway initialized!')
	    this.log(auth)
        this.multicastAddress = defaultConfig.multicastAddress;
        this.multicastPort = defaultConfig.multicastPort;
        this.serverPort = defaultConfig.serverPort;
        this.bindAddress = defaultConfig.bindAddress;
        this.gateways = {};
        this.deviceMaps = {};
        this.devices = {};
        this.debug = false
        this.childDevices = []

        if (Array.isArray(auth)) {
            for (let i=0; i<auth.length; i++) {
                this.addOrUpdate({
                    iv: auth[i].iv || defaultConfig.iv,
                    sid: auth[i].sid,
                    password: auth[i].token
                });
            }
        } else if (utils.isObject(auth)) {
            this.addOrUpdate({
                iv: auth.iv || defaultConfig.iv,
                sid: auth.sid,
                password: auth.token
            });
        } else {
            throw new Error('Param error');
        }

        this.createSocket();
        this.initServerSocket();
        this.sendWhoisCommand();
        this.lastDeviceManualUpdateTime = {}
        this.lastRequestPromise = Promise.resolve()
        this.updateDevicesPollInterval()
	}

    updateAuth(auth) {
        this.auth = auth
        this.updateDevicesPollInterval()
        this.emit('auth', !!auth)
    }

	addOrUpdate (data) {
        let sid = data.sid;
        if (this.gateways.hasOwnProperty(sid)) {
            let gateway = this.gateways[sid];
            gateway.update(data);
        } else {
            this.gateways[sid] = new Gateway(data);
        }
    }

    createSocket () {
        this.serverSocket = dgram.createSocket({
            type: 'udp4',
            reuseAddr: true
        });
    }

    initServerSocket () {
        let serverSocket = this.serverSocket;
        let that = this;

        serverSocket.on('error', function(err){
            if (this.debug) {
                console.error('error, msg - %s, stack - %s\n', err.message, err.stack);
            }
        });

        serverSocket.on('listening', function(){
            if (this.debug) {
                console.info(`server is listening on port ${that.serverPort}.`);
            }
            if (!that.bindAddress) {
                serverSocket.addMembership(that.multicastAddress);
            } else {
                serverSocket.setMulticastInterface(that.bindAddress);
                serverSocket.addMembership(that.multicastAddress, that.bindAddress);
            }
        });
        serverSocket.on('message', this.parseMessage.bind(this));
        serverSocket.bind(this.serverPort);
    }

    parseMessage (msg, rinfo) {
        let data;
        try {
            data = JSON.parse(msg);
            if (data.hasOwnProperty('data')) {
                data.data = JSON.parse(data.data);
            }
        } catch (e) {
            if (this.debug) {
                console.error('Bad message: %s', msg);
            }
            return;
        }

        let cmd = data['cmd'];

        if (this.debug) {
            console.log('[Message] cmd: %s, msg: ', cmd, msg.toString());
        }

        if (cmd === 'iam') {
            this.uploadGatewayBySid(data.sid, data);
            this.getIdList(data.sid);
        } else if(cmd === 'get_id_list_ack') {
            this.uploadGatewayBySid(data.sid, data);
            this.addOrUpdateDeviceMaps(data.sid, data.data);
            this.readAll(data.data);
        } else if (cmd === 'report') {
            this._addOrUpdate(data);
        } else if (cmd === 'read_ack') {
            this._addOrUpdate(data);
        } else if (cmd === 'write_ack') {

        } else if(cmd === 'server_ack') {

        } else if (cmd === 'heartbeat') {

        }

    }

    _addOrUpdate (data) {
        if (!data) {
           return;
        }
        if (data['model'] === 'gateway') {
            this.uploadGatewayBySid(data.sid, data);
        } else {
            this.addOrUpdateDevice(data);
        }
    }

    uploadGatewayBySid (sid, data) {
        if (this.gateways.hasOwnProperty(sid)) {
            let gateway = this.gateways[sid];
            gateway.update(data);
        }
    }

    getIdList (sid) {
        if (this.debug) {
            console.log('Get SID List sid: %s', sid);
        }
        let gateway = this.getGatewayBySid(sid);
        if (gateway) {
            this.send(gateway.ip, gateway.port, {
                cmd: 'get_id_list'
            });
        } else {
            if (this.debug) {
            console.log('Get SID list sid: %s is not authorized', sid);
            }
        }
    }

    getGatewayBySid (sid) {
        return this.gateways[sid];
    }

    send (ip, port, msg) {
        if (!ip || !port || !msg) {
            throw new Error('Param error');
        }
        let msgStr = utils.messageFormat(msg);
        if (this.debug) {
            console.log("[Send] msg: %s", msgStr);
        }
        this.serverSocket.send(msgStr, 0, msgStr.length, port, ip);
    }

    sendWhoisCommand () {
        this.send(this.multicastAddress, this.multicastPort, {
            cmd: 'whois'
        });
    }

    readAll (sidList) {
        if (this.debug) {
            console.log('[readAll] sidList=%s', sidList);
        }

        if (!sidList || sidList.length === 0) {
            return;
        }
        for (let i=0; i<sidList.length; i++) {
            this.readDeviceSid(sidList[i]);
        }
    }

    readDeviceSid (sid) {
        if (this.debug) {
            console.log('Read sid: %s', sid);
        }

        let gatewaySid = this.getGatewaySidByDeviceSid(sid);

        if (gatewaySid) {
            let gateway = this.getGatewayBySid(gatewaySid);
            if (gateway) {
                this.send(gateway.ip, gateway.port, {
                    cmd: 'read',
                    sid: sid
                });
            }
        } else {
            console.error('Read sid: %s can not find gateway', sid);
        }
    }

    getGatewaySidByDeviceSid (deviceSid) {
        for (let gatewaySid in this.deviceMaps) {
            let deviceIds = this.deviceMaps[gatewaySid];
            for (let i=0; i<deviceIds.length; i++) {
                if (deviceIds[i] === deviceSid) {
                    return gatewaySid;
                }
            }
        }
        return null;
    }

    addOrUpdateDeviceMaps (gatewaySid, deviceSids) {
        this.deviceMaps[gatewaySid] = deviceSids;
    }

    addOrUpdateDevice (data) {
        if (!data) {
            if (this.debug) {
                console.log('[addOrUpdateDevice] data is null');
            }
            return;
        }

        this.childDevices = []
        let sid = data.sid;

        if (this.devices.hasOwnProperty(sid)) {
        	let device = this.devices[sid];
        	let gateway = this.getGatewaySidByDeviceSid(sid)
         	device.update(data, gateway);
        } else {
            this.devices[sid] = new Device(data, this.getGatewaySidByDeviceSid(sid));
        }

        this.childDevices.push(this.devices[sid])
    }

    async getDevice(sid) {
	    const devices = this.childDevices
	    return devices.find(device => device.sid === sid)
	}

	async getDevicesForTypes(model) {

        let sortDevices = []

        for (var sid in this.devices) {
            var device = this.devices[sid];
            if(device.model == model) {
                sortDevices.push(device)
            }
        }

        return sortDevices
	}

	updateDevicesPollInterval() {
	    clearInterval(this.interval)
	    if (this.auth) {
	      this.emitDevicesIO()
	      this.interval = setInterval(
	          () => this.emitDevicesIO(),
	          POLL_INTERVAL
	      )
	    }
	}

	async emitDevicesIO() {

        this.sendWhoisCommand();
	    const devices = this.childDevices
        
	    devices.forEach(device => {
	      const lastDeviceUpdateTime = this.lastDeviceManualUpdateTime[device.sid]
	      if (lastDeviceUpdateTime && (timestamp() - lastDeviceUpdateTime) <= UPDATE_GAP_SECONDS) {
	        return
	      }

	      this.emit(`${device.sid}`, device)
	    })
	}
}

module.exports = MiHub