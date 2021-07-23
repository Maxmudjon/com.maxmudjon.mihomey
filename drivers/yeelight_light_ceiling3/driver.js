const Homey = require("homey");
const miio = require("miio");

const initFlowAction = (favoriteFlow) => ({
  favoriteFlow: new Homey.FlowCardAction(favoriteFlow).register(),
});

class YeelightJiaoyue450 extends Homey.Driver {
  onInit() {
    this.actions = {
      favoriteFlow: initFlowAction("favorite_flow_ceiling1_lamp"),
    };
  }

  onPair(socket) {
    let pairingDevice = {};
    pairingDevice.name = "Yeelight Jiaoyue 450";
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
                pairingDevice.data.id = "YL:J4:50:" + value.mac + ":YL:J4:50";
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
                  notDevice: "It is not Yeelight Jiaoyue 450",
                };
                pairingDevice.data.id = null;
                callback(null, result);
              }
            })
            .catch((error) => callback(null, error));
        })
        .catch(function (error) {
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

module.exports = YeelightJiaoyue450;
