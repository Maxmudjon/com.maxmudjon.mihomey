const Homey = require("homey");
const miio = require("miio");

class MiSmartPowerStrip extends Homey.Device {
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
    this.registerLedOnOffButton("onoff.led");
  }

  async getDeviceStatus() {
    try {
      this.miioDevice = await miio.device({ address: this.getSetting("deviceIP"), token: this.getSetting("deviceToken") });
      const result = await this.miioDevice.call("get_prop", ["power", "power_consume_rate", "current", "temperature", "wifi_led"]);
      const { triggers } = this.driver;

      this.setAvailable();

      this.updateCapabilityValue("onoff", result[0] === "on" ? true : false);
      this.updateCapabilityValue("measure_power", parseInt(result[1]));
      this.updateCapabilityValue("meter_ampere", result[2]);
      this.updateCapabilityValue("measure_temperature", result[3]);
      this.updateCapabilityValue("onoff.led", result[4] == "on" ? true : false);

      let tokens = { ampere: result[2] };
      triggers.meterAmpere.trigger(this, tokens, true);

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
        const result = await this.miioDevice.call("get_prop", ["power", "power_consume_rate", "current", "temperature", "wifi_led"]);
        const { triggers } = this.driver;

        this.setAvailable();

        this.updateCapabilityValue("onoff", result[0] === "on" ? true : false);
        this.updateCapabilityValue("measure_power", parseInt(result[1]));
        this.updateCapabilityValue("meter_ampere", result[2]);
        this.updateCapabilityValue("measure_temperature", result[3]);
        this.updateCapabilityValue("onoff.led", result[4] == "on" ? true : false);

        let tokens = { ampere: result[2] };
        triggers.meterAmpere.trigger(this, tokens, true);
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

  registerLedOnOffButton(name) {
    this.registerCapabilityListener(name, async value => {
      try {
        await this.miioDevice.call("set_wifi_led", [value ? "on" : "off"]);
      } catch (error) {
        this.error(error.message);
      }
    });
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

module.exports = MiSmartPowerStrip;
