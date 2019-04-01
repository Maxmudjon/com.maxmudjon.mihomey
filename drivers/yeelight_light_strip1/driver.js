const Homey = require("homey");
const miio = require("miio");

const initFlowAction = favoriteFlow => ({
  favoriteFlow: new Homey.FlowCardAction(favoriteFlow).register()
});

class YeelightLightStrip extends Homey.Driver {
  onInit() {
    this.actions = {
      favoriteFlow: initFlowAction("favorite_flow_color1_bulb")
    };
  }

  onPair(socket) {
    let pairingDevice = {};
    pairingDevice.name = "Yeelight Light Strip";
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
              if (value.model == this.data.model || value.model == "yeelink.light.strip2") {
                pairingDevice.data.id = "YL:LS:" + value.mac + ":YL:LS";
                device
                  .call("get_prop", ["bright"])
                  .then(value => {
                    let result = {
                      bright: value[0]
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
                  notDevice: "It is not Yeelight Light Strip"
                };
                pairingDevice.data.id = null;
                callback(null, result);
              }
            })
            .catch(error => callback(null, error));
        })
        .catch(function(error) {
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

module.exports = YeelightLightStrip;
