"use strict";
const Homey = require("homey");
const miio = require("miio");
const DRIVER_LOCATION = "/app/com.maxmudjon.mihomey/drivers/ir_remote/";

const initFlowAction = code => ({
  code: new Homey.FlowCardAction(code).register()
});

class IRRemote extends Homey.Driver {
  onInit() {
    this.actions = {
      sendIRCodeAction: initFlowAction("send_ir_code")
    };
  }

  onPair(socket) {
    let pairingDevice = {
      name: "Unknown",
      settings: {},
      data: {},
      capabilities: [],
      capabilitiesOptions: {}
    };

    let type = "other";

    socket.on("getCurrentDevice", (data, callback) => {
      callback(null, pairingDevice);
    });

    socket.on("getCurrentDeviceForCharacteristics", (data, callback) => {
      callback(null, pairingDevice);
    });

    socket.on("getDevicesList", (data, callback) => {
      var devices = Homey.ManagerSettings.get("irDevicesList");
      callback(null, devices || []);
    });

    socket.on("newCharacteristics", (data, callback) => {
      pairingDevice = data;

      if (pairingDevice.capabilitiesOptions && pairingDevice.capabilitiesOptions.dim) {
        pairingDevice.capabilitiesOptions.dim.max = parseInt(data.characteristicsSettings.dim);
      }

      console.log(pairingDevice.capabilitiesOptions);

      callback(null, true);
    });

    socket.on("learnCode", (data, callback) => {
      console.log("LEARN CODE: ", data);

      this.timekey = "123456789012345";
      this.data = data;
      miio
        .device({
          address: data.ip,
          token: data.token
        })
        .then(device => {
          device
            .call("miIO.ir_learn", { key: this.timekey })
            .then(result => {})
            .catch(error => {
              if (error == "Error: Call to device timed out") {
                callback(null, "time out");
              } else {
                callback(error, "Error");
              }
            });

          setTimeout(() => {
            device
              .call("miIO.ir_read", { key: this.timekey })
              .then(result => {
                if (result["code"] !== "") {
                  let value = { code: result["code"] };
                  pairingDevice.data[data.key] = result["code"];
                  console.log("KEY KEY: ", data.key);

                  console.log("TAYYORI: ", pairingDevice);

                  callback(null, value);
                } else {
                  callback(null, "timeout");
                }
              })
              .catch(error => {
                if (error == "Error: Call to device timed out") {
                  callback(null, "offline");
                } else {
                  callback(error, "Error");
                }
              });
          }, 5000);
        })
        .catch(error => {
          if (error == "Error: Could not connect to device, handshake timeout") {
            callback(null, "offline");
          } else {
            callback(error, "Error");
          }
        });
    });

    socket.on("selectedType", (data, callback) => {
      type = data.type;
      pairingDevice.name = data.name;
      pairingDevice.icon = data.type + ".svg";
      pairingDevice.capabilities = data.capabilities;
      pairingDevice.capabilitiesOptions = data.capabilitiesOptions;
      pairingDevice.characteristicsSettings = data.characteristicsSettings;

      callback(null, type);
    });

    socket.on("selectedDevice", (data, callback) => {
      pairingDevice.settings.deviceIp = data.devices.ip;
      pairingDevice.settings.deviceToken = data.devices.token;
      pairingDevice.data.id =
        pairingDevice.name +
        "-" +
        data.devices.ip +
        "-" +
        Math.floor((1 + Math.random()) * 0x10000)
          .toString(16)
          .substring(1);

      callback(null, pairingDevice);
    });
    socket.on("allmostDone", (data, callback) => {
      callback(null, pairingDevice);
    });
  }
}

module.exports = IRRemote;
