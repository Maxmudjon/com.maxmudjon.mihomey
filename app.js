"use strict";

const Homey = require("homey");
const MiHub = require("./lib/MiHub");
const { ManagerSettings } = Homey;

class MiHomey extends Homey.App {
  onInit() {
    this.log("MiHomey is running...");
    this.mihub = new MiHub(this.log);
    this.onSettingsChanged = this.onSettingsChanged.bind(this);
    ManagerSettings.on("set", this.onSettingsChanged);
    ManagerSettings.on("unset", this.onSettingsChanged);
    // this.actions();
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

  // actions() {
  //   new Homey.FlowCardAction("favorite_flow_color1_bulb").register().registerRunListener((args, state) => {
  //     try {
  //       miio
  //         .device({
  //           address: args.device.getSetting("deviceIP"),
  //           token: args.device.getSetting("deviceToken")
  //         })
  //         .then(device => {
  //           device
  //             .call("start_cf", flows[args.favoriteFlowID])
  //             .then(() => {
  //               that.log("Set flow: ", args.favoriteFlowID);
  //               device.destroy();
  //             })
  //             .catch(error => {
  //               that.log("Set flow error: ", error);
  //               device.destroy();
  //             });
  //         })
  //         .catch(error => {
  //           that.log("miio connect error: " + error);
  //         });
  //     } catch (error) {
  //       that.log("catch error: " + error);
  //     }
  //     return Promise.resolve(true);
  //   });
  // }
}

module.exports = MiHomey;
