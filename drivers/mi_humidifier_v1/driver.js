const Homey = require("homey");
const miio = require("miio");

const initFlowAction = action => ({
  action: new Homey.FlowCardAction(action).register()
});

class MiHumidifierV1 extends Homey.Driver {
  onInit() {
    this.actions = {
      humidifierOn: initFlowAction("humidifier_on"),
      humidifierOff: initFlowAction("humidifier_off"),
      humidifierMode: initFlowAction("humidifier_mode")
    };
  }

  onPair(socket) {
    let pairingDevice = {};
    pairingDevice.name = "Mi Humidifier V1";
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
                pairingDevice.data.id = "MH:V1:" + value.mac + ":MH:V1";
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
                      pairingDevice.settings.updateTimer = parseInt(
                        this.data.timer
                      );
                    }

                    callback(null, result);
                  })
                  .catch(error => callback(null, error));
              } else {
                let result = {
                  notDevice: "It is not Mi Humidifier V1"
                };
                pairingDevice.data.id = null;
                callback(null, result);
              }
            })
            .catch(error => callback(null, error));
        })
        .catch(error => {
          if (
            error == "Error: Could not connect to device, handshake timeout"
          ) {
            callback(null, "timeout");
          }
          if (
            error == "Error: Could not connect to device, token might be wrong"
          ) {
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

module.exports = MiHumidifierV1;
