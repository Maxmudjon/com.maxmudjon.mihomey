const Homey = require("homey");
const miio = require("miio");

class MiAirPurifierMJXFJ extends Homey.Device {
  async onInit() {
    this.initialize = this.initialize.bind(this);
    this.driver = this.getDriver();
    this.data = this.getData();
    this.updateInterval;
    this.initialize();
    this.log("Mi Homey device init | " + "name: " + this.getName() + " - " + "class: " + this.getClass() + " - " + "data: " + JSON.stringify(this.data));
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
    var that = this;
    miio
      .device({ address: this.getSetting("deviceIP"), token: this.getSetting("deviceToken") })
      .then(device => {
        this.setAvailable();
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
            "ptc_status"
          ])
          .then(result => {
            that.setCapabilityValue("onoff", result[0]);
            that.setCapabilityValue("measure_pm25", parseInt(result[1]));
            that.setCapabilityValue("measure_co2", parseInt(result[2]));
            that.setCapabilityValue("measure_temperature", parseInt(result[3]));
            that.setCapabilityValue("air_purifier_t2017_mode", result[4]);
            that.setCapabilityValue("air_heater_mode", result[5]);
            that.setCapabilityValue("dim", parseInt(that.normalize[result[6]], 60, 300));
            that.setSettings({ display: result[7] });
            that.setSettings({ sound: result[8] });
            that.setSettings({ childLock: result[9] });
            that.setSettings({ filter_efficient: parseInt(result[10]).toString() + "%" });
            that.setSettings({ filter_intermediate: parseInt(result[11]).toString() + "%" });
            that.setSettings({ screen_direction: result[12] });

            if (result[13] && result[14]) {
              that.setCapabilityValue("air_heater_mode", result[13]);
            } else that.setCapabilityValue("air_heater_mode", "off");
            that.setCapabilityValue("onoff.ptc", result[14]);
          })
          .catch(error => {
            that.log("Sending commmand 'get_prop' error: ", error);
          });

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
          this.getPurifierStatus();
        }, 10000);
      });
  }

  updateTimer(interval) {
    var that = this;
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
          "ptc_status"
        ])
        .then(result => {
          that.setCapabilityValue("onoff", result[0]);
          that.setCapabilityValue("measure_pm25", parseInt(result[1]));
          that.setCapabilityValue("measure_co2", parseInt(result[2]));
          that.setCapabilityValue("measure_temperature", parseInt(result[3]));
          that.setCapabilityValue("air_purifier_t2017_mode", result[4]);
          that.setCapabilityValue("air_heater_mode", result[5]);
          that.setCapabilityValue("dim", parseInt(that.normalize[result[6]], 60, 300));
          that.setSettings({ display: result[7] });
          that.setSettings({ sound: result[8] });
          that.setSettings({ childLock: result[9] });
          that.setSettings({ filter_efficient: parseInt(result[10]).toString() + "%" });
          that.setSettings({ filter_intermediate: parseInt(result[11]).toString() + "%" });
          that.setSettings({ screen_direction: result[12] });

          if (result[13] && result[14]) {
            that.setCapabilityValue("air_heater_mode", result[13]);
          } else that.setCapabilityValue("air_heater_mode", "off");
          that.setCapabilityValue("onoff.ptc", result[14]);
        })
        .catch(error => {
          this.log("Sending commmand error: ", error);
          clearInterval(this.updateInterval);
          if (error == "Error: Could not connect to device, handshake timeout") {
            this.setUnavailable(Homey.__("Could not connect to device, handshake timeout"));
            this.log("Error: Could not connect to device, handshake timeout");
          } else if (error == "Error: Could not connect to device, token might be wrong") {
            this.setUnavailable(Homey.__("Could not connect to device, token might be wrong"));
            this.log("Error: Could not connect to device, token might be wrong");
          }
          setTimeout(() => {
            this.getPurifierStatus();
          }, 1000 * interval);
        });
    }, 1000 * interval);
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
        .call("set_display", [newSettings.display])
        .then(() => {
          this.log("Sending " + name + " commmand: " + value);
          callback(null, true);
        })
        .catch(error => {
          this.log("Sending commmand 'set_display' error: ", error);
          callback(error, false);
        });
    }

    if (changedKeys.includes("sound")) {
      this.device
        .call("set_sound", [newSettings.sound])
        .then(() => {
          this.log("Sending commmand: " + newSettings.sound);
          callback(null, true);
        })
        .catch(error => {
          this.log("Sending commmand 'set_sound' " + newSettings.sound + " error: ", error);
          callback(error, false);
        });
    }

    if (changedKeys.includes("childLock")) {
      this.device
        .call("set_child_lock", [newSettings.childLock])
        .then(() => {
          this.log("Sending commmand: " + newSettings.childLock);
          callback(null, true);
        })
        .catch(error => {
          this.log("Sending commmand 'set_child_lock' " + newSettings.childLock + " error: ", error);
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
        .catch(error => {
          this.log("Sending commmand 'set_screen_direction' " + newSettings.screen_direction + " error: ", error);
          callback(error, false);
        });
    }
  }

  registerOnOffButton(name) {
    this.registerCapabilityListener(name, async value => {
      this.device
        .call("set_power", [value])
        .then(() => {
          this.log("Sending " + name + " commmand: " + value);
          callback(null, true);
        })
        .catch(error => {
          this.log("Sending commmand 'set_power' " + value + " error: " + error);
          callback(error, false);
        });
    });
  }

  registerPTCOnOffButton(name) {
    this.registerCapabilityListener(name, async value => {
      this.device
        .call("set_ptc_on", [value])
        .then(() => {
          this.log("Sending " + name + " commmand: " + value);
          callback(null, true);
        })
        .catch(error => {
          this.log("Sending commmand 'set_ptc_on' " + value + " error: " + error);
          callback(error, false);
        });
    });
  }

  registerFavoriteLevel(name) {
    this.registerCapabilityListener(name, async value => {
      let speed = value * 100;
      if (speed > 0) {
        this.device
          .call("set_favourite_speed", [this.denormalize(speed, 60, 300)])
          .then(() => {
            this.log("Sending " + name + " commmand: " + value);
            callback(null, true);
          })
          .catch(error => {
            this.log("Sending commmand 'set_favourite_speed' " + value + " error: " + error);
            callback(error, false);
          });
      }
    });
  }

  denormalize(normalized, min, max) {
    let denormalized = (1 - normalized) * (max - min) + min;
    return Number(denormalized.toFixed(0));
  }

  registerAirPurifierMode(name) {
    this.registerCapabilityListener(name, async value => {
      this.device
        .call("set_mode", [value])
        .then(() => {
          this.log("Sending " + name + " commmand: " + value);
          callback(null, true);
        })
        .catch(error => {
          this.log("Sending commmand 'set_mode' " + value + " error: " + error);
          callback(error, false);
        });
    });
  }

  registerAirPurifierHeatingMode(name) {
    this.registerCapabilityListener(name, async value => {
      this.device
        .call("set_ptc_level", [value])
        .then(() => {
          this.log("Sending " + name + " commmand: " + value);
          callback(null, true);
        })
        .catch(error => {
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
            token: args.device.getSetting("deviceToken")
          })
          .then(device => {
            device
              .call("set_power", ["on"])
              .then(() => {
                that.log("Set 'set_power' ON");
                device.destroy();
              })
              .catch(error => {
                that.log("Set 'set_power' error: ", error);
                device.destroy();
              });
          })
          .catch(error => {
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
            token: args.device.getSetting("deviceToken")
          })
          .then(device => {
            device
              .call("set_power", ["off"])
              .then(() => {
                that.log("Set 'set_power' OFF");
                device.destroy();
              })
              .catch(error => {
                that.log("Set 'set_power' error: ", error);
                device.destroy();
              });
          })
          .catch(error => {
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
            token: args.device.getSetting("deviceToken")
          })
          .then(device => {
            device
              .call("set_mode", [args.modes])
              .then(() => {
                that.log("Set 'set_mode': ", args.modes);
                device.destroy();
              })
              .catch(error => {
                that.log("Set 'set_mode' error: ", error);
                device.destroy();
              });
          })
          .catch(error => {
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
            token: args.device.getSetting("deviceToken")
          })
          .then(device => {
            device
              .call("set_favourite_speed", [this.denormalize(speed, 60, 300)])
              .then(() => {
                that.log("Set 'set_favourite_speed': ", that.getFavoriteLevel(args.range));
                device.destroy();
              })
              .catch(error => {
                that.log("Set 'set_favourite_speed' error: ", error);
                device.destroy();
              });
          })
          .catch(error => {
            that.log("miio connect error: " + error);
          });
      } catch (error) {
        that.log("catch error: " + error);
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

  onAdded() {
    this.log("Device added");
  }

  onDeleted() {
    this.log("Device deleted deleted");
    clearInterval(this.updateInterval);
  }
}

module.exports = MiAirPurifierMJXFJ;
