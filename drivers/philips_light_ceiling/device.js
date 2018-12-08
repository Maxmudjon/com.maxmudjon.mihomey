const Homey = require('homey')
const miio = require('miio')

class PhilipsLightCeiling extends Homey.Device {
  async onInit() {
    this.initialize = this.initialize.bind(this)
    this.driver = this.getDriver()
    this.data = this.getData()
    this.brightness;
    this.colorTemperature;
    this.initialize()
    this.log('Mi Homey device init | ' + 'name: ' + this.getName() + ' - ' + 'class: ' + this.getClass() + ' - ' + 'data: ' + JSON.stringify(this.data));
  }

  async initialize() {
    this.registerActions()
    this.registerCapabilities()
    this.getYeelightStatus()
  }

  registerCapabilities() {
    const { triggers } = this.driver
    this.registerOnOffButton('onoff')
    this.registerBrightnessLevel('dim')
    this.registerLightTemperatureLevel('light_temperature')
  }

  registerActions() {
    const { actions } = this.driver
    this.registerPhilipsScenesAction('philips_scenes', actions.philipsScenes)
    this.registerPhilipsLightACAction('philips_light_ac', actions.philipsLightAC)
  }

  getYeelightStatus() {
    var that = this;
    miio.device({
      address: that.getSetting('deviceIP'),
      token: that.getSetting('deviceToken')
    }).then(device => {
      if (!that.getAvailable()) {
        that.setAvailable();
      }

      that.device = device;

      device.call("get_prop", ["power"]).then(result => {
        that.setCapabilityValue('onoff', result[0] === 'on' ? true : false)
      }).catch(function(err) {
      });

      device.call("get_prop", ["bright"]).then(result => {
        that.setCapabilityValue('dim', result[0] / 100)
        that.brightness = result[0] / 100
      }).catch(function(err) {
      });

      device.call("get_prop", ["cct"]).then(result => {
        var that = this;
        that.colorTemperature = result[0];
      }).catch(function(err) {
      });

      if (this.colorTemperature != undefined && this.colorTemperature != null) {
        var colorTemp = this.normalize(this.colorTemperature, 2700, 5700)

        this.setCapabilityValue('light_temperature', colorTemp)
      }

      var update = that.getSetting('updateTimer') || 60;
      that.updateTimer(update);
    }).catch((error) => {
      that.log(error);
      that.setUnavailable(Homey.__('reconnecting'));
      setTimeout(() => {
        that.getYeelightStatus();
      }, 10000);
    });
  }

  updateTimer(interval) {
    clearInterval(this.updateInterval);
    this.updateInterval = setInterval(() => {
      this.device.call("get_prop", ["power"]).then(result => {
        this.setCapabilityValue('onoff', result[0] === 'on' ? true : false)
      }).catch(function(err) {
      });

      this.device.call("get_prop", ["bright"]).then(result => {
        this.setCapabilityValue('dim', result[0] / 100)
        this.brightness = result[0] / 100
      }).catch(function(err) {
      });

      this.device.call("get_prop", ["cct"]).then(result => {
        var that = this;
        that.colorTemperature = result[0];
      }).catch(function(err) {
      });

      if (this.colorTemperature != undefined && this.colorTemperature != null) {
        var colorTemp = this.normalize(this.colorTemperature, 2700, 5700)

        this.setCapabilityValue('light_temperature', colorTemp)
      }

    }, 1000 * interval);
  }

  normalize(value, min, max) {
    var normalized = (value - min) / (max - min);
    return Number(normalized.toFixed(2));
  }

  onSettings (oldSettings, newSettings, changedKeys, callback) {
    if (changedKeys.includes('updateTimer') || changedKeys.includes('deviceIP') || changedKeys.includes('deviceToken')) {
      this.getYeelightStatus();
      callback(null, true)
    }
  }

  registerOnOffButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      var that = this;
      that.device.call('set_power', [ value ? 'on' : 'off' ]).then(result => {
        that.log('Sending ' + name + ' commmand: ' + value);
      }).catch(function(error) {
        that.log("Sending commmand error: ", error);
      });
    })
  }

  registerBrightnessLevel(name) {
    this.registerCapabilityListener(name, async (value) => {
      var that = this;
      if (value * 100 > 0) {
        that.device.call('set_bright', [ value * 100 ]).then(result => {
          that.log('Sending ' + name + ' commmand: ' + value);
        }).catch(function(error) {
          that.log("Sending commmand error: ", error);
        });
      }
    })
  }

  registerLightTemperatureLevel(name) {
    this.registerCapabilityListener(name, async (value) => {
      var that = this;
      let color_temp = that.denormalize(value, 2700, 5700);
      that.device.call('set_cct', [ color_temp ]).then(result => {
        that.log('Sending ' + name + ' commmand: ' + color_temp);
      }).catch(function(error) {
        that.log("Sending commmand error: ", error);
      });
    })
  }

  denormalize(normalized, min, max) {
    var denormalized = ((1 - normalized) * (max - min) + min);
    return Number(denormalized.toFixed(0));
  }

  registerPhilipsScenesAction(name, action) {
    action.action.registerRunListener(async (args, state) => {
      var that = this;
      that.device.call('apply_fixed_scene', [args.scene]).then(result => {
        that.log('Set scene: ', args.scene);
      }).catch(function(error) {
        that.log("Set flow error: ", error);
      });
    })
  }
  
  registerPhilipsLightACAction(name, action) {
    action.action.registerRunListener(async (args, state) => {
      var that = this;
      that.device.call('enable_ac', [args.ac]).then(result => {
        that.log('Set Auto Adjust Color Temperature: ', args.ac);
      }).catch(function(error) {
        that.log("Set flow error: ", error);
      });
    })
  }

  onAdded() {
    this.log('Device added')
  }

  onDeleted() {
    this.log('Device deleted deleted')
    clearInterval(this.updateInterval);
    this.device.destroy();
  }
}

module.exports = PhilipsLightCeiling