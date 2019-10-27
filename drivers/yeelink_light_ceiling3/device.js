const Homey = require("homey");
const miio = require("miio");
const flows = require("../../lib/flows");

class YeelightJiaoyue450 extends Homey.Device {
  onInit() {
    this.driver = this.getDriver();
    this.data = this.getData();
    this.log("Mi Homey device init | " + "name: " + this.getName() + " - " + "class: " + this.getClass() + " - " + "id: " + this.data.id);
    this.initialize();
  }

  async initialize() {
    this.registerActions();
    this.registerCapabilities();
    this.getDeviceStatus();
  }

  registerCapabilities() {
    this.registerOnOffButton("onoff");
    this.registerDimLevel("dim");
    this.registerLightTemperatureLevel("light_temperature");
  }

  registerActions() {
    const { actions } = this.driver;
    this.registerFavoriteFlowsAction("favorite_flow_ceiling1_lamp", actions.favoriteFlow);
    this.registerSmoothAction("smoothOnOff", actions.smoothAction);
    this.registerNightModeAction("yeelink_night_mode", actions.nightMode);
  }

  async getDeviceStatus() {
    try {
      this.miioDevice = await miio.device({ address: this.getSetting("deviceIP"), token: this.getSetting("deviceToken") });
      const result = await this.miioDevice.call("get_prop", ["power", "bright", "ct"]);

      this.setAvailable();

      let colorTemp = this.normalize(result[2], 2700, 6500);

      this.updateCapabilityValue("onoff", result[0] === "on" ? true : false);
      this.updateCapabilityValue("dim", result[1] / 100);
      this.updateCapabilityValue("light_temperature", colorTemp);

      let update = this.getSetting("updateTimer") || 60;
      this.updateTimer(update);
    } catch (error) {
      this.error(error.message);
      this.setUnavailable(Homey.__("reconnecting"));
      setTimeout(() => this.getDeviceStatus(), 10000);
    }
  }

  updateTimer(interval) {
    clearInterval(this.updateInterval);

    this.updateInterval = setInterval(async () => {
      try {
        const result = await this.miioDevice.call("get_prop", ["power", "bright", "ct"]);

        this.setAvailable();

        let colorTemp = this.normalize(result[2], 2700, 6500);

        this.updateCapabilityValue("onoff", result[0] === "on" ? true : false);
        this.updateCapabilityValue("dim", result[1] / 100);
        this.updateCapabilityValue("light_temperature", colorTemp);
      } catch (error) {
        this.error(error.message);
        this.setUnavailable(Homey.__("reconnecting"));
        setTimeout(() => {
          this.miioDevice.destroy();
          clearInterval(this.updateInterval);
          this.getDeviceStatus();
        }, 10000);
      }
    }, 1000 * interval);
  }

  normalize(value, min, max) {
    var normalized = (value - min) / (max - min);
    return Number(normalized.toFixed(2));
  }

  async onSettings(oldSettings, newSettings, changedKeys, callback) {
    if (changedKeys.includes("updateTimer") || changedKeys.includes("deviceIP") || changedKeys.includes("deviceToken")) {
      this.miioDevice.destroy();
      this.getDeviceStatus();
      callback(null, true);
    }

    if (changedKeys.includes("setDefault")) {
      try {
        await this.miioDevice.call("set_default", []);
        callback(null, true);
        this.log("Sending commmand 'set_default' save current state to lamp");
        this.setSettings({
          setDefault: false
        });
      } catch (error) {
        this.error(error.message);
      }
    }
  }

  registerOnOffButton(name) {
    this.registerCapabilityListener(name, async value => {
      try {
        await this.miioDevice.call("set_power", [value ? "on" : "off", "smooth", this.getSetting("smooth") * 1000]);
      } catch (error) {
        this.error(error.message);
      }
    });
  }

  registerDimLevel(name) {
    this.registerCapabilityListener(name, async value => {
      if (value * 100 > 0) {
        try {
          await this.miioDevice.call("set_bright", [value * 100]);
        } catch (error) {
          this.error(error.message);
        }
      }
    });
  }

