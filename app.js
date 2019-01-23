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
}

module.exports = MiHomey;
