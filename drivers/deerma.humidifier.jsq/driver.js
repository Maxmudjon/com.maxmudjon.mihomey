const Homey = require("homey");
const miio = require("miio");

const deviceModels = ["deerma.humidifier.jsq"];

class MiHomeyDevice extends Homey.Driver {
  onInit() {
    this.actions = {
      humidifierMode: new Homey.FlowCardAction("deerma_humidifier_jsq4_mode").register(),
    };
  }

  onPair(socket) {
    let pairingDevice = {
      name: "Mi Smart Antibacterial Humidifier",
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
          const result = await miioDevice.call("get_prop", ["OnOff_State"]);
          callback(null, result);
        } else {
          callback(new Error("It is not Mi Smart Antibacterial Humidifier"), null);
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
