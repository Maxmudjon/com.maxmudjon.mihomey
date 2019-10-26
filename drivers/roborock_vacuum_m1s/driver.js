"use strict";

const Homey = require("homey");
const miio = require("miio");

class MiRobot1S extends Homey.Driver {
  onInit() {
    this.triggers = {
      main_brush: new Homey.FlowCardTriggerDevice("main_brush_work_time").register(),
      side_brush: new Homey.FlowCardTriggerDevice("side_brush_work_time").register(),
      filter: new Homey.FlowCardTriggerDevice("filter_work_time").register(),
      sensor: new Homey.FlowCardTriggerDevice("sensor_dirty_time").register()
    };

    this.actions = {
      vacuumZoneCleaner: new Homey.FlowCardAction("vacuumZoneCleaner").register(),
      vacuumGoToTarget: new Homey.FlowCardAction("vacuumGoToTarget").register()
    };
  }

  onPair(socket) {
    let pairingDevice = {};
    pairingDevice.name = "Mi Robot 1S";
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

          const value = await miioDevice.call("get_status", []);

          let result = {
            battery: value[0]["battery"]
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
            notDevice: "It is not Mi Robot 1S"
          };

          pairingDevice.data.id = null;
          miioDevice.destroy();

          callback(null, result);
        }
      } catch (error) {
        this.error(error.message);
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

module.exports = MiRobot1S;
