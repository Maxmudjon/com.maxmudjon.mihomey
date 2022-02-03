const Homey = require("homey");
const miio = require("miio");

class XiaoMiHumidifierPro extends Homey.Driver {
  onInit() {
    this.actions = {
      humidifierOn: new Homey.FlowCardAction("humidifier_on").register(),
      humidifierOff: new Homey.FlowCardAction("humidifier_off").register(),
      humidifierMode: new Homey.FlowCardAction("humidifier_pro_mode").register(),
      humidifierSpeed: new Homey.FlowCardAction("humidifier_pro_speed").register(),
    };
  }

  onPair(socket) {
    let pairingDevice = {};
    pairingDevice.name = "XiaoMi Humidifier Pro";
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
                pairingDevice.data.id = value.mac;
                const params = [{ siid: 2, piid: 6 }];
                device
                  .call("get_properties", params, {
                    retries: 1,
                  })
                  .then((result) => {
                    let deviceResult = {
                      state: result[0].value,
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

                    callback(null, deviceResult);
                  })
                  .catch((error) => callback(null, error));
              } else {
                let result = {
                  notDevice: "It is not XiaoMi Humidifier Pro",
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

module.exports = XiaoMiHumidifierPro;
