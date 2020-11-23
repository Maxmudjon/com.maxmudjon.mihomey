const Homey = require("homey");
const miio = require("miio");

class MiAirFreshVA4 extends Homey.Device {
  async onInit() {
    this.initialize = this.initialize.bind(this);
    this.driver = this.getDriver();
    this.data = this.getData();
    this.favoriteLevel = [0, 5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 95, 100];
    this.initialize();
    this.log("MiJia device init | name: " + this.getName() + " - class: " + this.getClass() + " - data: " + JSON.stringify(this.data));
  }

  async initialize() {
    this.registerActions();
    this.registerCapabilities();
    this.getAirFreshStatus();
  }

  registerActions() {
    const { actions } = this.driver;
    this.registerAirFreshOnAction("air_fresh_on", actions.airFreshOn);
    this.registerAirFreshOffAction("air_fresh_off", actions.airFreshOff);
    this.registerAirFreshModeAction("air_fresh_mode", actions.airFreshMode);
  }

  registerCapabilities() {
    this.registerOnOffButton("onoff");
    this.registerOnOffPTCButton("onoff.ptc");
    this.registerAirFreshMode("air_fresh_mode");
  }

  getAirFreshStatus() {
    miio
      .device({ address: this.getSetting("deviceIP"), token: this.getSetting("deviceToken") })
      .then((device) => {
        if (!this.getAvailable()) {
          this.setAvailable();
        }

        this.device = device;

        this.device
          .call("get_prop", ["power", "ptc_state", "mode", "aqi", "co2", "humidity", "temp_dec", "led_level", "buzzer", "child_lock", "f1_hour_used", "motor1_speed"])
          .then((result) => {
            this.updateCapabilityValue("onoff", result[0] === "on" ? true : false);
            this.updateCapabilityValue("onoff.ptc", result[1] === "on" ? true : false);
            this.updateCapabilityValue("air_fresh_mode", result[2]);
            this.updateCapabilityValue("measure_pm25", parseInt(result[3]));
            this.updateCapabilityValue("measure_co2", parseInt(result[4]));
            this.updateCapabilityValue("measure_humidity", parseFloat(result[5]));
            this.updateCapabilityValue("measure_temperature", parseFloat(result[6]));
            this.setSettings({ led: result[7] == 0 || 1 ? true : false });
            this.setSettings({ buzzer: result[8] == "on" ? true : false });
            this.setSettings({ childLock: result[9] == "on" ? true : false });
            this.setSettings({ f1_hour_used: "Has been used for " + Math.round(result[10] / 24) + " days" });
          })
          .catch((error) => this.log("Sending commmand 'get_prop' error: ", error));

        const update = this.getSetting("updateTimer") || 60;
        this.updateTimer(update);
      })
      .catch((error) => {
        clearInterval(this.updateInterval);
        this.setUnavailable(error.message);
        setTimeout(() => {
          this.getAirFreshStatus();
        }, 10000);
      });
  }

