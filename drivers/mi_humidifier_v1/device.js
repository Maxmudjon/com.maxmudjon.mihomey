const Homey = require("homey");
const miio = require("miio");

class MiHumidifierV1 extends Homey.Device {
  async onInit() {
    this.initialize = this.initialize.bind(this);
    this.driver = this.getDriver();
    this.data = this.getData();
    this.initialize();
    this.log("Mi Homey device init | name: " + this.getName() + " - class: " + this.getClass() + " - data: " + JSON.stringify(this.data));
  }

  async initialize() {
    this.registerActions();
    this.registerCapabilities();
    this.getHumidifierStatus();
  }

  registerActions() {
    const { actions } = this.driver;
    this.registerHumidifierOnAction("humidifier_on", actions.humidifierOn);
    this.registerHumidifierOffAction("humidifier_off", actions.humidifierOff);
    this.registerHumidifierModeAction("humidifier_mode", actions.humidifierMode);
  }

  registerCapabilities() {
    this.registerOnOffButton("onoff");
    this.registerTargetRelativeHumidity("dim");
    this.registerHumidifierMode("humidifier_mode");
  }

  getHumidifierStatus() {
    miio
      .device({
        address: this.getSetting("deviceIP"),
        token: this.getSetting("deviceToken"),
      })
      .then((device) => {
        if (!this.getAvailable()) {
          this.setAvailable();
        }
        this.device = device;

        this.device
          .call("get_prop", ["power", "humidity", "temp_dec", "mode", "target_humidity", "led_b", "buzzer"])
          .then((result) => {
            this.updateCapabilityValue("onoff", result[0] === "on" ? true : false);
            this.updateCapabilityValue("measure_humidity", parseInt(result[1]));
            this.updateCapabilityValue("measure_temperature", parseInt(result[2] / 10));
            this.updateCapabilityValue("humidifier_mode", result[3]);
            this.updateCapabilityValue("dim", parseInt(result[4] / 100));
            this.setSettings({ led: result[5] === 2 ? false : true });
            this.setSettings({ buzzer: result[6] === "on" ? 1 : 0 });
          })
          .catch((error) => this.log("Sending commmand 'get_prop' error: ", error));

        const update = this.getSetting("updateTimer") || 60;
        this.updateTimer(update);
      })
      .catch((error) => {
        this.setUnavailable(error.message);
        clearInterval(this.updateInterval);
        setTimeout(() => {
          this.getHumidifierStatus();
        }, 10000);
      });
  }

  updateTimer(interval) {
    clearInterval(this.updateInterval);
    this.updateInterval = setInterval(() => {
      this.device
        .call("get_prop", ["power", "humidity", "temp_dec", "mode", "target_humidity", "led_b", "buzzer"])
        .then((result) => {
          if (!this.getAvailable()) {
            this.setAvailable();
          }
          this.updateCapabilityValue("onoff", result[0] === "on" ? true : false);
          this.updateCapabilityValue("measure_humidity", parseInt(result[1]));
          this.updateCapabilityValue("measure_temperature", parseInt(result[2] / 10));
          this.updateCapabilityValue("humidifier_mode", result[3]);
          this.updateCapabilityValue("dim", parseInt(result[4] / 100));
          this.setSettings({ led: result[5] === 2 ? false : true });
          this.setSettings({ buzzer: result[6] === "on" ? 1 : 0 });
        })
        .catch((error) => {
          this.log("Sending commmand error: ", error);
          this.setUnavailable(error.message);
          clearInterval(this.updateInterval);
          setTimeout(() => {
            this.getHumidifierStatus();
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
      this.getHumidifierStatus();
      callback(null, true);
    }

    if (changedKeys.includes("led")) {
      this.device
        .call("set_led_b", [newSettings.led ? 1 : 0])
        .then(() => {
          this.log("Sending " + this.getName() + " commmand: " + newSettings.led);
          callback(null, true);
        })
        .catch((error) => {
          this.log("Sending commmand 'set_led_b' error: ", error);
          callback(error, false);
        });
    }

    if (changedKeys.includes("buzzer")) {
      this.device
        .call("set_buzzer", [newSettings.buzzer ? "on" : "off"])
        .then(() => {
          this.log("Sending " + this.getName() + " commmand: " + newSettings.buzzer);
          callback(null, true);
        })
        .catch((error) => {
          this.log("Sending commmand 'set_buzzer' error: ", error);
          callback(error, false);
        });
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

  registerTargetRelativeHumidity(name) {
    this.registerCapabilityListener(name, async (value) => {
      let humidity = value * 100;
      if (humidity > 0) {
        this.device
          .call("set_target_humidity", [humidity])
          .then(() => this.log("Sending " + name + " commmand: " + value))
          .catch((error) => this.log("Sending commmand 'set_target_humidity' error: ", error));
      }
    });
  }

  registerHumidifierMode(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("set_mode", [value])
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'set_mode' error: ", error));
    });
  }

  registerHumidifierOnAction(name, action) {
    var that = this;
    action.action.registerRunListener(async (args, state) => {
      that.device
        .call("set_power", ["on"])
        .then(() => that.log("Set 'set_power': ", args))
        .catch((error) => that.log("Set 'set_power' error: ", error));
    });
  }

  registerHumidifierOffAction(name, action) {
    var that = this;
    action.action.registerRunListener(async (args, state) => {
      that.device
        .call("set_power", ["off"])
        .then(() => that.log("Set 'set_power': ", args))
        .catch((error) => that.log("Set 'set_power' error: ", error));
    });
  }

  registerHumidifierModeAction(name, action) {
    var that = this;
    action.action.registerRunListener(async (args, state) => {
      that.device
        .call("set_mode", [args.modes])
        .then(() => that.log("Set 'set_mode': ", args.modes))
        .catch((error) => that.log("Set 'set_mode' error: ", error));
    });
  }

  getFavoriteLevel(speed) {
    for (var i = 1; i < this.favoriteLevel.length; i++) {
      if (speed > this.favoriteLevel[i - 1] && speed <= this.favoriteLevel[i]) {
        return i;
      }
    }

    return 1;
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

module.exports = MiHumidifierV1;
