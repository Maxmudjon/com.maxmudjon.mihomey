const Homey = require("homey");
const miio = require("miio");

const deviceModels = ["philips.light.cbulb"];

class MiHomeyDevice extends Homey.Driver {
  onInit() {
    this.actions = {
      philipsScenes: new Homey.FlowCardAction("philips_scenes").register(),
    };
  }

  onPair(socket) {
    let pairingDevice = {
      name: "Mijia Philips Color Bulb",
      settings: {},
      data: {},
    };

    socket.on("connect", async (data, callback) => {
      try {
        const miioDevice = await miio.device({ address: data.ip, token: data.token });
        const miioDeviceInfo = await miioDevice.call("miIO.info", []);

        if (deviceModels.includes(miioDeviceInfo.model)) {
          pairingDevice.data.id = miioDeviceInfo.mac;
          pairingDevice.settings.deviceIP = data.ip;
          pairingDevice.settings.deviceToken = data.token;
          pairingDevice.settings.updateTimer = +data.timer || 60;
          const result = await miioDevice.call("get_properties", [{ siid: 2, piid: 2 }]);
          callback(null, result);
        } else {
          callback(new Error("It is not Mijia Philips Color Bulb"), null);
        }
      } catch (error) {
        callback(error, null);
      }
    });

    socket.on("done", (data, callback) => {
      callback(null, pairingDevice);
    });
  }
}

module.exports = MiHomeyDevice;
