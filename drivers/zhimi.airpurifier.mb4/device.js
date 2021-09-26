const Homey = require("homey");
const miio = require("miio");

const params = [
  { siid: 2, piid: 1 },
  { siid: 2, piid: 2 },
  { siid: 2, piid: 4 },
  { siid: 3, piid: 4 },
  { siid: 6, piid: 1 },
  { siid: 7, piid: 2 },
  { siid: 8, piid: 1 },
  { siid: 9, piid: 3 },
];

class MiAirPurifier3C extends Homey.Device {
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
    this.getAirPurifierStatus();
  }

  registerActions() {
    const { actions } = this.driver;
    this.registerAirPurifierModeAction("zhimi_airpurifier_mb4_mode", actions.airPurifierMode);
  }

  registerCapabilities() {
    this.registerOnOffButton("onoff");
    this.registerFavoriteFanLevel("dim");
    this.registerAirPurifierMode("zhimi_airpurifier_mb4_mode");
  }

  getAirPurifierStatus() {
    miio
      .device({ address: this.getSetting("deviceIP"), token: this.getSetting("deviceToken") })
      .then((device) => {
        if (!this.getAvailable()) {
          this.setAvailable();
        }
        this.device = device;

        this.device
          .call("get_properties", params, { retries: 1 })
          .then((result) => {
            const powerResult = result.filter((r) => r.siid == 2 && r.piid == 1)[0];
            const deviceFaultResult = result.filter((r) => r.siid == 2 && r.piid == 2)[0];
            const deviceModeResult = result.filter((r) => r.siid == 2 && r.piid == 4)[0];
            const deviceFanLevelResult = result.filter((r) => r.siid == 9 && r.piid == 3)[0];
            const devicePM25Result = result.filter((r) => r.siid == 3 && r.piid == 4)[0];
            const deviceBuzzerResult = result.filter((r) => r.siid == 6 && r.piid == 1)[0];
            const deviceLedBrightnessResult = result.filter((r) => r.siid == 7 && r.piid == 2)[0];
            const deviceChildLockResult = result.filter((r) => r.siid == 8 && r.piid == 1)[0];

            this.updateCapabilityValue("onoff", powerResult.value);
            this.updateCapabilityValue("zhimi_airpurifier_mb4_mode", "" + deviceModeResult.value);
            this.updateCapabilityValue("dim", +deviceFanLevelResult.value);
            this.updateCapabilityValue("measure_pm25", +devicePM25Result.value);

            this.setSettings({ led: !!deviceLedBrightnessResult.value });
            this.setSettings({ buzzer: deviceBuzzerResult.value });
            this.setSettings({ childLock: deviceChildLockResult.value });
          })
          .catch((error) => this.log("Sending commmand 'get_properties' error: ", error));

        const update = this.getSetting("updateTimer") || 60;
        this.updateTimer(update);
      })
      .catch((error) => {
        this.setUnavailable(error.message);
        clearInterval(this.updateInterval);
        setTimeout(() => {
          this.getAirPurifierStatus();
        }, 10000);
      });
  }

  updateTimer(interval) {
    clearInterval(this.updateInterval);
    this.updateInterval = setInterval(() => {
      this.device
        .call("get_properties", params, { retries: 1 })
        .then((result) => {
          if (!this.getAvailable()) {
            this.setAvailable();
          }
          const powerResult = result.filter((r) => r.siid == 2 && r.piid == 1)[0];
          const deviceFaultResult = result.filter((r) => r.siid == 2 && r.piid == 2)[0];
          const deviceModeResult = result.filter((r) => r.siid == 2 && r.piid == 4)[0];
          const deviceFanLevelResult = result.filter((r) => r.siid == 9 && r.piid == 3)[0];
          const devicePM25Result = result.filter((r) => r.siid == 3 && r.piid == 4)[0];
          const deviceBuzzerResult = result.filter((r) => r.siid == 6 && r.piid == 1)[0];
          const deviceLedBrightnessResult = result.filter((r) => r.siid == 7 && r.piid == 2)[0];
          const deviceChildLockResult = result.filter((r) => r.siid == 8 && r.piid == 1)[0];

          this.updateCapabilityValue("onoff", powerResult.value);
          this.updateCapabilityValue("zhimi_airpurifier_mb4_mode", "" + deviceModeResult.value);
          this.updateCapabilityValue("dim", +deviceFanLevelResult.value);
          this.updateCapabilityValue("measure_pm25", +devicePM25Result.value);

          this.setSettings({ led: !!deviceLedBrightnessResult.value });
          this.setSettings({ buzzer: deviceBuzzerResult.value });
          this.setSettings({ childLock: deviceChildLockResult.value });
        })
        .catch((error) => {
          this.log("Sending commmand error: ", error);
          this.setUnavailable(error.message);
          clearInterval(this.updateInterval);
          setTimeout(() => {
            this.getAirPurifierStatus();
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
      this.getAirPurifierStatus();
      callback(null, true);
    }

    if (changedKeys.includes("led")) {
      this.device
        .call("set_properties", [{ siid: 7, piid: 2, value: newSettings.led ? 8 : 0 }], { retries: 1 })
        .then(() => {
          this.log("Sending " + this.getName() + " commmand: " + newSettings.led);
          callback(null, true);
        })
        .catch((error) => {
          this.log("Sending commmand 'set_properties' error: ", error);
          callback(error, false);
        });
    }

    if (changedKeys.includes("buzzer")) {
      this.device
        .call("set_properties", [{ siid: 6, piid: 1, value: newSettings.buzzer }], { retries: 1 })
        .then(() => {
          this.log("Sending " + this.getName() + " commmand: " + newSettings.buzzer);
          callback(null, true);
        })
        .catch((error) => {
          this.log("Sending commmand 'set_properties' error: ", error);
          callback(error, false);
        });
    }

    if (changedKeys.includes("childLock")) {
      this.device
        .call("set_properties", [{ siid: 8, piid: 1, value: newSettings.childLock }], { retries: 1 })
        .then(() => {
          this.log("Sending " + this.getName() + " commmand: " + newSettings.childLock);
          callback(null, true);
        })
        .catch((error) => {
          this.log("Sending commmand 'set_properties' error: ", error);
          callback(error, false);
        });
    }
  }

  registerOnOffButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("set_properties", [{ siid: 2, piid: 1, value }], { retries: 1 })
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'set_properties' error: ", error));
    });
  }

  registerFavoriteFanLevel(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("set_properties", [{ siid: 9, piid: 3, value: +value }], { retries: 1 })
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'set_properties' error: ", error));
    });
  }

  registerAirPurifierMode(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("set_properties", [{ siid: 2, piid: 4, value: +value }], { retries: 1 })
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'set_properties' error: ", error));
    });
  }

  registerAirPurifierModeAction(name, action) {
    action.registerRunListener(async (args, state) => {
      try {
        miio
          .device({
            address: args.device.getSetting("deviceIP"),
            token: args.device.getSetting("deviceToken"),
          })
          .then((device) => {
            device
              .call("set_properties", [{ siid: 2, piid: 4, value: +args.modes }], { retries: 1 })
              .then(() => {
                this.log("Set 'set_properties': ", args.modes);
                device.destroy();
              })
              .catch((error) => {
                this.log("Set 'set_properties' error: ", error.message);
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

module.exports = MiAirPurifier3C;
