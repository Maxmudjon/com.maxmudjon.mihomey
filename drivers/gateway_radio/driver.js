const Homey = require("homey");
const miio = require("miio");

const initFlowAction = radio => ({
  radio: new Homey.FlowCardAction(radio).register()
});

const initFlowAction2 = customRadioListSend => ({
  customRadioListSend: new Homey.FlowCardAction(customRadioListSend).register()
});

const initToggleFlowAction = toggle => ({
  toggle: new Homey.FlowCardAction(toggle).register()
});

class GatewayRadio extends Homey.Driver {
  onInit() {
    this.actions = {
      playRadio: initFlowAction("play_radio"),
      customRadioListSend: initFlowAction2("customRadioListSend"),
      toggle: initToggleFlowAction("play_toggle")
    };
  }

  onPair(socket) {
    let pairingDevice = {};
    pairingDevice.name = "Xiaomi Gateway 3 Radio";
    pairingDevice.settings = {};
    pairingDevice.data = {};
    pairingDevice.capabilities = [];

    socket.on("connect", function(data, callback) {
      this.data = data;
      miio
        .device({ address: data.ip, token: data.token })
        .then(device => {
          device
            .call("miIO.info", [])
            .then(value => {
              if (value.model == this.data.model) {
                pairingDevice.data.id = "FM:" + value.mac + ":FM";
                device
                  .call("get_prop_fm", [])
                  .then(value => {
                    let result = {
                      volume: value.current_volume
                    };
                    if (process.env.HOMEY_VERSION.replace(/\W/g, "") >= "200") {
                      pairingDevice.capabilities.push("speaker_playing");
                      pairingDevice.capabilities.push("speaker_prev");
                      pairingDevice.capabilities.push("speaker_next");
                      pairingDevice.capabilities.push("volume_set");
                      pairingDevice.capabilities.push("speaker_track");
                    } else {
                      pairingDevice.capabilities.push("speaker_playing");
                      pairingDevice.capabilities.push("speaker_prev");
                      pairingDevice.capabilities.push("speaker_next");
                      pairingDevice.capabilities.push("volume_set");
                    }
                    pairingDevice.settings.gatewayIP = this.data.ip;
                    pairingDevice.settings.gatewayToken = this.data.token;
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
                  notDevice: "It is not Mi Gateway with radio"
                };
                pairingDevice.data.id = null;
                callback(null, result);
              }
            })
            .catch(error => callback(null, error));
        })
        .catch(error => {
          if (error == "Error: Could not connect to device, handshake timeout") {
            callback(null, "timeout");
          }
          if (error == "Error: Could not connect to device, token might be wrong") {
            callback(null, "wrongToken");
          } else {
            callback(error, "Error");
          }
        });
    });
    socket.on("done", function(data, callback) {
      callback(null, pairingDevice);
    });
  }
}

module.exports = GatewayRadio;
