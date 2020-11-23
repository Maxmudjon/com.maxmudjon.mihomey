const Homey = require("homey");
const miio = require("miio");
const flows = require("../../lib/flows");

class YeelightColorBulb extends Homey.Device {
  async onInit() {
    this.initialize = this.initialize.bind(this);
    this.driver = this.getDriver();
    this.data = this.getData();
    this.drgb;
    this.brightness;
    this.colorTemperature;
    this.initialize();
    this.log("Mi Homey device init | name: " + this.getName() + " - class: " + this.getClass() + " - data: " + JSON.stringify(this.data));
  }

  async initialize() {
    this.registerActions();
    this.registerCapabilities();
    this.getYeelightStatus();
  }

  registerCapabilities() {
    this.registerOnOffButton("onoff");
    this.registerDimLevel("dim");
    this.registerHueLevel("light_hue");
    this.registerLightTemperatureLevel("light_temperature");
  }

  registerActions() {
    const { actions } = this.driver;
    this.registerFavoriteFlowsAction("favorite_flow_color1_bulb", actions.favoriteFlow);
    this.registerSmoothAction("smoothOnOff", actions.smoothAction);
  }

  getYeelightStatus() {
    miio
      .device({ address: this.getSetting("deviceIP"), token: this.getSetting("deviceToken") })
      .then((device) => {
        if (!this.getAvailable()) {
          this.setAvailable();
        }
        this.device = device;

        this.device
          .call("get_prop", ["power", "bright", "rgb", "ct", "color_mode"])
          .then((result) => {
            this.updateCapabilityValue("onoff", result[0] === "on" ? true : false);
            this.updateCapabilityValue("dim", result[1] / 100);
            this.brightness = result[1] / 100;
            this.drgb = result[2];
            this.colorTemperature = result[3];
            if (result[4] == 2) {
              this.updateCapabilityValue("light_mode", "temperature");
            } else {
              this.updateCapabilityValue("light_mode", "color");
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
          let colorTemp = this.normalize(this.colorTemperature, 1700, 6500);

          this.updateCapabilityValue("light_temperature", colorTemp);
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
        .call("get_prop", ["power", "bright", "rgb", "ct", "color_mode"])
        .then((result) => {
          if (!this.getAvailable()) {
            this.setAvailable();
          }
          this.updateCapabilityValue("onoff", result[0] === "on" ? true : false);
          this.updateCapabilityValue("dim", result[1] / 100);
          this.brightness = result[1] / 100;
          this.drgb = result[2];
          this.colorTemperature = result[3];
          if (result[4] == 2) {
            this.updateCapabilityValue("light_mode", "temperature");
          } else {
            this.updateCapabilityValue("light_mode", "color");
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
        let colorTemp = this.normalize(this.colorTemperature, 1700, 6500);

        this.updateCapabilityValue("light_temperature", colorTemp);
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
    let normalized = (value - min) / (max - min);
    return Number(normalized.toFixed(2));
  }

  rgb2hsb(rgb) {
    let hsb = [];
    let rearranged = rgb.slice(0);
    let maxIndex = 0,
      minIndex = 0;
    let tmp;
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2 - i; j++)
        if (rearranged[j] > rearranged[j + 1]) {
          tmp = rearranged[j + 1];
          rearranged[j + 1] = rearranged[j];
          rearranged[j] = tmp;
        }
    }
    for (let i = 0; i < 3; i++) {
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
        .call("set_rgb", [argbToSend])
        .then(() => this.log("Sending " + name + " commmand: " + argbToSend))
        .catch((error) => this.log("Sending commmand 'set_rgb' error: ", error));
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

  denormalize(normalized, min, max) {
    let denormalized = (1 - normalized) * (max - min) + min;
    return Number(denormalized.toFixed(0));
  }

  registerFavoriteFlowsAction(name, action) {
    let that = this;
    action.favoriteFlow.registerRunListener(async (args, state) => {
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
                that.log("Set flow: ", args.favoriteFlowID);
                device.destroy();
              })
              .catch((error) => {
                that.log("Set flow error: ", error);
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

  registerSmoothAction(name, action) {
    let that = this;
    action.smoothAction.registerRunListener(async (args, state) => {
      if (args.smoothMode == "on") {
        try {
          miio
            .device({
              address: args.device.getSetting("deviceIP"),
              token: args.device.getSetting("deviceToken"),
            })
            .then((device) => {
              device
                .call("set_power", ["on", "smooth", args.smoothTime * 1000])
                .then(() => {
                  that.log("Set ON with smooth: ", args.smoothTime * 1000);
                  device.destroy();
                })
                .catch((error) => {
                  that.log("Set power error: ", error);
                  device.destroy();
                });
            })
            .catch((error) => {
              that.log("miio connect error: " + error);
            });
        } catch (error) {
          that.log("catch error: " + error);
        }
      } else if (args.smoothMode == "off") {
        try {
          miio
            .device({
              address: args.device.getSetting("deviceIP"),
              token: args.device.getSetting("deviceToken"),
            })
            .then((device) => {
              device
                .call("set_power", ["off", "smooth", args.smoothTime * 1000])
                .then(() => {
                  that.log("Set OFF with smooth: ", args.smoothTime * 1000);
                  device.destroy();
                })
                .catch((error) => {
                  that.log("Set power error: ", error);
                  device.destroy();
                });
            })
            .catch((error) => {
              that.log("miio connect error: " + error);
            });
        } catch (error) {
          that.log("catch error: " + error);
        }
      } else if (args.smoothMode == "toggle") {
        try {
          miio
            .device({
              address: args.device.getSetting("deviceIP"),
              token: args.device.getSetting("deviceToken"),
            })
            .then((device) => {
              device.call("get_prop", ["power"]).then((result) => {
                if (result[0] === "on") {
                  try {
                    miio
                      .device({
                        address: args.device.getSetting("deviceIP"),
                        token: args.device.getSetting("deviceToken"),
                      })
                      .then((device) => {
                        device
                          .call("set_power", ["off", "smooth", args.smoothTime * 1000])
                          .then(() => {
                            that.log("Set OFF with smooth: ", args.smoothTime * 1000);
                            device.destroy();
                          })
                          .catch((error) => {
                            that.log("Set power error: ", error);
                            device.destroy();
                          });
                      })
                      .catch((error) => {
                        that.log("miio connect error: " + error);
                      });
                  } catch (error) {
                    that.log("catch error: " + error);
                  }
                } else if (result[0] === "off") {
                  try {
                    miio
                      .device({
                        address: args.device.getSetting("deviceIP"),
                        token: args.device.getSetting("deviceToken"),
                      })
                      .then((device) => {
                        device
                          .call("set_power", ["on", "smooth", args.smoothTime * 1000])
                          .then(() => {
                            that.log("Set ON with smooth: ", args.smoothTime * 1000);
                            device.destroy();
                          })
                          .catch((error) => {
                            that.log("Set power error: ", error);
                            device.destroy();
                          });
                      })
                      .catch((error) => {
                        that.log("miio connect error: " + error);
                      });
                  } catch (error) {
                    that.log("catch error: " + error);
                  }
                }
              });
            })
            .catch((error) => {
              that.log("miio connect error: " + error);
            });
        } catch (error) {
          that.log("catch error: " + error);
        }
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

module.exports = YeelightColorBulb;
