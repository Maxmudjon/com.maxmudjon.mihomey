const Homey = require("homey");
const miio = require("miio");

const modes = {
  1: "low",
  2: "medium",
  3: "high",
  4: "humidity",
};

const modesID = {
  low: 1,
  medium: 2,
  high: 3,
  humidity: 4,
};

class MiSmartHumidifier extends Homey.Device {
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
    this.registerHumidifierModeAction("humidifier_deerma_mode", actions.humidifierMode);
  }

  registerCapabilities() {
    this.registerOnOffButton("onoff");
    this.registerDryOnOffButton("onoff.dry");
    this.registerTargetRelativeHumidity("dim");
    this.registerHumidifierMode("humidifier_deerma_mode");
  }

  getHumidifierStatus() {
    miio
      .device({ address: this.getSetting("deviceIP"), token: this.getSetting("deviceToken") })
      .then((device) => {
        if (!this.getAvailable()) {
          this.setAvailable();
        }
        this.device = device;

        this.device
          .call("get_prop", ["Humidifier_Gear", "Humidity_Value", "HumiSet_Value", "Led_State", "OnOff_State", "TemperatureValue", "TipSound_State", "waterstatus", "watertankstatus"])
          .then((result) => {
            this.updateCapabilityValue("humidifier_deerma_mode", modes[result[0]]);
            this.updateCapabilityValue("measure_humidity", parseInt(result[1]));
            this.updateCapabilityValue("dim", parseInt(result[2]) / 100);
            this.setSettings({ led: result[3] === 1 ? true : false });
            this.updateCapabilityValue("onoff", result[4] === 1 ? true : false);
            this.updateCapabilityValue("measure_temperature", parseInt(result[5]));
            this.setSettings({ buzzer: result[6] === 1 ? true : false });
            this.updateCapabilityValue("alarm_water", result[7] === 0 ? true : false);
            this.updateCapabilityValue("alarm_motion.tank", result[8] === 0 ? true : false);
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
        .call("get_prop", ["Humidifier_Gear", "Humidity_Value", "HumiSet_Value", "Led_State", "OnOff_State", "TemperatureValue", "TipSound_State", "waterstatus", "watertankstatus"])
        .then((result) => {
          if (!this.getAvailable()) {
            this.setAvailable();
          }
          this.updateCapabilityValue("humidifier_deerma_mode", modes[result[0]]);
          this.updateCapabilityValue("measure_humidity", parseInt(result[1]));
          this.updateCapabilityValue("dim", parseInt(result[2]) / 100);
          this.setSettings({ led: result[3] === 1 ? true : false });
          this.updateCapabilityValue("onoff", result[4] === 1 ? true : false);
          this.updateCapabilityValue("measure_temperature", parseInt(result[5]));
          this.setSettings({ buzzer: result[6] === 1 ? true : false });
          this.updateCapabilityValue("alarm_water", result[7] === 0 ? true : false);
          this.updateCapabilityValue("alarm_motion.tank", result[8] === 0 ? true : false);
        })
        .catch((error) => {
          this.log("Sending commmand 'get_prop' error: ", error);
          this.setUnavailable(error.message);
          clearInterval(this.updateInterval);
          setTimeout(() => {
            this.getHumidifierStatus();
          }, 1000 * interval);
        });
    }, 1000 * interval);
  }

  updateCapabilityValue(name, value) {
    if (this.getCapabilityValue(name) != value) {
      this.setCapabilityValue(name, value)
        .then(() => {
          this.log("[" + this.getName() + "] [" + name + "] [" + value + "] Capability successfully updated");
        })
        .catch((error) => {
          this.log("[" + this.getName() + "] [" + name + "] [" + value + "] Capability not updated because there are errors: " + error.message);
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
        .call("SetLedState", [newSettings.led ? 1 : 0])
        .then(() => {
          this.log("Sending " + this.getName() + " commmand: " + newSettings.led);
          callback(null, true);
        })
        .catch((error) => {
          this.log("Sending commmand 'SetLedState' error: ", error);
          callback(error, false);
        });
    }

    if (changedKeys.includes("buzzer")) {
      this.device
        .call("SetTipSound_Status", [newSettings.buzzer ? 1 : 0])
        .then(() => {
          this.log("Sending " + this.getName() + " commmand: " + newSettings.buzzer);
          callback(null, true);
        })
        .catch((error) => {
          this.log("Sending commmand 'SetTipSound_Status' error: ", error);
          callback(error, false);
        });
    }
  }

  registerOnOffButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("Set_OnOff", [value ? 1 : 0])
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'Set_OnOff' error: ", error));
    });
  }

  registerDryOnOffButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("set_dry", [value ? 1 : 0])
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'set_dry' error: ", error));
    });
  }

  registerTargetRelativeHumidity(name) {
    this.registerCapabilityListener(name, async (value) => {
      let humidity = value * 100;
      if (humidity > 0) {
        this.device
          .call("Set_HumiValue", [humidity])
          .then(() => this.log("Sending " + name + " commmand: " + value))
          .catch((error) => this.log("Sending commmand 'Set_HumiValue' error: ", error));
      }
    });
  }

  registerHumidifierMode(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("Set_HumidifierGears", [modesID[value]])
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'Set_HumidifierGears' error: ", error));
    });
  }

  registerHumidifierOnAction(name, action) {
    action.registerRunListener(async (args, state) => {
      this.device
        .call("Set_OnOff", [1])
        .then(() => this.log("Set 'Set_OnOff': ", args))
        .catch((error) => this.log("Set 'Set_OnOff' error: ", error));
    });
  }

  registerHumidifierOffAction(name, action) {
    action.registerRunListener(async (args, state) => {
      this.device
        .call("Set_OnOff", [0])
        .then(() => this.log("Set 'Set_OnOff': ", args))
        .catch((error) => this.log("Set 'Set_OnOff' error: ", error));
    });
  }

  registerHumidifierModeAction(name, action) {
    action.registerRunListener(async (args, state) => {
      this.device
        .call("Set_HumidifierGears", [modesID[args.modes]])
        .then(() => this.log("Set 'Set_HumidifierGears': ", args.modes))
        .catch((error) => this.log("Set 'Set_HumidifierGears' error: ", error));
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

module.exports = MiSmartHumidifier;
