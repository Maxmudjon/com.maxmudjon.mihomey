const Homey = require('homey');
const miio = require('miio');

class MiSmartPowerStrip extends Homey.Driver {

  onInit() {
    this.triggers = {
      meterAmpere: new Homey.FlowCardTriggerDevice('meterAmpere').register()
    }
  }

  onPair(socket) {
    let pairingDevice = {};
    pairingDevice.name = 'Mi Smart Power Strip';
    pairingDevice.settings = {};
    pairingDevice.data = {};

    socket.on('connect', function (data, callback) {
      this.data = data;
      miio.device({ address: data.ip, token: data.token })
        .then(device => {
          device.call("miIO.info", [])
            .then(value => {
              if (value.model == this.data.model) {
                pairingDevice.data.id = 'ZP:V2:' + value.mac + ':ZP:V2';
                device.call("get_prop", ["power"])
                  .then(value => {
                    let result = {
                      power: value[0]
                    }
                    pairingDevice.settings.deviceIP = this.data.ip;
                    pairingDevice.settings.deviceToken = this.data.token;
                    if (this.data.timer < 5) {
                      pairingDevice.settings.updateTimer = 5;
                    } else if (this.data.timer > 3600) {
                      pairingDevice.settings.updateTimer = 3600;
                    } else {
                      pairingDevice.settings.updateTimer = parseInt(this.data.timer);
                    }

                    callback(null, result);
                  })
                  .catch(error => callback(null, error));
              } else {
                let result = {
                  notDevice: 'It is not Mi Smart Power Strip'
                }
                pairingDevice.data.id = null
                callback(null, result)
              }
            })
            .catch(error => callback(null, error));
        })
        .catch(function (error) {
          if (error == "Error: Could not connect to device, handshake timeout") {
            callback(null, 'timeout')
          } if (error == "Error: Could not connect to device, token might be wrong") {
            callback(null, 'wrongToken')
          } else {
            callback(error, 'Error');
          }
        });
    });
    socket.on('done', function (data, callback) {
      callback(null, pairingDevice);
    });
  }
}

module.exports = MiSmartPowerStrip;