  registerLightTemperatureLevel(name) {
    this.registerCapabilityListener(name, async value => {
      let color_temp = this.denormalize(value, 1700, 6500);

      try {
        await this.miioDevice.call("set_ct_abx", [color_temp, "smooth", this.getSetting("smooth") * 1000]);
      } catch (error) {
        this.error(error.message);
      }
    });
  }

  denormalize(normalized, min, max) {
    var denormalized = (1 - normalized) * (max - min) + min;
    return Number(denormalized.toFixed(0));
  }

  registerFavoriteFlowsAction(name, action) {
    action.registerRunListener(async (args, state) => {
      try {
        let miioDevice = await miio.device({
          address: args.device.getSetting("deviceIP"),
          token: args.device.getSetting("deviceToken")
        });

        await miioDevice.call("start_cf", flows[args.favoriteFlowID]);

        miioDevice.destroy();
      } catch (error) {
        this.error(error.message);
      }
    });
  }

  registerSmoothAction(name, action) {
    action.registerRunListener(async (args, state) => {
      if (args.smoothMode == "on") {
        try {
          let miioDevice = await miio.device({
            address: args.device.getSetting("deviceIP"),
            token: args.device.getSetting("deviceToken")
          });

          await miioDevice.call("set_power", ["on", "smooth", args.smoothTime * 1000]);

          miioDevice.destroy();
        } catch (error) {
          this.error(error.message);
        }
      } else if (args.smoothMode == "off") {
        try {
          let miioDevice = await miio.device({
            address: args.device.getSetting("deviceIP"),
            token: args.device.getSetting("deviceToken")
          });

          await miioDevice.call("set_power", ["off", "smooth", args.smoothTime * 1000]);

          miioDevice.destroy();
        } catch (error) {
          this.error(error.message);
        }
      } else if (args.smoothMode == "toggle") {
        try {
          let miioDevice = await miio.device({
            address: args.device.getSetting("deviceIP"),
            token: args.device.getSetting("deviceToken")
          });

          await miioDevice.call("set_power", ["toogle", "smooth", args.smoothTime * 1000]);

          miioDevice.destroy();
        } catch (error) {
          this.error(error.message);
        }
      }
    });
  }

  registerNightModeAction(name, action) {
    action.registerRunListener(async (args, state) => {
      switch (args.modes) {
        case "on":
          try {
            let miioDevice = await miio.device({
              address: args.device.getSetting("deviceIP"),
              token: args.device.getSetting("deviceToken")
            });

            await miioDevice.call("set_power", ["on", "smooth", args.smoothTime * 1000, 5]);

            miioDevice.destroy();
          } catch (error) {
            this.error(error.message);
          }

        case "off":
          try {
            let miioDevice = await miio.device({
              address: args.device.getSetting("deviceIP"),
              token: args.device.getSetting("deviceToken")
            });

            await miioDevice.call("set_power", ["on", "smooth", args.smoothTime * 1000, 1]);

            miioDevice.destroy();
          } catch (error) {
            this.error(error.message);
          }

        case "toggle":
          try {
            let miioDevice = await miio.device({
              address: args.device.getSetting("deviceIP"),
              token: args.device.getSetting("deviceToken")
            });

            const result = await miioDevice.call("get_prop", ["active_mode"]);

            if (result[0] == "0") {
              await miioDevice.call("set_power", ["on", "smooth", args.smoothTime, 5]);
            } else if (result[0] == "1") {
              await miioDevice.call("set_power", ["on", "smooth", args.smoothTime, 1]);
            }

            miioDevice.destroy();
          } catch (error) {
            this.error(error.message);
          }
      }
    });
  }

  registerCondition(name, condition) {
    condition.registerRunListener((args, state, callback) => {
      try {
        let miioDevice = await miio.device({
          address: args.device.getSetting("deviceIP"),
          token: args.device.getSetting("deviceToken")
        });

        const result = await miioDevice.call("get_prop", ["active_mode"]);

        if (result[0] == "0") {
          callback(null, false)
        } else if (result[0] == "1") {
          callback(null, true)
        }

        miioDevice.destroy();
      } catch (error) {
        this.error(error.message);
      }
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

module.exports = YeelightJiaoyue450;
