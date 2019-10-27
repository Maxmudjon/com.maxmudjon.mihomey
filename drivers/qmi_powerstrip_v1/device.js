const Homey = require("homey");
const miio = require("miio");

class CHINGMISmartPowerStrip extends Homey.Device {
  onInit() {
    this.driver = this.getDriver();
    this.data = this.getData();
    this.log("Mi Homey device init | " + "name: " + this.getName() + " - " + "class: " + this.getClass() + " - " + "id: " + this.data.id);
    this.initialize();
  }

  async initialize() {
    this.registerCapabilities();
    this.getDeviceStatus();
  }

  registerCapabilities() {
    this.registerOnOffButton("onoff");
  }

  async getDeviceStatus() {
    try {
      const { triggers } = this.driver;
      this.miioDevice = await miio.device({ address: this.getSetting("deviceIP"), token: this.getSetting("deviceToken") });
      const result = await this.miioDevice.call("get_prop", ["power", "power_consume_rate", "current", "voltage", "temperature"]);

      this.setAvailable();

      this.updateCapabilityValue("onoff", result[0] === "on" ? true : false);
      this.updateCapabilityValue("measure_power", parseInt(result[1]));
      this.updateCapabilityValue("meter_ampere", result[2] / 1000);
      let tokens = { ampere: result[2] / 1000 };
      this.triggerFlow(triggers.meterAmpere, "meterAmpere", tokens);
      this.updateCapabilityValue("measure_voltage", result[3] / 100);
      this.updateCapabilityValue("measure_temperature", result[4]);

      let update = this.getSetting("updateTimer") || 60;
      this.updateTimer(update);
    } catch (error) {
      this.error(error.message);
      this.setUnavailable(Homey.__("reconnecting"));
      setTimeout(() => this.getDeviceStatus(), 10000);
    }
  }

  updateTimer(interval) {
    clearInterval(this.updateInterval);
    this.updateInterval = setInterval(async () => {
      try {
        const { triggers } = this.driver;
        const result = await this.miioDevice.call("get_prop", ["power", "power_consume_rate", "current", "voltage", "temperature"]);

        this.setAvailable();

        this.updateCapabilityValue("onoff", result[0] === "on" ? true : false);
        this.updateCapabilityValue("measure_power", parseInt(result[1]));
        this.updateCapabilityValue("meter_ampere", result[2] / 1000);
        let tokens = { ampere: result[2] / 1000 };
        this.triggerFlow(triggers.meterAmpere, "meterAmpere", tokens);
        this.updateCapabilityValue("measure_voltage", result[3] / 100);
        this.updateCapabilityValue("measure_temperature", result[4]);
      } catch (error) {
        this.error(error.message);
        this.setUnavailable(Homey.__("reconnecting"));
        setTimeout(() => {
          this.miioDevice.destroy();
          clearInterval(this.updateInterval);
          this.getDeviceStatus();
        }, 10000);
      }
    }, 1000 * interval);
  }

  updateCapabilityValue(name, value) {
    if (this.getCapabilityValue(name) != value) {
      this.setCapabilityValue(name, value)
        .then(() => {
          this.log("[" + this.data.id + "]" + " [" + name + "] [" + value + "] Capability successfully updated");
        })
        .catch(error => {
          this.error("[" + this.data.id + "]" + " [" + name + "] [" + value + "] Capability not updated because there are errors: " + error.message);
        });
    }
  }

  onSettings(oldSettings, newSettings, changedKeys, callback) {
    if (changedKeys.includes("updateTimer") || changedKeys.includes("deviceIP") || changedKeys.includes("deviceToken")) {
      this.miioDevice.destroy();
      this.getDeviceStatus();
      callback(null, true);
    }
  }

  registerOnOffButton(name) {
    this.registerCapabilityListener(name, async value => {
      try {
        await this.miioDevice.call("set_power", [value ? "on" : "off"]);
      } catch (error) {
        this.error(error.message);
      }
    });
  }

  triggerFlow(trigger, name, value) {
    if (!trigger) {
      return;
    }

    if (value) {
      trigger.trigger(this, value, true);
    }
  }

  onAdded() {
    this.log("Device added");
  }

  onDeleted() {
    this.log("Device deleted deleted");
    clearInterval(this.updateInterval);
    if (typeof this.device !== "undefined") {
      this.device.destroy();
    }
  }
}

module.exports = CHINGMISmartPowerStrip;
