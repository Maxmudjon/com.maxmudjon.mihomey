const Homey = require("homey");
const miio = require("miio");

class CHINGMISmartPowerStrip extends Homey.Device {
  async onInit() {
    this.initialize = this.initialize.bind(this);
    this.driver = this.getDriver();
    this.data = this.getData();
    this.initialize();
    this.log("Mi Homey device init | name: " + this.getName() + " - class: " + this.getClass() + " - data: " + JSON.stringify(this.data));
  }

  async initialize() {
    this.registerCapabilities();
    this.getXiaomiStatus();
  }

  registerCapabilities() {
    this.registerOnOffButton("onoff");
  }

  getXiaomiStatus() {
    miio
      .device({ address: this.getSetting("deviceIP"), token: this.getSetting("deviceToken") })
      .then((device) => {
        if (!this.getAvailable()) {
          this.setAvailable();
        }
        const { triggers } = this.driver;
        this.device = device;

        this.device
          .call("get_prop", ["power", "power_consume_rate", "current", "voltage", "temperature"])
          .then((result) => {
            this.updateCapabilityValue("onoff", result[0] == "on" ? true : false);
            this.updateCapabilityValue("measure_power", parseInt(result[1]));
            this.updateCapabilityValue("meter_ampere", result[2] / 1000);
            let tokens = { ampere: result[2] / 1000 };
            this.triggerFlow(triggers.meterAmpere, "meterAmpere", tokens);
            this.updateCapabilityValue("measure_voltage", result[3] / 100);
            this.updateCapabilityValue("measure_temperature", result[4]);
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
    const { triggers } = this.driver;

    clearInterval(this.updateInterval);
    this.updateInterval = setInterval(() => {
      this.device
        .call("get_prop", ["power", "power_consume_rate", "current", "voltage", "temperature"])
        .then((result) => {
          if (!this.getAvailable()) {
            this.setAvailable();
          }
          this.updateCapabilityValue("onoff", result[0] == "on" ? true : false);
          this.updateCapabilityValue("measure_power", parseInt(result[1]));
          this.updateCapabilityValue("meter_ampere", result[2] / 1000);
          let tokens = { ampere: result[2] / 1000 };
          this.triggerFlow(triggers.meterAmpere, "meterAmpere", tokens);
          this.updateCapabilityValue("measure_voltage", result[3] / 100);
          this.updateCapabilityValue("measure_temperature", result[4]);
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

  triggerFlow(trigger, name, value) {
    if (!trigger) {
      return;
    }

    if (value) {
      trigger.trigger(this, value, true);
    }

    switch (name) {
      case "meterAmpere":
    }
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

module.exports = CHINGMISmartPowerStrip;
