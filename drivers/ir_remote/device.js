const Homey = require("homey");
const miio = require("miio");

class IRRemote extends Homey.Device {
  async onInit() {
    this.initialize = this.initialize.bind(this);
    this.driver = this.getDriver();
    this.data = this.getData();
    this.initialize();
    this.lux = 0;
    this.log("Mi IR device init | name: " + this.getName() + " - class: " + this.getClass() + " - data: " + JSON.stringify(this.data));
  }

  async initialize() {
    this.registerCapabilities();
    this.registerConditions();
    this.registerActions();
  }

  registerCapabilities() {
    const { triggers } = this.driver;
  }

  registerConditions() {
    const { conditions } = this.driver;
  }

  registerActions() {
    const { actions } = this.driver;
    this.sendIrCodeAction("send_ir_code", actions.sendIRCodeAction);
    this.registerStandbyAction("onoff");
    this.registerChannelUpAction("channel_up");
    this.registerChannelDownAction("channel_down");
    this.registerVolumeUpAction("volume_up");
    this.registerVolumeDownAction("volume_down");
    this.registerMuteAction("volume_mute");
    this.registerDimAction("dim");
    this.registerThermostatAction("thermostat");
  }

  registerCondition(name, condition) {
    condition.registerRunListener((args, state) => Promise.resolve(this.getCapabilityValue(name)));
  }

  registerStandbyAction(name) {
    this.registerCapabilityListener(name, async (value) => {
      if (value) {
        if (this.data && this.data.onoff1) {
          this.sendIrCode(this.data.onoff1, name);
        } else {
          this.sendIrCode(this.data.onoff, name);
        }
      } else {
        if (this.data && this.data.onoff2) {
          this.sendIrCode(this.data.onoff2, name);
        } else {
          this.sendIrCode(this.data.onoff, name);
        }
      }
    });
  }

  registerChannelUpAction(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.sendIrCode(this.data.channel_up, name);
    });
  }

  registerChannelDownAction(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.sendIrCode(this.data.channel_down, name);
    });
  }

  registerVolumeUpAction(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.sendIrCode(this.data.volume_up, name);
    });
  }

  registerVolumeDownAction(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.sendIrCode(this.data.volume_down, name);
    });
  }

  registerMuteAction(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.sendIrCode(this.data.volume_mute, name);
    });
  }

  registerDimAction(name) {
    this.registerCapabilityListener(name, async (value) => {
      if (this.data && this.data.dim1) {
        this.sendIrCode(this.data.dim + value, name);
      } else {
        this.sendIrCode(this.data.dim, name);
      }
    });
  }

  registerThermostatAction(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.log(value);
      // this.sendIrCode(this.data.volume_mute, name);
    });
  }

  sendIrCodeAction(name, action) {
    action.code.registerRunListener(async (args, state) => {
      let data = {
        deviceIp: args.device.getSetting("deviceIP"),
        deviceToken: args.device.getSetting("deviceToken"),
      };
      this.sendIrCode(args.code);
    });
  }

  sendIrCode(code, cababilityName) {
    const settings = this.getSettings();
    miio
      .device({
        address: settings.deviceIp,
        token: settings.deviceToken,
      })
      .then(async (device) => {
        for (let i = 0; i < settings.replay; i++) {
          await this.sleep(500);
          device
            .call("miIO.ir_play", { freq: 38400, code: code })
            .then((result) => {
              if (!cababilityName) {
                cababilityName = "custom";
              }
              this.log("Sending " + cababilityName + " ir code: " + code);
            })
            .catch((error) => {
              this.log("Sending ir code error: ", error);
            });
        }
      })
      .catch((error) => {
        if (error == "Error: Could not connect to device, handshake timeout") {
          this.log("Device timeout error: ", error);
        } else {
          this.log("Device error: ", error);
        }
      });
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  onAdded() {
    this.log("Device added");
  }

  onDeleted() {
    this.log("Device deleted");
  }
}

module.exports = IRRemote;
