const Homey = require("homey");
const miio = require("miio");

class GatewaySecurity extends Homey.Driver {
  onPair(socket) {
    let pairingDevice = {};
    pairingDevice.name = "Xiaomi Gateway Security";
    pairingDevice.settings = {};
    pairingDevice.data = {};

    socket.on("connect", function(data, callback) {
      this.data = data;
      miio
        .device({ address: data.ip, token: data.token })
        .then(device => {
          device
            .call("miIO.info", [])
            .then(value => {
              pairingDevice.data.id = "SE:CU:RI:TY:" + value.mac + ":SE:CU:RI:TY";
              device
                .call("get_arming", [])
                .then(value => {
                  let result = {
                    state: value[0]
                  };
                  pairingDevice.settings.gatewayIP = this.data.ip;
                  pairingDevice.settings.gatewayToken = this.data.token;
                  if (this.data.timer < 5) {
                    pairingDevice.settings.updateTimer = 5;
                  } else if (this.data.timer > 3600) {
                    pairingDevice.settings.updateTimer = 3600;
                  } else {
                    pairingDevice.settings.updateTimer = parseInt(this.data.timer);
                  }

                  callback(null, result);
                })
                .catch(error => callback(null, error));
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

    socket.on("done", function(data, callback) {
      callback(null, pairingDevice);
    });
  }
}

module.exports = GatewaySecurity;
