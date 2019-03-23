const Homey = require("homey");
const miio = require("miio");

class MiSmartPlugWiFi extends Homey.Device {
  async onInit() {
    this.initialize = this.initialize.bind(this);
    this.driver = this.getDriver();
    this.data = this.getData();
    this.updateInterval;
    this.initialize();
    this.log("Mi Homey device init | " + "name: " + this.getName() + " - " + "class: " + this.getClass() + " - " + "data: " + JSON.stringify(this.data));
  }

  async initialize() {
    this.registerCapabilities();
    this.getXiaomiStatus();
  }

  registerCapabilities() {
    this.registerOnOffButton("onoff");
    this.registerLedOnOffButton("onoff.led");
  }

  getXiaomiStatus() {
    var that = this;
    miio
      .device({ address: this.getSetting("deviceIP"), token: this.getSetting("deviceToken") })
      .then(device => {
        this.setAvailable();
        this.device = device;

        this.device
          .call("get_prop", ["power", "temperature", "wifi_led"])
          .then(result => {
            that.setCapabilityValue("onoff", result[0] === "on" ? true : false);
            that.setCapabilityValue("measure_temperature", result[1]);
            that.setCapabilityValue("onoff.led", result[2] === "on" ? true : false);
          })
          .catch(error => that.log("Sending commmand 'get_prop' error: ", error));

        var update = this.getSetting("updateTimer") || 60;
        this.updateTimer(update);
      })
      .catch(error => {
        this.log(error);
        if (error == "Error: Could not connect to device, handshake timeout") {
          this.setUnavailable(Homey.__("Could not connect to device, handshake timeout"));
          this.log("Error: Could not connect to device, handshake timeout");
        } else if (error == "Error: Could not connect to device, token might be wrong") {
          this.setUnavailable(Homey.__("Could not connect to device, token might be wrong"));
          this.log("Error: Could not connect to device, token might be wrong");
        }
        setTimeout(() => {
          this.getXiaomiStatus();
        }, 10000);
      });
  }

  updateTimer(interval) {
    clearInterval(this.updateInterval);
    var that = this;
    this.updateInterval = setInterval(() => {
      this.device
        .call("get_prop", ["power", "temperature", "wifi_led"])
        .then(result => {
          that.setCapabilityValue("onoff", result[0] === "on" ? true : false);
          that.setCapabilityValue("measure_temperature", result[1]);
          that.setCapabilityValue("onoff.led", result[2] === "on" ? true : false);
        })
        .catch(error => that.log("Sending commmand 'get_prop' error: ", error));
    }, 1000 * interval);
  }

  onSettings(oldSettings, newSettings, changedKeys, callback) {
    if (changedKeys.includes("updateTimer") || changedKeys.includes("deviceIP") || changedKeys.includes("deviceToken")) {
      this.getXiaomiStatus();
      callback(null, true);
    }
  }

  registerOnOffButton(name) {
    this.registerCapabilityListener(name, async value => {
      this.device
        .call("set_power", [value ? "on" : "off"])
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch(error => this.log("Sending commmand 'set_power' error: ", error));
    });
  }

  registerLedOnOffButton(name) {
    this.registerCapabilityListener(name, async value => {
      this.device
        .call("set_wifi_led", [value ? "on" : "off"])
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch(error => this.log("Sending commmand 'set_wifi_led' error: ", error));
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

module.exports = MiSmartPlugWiFi;
