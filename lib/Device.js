class Device {
    constructor ({model, sid, short_id, data}, gateway) {
        this.model = model;
        this.sid = sid;
        this.short_id = short_id;
        this.name = "Device "+this.sid+" MiHub: "+ gateway
        this.status = data.status;
        this.voltage = data.voltage;
        this.no_close = data.no_close;
        this.gateway = gateway;
        this.channel_0 = data.channel_0;
        this.channel_1 = data.channel_1;
        this.dual_channel = data.dual_channel;
    }

    update (data, gateway) {
        for (let key in data) {
            if (this.hasOwnProperty(key)) {
                this[key] = data[key];
            }

            if (data.model == '86sw2') {
                this.channel_0 = false;
                this.channel_1 = false;
                this.dual_channel = false;
            }

        }

        for (let key in data.data) {
            this[key] = data.data[key];

            if(data.data.status == 'open') {
                this.status = true;
            } else {
                this.status = false;
            }

            if(key == 'channel_0') {
                this.channel_0 = true;
            }

            if(key == 'channel_1') {
                this.channel_1 = true;
            }

            if(key == 'dual_channel') {
                this.dual_channel = true;
            }

            this.gateway = gateway;
        }
    }
}

module.exports = Device;