const Homey = require("homey");
const miio = require("miio");

class YeelightJiaoyue450 extends Homey.Driver {
  onInit() {
    this.actions = {
      favoriteFlow: new Homey.FlowCardAction("favorite_flow_ceiling1_lamp").register(),
      smoothAction: new Homey.FlowCardAction("smoothOnOff").register(),
      nightMode: new Homey.FlowCardAction("yeelink_night_mode").register()
    };
    this.conditions = {
      night_mode: new Homey.FlowCardCondition("night_mode").register()
    };
  }

  onPair(socket) {
    let pairingDevice = {};
    pairingDevice.name = "Yeelight Jiaoyue 450";
    pairingDevice.settings = {};
    pairingDevice.data = {};

    socket.on("connect", async (data, callback) => {
      try {
        let miioDevice = await miio.device({ address: data.ip, token: data.token });
        const info = await miioDevice.call("miIO.info", []);

        if (info.model == data.models[0]) {
          pairingDevice.data.id = info.mac;
          pairingDevice.settings.deviceIP = data.ip;
          pairingDevice.settings.deviceToken = data.token;

          const value = await miioDevice.call("get_prop", ["bright"]);

          let result = {
            bright: value[0]
          };

          if (data.timer < 5) {
            pairingDevice.settings.updateTimer = 5;
          } else if (data.timer > 3600) {
            pairingDevice.settings.updateTimer = 3600;
          } else {
            pairingDevice.settings.updateTimer = parseInt(data.timer);
          }

          miioDevice.destroy();

          callback(null, result);
        } else {
          let result = {
            notDevice: "It is not Yeelight Jiaoyue 450"
          };

          pairingDevice.data.id = null;
          miioDevice.destroy();

          callback(null, result);
        }
      } catch (error) {
        if (error == "Error: Could not connect to device, handshake timeout") {
          callback(null, "timeout");
        }
        if (error == "Error: Could not connect to device, token might be wrong") {
          callback(null, "wrongToken");
        } else {
          callback(error, "Error");
        }
      }
    });

    socket.on("done", (data, callback) => {
      callback(null, pairingDevice);
    });
  }
}

module.exports = YeelightJiaoyue450;
