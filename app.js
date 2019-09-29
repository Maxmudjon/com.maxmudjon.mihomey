"use strict";

const Homey = require("homey");
const MiHub = require("./lib/MiHub");
const miio = require("miio");
const { ManagerSettings } = Homey;
const CHARS = "0123456789ABCDEF";

function generateKey() {
  let result = "";
  for (let i = 0; i < 16; i++) {
    let idx = Math.floor(Math.random() * CHARS.length);
    result += CHARS[idx];
  }
  return result;
}

class MiHomey extends Homey.App {
  onInit() {
    this.log("MiHomey is running...");
    this.mihub = new MiHub(this.log);
    this.onSettingsChanged = this.onSettingsChanged.bind(this);
    ManagerSettings.on("set", this.onSettingsChanged);
    ManagerSettings.on("unset", this.onSettingsChanged);
  }

  onSettingsChanged(key) {
    switch (key) {
      case "gatewaysList":
        this.mihub.updateGateways(ManagerSettings.get("gatewaysList"));
        break;
      default:
        break;
    }
  }

  async generate(args) {
    return new Promise(function(resolve, reject) {
      let key = generateKey();

      miio
        .device({ address: args.body.ip, token: args.body.token })
        .then(device => {
          device
            .call("miIO.info", [])
            .then(value => {
              device
                .call("set_lumi_dpf_aes_key", [key])
                .then(result => {
                  resolve({ status: "OK", key: key, mac: value.mac.replace(/\:/g, "").toLowerCase() });
                })
                .catch(error => {
                  reject(new Error({ status: "ERROR", error: error }));
                });
            })
            .catch(error => {
              reject(new Error({ status: "ERROR", error: error }));
            });
        })
        .catch(err => {
          reject(new Error({ status: "ERROR", error: err }));
        });
    });
  }
}

module.exports = MiHomey;
