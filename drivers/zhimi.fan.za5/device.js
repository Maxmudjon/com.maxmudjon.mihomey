const Homey = require("homey");
const miio = require("miio");

const params = [
  { siid: 2, piid: 1 },
  { siid: 2, piid: 2 },
  { siid: 2, piid: 3 },
  { siid: 2, piid: 5 },
  { siid: 2, piid: 7 },
  { siid: 3, piid: 1 },
  { siid: 4, piid: 3 },
  { siid: 5, piid: 1 },
  { siid: 7, piid: 1 },
  { siid: 7, piid: 7 },
];

class MiSmartStandingFan3 extends Homey.Device {
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
    this.getFanStatus();
  }

  registerActions() {
    const { actions } = this.driver;
    this.registerFanModeAction("zhimi_fan_za5_mode", actions.fanMode);
    this.registeHorizontalAngleAction("zhimi_fan_za5_horizontal_angle", actions.horizontalAngle);
  }

  registerCapabilities() {
    this.registerOnOffButton("onoff");
    this.registerOnOffSwingButton("onoff.swing");
    this.registerFanLevel("dim");
    this.registerAngleLevel("dim.swing");
    this.registerFanMode("zhimi_fan_za5_mode");
  }

  getFanStatus() {
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
            const deviceFanLevelResult = result.filter((r) => r.siid == 2 && r.piid == 2)[0];
            const swingResult = result.filter((r) => r.siid == 2 && r.piid == 3)[0];
            const swingAngleResult = result.filter((r) => r.siid == 2 && r.piid == 5)[0];
            const deviceModeResult = result.filter((r) => r.siid == 2 && r.piid == 7)[0];
            const devicePhyicalLockResult = result.filter((r) => r.siid == 3 && r.piid == 1)[0];
            const deviceBuzzerResult = result.filter((r) => r.siid == 5 && r.piid == 1)[0];
            const deviceLedBrightnessResult = result.filter((r) => r.siid == 4 && r.piid == 3)[0];
            const deviceHumidityResult = result.filter((r) => r.siid == 7 && r.piid == 1)[0];
            const deviceTemperatureResult = result.filter((r) => r.siid == 7 && r.piid == 7)[0];

            this.updateCapabilityValue("onoff", powerResult.value);
            this.updateCapabilityValue("onoff.swing", swingResult.value);
            this.updateCapabilityValue("zhimi_fan_za5_mode", "" + deviceModeResult.value);
            this.updateCapabilityValue("dim", +deviceFanLevelResult.value);
            this.updateCapabilityValue("dim.angle", +swingAngleResult.value);
            this.updateCapabilityValue("measure_humidity", +deviceHumidityResult.value);
            this.updateCapabilityValue("measure_temperature", +deviceTemperatureResult.value);

            this.setSettings({ led: !!deviceLedBrightnessResult.value });
            this.setSettings({ buzzer: deviceBuzzerResult.value });
            this.setSettings({ childLock: devicePhyicalLockResult.value });
          })
          .catch((error) => this.log("Sending commmand 'get_properties' error: ", error));

        const update = this.getSetting("updateTimer") || 60;
        this.updateTimer(update);
      })
      .catch((error) => {
        this.setUnavailable(error.message);
        clearInterval(this.updateInterval);
        setTimeout(() => {
          this.getFanStatus();
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
          const deviceFanLevelResult = result.filter((r) => r.siid == 2 && r.piid == 2)[0];
          const swingResult = result.filter((r) => r.siid == 2 && r.piid == 3)[0];
          const swingAngleResult = result.filter((r) => r.siid == 2 && r.piid == 5)[0];
          const deviceModeResult = result.filter((r) => r.siid == 2 && r.piid == 7)[0];
          const devicePhyicalLockResult = result.filter((r) => r.siid == 3 && r.piid == 1)[0];
          const deviceBuzzerResult = result.filter((r) => r.siid == 5 && r.piid == 1)[0];
          const deviceLedBrightnessResult = result.filter((r) => r.siid == 4 && r.piid == 3)[0];
          const deviceHumidityResult = result.filter((r) => r.siid == 7 && r.piid == 1)[0];
          const deviceTemperatureResult = result.filter((r) => r.siid == 7 && r.piid == 7)[0];

          this.updateCapabilityValue("onoff", powerResult.value);
          this.updateCapabilityValue("onoff.swing", swingResult.value);
          this.updateCapabilityValue("zhimi_fan_za5_mode", "" + deviceModeResult.value);
          this.updateCapabilityValue("dim", +deviceFanLevelResult.value);
          this.updateCapabilityValue("dim.angle", +swingAngleResult.value);
          this.updateCapabilityValue("measure_humidity", +deviceHumidityResult.value);
          this.updateCapabilityValue("measure_temperature", +deviceTemperatureResult.value);

          this.setSettings({ led: !!deviceLedBrightnessResult.value });
          this.setSettings({ buzzer: deviceBuzzerResult.value });
          this.setSettings({ childLock: devicePhyicalLockResult.value });
        })
        .catch((error) => {
          this.log("Sending commmand error: ", error);
          this.setUnavailable(error.message);
          clearInterval(this.updateInterval);
          setTimeout(() => {
            this.getFanStatus();
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
      this.getFanStatus();
      callback(null, true);
    }

    if (changedKeys.includes("led")) {
      this.device
        .call("set_properties", [{ siid: 4, piid: 3, value: newSettings.led ? 100 : 0 }], { retries: 1 })
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
        .call("set_properties", [{ siid: 5, piid: 1, value: newSettings.buzzer }], { retries: 1 })
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
        .call("set_properties", [{ siid: 3, piid: 1, value: newSettings.childLock }], { retries: 1 })
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

  registerOnOffSwingButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("set_properties", [{ siid: 2, piid: 3, value }], { retries: 1 })
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'set_properties' error: ", error));
    });
  }

  registerFanLevel(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("set_properties", [{ siid: 2, piid: 2, value: +value }], { retries: 1 })
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'set_properties' error: ", error));
    });
  }

  registerFanMode(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("set_properties", [{ siid: 2, piid: 7, value: +value }], { retries: 1 })
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'set_properties' error: ", error));
    });
  }

  registerFanModeAction(name, action) {
    action.registerRunListener(async (args, state) => {
      try {
        miio
          .device({
            address: args.device.getSetting("deviceIP"),
            token: args.device.getSetting("deviceToken"),
          })
          .then((device) => {
            device
              .call("set_properties", [{ siid: 2, piid: 7, value: +args.modes }], { retries: 1 })
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

  registeHorizontalAngleAction(name, action) {
    action.registerRunListener(async (args, state) => {
      try {
        miio
          .device({
            address: args.device.getSetting("deviceIP"),
            token: args.device.getSetting("deviceToken"),
          })
          .then((device) => {
            device
              .call("set_properties", [{ siid: 2, piid: 5, value: +args.angle }], { retries: 1 })
              .then(() => {
                this.log("Set 'set_properties': ", args.angle);
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

module.exports = MiSmartStandingFan3;
