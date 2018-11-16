const Homey = require('homey');
const miio = require('miio');

const initFlowAction = (radio) => ({
  radio: new Homey.FlowCardAction(radio).register()
})

const initFlowAction2 = (customRadioListSend) => ({
  customRadioListSend: new Homey.FlowCardAction(customRadioListSend).register()
})

class GatewayRadio extends Homey.Driver {

  onInit() {
    this.actions = {
      playRadio: initFlowAction('play_radio'),
      customRadioListSend: initFlowAction2('customRadioListSend')
    }
  }

  onPair( socket ) {
    let pairingDevice = {};
    pairingDevice.name = 'Xiaomi Gateway 3 Radio';
    pairingDevice.settings = {};
    pairingDevice.data = {};

    socket.on('connect', function( data, callback ) {
        this.data = data;
        miio.device({
            address: data.ip,
            token: data.token
        }).then(device => {
          const getData = async () => {
            try {
                const luxLevel = await device.illuminance();
                let result = {
                    lux: luxLevel.lux
                }
                pairingDevice.settings.gatewayIP = this.data.ip;
                pairingDevice.settings.gatewayToken = this.data.token;

                callback(null, result);
            } catch (error) {
                callback(error, null);
            }
          }
          getData();
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
        callback( null, pairingDevice );
    });
  }
}

module.exports = GatewayRadio;
