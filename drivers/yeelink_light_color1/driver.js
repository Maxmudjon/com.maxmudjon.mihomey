"use strict";

const Homey = require("homey");
const miio = require("miio");

const registerActionFlow = name => new Homey.FlowCardAction(name).register();

class YeelightColorLightBulb extends Homey.Driver {
  onInit() {
    this.actions = {
      favoriteFlow: registerActionFlow("favorite_flow_color1_bulb"),
      smoothAction: registerActionFlow("smoothOnOff")
    };
  }

  onPair(socket) {
    let pairingDevice = {};
    pairingDevice.name = "Yeelight Color Light Bulb";
    pairingDevice.settings = {};
    pairingDevice.data = {};

    socket.on("connect", async (data, callback) => {
      try {
        let miioDevice = await miio.device({ address: data.ip, token: data.token });
        const info = await miioDevice.call("miIO.info", []);

        if (info.model == data.models[0] || info.model == data.models[1]) {
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
            notDevice: "It is not Yeelight Color Light Bulb"
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

module.exports = YeelightColorLightBulb;
