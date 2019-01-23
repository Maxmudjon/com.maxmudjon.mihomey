const Homey = require("homey");
const miio = require("miio");

class GatewaySecurity extends Homey.Device {
  async onInit() {
    this.initialize = this.initialize.bind(this);
    this.driver = this.getDriver();
    this.data = this.getData();
    this.update = this.getSetting("updateTimer") || 60;
    this.updateInterval;
    this.initialize();
    this.log(
      "Mi Homey device init | " +
        "name: " +
        this.getName() +
        " - " +
        "class: " +
        this.getClass() +
        " - " +
        "data: " +
        JSON.stringify(this.data)
    );
  }

  async initialize() {
    this.registerCapabilities();
    this.getSecurityStatus(this.update);
  }

  registerCapabilities() {
    this.registerHomeAlarmSecurity("homealarm_state");
  }

  async getSecurityStatus(update) {
    clearInterval(this.updateInterval);
    this.updateInterval = setInterval(async () => {
      var that = this;
      try {
        await miio
          .device({
            address: this.getSetting("gatewayIP"),
            token: this.getSetting("gatewayToken")
          })
          .then(device => {
            if (!this.getAvailable()) {
              this.setAvailable();
            }

            this.setAvailable();

            device
              .call("get_arming", [])
              .then(result => {
                if (result[0] == "on") {
                  this.setCapabilityValue("homealarm_state", "armed");
                } else if (result[0] == "off") {
                  this.setCapabilityValue("homealarm_state", "disarmed");
                }
                device.destroy();
              })
              .catch(error => {
                that.log("Sending commmand 'get_arming' error: ", error);
                device.destroy();
              });
          })
          .catch(error => {
            if (
              error == "Error: Could not connect to device, handshake timeout"
            ) {
              this.setUnavailable(
                Homey.__("Could not connect to device, handshake timeout")
              );
              this.log("Error: Could not connect to device, handshake timeout");
            } else if (
              error ==
              "Error: Could not connect to device, token might be wrong"
            ) {
              this.setUnavailable(
                Homey.__("Could not connect to device, token might be wrong")
              );
              this.log(
                "Error: Could not connect to device, token might be wrong"
              );
            }
            if (typeof that.device !== "undefined") {
              device.destroy();
            }
          });
      } catch (error) {
        this.log("Error ", error);
      }
    }, 1000 * update);
  }

  onSettings(oldSettings, newSettings, changedKeys, callback) {
    if (
      changedKeys.includes("updateTimer") ||
      changedKeys.includes("gatewayIP") ||
      changedKeys.includes("gatewayToken")
    ) {
      this.getSecurityStatus(newSettings["updateTimer"]);
      callback(null, true);
    }
  }

  registerHomeAlarmSecurity(name) {
    this.registerCapabilityListener(name, async value => {
      var state;
      if (value == "armed") {
        state = "on";
      } else if (value == "disarmed") {
        state = "off";
      } else {
        state = "off";
      }

      try {
        miio
          .device({
            address: this.getSetting("gatewayIP"),
            token: this.getSetting("gatewayToken")
          })
          .then(device => {
            device
              .call("set_arming", [state])
              .then(() => {
                this.log("Sending " + name + " commmand: " + state);
                device.destroy();
              })
              .catch(error => {
                this.log(
                  "Sending commmand 'set_arming' " + state + " error: " + error
                );
                device.destroy();
              });
          })
          .catch(error => {
            this.log("miio connect error: " + error);
          });
      } catch (error) {
        this.log("catch error: " + error);
      }
    });
  }

  onAdded() {
    this.log("Device added");
  }

  onDeleted() {
    this.log("Device deleted deleted");
    clearInterval(this.updateInterval);
  }
}

module.exports = GatewaySecurity;
