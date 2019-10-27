const Homey = require("homey");
const miio = require("miio");

class MiSmartPowerStrip extends Homey.Driver {
  onInit() {
    this.triggers = {
      meterAmpere: new Homey.FlowCardTriggerDevice("meterAmpere").register()
    };
  }

  onPair(socket) {
    let pairingDevice = {};
    pairingDevice.name = "Mi Smart Power Strip";
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

          const value = await miioDevice.call("get_prop", ["power"]);

          let result = {
            power: value[0]
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
            notDevice: "It is not Mi Smart Power Strip"
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

module.exports = MiSmartPowerStrip;
