const Homey = require("homey");
const miio = require("miio");

class MiVacuumCleanerV2 extends Homey.Driver {
  onInit() {
    this.triggers = {
      main_brush: new Homey.FlowCardTriggerDevice("main_brush_work_time").register(),
      side_brush: new Homey.FlowCardTriggerDevice("side_brush_work_time").register(),
      filter: new Homey.FlowCardTriggerDevice("filter_work_time").register(),
      sensor: new Homey.FlowCardTriggerDevice("sensor_dirty_time").register(),
    };

    this.actions = {
      vacuumZoneCleaner: new Homey.FlowCardAction("vacuumZoneCleaner").register(),
      vacuumGoToTarget: new Homey.FlowCardAction("vacuumGoToTarget").register(),
    };
  }

  onPair(socket) {
    let pairingDevice = {};
    pairingDevice.name = "Mi Roborock";
    pairingDevice.settings = {};
    pairingDevice.data = {};

    socket.on("connect", (data, callback) => {
      this.data = data;
      miio
        .device({ address: data.ip, token: data.token })
        .then((device) => {
          device
            .call("miIO.info", [])
            .then((miioInfoResult) => {
              if (data.models.includes(miioInfoResult.model)) {
                pairingDevice.data.id = miioInfoResult.mac;
                device
                  .call("get_status", [])
                  .then((statusResult) => {
                    let result = {
                      battery: statusResult[0]["battery"],
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
                  notDevice: "It is not Mi Roborock",
                };
                pairingDevice.data.id = null;
                callback(null, result);
              }
            })
            .catch((error) => callback(null, error));
        })
        .catch((error) => {
          console.error(error);
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

module.exports = MiVacuumCleanerV2;