  updateTimer(interval) {
    clearInterval(this.updateInterval);
    this.updateInterval = setInterval(() => {
      this.device
        .call("get_prop", ["power", "ptc_state", "mode", "aqi", "co2", "humidity", "temp_dec", "led_level", "buzzer", "child_lock", "f1_hour_used", "motor1_speed"])
        .then((result) => {
          if (!this.getAvailable()) {
            this.setAvailable();
          }
          this.updateCapabilityValue("onoff", result[0] === "on" ? true : false);
          this.updateCapabilityValue("onoff.ptc", result[1] === "on" ? true : false);
          this.updateCapabilityValue("air_fresh_mode", result[2]);
          this.updateCapabilityValue("measure_pm25", parseInt(result[3]));
          this.updateCapabilityValue("measure_co2", parseInt(result[4]));
          this.updateCapabilityValue("measure_humidity", parseFloat(result[5]));
          this.updateCapabilityValue("measure_temperature", parseFloat(result[6]));
          this.setSettings({ led: result[7] == 0 || 1 ? true : false });
          this.setSettings({ buzzer: result[8] == "on" ? true : false });
          this.setSettings({ childLock: result[9] == "on" ? true : false });
          this.setSettings({ f1_hour_used: "Has been used for " + Math.round(result[10] / 24) + " days" });
        })
        .catch((error) => {
          this.log("Sending commmand error: ", error);
          clearInterval(this.updateInterval);
          this.setUnavailable(error.message);
          setTimeout(() => {
            this.getAirFreshStatus();
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
      this.getAirFreshStatus();
      callback(null, true);
    }

    if (changedKeys.includes("led")) {
      this.device
        .call("set_led_level", [newSettings.led ? 0 : 2])
        .then(() => {
          this.log("Sending commmand 'set_led_level' value: " + newSettings.led);
          callback(null, true);
        })
        .catch((error) => {
          this.log("Sending commmand 'set_led_level' error: ", error);
          callback(error, false);
        });
    }

    if (changedKeys.includes("buzzer")) {
      this.device
        .call("set_buzzer", [newSettings.buzzer ? "on" : "off"])
        .then(() => {
          this.log("Sending commmand 'set_buzzer' value: " + newSettings.buzzer);
          callback(null, true);
        })
        .catch((error) => {
          this.log("Sending commmand 'set_buzzer' error: ", error);
          callback(error, false);
        });
    }

    if (changedKeys.includes("childLock")) {
      this.device
        .call("set_child_lock", [newSettings.childLock ? "on" : "off"])
        .then(() => {
          this.log("Sending commmand 'set_child_lock' value: " + newSettings.childLock);
          callback(null, true);
        })
        .catch((error) => {
          this.log("Sending commmand 'set_child_lock' error: ", error);
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

  registerOnOffPTCButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("set_ptc_state", [value ? "on" : "off"])
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'set_ptc_state' error: ", error));
    });
  }

  registerAirFreshMode(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("set_mode", [value])
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'set_mode' error: ", error));
    });
  }

  registerAirFreshOnAction(name, action) {
    var that = this;
    action.action.registerRunListener(async (args, state) => {
      try {
        miio
          .device({
            address: args.device.getSetting("deviceIP"),
            token: args.device.getSetting("deviceToken"),
          })
          .then((device) => {
            device
              .call("set_power", ["on"])
              .then(() => {
                that.log("Set 'set_power' ON");
                device.destroy();
              })
              .catch((error) => {
                that.log("Set 'set_power' error: ", error);
                device.destroy();
              });
          })
          .catch((error) => {
            that.log("miio connect error: " + error);
          });
      } catch (error) {
        that.log("catch error: " + error);
      }
    });
  }

  registerAirFreshOffAction(name, action) {
    var that = this;
    action.action.registerRunListener(async (args, state) => {
      try {
        miio
          .device({
            address: args.device.getSetting("deviceIP"),
            token: args.device.getSetting("deviceToken"),
          })
          .then((device) => {
            device
              .call("set_power", ["off"])
              .then(() => {
                that.log("Set 'set_power' OFF");
                device.destroy();
              })
              .catch((error) => {
                that.log("Set 'set_power' error: ", error);
                device.destroy();
              });
          })
          .catch((error) => {
            that.log("miio connect error: " + error);
          });
      } catch (error) {
        that.log("catch error: " + error);
      }
    });
  }

  registerAirFreshModeAction(name, action) {
    var that = this;
    action.action.registerRunListener(async (args, state) => {
      try {
        miio
          .device({
            address: args.device.getSetting("deviceIP"),
            token: args.device.getSetting("deviceToken"),
          })
          .then((device) => {
            device
              .call("set_mode", [args.modes])
              .then(() => {
                that.log("Set 'set_mode': ", args.modes);
                device.destroy();
              })
              .catch((error) => {
                that.log("Set 'set_mode' error: ", error);
                device.destroy();
              });
          })
          .catch((error) => {
            that.log("miio connect error: " + error);
          });
      } catch (error) {
        that.log("catch error: " + error);
      }
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

module.exports = MiAirFreshVA4;
