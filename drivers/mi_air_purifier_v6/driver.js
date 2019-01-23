const Homey = require("homey");
const miio = require("miio");

const initFlowAction = action => ({
  action: new Homey.FlowCardAction(action).register()
});

class MiAirPurifierPro extends Homey.Driver {
  onInit() {
    this.actions = {
      purifierOn: initFlowAction("purifier_on"),
      purifierOff: initFlowAction("purifier_off"),
      purifierMode: initFlowAction("purifier_mode"),
      purifierSpeed: initFlowAction("purifier_speed")
    };
  }

  onPair(socket) {
    let pairingDevice = {};
    pairingDevice.name = "Mi Air Purifier Pro";
    pairingDevice.settings = {};
    pairingDevice.data = {};

    socket.on("connect", function(data, callback) {
      this.data = data;
      miio
        .device({ address: data.ip, token: data.token })
        .then(device => {
          device
            .call("miIO.info", [])
            .then(value => {
              if (value.model == this.data.model) {
                pairingDevice.data.id = "MA:PP:RO:" + value.mac + ":MA:PP:RO";
                device
                  .call("get_prop", ["power"])
                  .then(value => {
                    let result = {
                      state: value[0]
                    };
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
                  notDevice: "It is not Mi Air Purifier Pro"
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

module.exports = MiAirPurifierPro;
