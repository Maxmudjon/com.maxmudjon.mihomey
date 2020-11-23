const Homey = require("homey");
const miio = require("miio");

class MiAirPurifierMJXFJ extends Homey.Device {
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
    this.getPurifierStatus();
  }

  registerActions() {
    const { actions } = this.driver;
    this.registerPurifierOnAction("purifier_on", actions.purifierOn);
    this.registerPurifierOffAction("purifier_off", actions.purifierOff);
    this.registerPurifierModeAction("purifier_mode", actions.purifierMode);
    this.registerPurifierSpeedAction("purifier_speed", actions.purifierSpeed);
  }

  registerCapabilities() {
    this.registerOnOffButton("onoff");
    this.registerPTCOnOffButton("onoff.ptc");
    this.registerFavoriteLevel("dim");
    this.registerAirPurifierMode("air_purifier_t2017_mode");
    this.registerAirPurifierHeatingMode("air_heater_mode");
  }

  getPurifierStatus() {
    miio
      .device({ address: this.getSetting("deviceIP"), token: this.getSetting("deviceToken") })
      .then((device) => {
        if (!this.getAvailable()) {
          this.setAvailable();
        }
        this.device = device;

        this.device
          .call("get_prop", [
            "power",
            "pm25",
            "co2",
            "temperature_outside",
            "mode",
            "ptc_level",
            "favourite_speed",
            "display",
            "sound",
            "child_lock",
            "filter_efficient",
            "filter_intermediate",
            "screen_direction",
            "ptc_level",
            "ptc_on",
            "ptc_status",
          ])
          .then((result) => {
            this.updateCapabilityValue("onoff", result[0]);
            this.updateCapabilityValue("measure_pm25", parseInt(result[1]));
            this.updateCapabilityValue("measure_co2", parseInt(result[2]));
            this.updateCapabilityValue("measure_temperature", parseInt(result[3]));
            this.updateCapabilityValue("air_purifier_t2017_mode", result[4]);
            this.updateCapabilityValue("air_heater_mode", result[5]);
            this.updateCapabilityValue("dim", parseInt(this.normalize[result[6]], 60, 300));
            this.setSettings({ display: result[7] });
            this.setSettings({ sound: result[8] });
            this.setSettings({ childLock: result[9] });
            this.setSettings({ filter_efficient: parseInt(result[10]).toString() + "%" });
            this.setSettings({ filter_intermediate: parseInt(result[11]).toString() + "%" });
            this.setSettings({ screen_direction: result[12] });

            if (result[13] && result[14]) {
              this.updateCapabilityValue("air_heater_mode", result[13]);
            } else this.updateCapabilityValue("air_heater_mode", "off");
            this.updateCapabilityValue("onoff.ptc", result[14]);
          })
          .catch((error) => {
            this.log("Sending commmand 'get_prop' error: ", error);
          });

        const update = this.getSetting("updateTimer") || 60;
        this.updateTimer(update);
      })
      .catch((error) => {
        this.setUnavailable(error.message);
        clearInterval(this.updateInterval);
        setTimeout(() => {
          this.getPurifierStatus();
        }, 10000);
      });
  }

  updateTimer(interval) {
    clearInterval(this.updateInterval);
    this.updateInterval = setInterval(() => {
      this.device
        .call("get_prop", [
          "power",
          "pm25",
          "co2",
          "temperature_outside",
          "mode",
          "ptc_level",
          "favourite_speed",
          "display",
          "sound",
          "child_lock",
          "filter_efficient",
          "filter_intermediate",
          "screen_direction",
          "ptc_level",
          "ptc_on",
          "ptc_status",
        ])
        .then((result) => {
          if (!this.getAvailable()) {
            this.setAvailable();
          }
          this.updateCapabilityValue("onoff", result[0]);
          this.updateCapabilityValue("measure_pm25", parseInt(result[1]));
          this.updateCapabilityValue("measure_co2", parseInt(result[2]));
          this.updateCapabilityValue("measure_temperature", parseInt(result[3]));
          this.updateCapabilityValue("air_purifier_t2017_mode", result[4]);
          this.updateCapabilityValue("air_heater_mode", result[5]);
          this.updateCapabilityValue("dim", parseInt(this.normalize[result[6]], 60, 300));
          this.setSettings({ display: result[7] });
          this.setSettings({ sound: result[8] });
          this.setSettings({ childLock: result[9] });
          this.setSettings({ filter_efficient: parseInt(result[10]).toString() + "%" });
          this.setSettings({ filter_intermediate: parseInt(result[11]).toString() + "%" });
          this.setSettings({ screen_direction: result[12] });

          if (result[13] && result[14]) {
            this.updateCapabilityValue("air_heater_mode", result[13]);
          } else this.updateCapabilityValue("air_heater_mode", "off");
          this.updateCapabilityValue("onoff.ptc", result[14]);
        })
        .catch((error) => {
          this.log("Sending commmand 'get_prop' error: ", error);
          this.setUnavailable(error.message);
          clearInterval(this.updateInterval);
          setTimeout(() => {
            this.getPurifierStatus();
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

  normalize(value, min, max) {
    let normalized = (value - min) / (max - min);
    return Number(normalized.toFixed(2));
  }

  onSettings(oldSettings, newSettings, changedKeys, callback) {
    if (changedKeys.includes("updateTimer") || changedKeys.includes("deviceIP") || changedKeys.includes("deviceToken")) {
      this.getPurifierStatus();
      callback(null, true);
    }

    if (changedKeys.includes("display")) {
      this.device
        .call("set_display", [newSettings.display ? "on" : "off"])
        .then(() => {
          this.log("Sending " + this.getName() + " commmand: " + newSettings.display);
          callback(null, true);
        })
        .catch((error) => {
          this.log("Sending commmand 'set_sound' " + newSettings.display + " error: ", error);
          callback(error, false);
        });
    }

    if (changedKeys.includes("sound")) {
      this.device
        .call("set_sound", [newSettings.sound ? "on" : "off"])
        .then(() => {
          this.log("Sending " + this.getName() + " commmand: " + newSettings.sound);
          callback(null, true);
        })
        .catch((error) => {
          this.log("Sending commmand 'set_sound' " + newSettings.sound + " error: ", error);
          callback(error, false);
        });
    }

    if (changedKeys.includes("childLock")) {
      this.device
        .call("set_child_lock", [newSettings.childLock ? "on" : "off"])
        .then(() => {
          this.log("Sending " + this.getName() + " commmand: " + newSettings.childLock);
          callback(null, true);
        })
        .catch((error) => {
          this.log("Sending commmand 'set_sound' " + newSettings.childLock + " error: ", error);
          callback(error, false);
        });
    }

    if (changedKeys.includes("screen_direction")) {
      this.device
        .call("set_screen_direction", [newSettings.screen_direction])
        .then(() => {
          this.log("Sending commmand: " + newSettings.screen_direction);
          callback(null, true);
        })
        .catch((error) => {
          this.log("Sending commmand 'set_screen_direction' " + newSettings.screen_direction + " error: ", error);
          callback(error, false);
        });
    }
  }

  registerOnOffButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("set_power", [value])
        .then(() => {
          this.log("Sending " + name + " commmand: " + value);
          callback(null, true);
        })
        .catch((error) => {
          this.log("Sending commmand 'set_power' " + value + " error: " + error);
          callback(error, false);
        });
    });
  }

  registerPTCOnOffButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("set_ptc_on", [value])
        .then(() => {
          this.log("Sending " + name + " commmand: " + value);
          callback(null, true);
        })
        .catch((error) => {
          this.log("Sending commmand 'set_ptc_on' " + value + " error: " + error);
          callback(error, false);
        });
    });
  }

  registerFavoriteLevel(name) {
    this.registerCapabilityListener(name, async (value) => {
      let speed = value * 100;
      if (speed > 0) {
        this.device
          .call("set_favourite_speed", [parseInt(speed * 2.4 + 60)])
          .then(() => {
            this.log("Sending " + name + " commmand: " + value);
            callback(null, true);
          })
          .catch((error) => {
            this.log("Sending commmand 'set_favourite_speed' " + value + " error: " + error);
            callback(error, false);
          });
      }
    });
  }

  registerAirPurifierMode(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("set_mode", [value])
        .then(() => {
          this.log("Sending " + name + " commmand: " + value);
          callback(null, true);
        })
        .catch((error) => {
          this.log("Sending commmand 'set_mode' " + value + " error: " + error);
          callback(error, false);
        });
    });
  }

  registerAirPurifierHeatingMode(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("set_ptc_level", [value])
        .then(() => {
          this.log("Sending " + name + " commmand: " + value);
          callback(null, true);
        })
        .catch((error) => {
          this.log("Sending commmand 'set_ptc_level' " + value + " error: " + error);
          callback(error, false);
        });
    });
  }

  registerPurifierOnAction(name, action) {
    var that = this;
    action.registerRunListener(async (args, state) => {
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

  registerPurifierOffAction(name, action) {
    var that = this;
    action.registerRunListener(async (args, state) => {
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

  registerPurifierModeAction(name, action) {
    var that = this;
    action.registerRunListener(async (args, state) => {
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

  registerPurifierSpeedAction(name, action) {
    var that = this;
    action.registerRunListener(async (args, state) => {
      try {
        miio
          .device({
            address: args.device.getSetting("deviceIP"),
            token: args.device.getSetting("deviceToken"),
          })
          .then((device) => {
            device
              .call("set_favourite_speed", [parseInt(speed * 2.4 + 60)])
              .then(() => {
                that.log("Set 'set_favourite_speed': ", parseInt(speed * 2.4 + 60));
                device.destroy();
              })
              .catch((error) => {
                that.log("Set 'set_favourite_speed' error: ", error);
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
  }
}

module.exports = MiAirPurifierMJXFJ;
