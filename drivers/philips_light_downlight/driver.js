const Homey = require("homey");
const miio = require("miio");

const initFlowAction = (action) => ({
  action: new Homey.FlowCardAction(action).register(),
});

class PhilipsDownlight extends Homey.Driver {
  onInit() {
    this.actions = {
      philipsScenes: initFlowAction("philips_scenes"),
    };
  }

  onPair(socket) {
    let pairingDevice = {};
    pairingDevice.name = "Philips Downlight";
    pairingDevice.settings = {};
    pairingDevice.data = {};

    socket.on("connect", (data, callback) => {
      this.data = data;
      miio
        .device({ address: data.ip, token: data.token })
        .then((device) => {
          device
            .call("miIO.info", [])
            .then((value) => {
              if (value.model == this.data.model) {
                pairingDevice.data.id = "PH:DL:" + value.mac + ":PH:LI:BU";
                device
                  .call("get_prop", ["bright"])
                  .then((value) => {
                    let result = {
                      bright: value[0],
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
                  .catch((error) => callback(null, error));
              } else {
                let result = {
                  notDevice: "It is not Philips Downlight",
                };
                pairingDevice.data.id = null;
                callback(null, result);
              }
            })
            .catch((error) => callback(null, error));
        })
        .catch((error) => {
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
    socket.on("done", (data, callback) => {
      callback(null, pairingDevice);
    });
  }
}

module.exports = PhilipsDownlight;
