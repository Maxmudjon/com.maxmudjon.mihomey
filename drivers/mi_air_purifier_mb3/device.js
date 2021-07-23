const Homey = require("homey");
const miio = require("miio");

const params = [
  { siid: 2, piid: 1 }, //fault - uint8
  { siid: 2, piid: 2 }, //status - bool
  { siid: 2, piid: 4 }, //fan level - uint8
  { siid: 2, piid: 5 }, //mode - uint8
  { siid: 3, piid: 6 }, //pm2.5 - float
  { siid: 3, piid: 7 }, //humidity - uint8
  { siid: 3, piid: 8 }, //temperature - float
  { siid: 6, piid: 1 }, //led - uint8
  { siid: 7, piid: 1 }, //lock - bool
  { siid: 4, piid: 3 }, //filter life - uint8
  { siid: 13, piid: 1 }, //purify volume - int32
];

class MiAirPurifierMB3 extends Homey.Device {
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
    this.getPurifierStatus();
  }

  registerActions() {
    const { actions } = this.driver;
    this.registerPurifierOnAction("purifier_on", actions.purifierOn);
    this.registerPurifierOffAction("purifier_off", actions.purifierOff);
    this.registerPurifierModeAction("purifier_mb3_mode", actions.purifierMode);
    this.registerPurifierSpeedAction("purifier_mb3_speed", actions.purifierSpeed);
  }

  registerCapabilities() {
    this.registerOnOffButton("onoff");
    this.registerFavoriteLevel("dim");
    this.registerAirPurifierMode("air_purifier_mb3_mode");
  }

  getPurifierStatus() {
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
          .call("get_properties", params, {
            retries: 1,
          })
          .then((result) => {
            console.log(result);
            const deviceFaultResult = result.filter((r) => r.siid == 2 && r.piid == 1)[0];
            const deviceStatusResult = result.filter((r) => r.siid == 2 && r.piid == 2)[0];
            const deviceFanLevelResult = result.filter((r) => r.siid == 2 && r.piid == 4)[0];
            const deviceModeResult = result.filter((r) => r.siid == 2 && r.piid == 5)[0];
            const devicepm25Result = result.filter((r) => r.siid == 3 && r.piid == 6)[0];
            const deviceHumidityResult = result.filter((r) => r.siid == 3 && r.piid == 7)[0];
            const deviceTemperatureResult = result.filter((r) => r.siid == 3 && r.piid == 8)[0];
            const deviceLedResult = result.filter((r) => r.siid == 6 && r.piid == 1)[0];
            const deviceLockResult = result.filter((r) => r.siid == 7 && r.piid == 1)[0];
            const deviceFilterLifeLevelResult = result.filter((r) => r.siid == 4 && r.piid == 3)[0];
            const devicePurifierVolumeResult = result.filter((r) => r.siid == 13 && r.piid == 1)[0];
            this.updateCapabilityValue("onoff", deviceStatusResult.value);
            this.updateCapabilityValue("measure_pm25", +devicepm25Result.value);
            this.updateCapabilityValue("measure_humidity", +deviceHumidityResult.value);
            this.updateCapabilityValue("measure_temperature", +deviceTemperatureResult.value);
            this.updateCapabilityValue("air_purifier_mb3_mode", "" + deviceModeResult.value);
            this.updateCapabilityValue("dim", deviceFanLevelResult.value);
            this.setSettings({
              filter1_life: deviceFilterLifeLevelResult.value + "%",
            });
            this.setSettings({
              purify_volume: devicePurifierVolumeResult.value + " m3",
            });
            this.setSettings({ led: !!deviceLedResult.value });
            this.setSettings({ childLock: deviceLockResult.value });
          })
          .catch((error) => this.log("Sending commmand 'get_prop' error: ", error));

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
        .call("get_properties", params, {
          retries: 1,
        })
        .then((result) => {
          const deviceFaultResult = result.filter((r) => r.siid == 2 && r.piid == 1)[0];
          const deviceStatusResult = result.filter((r) => r.siid == 2 && r.piid == 2)[0];
          const deviceFanLevelResult = result.filter((r) => r.siid == 2 && r.piid == 4)[0];
          const deviceModeResult = result.filter((r) => r.siid == 2 && r.piid == 5)[0];
          const devicepm25Result = result.filter((r) => r.siid == 3 && r.piid == 6)[0];
          const deviceHumidityResult = result.filter((r) => r.siid == 3 && r.piid == 7)[0];
          const deviceTemperatureResult = result.filter((r) => r.siid == 3 && r.piid == 8)[0];
          const deviceLedResult = result.filter((r) => r.siid == 6 && r.piid == 1)[0];
          const deviceLockResult = result.filter((r) => r.siid == 7 && r.piid == 1)[0];
          const deviceFilterLifeLevelResult = result.filter((r) => r.siid == 4 && r.piid == 3)[0];
          const devicePurifierVolumeResult = result.filter((r) => r.siid == 13 && r.piid == 1)[0];
          this.updateCapabilityValue("onoff", deviceStatusResult.value);
          this.updateCapabilityValue("measure_pm25", +devicepm25Result.value);
          this.updateCapabilityValue("measure_humidity", +deviceHumidityResult.value);
          this.updateCapabilityValue("measure_temperature", +deviceTemperatureResult.value);
          this.updateCapabilityValue("air_purifier_mb3_mode", "" + deviceModeResult.value);
          this.updateCapabilityValue("dim", deviceFanLevelResult.value);
          this.setSettings({
            filter1_life: deviceFilterLifeLevelResult.value + "%",
          });
          this.setSettings({
            purify_volume: devicePurifierVolumeResult.value + " m3",
          });
          this.setSettings({ led: !!deviceLedResult.value });
          this.setSettings({ childLock: deviceLockResult.value });
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
        .then(() => {
          this.log("[" + this.data.id + "] [" + name + "] [" + value + "] Capability successfully updated");
        })
        .catch((error) => {
          this.log("[" + this.data.id + "] [" + name + "] [" + value + "] Capability not updated because there are errors: " + error.message);
        });
    }
  }

  onSettings(oldSettings, newSettings, changedKeys, callback) {
    if (changedKeys.includes("updateTimer") || changedKeys.includes("deviceIP") || changedKeys.includes("deviceToken")) {
      this.getPurifierStatus();
      callback(null, true);
    }

    if (changedKeys.includes("led")) {
      const params = [{ siid: 6, piid: 1, value }];
      this.device
        .call("set_properties", params, { retries: 1 })
        .then(() => {
          this.log("Sending " + this.getName() + " commmand: " + newSettings.led);
          callback(null, true);
        })
        .catch((error) => {
          this.log("Sending commmand 'set_properties' error: ", error);
          callback(error, false);
        });
    }

    if (changedKeys.includes("childLock")) {
      const params = [{ siid: 7, piid: 1, value }];
      this.device
        .call("set_properties", params, { retries: 1 })
        .then(() => {
          this.log("Sending " + this.getName() + " commmand: " + newSettings.childLock);
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
      const params = [{ siid: 2, piid: 2, value }];
      this.device
        .call("set_properties", params, { retries: 1 })
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'set_properties' error: ", error));
    });
  }

  registerFavoriteLevel(name) {
    this.registerCapabilityListener(name, async (value) => {
      const params = [{ siid: 2, piid: 4, value }];
      this.device
        .call("set_properties", params, { retries: 1 })
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'set_properties' error: ", error));
    });
  }

  registerAirPurifierMode(name) {
    this.registerCapabilityListener(name, async (value) => {
      const params = [{ siid: 2, piid: 5, value: +value }];

      this.device
        .call("set_properties", params, { retries: 1 })
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'set_properties' error: ", error));
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
            const params = [{ siid: 2, piid: 2, value: true }];
            device
              .call("set_properties", params, { retries: 1 })
              .then(() => {
                this.log("Set 'set_properties' ON");
                device.destroy();
              })
              .catch((error) => {
                this.log("Set 'set_properties' error: ", error);
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
            const params = [{ siid: 2, piid: 2, value: false }];
            device
              .call("set_properties", params, { retries: 1 })
              .then(() => {
                this.log("Set 'set_properties' OFF");
                device.destroy();
              })
              .catch((error) => {
                this.log("Set 'set_properties' error: ", error);
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
            const modes = { auto: 0, silent: 1, favorite: 2, none: 3 };
            const params = [{ siid: 2, piid: 5, value: +modes[args.modes] }];
            device
              .call("set_properties", params, { retries: 1 })
              .then(() => {
                this.log("Set 'set_properties': ", args.modes);
                device.destroy();
              })
              .catch((error) => {
                this.log("Set 'set_properties' error: ", error);
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
            const params = [{ siid: 2, piid: 4, value: +args.range }];
            device
              .call("set_properties", params, { retries: 1 })
              .then(() => {
                this.log("Set 'set_properties': ", args.range);
                device.destroy();
              })
              .catch((error) => {
                this.log("Set 'set_properties' error: ", error);
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

  onDeleted() {
    this.log("Device deleted");
    clearInterval(this.updateInterval);
    if (typeof this.device !== "undefined") {
      this.device.destroy();
    }
  }
}

module.exports = MiAirPurifierMB3;
