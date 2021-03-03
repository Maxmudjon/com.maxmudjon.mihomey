const Homey = require("homey");
const miio = require("miio");

class MiAirPurifierPro extends Homey.Device {
  async onInit() {
    this.initialize = this.initialize.bind(this);
    this.driver = this.getDriver();
    this.data = this.getData();
    this.favoriteLevel = [0, 5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 95, 100];
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
    this.registerFavoriteLevel("dim");
    this.registerAirPurifierMode("air_purifier_mode");
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
          .call("get_prop", ["power", "aqi", "average_aqi", "humidity", "temp_dec", "bright", "mode", "favorite_level", "filter1_life", "use_time", "purify_volume", "led", "volume", "child_lock"])
          .then((result) => {
            this.updateCapabilityValue("onoff", result[0] === "on" ? true : false);
            this.updateCapabilityValue("measure_pm25", parseInt(result[1]));
            this.updateCapabilityValue("measure_humidity", parseInt(result[3]));
            this.updateCapabilityValue("measure_temperature", parseInt(result[4] / 10));
            this.updateCapabilityValue("measure_luminance", parseInt(result[5]));
            this.updateCapabilityValue("air_purifier_mode", result[6]);
            this.updateCapabilityValue("dim", parseInt(this.favoriteLevel[result[7]] / 100));
            this.setSettings({ filter1_life: result[8] + "%" });
            this.setSettings({ purify_volume: result[10] + " m3" });
            this.setSettings({ led: result[11] == "on" ? true : false });
            this.setSettings({ volume: result[12] >= 1 ? true : false });
            this.setSettings({ childLock: result[13] == "on" ? true : false });
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
        .call("get_prop", ["power", "aqi", "average_aqi", "humidity", "temp_dec", "bright", "mode", "favorite_level", "filter1_life", "use_time", "purify_volume", "led", "volume", "child_lock"])
        .then((result) => {
          if (!this.getAvailable()) {
            this.setAvailable();
          }
          this.updateCapabilityValue("onoff", result[0] === "on" ? true : false);
          this.updateCapabilityValue("measure_pm25", parseInt(result[1]));
          this.updateCapabilityValue("measure_humidity", parseInt(result[3]));
          this.updateCapabilityValue("measure_temperature", parseInt(result[4] / 10));
          this.updateCapabilityValue("measure_luminance", parseInt(result[5]));
          this.updateCapabilityValue("air_purifier_mode", result[6]);
          this.updateCapabilityValue("dim", parseInt(this.favoriteLevel[result[7]] / 100));
          this.setSettings({ filter1_life: result[8] + "%" });
          this.setSettings({ purify_volume: result[10] + " m3" });
          this.setSettings({ led: result[11] == "on" ? true : false });
          this.setSettings({ volume: result[12] >= 1 ? true : false });
          this.setSettings({ childLock: result[13] == "on" ? true : false });
        })
        .catch((error) => {
          this.log("Sending commmand error: ", error);
          this.setUnavailable(error.message);
          clearInterval(this.updateInterval);
          setTimeout(() => {
            this.getPurifierStatus();
          }, 1000 * interval);
        });
    }, 1000 * interval);
  }

  updateCapabilityValue(name, value) {
    if (this.getCapabilityValue(name) != value) {
      this.setCapabilityValue(name, value)
        .then(() => this.log("[" + this.data.id + "] [" + name + "] [" + value + "] Capability successfully updated"))
        .catch((error) => this.log("[" + this.data.id + "] [" + name + "] [" + value + "] Capability not updated because there are errors: " + error.message));
    }
  }

  onSettings(oldSettings, newSettings, changedKeys, callback) {
    if (changedKeys.includes("updateTimer") || changedKeys.includes("deviceIP") || changedKeys.includes("deviceToken")) {
      this.getPurifierStatus();
      callback(null, true);
    }

    if (changedKeys.includes("led")) {
      this.device
        .call("set_led", [newSettings.led ? "on" : "off"])
        .then(() => {
          this.log("Sending " + this.getName() + " commmand: " + newSettings.led);
          callback(null, true);
        })
        .catch((error) => {
          this.log("Sending commmand 'set_led' " + newSettings.led + " error: ", error);
          callback(error, false);
        });
    }

    if (changedKeys.includes("volume")) {
      this.device
        .call("set_volume", [newSettings.volume ? 100 : 0])
        .then(() => {
          this.log("Sending " + this.getName() + " commmand: " + newSettings.volume);
          callback(null, true);
        })
        .catch((error) => {
          this.log("Sending commmand 'newSettings.volume' " + newSettings.volume + " error: ", error);
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
          this.log("Sending commmand 'set_child_lock' " + newSettings.childLock + " error: ", error);
          callback(error, false);
        });
    }
  }

  registerOnOffButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("set_power", [value ? "on" : "off"])
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

  registerFavoriteLevel(name) {
    this.registerCapabilityListener(name, async (value) => {
      let speed = value * 100;
      if (speed > 0) {
        this.device
          .call("set_level_favorite", [this.getFavoriteLevel(speed)])
          .then(() => {
            this.log("Sending " + name + " commmand: " + value);
            callback(null, true);
          })
          .catch((error) => {
            this.log("Sending commmand 'set_level_favorite' " + value + " error: " + error);
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

  registerPurifierOnAction(name, action) {
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
                this.log("Set 'set_power' ON");
                device.destroy();
              })
              .catch((error) => {
                this.log("Set 'set_power' error: ", error);
                device.destroy();
              });
          })
          .catch((error) => {
            this.log("miio connect error: " + error);
          });
      } catch (error) {
        this.log("catch error: " + error);
      }
    });
  }

  registerPurifierOffAction(name, action) {
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
                this.log("Set 'set_power' OFF");
                device.destroy();
              })
              .catch((error) => {
                this.log("Set 'set_power' error: ", error);
                device.destroy();
              });
          })
          .catch((error) => {
            this.log("miio connect error: " + error);
          });
      } catch (error) {
        this.log("catch error: " + error);
      }
    });
  }

  registerPurifierModeAction(name, action) {
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
                this.log("Set 'set_mode': ", args.modes);
                device.destroy();
              })
              .catch((error) => {
                this.log("Set 'set_mode' error: ", error);
                device.destroy();
              });
          })
          .catch((error) => {
            this.log("miio connect error: " + error);
          });
      } catch (error) {
        this.log("catch error: " + error);
      }
    });
  }

  registerPurifierSpeedAction(name, action) {
    action.registerRunListener(async (args, state) => {
      try {
        miio
          .device({
            address: args.device.getSetting("deviceIP"),
            token: args.device.getSetting("deviceToken"),
          })
          .then((device) => {
            device
              .call("set_level_favorite", [this.getFavoriteLevel(args.range)])
              .then(() => {
                this.log("Set 'set_level_favorite': ", this.getFavoriteLevel(args.range));
                device.destroy();
              })
              .catch((error) => {
                this.log("Set 'set_level_favorite' error: ", error);
                device.destroy();
              });
          })
          .catch((error) => {
            this.log("miio connect error: " + error);
          });
      } catch (error) {
        this.log("catch error: " + error);
      }
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

  onDeleted() {
    this.log("Device deleted");
    clearInterval(this.updateInterval);
  }
}

module.exports = MiAirPurifierPro;
