const Homey = require("homey");
const miio = require("miio");

class MiSmartPlugWiFiWith2USB extends Homey.Device {
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
    this.getXiaomiStatus(this.update);
  }

  registerCapabilities() {
    this.registerOnOffButton("onoff");
    this.registerUSBOnOffButton("onoff.usb");
    this.registerLedOnOffButton("onoff.led");
  }

  async getXiaomiStatus(update) {
    clearInterval(this.updateInterval);
    this.updateInterval = setInterval(async () => {
      var that = this;
      try {
        await miio
          .device({
            address: this.getSetting("deviceIP"),
            token: this.getSetting("deviceToken")
          })
          .then(device => {
            if (!this.getAvailable()) {
              this.setAvailable();
            }

            this.setAvailable();

            device
              .call("get_prop", ["power", "usb_on", "temperature", "wifi_led"])
              .then(result => {
                that.setCapabilityValue(
                  "onoff",
                  result[0] == "on" ? true : false
                );
                that.setCapabilityValue("onoff.usb", result[1]);
                that.setCapabilityValue("measure_temperature", result[2]);
                that.setCapabilityValue(
                  "onoff.led",
                  result[3] == "on" ? true : false
                );
                device.destroy();
              })
              .catch(error => {
                that.log("Sending commmand 'get_prop' error: ", error);
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
      changedKeys.includes("deviceIP") ||
      changedKeys.includes("deviceToken")
    ) {
      this.getXiaomiStatus(newSettings["updateTimer"]);
      callback(null, true);
    }
  }

  registerOnOffButton(name) {
    this.registerCapabilityListener(name, async value => {
      try {
        miio
          .device({
            address: this.getSetting("deviceIP"),
            token: this.getSetting("deviceToken")
          })
          .then(device => {
            device
              .call("set_power", [value ? "on" : "off"])
              .then(() => {
                this.log(
                  "Sending " + name + " commmand: " + value ? "on" : "off"
                );
                device.destroy();
              })
              .catch(error => {
                this.log(
                  "Sending commmand 'set_power' " + value
                    ? "on"
                    : "off" + " error: " + error
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

  registerUSBOnOffButton(name) {
    this.registerCapabilityListener(name, async value => {
      try {
        miio
          .device({
            address: this.getSetting("deviceIP"),
            token: this.getSetting("deviceToken")
          })
          .then(device => {
            device
              .call(value ? "set_usb_on" : "set_usb_off", [])
              .then(() => {
                this.log(
                  "Sending " + name + " commmand: " + value
                    ? "set_usb_on"
                    : "set_usb_off"
                );
                device.destroy();
              })
              .catch(error => {
                this.log(
                  "Sending commmand " + value
                    ? "set_usb_on"
                    : "set_usb_off" + " error: " + error
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

  registerLedOnOffButton(name) {
    this.registerCapabilityListener(name, async value => {
      try {
        miio
          .device({
            address: this.getSetting("deviceIP"),
            token: this.getSetting("deviceToken")
          })
          .then(device => {
            device
              .call("set_wifi_led", [value ? "on" : "off"])
              .then(() => {
                this.log(
                  "Sending " + name + " commmand: " + value ? "on" : "off"
                );
                device.destroy();
              })
              .catch(error => {
                this.log(
                  "Sending commmand 'set_wifi_led' " + value
                    ? "on"
                    : "off" + " error: " + error
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

module.exports = MiSmartPlugWiFiWith2USB;
