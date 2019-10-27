const Homey = require("homey");
const miio = require("miio");
const flows = require("../../lib/flows");

class YeelightJiaoyue650 extends Homey.Device {
  onInit() {
    this.driver = this.getDriver();
    this.data = this.getData();
    this.log("Mi Homey device init | " + "name: " + this.getName() + " - " + "class: " + this.getClass() + " - " + "id: " + this.data.id);
    this.initialize();
  }

  async initialize() {
    this.registerActions();
    this.registerCapabilities();
    this.registerConditions();
    this.getDeviceStatus();
  }

  registerCapabilities() {
    this.registerOnOffButton("onoff");
    this.registerDimLevel("dim");
    this.registerHueLevel("light_hue");
    this.registerLightTemperatureLevel("light_temperature");
    this.registerBGOnOffButton("onoff.bg");
    this.registerBGDimLevel("dim.bg");
    this.registerBGLightTemperatureLevel("light_temperature.bg");
  }

  registerActions() {
    const { actions } = this.driver;
    this.registerFavoriteFlowsAction("favorite_flow_ceiling1_lamp", actions.favoriteFlow);
    this.registerSmoothAction("smoothOnOff", actions.smoothAction);
    this.registerNightModeAction("yeelink_night_mode", actions.nightMode);
  }

  registerConditions() {
    const { conditions } = this.driver;
    this.registerCondition("night_mode", conditions.night_mode);
  }

