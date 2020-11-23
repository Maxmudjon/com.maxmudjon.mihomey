const Homey = require("homey");

class Gateway extends Homey.Device {
  async onInit() {
    this.initialize = this.initialize.bind(this);
    this.handleStateChange = this.handleStateChange.bind(this);
    this.driver = this.getDriver();
    this.data = this.getData();
    this.initialize();
    this.lux = 0;
    this.log("Mi Homey device init | name: " + this.getName() + " - class: " + this.getClass() + " - data: " + JSON.stringify(this.data));
  }

  async initialize() {
    if (Homey.app.mihub.hubs) {
      this.registerStateChangeListener();
      this.registerCapabilities();
      this.registerConditions();
      this.registerActions();
    } else {
      this.unregisterStateChangeListener();
    }
  }

  registerCapabilities() {
    const { triggers } = this.driver;
    this.registerToggle("onoff", triggers.power);
    this.registerDim("dim");
    this.registerLight_hueAndSaturation();
    this.registerButton("button");
  }

  registerConditions() {
    const { conditions } = this.driver;
    this.registerCondition("onoff", conditions.power);
  }

  registerActions() {
    const { actions } = this.driver;
    this.registerToggleAction("onoff", actions.power);
    this.registerPlayToneAction("play_tone", actions.playTone);
  }

  handleStateChange(device) {
    const { triggers } = this.driver;

    if (parseInt(device["data"]["rgb"]) > 0) {
      this.updateCapabilityValue("onoff", true, triggers.power);
    }

    if (parseInt(device["data"]["rgb"]) == 0) {
      this.updateCapabilityValue("onoff", false, triggers.power);
    }

    if (device["data"]["illumination"]) {
      this.lux = parseInt(device["data"]["illumination"]);
    }

    if (device["data"]["rgb"]) {
      const rawRgb = device["data"]["rgb"];
      var hexRawRgb = rawRgb.toString(16).length == 8 ? rawRgb.toString(16) : "0" + rawRgb.toString(16);
      var hexRgb = hexRawRgb.substring(2, 8);
      var hsb = this.rgb2hsb([parseInt(hexRgb.substring(0, 2), 16), parseInt(hexRgb.substring(2, 4), 16), parseInt(hexRgb.substring(4, 6), 16)]);
      const brightness = parseInt(hexRawRgb.substring(0, 2), 16);
      const dim = brightness / 100;
      const hue = hsb[0] / 359;
      const saturation = hsb[1];
      this.updateCapabilityValue("dim", dim);
      this.updateCapabilityValue("light_hue", hue);
      this.updateCapabilityValue("light_saturation", saturation);
    }

    let gateways = Homey.app.mihub.gateways;
    for (let sid in gateways) {
      if (gateways[sid]["sid"] == this.data.sid) {
        this.setSettings({
          gatewaySid: this.data.sid,
          deviceModelName: gateways[sid].model,
          deviceIp: gateways[sid].ip,
          deviceProtoVersion: gateways[sid].proto_version,
        });

        if (gateways[sid]["model"] == "gateway") {
          this.setSettings({
            deviceModelCodeName: "DGNWG02LM",
          });
        }
      }
    }
  }

