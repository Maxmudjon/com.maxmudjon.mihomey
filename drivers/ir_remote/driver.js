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
    let allCapabilities;
    let createdDevice = {
      onoffType: {
        onoff: 0
      },
      dimSteep: {
        dim: 0
      }
    };

    socket.on("getCurrentDevice", function(data, callback) {
      let device = Object.assign(pairingDevice, createdDevice);
      console.log("CURRENT PAIRING DEVICES: ", device);
      callback(null, device);
    });

    socket.on("getCurrentDeviceForCharacteristics", function(data, callback) {
      console.log("CURRENT PAIRING DEVICES: ", pairingDevice);

      callback(null, pairingDevice);
    });

    socket.on("getDevicesList", function(data, callback) {
      var devices = Homey.ManagerSettings.get("irDevicesList");
      callback(null, devices || []);
    });

    socket.on("newCharacteristics", function(data, callback) {
      console.log(data);
      if (data.onoff) {
        createdDevice.onoffType.onoff = data.onoff;
      }

      if (data.dim) {
        createdDevice.dimSteep.dim = data.dim;
      }

      console.log(createdDevice);

      callback(null, true);
    });

    socket.on("learnCode", function(data, callback) {
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
            .catch(function(error) {
              if (error == "Error: Call to device timed out") {
                callback(null, "time out");
              } else {
                callback(error, "Error");
              }
            });
        })
        .catch(function(error) {
          if (error == "Error: Could not connect to device, handshake timeout") {
            callback(null, "offline");
          } else {
            callback(error, "Error");
          }
        });

      setTimeout(() => {
        miio
          .device({
            address: data.ip,
            token: data.token
          })
          .then(device => {
            device
              .call("miIO.ir_read", { key: this.timekey })
              .then(result => {
                if (result["code"] !== "") {
                  let value = { code: result["code"] };
                  pairingDevice.data[`${data.key}`] = result["code"];
                  console.log("KEY KEY: ", data.key);

                  pairingDevice.capabilities = data.key;

                  console.log("TAYYORI: ", pairingDevice);

                  callback(null, value);
                } else {
                  callback(null, "timeout");
                }
              })
              .catch(function(err) {
                if (err == "Error: Call to device timed out") {
                  callback(null, "offline");
                } else {
                  callback(err, "Error");
                }
              });
          })
          .catch(function(error) {
            if (error == "Error: Could not connect to device, handshake timeout") {
              callback(null, "offline");
            } else {
              callback(error, "Error");
            }
          });
      }, 5000);
    });

    socket.on("selectedType", function(data, callback) {
      type = data.type;
      console.log("Tanlangan qurilma turi: ", data.type);

      pairingDevice.name = data.name;
      pairingDevice.icon = data.type + ".svg";
      pairingDevice.capabilities = data.capabilities;
      pairingDevice.capabilitiesOptions = data.capabilitiesOptions;

      console.log(pairingDevice);

      callback(null, type);
    });

    socket.on("selectedDevice", function(data, callback) {
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
    socket.on("allmostDone", function(data, callback) {
      callback(null, pairingDevice);
    });
  }
}

module.exports = IRRemote;