  async getDeviceStatus() {
    try {
      this.miioDevice = await miio.device({ address: this.getSetting("deviceIP"), token: this.getSetting("deviceToken") });
      const result = await this.miioDevice.call("get_prop", ["power", "bright", "ct", "color_mode", "bg_power", "bg_bright", "bg_rgb", "bg_ct", "bg_lmode"]);

      this.setAvailable();

      let red = (result[6] >> 16) & 0xff,
        green = (result[6] >> 8) & 0xff,
        blue = result[6] & 0xff;
      const hsbc = this.rgb2hsb([red, green, blue]);
      const hue = hsbc[0] / 359;
      let colorTemp = this.normalize(result[2], 2700, 6500);
      result[3] == 2 ? this.updateCapabilityValue("light_mode", "temperature") : this.updateCapabilityValue("light_mode", "color");

      this.updateCapabilityValue("onoff", result[0] === "on" ? true : false);
      this.updateCapabilityValue("dim", result[1] / 100);
      this.updateCapabilityValue("onoff.bg", result[4] === "on" ? true : false);
      this.updateCapabilityValue("light_hue", hue);
      this.updateCapabilityValue("light_saturation", result[1] / 100);
      this.updateCapabilityValue("light_temperature", colorTemp);
      this.updateCapabilityValue("dim.bg", result[5] / 100);
      if (result[8] == 1) {
        this.updateCapabilityValue("light_mode.bg", "color");
      }
      this.updateCapabilityValue("light_temperature.bg", this.normalize(result[7], 2700, 6500));

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
        this.miioDevice = await miio.device({ address: this.getSetting("deviceIP"), token: this.getSetting("deviceToken") });
        const result = await this.miioDevice.call("get_prop", ["power", "bright", "ct", "color_mode", "bg_power", "bg_bright", "bg_rgb", "bg_ct", "bg_lmode"]);

        this.setAvailable();

        let red = (result[6] >> 16) & 0xff,
          green = (result[6] >> 8) & 0xff,
          blue = result[6] & 0xff;
        const hsbc = this.rgb2hsb([red, green, blue]);
        const hue = hsbc[0] / 359;
        let colorTemp = this.normalize(result[2], 2700, 6500);
        result[3] == 2 ? this.updateCapabilityValue("light_mode", "temperature") : this.updateCapabilityValue("light_mode", "color");

        this.updateCapabilityValue("onoff", result[0] === "on" ? true : false);
        this.updateCapabilityValue("dim", result[1] / 100);
        this.updateCapabilityValue("onoff.bg", result[4] === "on" ? true : false);
        this.updateCapabilityValue("light_hue", hue);
        this.updateCapabilityValue("light_saturation", result[1] / 100);
        this.updateCapabilityValue("light_temperature", colorTemp);
        this.updateCapabilityValue("dim.bg", result[5] / 100);
        if (result[8] == 1) {
          this.updateCapabilityValue("light_mode.bg", "color");
        }
        this.updateCapabilityValue("light_temperature.bg", this.normalize(result[7], 2700, 6500));

        let update = this.getSetting("updateTimer") || 60;
        this.updateTimer(update);
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

  updateCapabilityValue(name, value) {
    if (this.getCapabilityValue(name) != value) {
      this.setCapabilityValue(name, value)
        .then(() => {
          this.log("[" + this.data.id + "]" + " [" + name + "] [" + value + "] Capability successfully updated");
        })
        .catch(error => {
          this.error("[" + this.data.id + "]" + " [" + name + "] [" + value + "] Capability not updated because there are errors: " + error.message);
        });
    }
  }

  normalize(value, min, max) {
    var normalized = (value - min) / (max - min);
    return Number(normalized.toFixed(2));
  }

  rgb2hsb(rgb) {
    var hsb = [];
    var rearranged = rgb.slice(0);
    var maxIndex = 0,
      minIndex = 0;
    var tmp;
    for (var i = 0; i < 2; i++) {
      for (var j = 0; j < 2 - i; j++)
        if (rearranged[j] > rearranged[j + 1]) {
          tmp = rearranged[j + 1];
          rearranged[j + 1] = rearranged[j];
          rearranged[j] = tmp;
        }
    }
    for (var i = 0; i < 3; i++) {
      if (rearranged[0] == rgb[i]) minIndex = i;
      if (rearranged[2] == rgb[i]) maxIndex = i;
    }
    hsb[2] = rearranged[2] / 255.0;
    hsb[1] = 1 - rearranged[0] / rearranged[2];
    hsb[0] = maxIndex * 120 + 60 * (rearranged[1] / hsb[1] / rearranged[2] + (1 - 1 / hsb[1])) * ((maxIndex - minIndex + 3) % 3 == 1 ? 1 : -1);
    hsb[0] = (hsb[0] + 360) % 360;
    return hsb;
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

  registerHueLevel(name) {
    this.registerCapabilityListener(name, async value => {
      let rgbToSend = this.hsb2rgb([value * 359, 1, 1]);
      let argbToSend = rgbToSend[0] * 65536 + rgbToSend[1] * 256 + rgbToSend[2];

      try {
        await this.miioDevice.call("bg_set_rgb", [argbToSend]);
      } catch (error) {
        this.error(error.message);
      }
    });
  }

  registerBGOnOffButton(name) {
    this.registerCapabilityListener(name, async value => {
      try {
        await this.miioDevice.call("bg_set_power", [value ? "on" : "off"]);
      } catch (error) {
        this.error(error.message);
      }
    });
  }

  registerBGDimLevel(name) {
    this.registerCapabilityListener(name, async value => {
      if (value * 100 > 0) {
        try {
          await this.miioDevice.call("bg_set_bright", [value * 100]);
        } catch (error) {
          this.error(error.message);
        }
      }
    });
  }

  hsb2rgb(hsb) {
    let rgb = [];
    for (let offset = 240, i = 0; i < 3; i++, offset -= 120) {
      let x = Math.abs(((hsb[0] + offset) % 360) - 240);
      if (x <= 60) rgb[i] = 255;
      else if (60 < x && x < 120) rgb[i] = (1 - (x - 60) / 60) * 255;
      else rgb[i] = 0;
    }
    for (let i = 0; i < 3; i++) rgb[i] += (255 - rgb[i]) * (1 - hsb[1]);
    for (let i = 0; i < 3; i++) rgb[i] *= hsb[2];
    for (let i = 0; i < 3; i++) rgb[i] = Math.round(rgb[i]);
    return rgb;
  }

  registerLightTemperatureLevel(name) {
    this.registerCapabilityListener(name, async value => {
      let color_temp = this.denormalize(value, 1700, 6500);

      try {
        await this.miioDevice.call("set_ct_abx", [color_temp, "smooth", 500]);
      } catch (error) {
        this.error(error.message);
      }
    });
  }

  registerBGLightTemperatureLevel(name) {
    this.registerCapabilityListener(name, async value => {
      let color_temp = this.denormalize(value, 1700, 6500);

      try {
        await this.miioDevice.call("bg_set_ct_abx", [color_temp, "smooth", 500]);
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

module.exports = YeelightJiaoyue650;