  // Special thanks to t.me/FantomNotaBene
  onSettings(oldSettings, newSettings, changedKeys, callback) {
    if (changedKeys.includes("update_luminance_number")) {
      let newUpdateLuminanceInterval = newSettings["update_luminance_number"];
      clearInterval(this.interval);
      this.interval = setInterval(() => {
        this.updateCapabilityValue("measure_luminance", parseInt(this.lux));
      }, newUpdateLuminanceInterval * 1000);
      callback(null, true);
    }
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

  registerAuthChangeListener() {
    Homey.app.mihub.on("gatewaysList", this.initialize);
  }

  registerStateChangeListener() {
    Homey.app.mihub.on(`${this.data.sid}`, this.handleStateChange);
  }

  unregisterAuthChangeListener() {
    Homey.app.mihub.removeListener("gatewaysList", this.initialize);
  }

  unregisterStateChangeListener() {
    Homey.app.mihub.removeListener(`${this.data.sid}`, this.handleStateChange);
  }

  updateCapabilityValue(name, value, trigger) {
    if (this.getCapabilityValue(name) != value) {
      this.setCapabilityValue(name, value)
        .then(() => {
          this.log("[" + this.data.sid + "] [" + name + "] [" + value + "] Capability successfully updated");
        })
        .catch((error) => {
          this.log("[" + this.data.sid + "] [" + name + "] [" + value + "] Capability not updated because there are errors: " + error.message);
        });
      this.triggerFlow(trigger, name, value);
    }
  }

  registerToggle(name, trigger) {
    let sid = this.data.sid;
    this.registerCapabilityListener(name, async (value) => {
      if (value) {
        var hue = this.getCapabilityValue("light_hue") * 359;
        var saturation = this.getCapabilityValue("light_saturation") * 100;
        var dim = this.getCapabilityValue("dim") * 100;
        await Homey.app.mihub.controlLightHLS(sid, Math.round(hue), saturation, dim);
      } else {
        var hue = 0;
        var saturation = 0;
        var dim = 0;
        await Homey.app.mihub.controlLightHLS(sid, Math.round(hue), saturation, dim);
      }
      this.triggerFlow(trigger, name, value);
    });
  }

  registerDim(name) {
    let sid = this.data.sid;

    this.registerCapabilityListener(name, async (value) => {
      var hue = this.getCapabilityValue("light_hue") * 359;
      var saturation = this.getCapabilityValue("light_saturation") * 100;
      var dim = value * 100;
      await Homey.app.mihub.controlLightHLS(sid, Math.round(hue), saturation, dim);
    });
  }

  registerButton(name) {
    let sid = this.data.sid;
    this.registerCapabilityListener(name, async (value) => {
      const data = { join_permission: "yes" };
      await Homey.app.mihub.sendWriteCmd(sid, data);
    });
  }

  registerLight_hueAndSaturation() {
    let sid = this.data.sid;
    this.registerMultipleCapabilityListener(["light_hue", "light_saturation"], async (valueObj) => {
      var hue = valueObj.light_hue * 359;
      var saturation_value = this.getCapabilityValue("light_saturation");
      var saturation = saturation_value * 100;
      var dim = this.getCapabilityValue("dim") * 100;
      await Homey.app.mihub.controlLightHLS(sid, Math.round(hue), saturation, dim);
    });
  }

  dec2hex(dec, len) {
    var hex = "";
    while (dec) {
      var last = dec & 15;
      hex = String.fromCharCode((last > 9 ? 55 : 48) + last) + hex;
      dec >>= 4;
    }
    if (len) {
      while (hex.length < len) hex = "0" + hex;
    }
    return hex;
  }

  registerLight_saturation(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.log("Light_saturation: ", value);
    });
  }

  registerCondition(name, condition) {
    condition.registerRunListener((args, state) => Promise.resolve(this.getCapabilityValue(name)));
  }

  registerToggleAction(name, action) {
    let sid = this.data.sid;
    action.on.registerRunListener(async (args, state) => {
      var hue = this.getCapabilityValue("light_hue") * 359;
      var saturation = this.getCapabilityValue("light_saturation") * 100;
      var dim = this.getCapabilityValue("dim") * 100;
      await Homey.app.mihub.controlLightHLS(sid, Math.round(hue), saturation, dim);
    });
    action.off.registerRunListener(async (args, state) => {
      var hue = 0;
      var saturation = 0;
      var dim = 0;
      await Homey.app.mihub.controlLightHLS(sid, Math.round(hue), saturation, dim);
    });
  }

  registerPlayToneAction(name, action) {
    let sid = this.data.sid;
    action.play.registerRunListener(async (args, state) => {
      await Homey.app.mihub.controlMid(sid, args.toneID, args.volume * 100);
    });
  }

  triggerFlow(trigger, name, value) {
    if (!trigger) {
      return;
    }

    this.log("trigger:", name, value);

    switch (name) {
      case "onoff":
    }
  }

  onAdded() {
    this.log("Device added");
  }

  onDeleted() {
    this.unregisterAuthChangeListener();
    this.unregisterStateChangeListener();
    this.log("Device deleted");
  }
}

module.exports = Gateway;
