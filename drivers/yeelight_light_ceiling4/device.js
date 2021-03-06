const Homey = require("homey");
const miio = require("miio");
const flows = require("../../lib/flows");

class YeelightJiaoyue650 extends Homey.Device {
  async onInit() {
    this.initialize = this.initialize.bind(this);
    this.driver = this.getDriver();
    this.data = this.getData();
    this.drgb;
    this.brightness;
    this.colorTemperature;
    this.bgColorTemperature;
    this.initialize();
    this.log("Mi Homey device init | name: " + this.getName() + " - class: " + this.getClass() + " - data: " + JSON.stringify(this.data));
  }

  async initialize() {
    this.registerActions();
    this.registerCapabilities();
    this.getYeelightStatus();
    this.registerConditions();
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
    this.registerNightModeAction("yeelight_night_mode", actions.nightMode);
  }

  registerConditions() {
    const { conditions } = this.driver;
    this.registerCondition("night_mode", conditions.night_mode);
  }

  getYeelightStatus() {
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
          .call("get_prop", ["power", "bright", "ct", "color_mode", "bg_power", "bg_bright", "bg_rgb", "bg_ct", "bg_lmode"])
          .then((result) => {
            this.updateCapabilityValue("onoff", result[0] === "on" ? true : false);
            this.updateCapabilityValue("dim", result[1] / 100);
            this.brightness = result[1] / 100;
            this.colorTemperature = result[2];
            if (result[3] == 2) {
              this.updateCapabilityValue("light_mode", "temperature");
            } else {
              this.updateCapabilityValue("light_mode", "color");
            }
            this.updateCapabilityValue("onoff.bg", result[4] === "on" ? true : false);
            this.updateCapabilityValue("dim.bg", result[5] / 100);
            this.drgb = result[6];
            this.bgColorTemperature = result[7];
            if (result[8] == 1) {
              this.updateCapabilityValue("light_mode.bg", "color");
            }
          })
          .catch((error) => this.log("Sending commmand 'get_prop' error: ", error));

        if (this.drgb != undefined && this.drgb != null) {
          let red = (this.drgb >> 16) & 0xff;
          let green = (this.drgb >> 8) & 0xff;
          let blue = this.drgb & 0xff;
          let hsbc = this.rgb2hsb([red, green, blue]);
          const hue = hsbc[0] / 359;

          this.updateCapabilityValue("light_hue", hue);
          this.updateCapabilityValue("light_saturation", this.brightness);
        }

        if (this.colorTemperature != undefined && this.colorTemperature != null) {
          var colorTemp = this.normalize(this.colorTemperature, 2700, 6000);

          this.updateCapabilityValue("light_temperature", colorTemp);
        }

        if (this.bgColorTemperature != undefined && this.bgColorTemperature != null) {
          var colorTemp = this.normalize(this.bgColorTemperature, 1700, 6500);

          this.updateCapabilityValue("light_temperature.bg", colorTemp);
        }

        const update = this.getSetting("updateTimer") || 60;
        this.updateTimer(update);
      })
      .catch((error) => {
        this.setUnavailable(error.message);
        clearInterval(this.updateInterval);
        setTimeout(() => {
          this.getYeelightStatus();
        }, 10000);
      });
  }

  updateTimer(interval) {
    clearInterval(this.updateInterval);
    this.updateInterval = setInterval(() => {
      this.device
        .call("get_prop", ["power", "bright", "ct", "color_mode", "bg_power", "bg_bright", "bg_rgb", "bg_ct", "bg_lmode"])
        .then((result) => {
          if (!this.getAvailable()) {
            this.setAvailable();
          }
          this.updateCapabilityValue("onoff", result[0] === "on" ? true : false);
          this.updateCapabilityValue("dim", result[1] / 100);
          this.brightness = result[1] / 100;
          this.colorTemperature = result[2];
          if (result[3] == 2) {
            this.updateCapabilityValue("light_mode", "temperature");
          } else {
            this.updateCapabilityValue("light_mode", "color");
          }
          this.updateCapabilityValue("onoff.bg", result[4] === "on" ? true : false);
          this.updateCapabilityValue("dim.bg", result[5] / 100);
          this.drgb = result[6];
          this.bgColorTemperature = result[7];
          if (result[8] == 1) {
            this.updateCapabilityValue("light_mode.bg", "color");
          }
        })
        .catch((error) => {
          this.log("Sending commmand 'get_prop' error: ", error);
          this.setUnavailable(error.message);
          clearInterval(this.updateInterval);
          setTimeout(() => {
            this.getYeelightStatus();
          }, 1000 * interval);
        });

      if (this.drgb != undefined && this.drgb != null) {
        let red = (this.drgb >> 16) & 0xff;
        let green = (this.drgb >> 8) & 0xff;
        let blue = this.drgb & 0xff;
        let hsbc = this.rgb2hsb([red, green, blue]);
        const hue = hsbc[0] / 359;

        this.updateCapabilityValue("light_hue", hue);
        this.updateCapabilityValue("light_saturation", this.brightness);
      }

      if (this.colorTemperature != undefined && this.colorTemperature != null) {
        var colorTemp = this.normalize(this.colorTemperature, 2700, 6000);

        this.updateCapabilityValue("light_temperature", colorTemp);
      }

      if (this.bgColorTemperature != undefined && this.bgColorTemperature != null) {
        var colorTemp = this.normalize(this.bgColorTemperature, 1700, 6500);

        this.updateCapabilityValue("light_temperature.bg", colorTemp);
      }
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

  onSettings(oldSettings, newSettings, changedKeys, callback) {
    if (changedKeys.includes("updateTimer") || changedKeys.includes("deviceIP") || changedKeys.includes("smooth") || changedKeys.includes("deviceToken")) {
      this.getYeelightStatus();
      callback(null, true);
    }
  }

  registerOnOffButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("set_power", [value ? "on" : "off", "smooth", this.getSetting("smooth") * 1000])
        .then(() => this.log("Sending " + name + " commmand: " + value + " with " + this.getSetting("smooth") + " smooth"))
        .catch((error) => this.log("Sending commmand 'set_power' error: ", error));
    });
  }

  registerDimLevel(name) {
    this.registerCapabilityListener(name, async (value) => {
      if (value * 100 > 0) {
        this.device
          .call("set_bright", [value * 100])
          .then(() => this.log("Sending " + name + " commmand: " + value))
          .catch((error) => this.log("Sending commmand 'set_bright' error: ", error));
      }
    });
  }

  registerHueLevel(name) {
    this.registerCapabilityListener(name, async (value) => {
      let rgbToSend = this.hsb2rgb([value * 359, 1, 1]);
      let argbToSend = rgbToSend[0] * 65536 + rgbToSend[1] * 256 + rgbToSend[2];
      this.device
        .call("bg_set_rgb", [argbToSend])
        .then(() => this.log("Sending " + name + " commmand: " + argbToSend))
        .catch((error) => this.log("Sending commmand 'bg_set_rgb' error: ", error));
    });
  }

  registerBGOnOffButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("bg_set_power", [value ? "on" : "off"])
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'bg_set_power' error: ", error));
    });
  }

  registerBGDimLevel(name) {
    this.registerCapabilityListener(name, async (value) => {
      if (value * 100 > 0) {
        this.device
          .call("bg_set_bright", [value * 100])
          .then(() => this.log("Sending " + name + " commmand: " + value))
          .catch((error) => this.log("Sending commmand 'bg_set_bright' error: ", error));
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
    this.registerCapabilityListener(name, async (value) => {
      let color_temp = this.denormalize(value, 1700, 6500);
      this.device
        .call("set_ct_abx", [color_temp, "smooth", 500])
        .then(() => this.log("Sending " + name + " commmand: " + color_temp))
        .catch((error) => this.log("Sending commmand 'set_ct_abx' error: ", error));
    });
  }

  registerBGLightTemperatureLevel(name) {
    this.registerCapabilityListener(name, async (value) => {
      let color_temp = this.denormalize(value, 1700, 6500);
      this.device
        .call("bg_set_ct_abx", [color_temp, "smooth", 500])
        .then(() => this.log("Sending " + name + " commmand: " + color_temp))
        .catch((error) => this.log("Sending commmand 'bg_set_ct_abx' error: ", error));
    });
  }

  denormalize(normalized, min, max) {
    var denormalized = (1 - normalized) * (max - min) + min;
    return Number(denormalized.toFixed(0));
  }

  registerFavoriteFlowsAction(name, action) {
    action.registerRunListener(async (args, state) => {
      try {
        miio
          .device({
            address: args.device.getSetting("deviceIP"),
            token: args.device.getSetting("deviceToken"),
          })
          .then((device) => {
            device
              .call("start_cf", flows[args.favoriteFlowID])
              .then(() => {
                this.log("Set flow: ", args.favoriteFlowID);
                device.destroy();
              })
              .catch((error) => {
                this.log("Set flow error: ", error);
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

  registerNightModeAction(name, action) {
    action.registerRunListener(async (args, state) => {
      switch (args.modes) {
        case "on":
          try {
            miio
              .device({
                address: args.device.getSetting("deviceIP"),
                token: args.device.getSetting("deviceToken"),
              })
              .then((device) => {
                device
                  .call("set_power", ["on", "smooth", args.smoothTime, 5])
                  .then(() => {
                    this.log("Set flow: ", args.modes);
                    device.destroy();
                  })
                  .catch((error) => {
                    this.log("Set flow error: ", error);
                    device.destroy();
                  });
              })
              .catch((error) => {
                this.log("miio connect error: " + error);
              });
          } catch (error) {
            this.log("catch error: " + error);
          }

        case "off":
          try {
            miio
              .device({
                address: args.device.getSetting("deviceIP"),
                token: args.device.getSetting("deviceToken"),
              })
              .then((device) => {
                device
                  .call("set_power", ["on", "smooth", args.smoothTime, 1])
                  .then(() => {
                    this.log("Set flow: ", args.modes);
                    device.destroy();
                  })
                  .catch((error) => {
                    this.log("Set flow error: ", error);
                    device.destroy();
                  });
              })
              .catch((error) => {
                this.log("miio connect error: " + error);
              });
          } catch (error) {
            this.log("catch error: " + error);
          }

        case "toggle":
          try {
            miio
              .device({
                address: args.device.getSetting("deviceIP"),
                token: args.device.getSetting("deviceToken"),
              })
              .then((device) => {
                device
                  .call("get_prop", ["active_mode"])
                  .then((result) => {
                    this.log("Set flow: ", args.modes);
                    if (result[0] == "0") {
                      device
                        .call("set_power", ["on", "smooth", args.smoothTime, 5])
                        .then(() => {
                          this.log("Set flow: ", args.modes);
                          device.destroy();
                        })
                        .catch((error) => {
                          this.log("Set flow error: ", error);
                          device.destroy();
                        });
                    } else if (result[0] == "1") {
                      device
                        .call("set_power", ["on", "smooth", args.smoothTime, 1])
                        .then(() => {
                          this.log("Set flow: ", args.modes);
                          device.destroy();
                        })
                        .catch((error) => {
                          this.log("Set flow error: ", error);
                          device.destroy();
                        });
                    }
                  })
                  .catch((error) => {
                    this.log("Set flow error: ", error);
                    device.destroy();
                  });
              })
              .catch((error) => {
                this.log("miio connect error: " + error);
              });
          } catch (error) {
            this.log("catch error: " + error);
          }
      }
    });
  }

  registerCondition(name, condition) {
    condition.registerRunListener(async (args, state, callback) => {
      try {
        miio
          .device({
            address: args.device.getSetting("deviceIP"),
            token: args.device.getSetting("deviceToken"),
          })
          .then((device) => {
            device
              .call("get_prop", ["active_mode"])
              .then((result) => {
                if (result[0] == "1") {
                  callback(null, true);
                } else if (result[0] == "0") {
                  callback(null, false);
                }
                device.destroy();
              })
              .catch((error) => {
                this.log("Set flow error: ", error);
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

module.exports = YeelightJiaoyue650;
