"use strict";
const Homey = require("homey");
const miio = require("miio");

const initFlowAction = code => ({
  code: new Homey.FlowCardAction(code).register()
});

class MiIrTv extends Homey.Driver {
  onInit() {
    this.actions = {
      sendIRCodeAction: initFlowAction("send_ir_code")
    };
  }

  onPair(socket) {
    let pairingDevice = {};
    let type = "other";
    pairingDevice.name = "Unknown";
    pairingDevice.settings = {};
    pairingDevice.data = {};
    pairingDevice.capabilities = [];
    socket.on("getCurrentDevice", function(data, callback) {
      callback(null, pairingDevice);
    });
    socket.on("getDevicesList", function(data, callback) {
      var devices = Homey.ManagerSettings.get("irDevicesList");
      callback(null, devices || []);
    });
    socket.on("learnCode", function(data, callback) {
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
                  if (data.key == "standby") {
                    const capability = "onoff";
                    pairingDevice.capabilities.push(capability);
                  } else if (data.key == "channelUp") {
                    const capability = "channel_up";
                    pairingDevice.capabilities.push(capability);
                  } else if (data.key == "channelDown") {
                    const capability = "channel_down";
                    pairingDevice.capabilities.push(capability);
                  } else if (data.key == "volumeUp") {
                    const capability = "volume_up";
                    pairingDevice.capabilities.push(capability);
                  } else if (data.key == "volumeDown") {
                    const capability = "volume_down";
                    pairingDevice.capabilities.push(capability);
                  } else if (data.key == "mute") {
                    const capability = "volume_mute";
                    pairingDevice.capabilities.push(capability);
                  }

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
      type = data.devices;
      console.log("Tanlangan qurilma turi: ", data.devices);

      if (data.devices == "projector") {
        pairingDevice.name = "Projector";
        pairingDevice.icon = "/icons/projector.svg";
      }
      callback(null, type);
    });
    socket.on("selectedDevice", function(data, callback) {
      pairingDevice.settings.deviceIp = data.devices.ip;
      pairingDevice.settings.deviceToken = data.devices.token;
      pairingDevice.data.id = pairingDevice.name + data.devices.ip;

      const capability = "onoff";
      pairingDevice.capabilities.push(capability);

      callback(null, pairingDevice);
    });
    socket.on("allmostDone", function(data, callback) {
      callback(null, pairingDevice);
    });
  }
}

module.exports = MiIrTv;
