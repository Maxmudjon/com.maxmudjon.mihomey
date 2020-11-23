const Homey = require("homey");
const miio = require("miio");

class MiSmartPlugWiFiWith2USB extends Homey.Device {
  async onInit() {
    this.initialize = this.initialize.bind(this);
    this.driver = this.getDriver();
    this.data = this.getData();
    this.updateInterval;
    this.initialize();
    this.log("Mi Homey device init | name: " + this.getName() + " - class: " + this.getClass() + " - data: " + JSON.stringify(this.data));
  }

  async initialize() {
    this.registerActions();
    this.registerCapabilities();
    this.getXiaomiStatus();
  }

  registerActions() {
    const { actions } = this.driver;
    this.registerUSBOnAction("power_usb_on", actions.usbOn);
    this.registerUSBOffAction("power_usb_off", actions.usbOff);
  }

  registerCapabilities() {
    this.registerOnOffButton("onoff");
    this.registerUSBOnOffButton("onoff.usb");
    this.registerLedOnOffButton("onoff.led");
  }

  getXiaomiStatus() {
    miio
      .device({ address: this.getSetting("deviceIP"), token: this.getSetting("deviceToken") })
      .then((device) => {
        if (!this.getAvailable()) {
          this.setAvailable();
        }

        this.device = device;

        this.device
          .call("get_prop", ["power", "usb_on", "temperature", "wifi_led"])
          .then((result) => {
            this.updateCapabilityValue("onoff", result[0] == "on" ? true : false);
            this.updateCapabilityValue("onoff.usb", result[1]);
            this.updateCapabilityValue("measure_temperature", result[2]);
            this.updateCapabilityValue("onoff.led", result[3] == "on" ? true : false);
          })
          .catch((error) => this.log("Sending commmand 'get_prop' error: ", error));

        const update = this.getSetting("updateTimer") || 60;
        this.updateTimer(update);
      })
      .catch((error) => {
        this.setUnavailable(error.message);
        clearInterval(this.updateInterval);
        setTimeout(() => {
          this.getXiaomiStatus();
        }, 10000);
      });
  }

  updateTimer(interval) {
    clearInterval(this.updateInterval);
    this.updateInterval = setInterval(() => {
      this.device
        .call("get_prop", ["power", "usb_on", "temperature", "wifi_led"])
        .then((result) => {
          if (!this.getAvailable()) {
            this.setAvailable();
          }
          this.updateCapabilityValue("onoff", result[0] == "on" ? true : false);
          this.updateCapabilityValue("onoff.usb", result[1]);
          this.updateCapabilityValue("measure_temperature", result[2]);
          this.updateCapabilityValue("onoff.led", result[3] == "on" ? true : false);
        })
        .catch((error) => {
          this.log("Sending commmand 'get_prop' error: ", error);
          this.setUnavailable(error.message);
          clearInterval(this.updateInterval);
          setTimeout(() => {
            this.getXiaomiStatus();
          }, 1000 * interval);
        });
    }, 1000 * interval);
  }

  updateCapabilityValue(capabilityName, value) {
    if (this.getCapabilityValue(capabilityName) != value) {
      this.setCapabilityValue(capabilityName, value)
        .then(() => {
          this.log("[" + this.data.id + "] [" + capabilityName + "] [" + value + "] Capability successfully updated");
        })
        .catch((error) => {
          this.log("[" + this.data.id + "] [" + capabilityName + "] [" + value + "] Capability not updated because there are errors: " + error.message);
        });
    }
  }

  onSettings(oldSettings, newSettings, changedKeys, callback) {
    if (changedKeys.includes("updateTimer") || changedKeys.includes("deviceIP") || changedKeys.includes("deviceToken")) {
      this.getXiaomiStatus();
      callback(null, true);
    }
  }

  registerOnOffButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("set_power", [value ? "on" : "off"])
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'set_power' error: ", error));
    });
  }

  registerUSBOnOffButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call(value ? "set_usb_on" : "set_usb_off", [])
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'set_usb_on' error: ", error));
    });
  }

  registerLedOnOffButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("set_wifi_led", [value ? "on" : "off"])
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'set_wifi_led' error: ", error));
    });
  }

  registerUSBOnAction(name, action) {
    action.registerRunListener(async (args, state) => {
      this.device
        .call("set_usb_on", [])
        .then(() => this.log("Sending " + name + " commmand: set_usb_on"))
        .catch((error) => this.log("Sending commmand 'set_usb_on' error: ", error));
    });
  }

  registerUSBOffAction(name, action) {
    action.registerRunListener(async (args, state) => {
      this.device
        .call("set_usb_off", [])
        .then(() => this.log("Sending " + name + " commmand: set_usb_off"))
        .catch((error) => this.log("Sending commmand 'set_usb_off' error: ", error));
    });
  }

  onAdded() {
    this.log("Device added");
  }

  onDeleted() {
    this.log("Device deleted");
    clearInterval(this.updateInterval);
    if (typeof this.device !== "undefined") {
      this.device.destroy();
    }
  }
}

module.exports = MiSmartPlugWiFiWith2USB;
