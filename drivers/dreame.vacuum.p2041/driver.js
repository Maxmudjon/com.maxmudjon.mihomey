const Homey = require("homey");
const miio = require("miio");

class MiRobotVacuumMop1T extends Homey.Driver {
  onInit() {
    this.triggers = {
      main_brush: new Homey.FlowCardTriggerDevice("main_brush_work_time").register(),
      side_brush: new Homey.FlowCardTriggerDevice("side_brush_work_time").register(),
      filter: new Homey.FlowCardTriggerDevice("filter_work_time").register()
    };
  }

  onPair(socket) {
    let pairingDevice = {};
    pairingDevice.name = "Mi Robot Vacuum-Mop 1T";
    pairingDevice.settings = {};
    pairingDevice.data = {};

    socket.on("connect", (data, callback) => {
      this.data = data;
      miio
        .device({ address: data.ip, token: data.token })
        .then(device => {
          device
            .call("miIO.info", [])
            .then(value => {
              if (value.model == this.data.model) {
                pairingDevice.data.id = value.mac;
                const params = [{ siid: 3, piid: 1 }];
                device
                  .call("get_properties", params, {
                    retries: 1
                  })
                  .then(result => {
                    if (result && result[0].code === 0) {
                      let resultData = {
                        battery: result[0].value
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

                      callback(null, resultData);
                    }
                  })
                  .catch(error => callback(null, error));
              } else {
                let result = {
                  notDevice: "It is not Mi Robot Vacuum-Mop 1T"
                };
                pairingDevice.data.id = null;
                callback(null, result);
              }
            })
            .catch(error => callback(null, error));
        })
        .catch(error => {
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

    socket.on("done", (data, callback) => callback(null, pairingDevice));
  }
}

module.exports = MiRobotVacuumMop1T;
