const Homey = require('homey');
const miio = require('miio');

function randomGUID() {
  function id() {
      return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }
  return id() + id() + '-' + id() + '-' + id() + '-' + id() + '-' + id() + id() + id();
}

class CHINGMISmartPowerStrip extends Homey.Driver {

  onInit() {
    this.triggers = {
      meterAmpere: new Homey.FlowCardTriggerDevice('meterAmpere').register()
    }
  }

  onPair( socket ) {
    let pairingDevice = {};
    pairingDevice.name = 'CHINGMI Smart Power Strip';
    pairingDevice.settings = {};
    pairingDevice.data = {};

    socket.on('connect', function( data, callback ) {
        this.data = data;
        miio.device({
          address: data.ip,
          token: data.token
        }).then(device => {
          device.call("miIO.info", []).then(value => {
            if (value.model == this.data.model) {
              device.call("get_prop", ["power"]).then(value => {
                let result = {
                  power: value[0]
                }
                pairingDevice.settings.deviceIP = this.data.ip;
                pairingDevice.settings.deviceToken = this.data.token;
    
                callback(null, result);
              }).catch(function(error) {
                callback(null, error);
              });
            } else {
              let result = {
                notDevice: 'It is not CHINGMI Smart Power Strip'
              }
              callback(null, result)
            }
          }).catch(function(error) {
            callback(null, error);
          });
        }).catch(function (error) {
          if (error == "Error: Could not connect to device, handshake timeout") {
            callback(null, 'timeout')
          } if (error == "Error: Could not connect to device, token might be wrong") {
            callback(null, 'wrongToken')
          } else {
              callback(error, 'Error');
          }
        });
    });
    socket.on('done', function( data, callback ) {
      pairingDevice.data.id = randomGUID();
      callback( null, pairingDevice );
    });
  }
}

module.exports = CHINGMISmartPowerStrip;
