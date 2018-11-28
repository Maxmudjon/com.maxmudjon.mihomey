const Homey = require('homey')
const miio = require('miio')
const flows = require('../../lib/flows')

class YeelightWhiteBulb extends Homey.Device {
  async onInit() {
    this.initialize = this.initialize.bind(this)
    this.driver = this.getDriver()
    this.data = this.getData()
    this.brightness;
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
    this.registerEyeCareButton('onoff.eyecare')
    this.registerAmbilightButton('onoff.ambilight')
    this.registerAmbilightLevel('dim.ambilight')
  }

  registerActions() {
    const { actions } = this.driver
    this.registerAmbilightLevelAction('ambilight_level', actions.ambilightLevel)
    this.registerEyecareSceneAction('eyecare_scene', actions.eyecareScene)
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

      device.call("get_prop", ["ambstatus"]).then(result => {
        that.setCapabilityValue('onoff.ambilight', result[0] === 'on' ? true : false)
      }).catch(function(err) {
      });

      device.call("get_prop", ["eyecare"]).then(result => {
        that.setCapabilityValue('onoff.eyecare', result[0] === 'on' ? true : false)
      }).catch(function(err) {
      });

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

      this.device.call("get_prop", ["ambstatus"]).then(result => {
        this.setCapabilityValue('onoff.ambilight', result[0] === 'on' ? true : false)
      }).catch(function(err) {
      });

      this.device.call("get_prop", ["eyecare"]).then(result => {
        this.setCapabilityValue('onoff.eyecare', result[0] === 'on' ? true : false)
      }).catch(function(err) {
      });
    }, 1000 * interval);
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

  registerEyeCareButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      var that = this;
      that.device.call('set_eyecare', [ value ? 'on' : 'off' ]).then(result => {
        that.log('Sending ' + name + ' commmand: ' + value);
      }).catch(function(error) {
        that.log("Sending commmand error: ", error);
      });
    })
  }

  registerAmbilightButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      var that = this;
      that.device.call('enable_amb', [ value ? 'on' : 'off' ]).then(result => {
        that.log('Sending ' + name + ' commmand: ' + value);
      }).catch(function(error) {
        that.log("Sending commmand error: ", error);
      });
    })
  }

  registerAmbilightLevel(name) {
    this.registerCapabilityListener(name, async (value) => {
      var that = this;
      if (value * 100 > 0) {
        that.device.call('set_amb_bright', [ value * 100 ]).then(result => {
          that.log('Sending ' + name + ' commmand: ' + value);
        }).catch(function(error) {
          that.log("Sending commmand error: ", error);
        });
      }
    })
  }

  registerAmbilightLevelAction(name, action) {
    action.action.registerRunListener(async (args, state) => {
      var that = this;
      that.device.call('set_amb_bright', [args.level * 100]).then(result => {
        that.log('Set ambilight: ', args.level * 100);
      }).catch(function(error) {
        that.log("Set flow error: ", error);
      });
    })
  }

  registerEyecareSceneAction(name, action) {
    action.action.registerRunListener(async (args, state) => {
      var that = this;
      console.log('registerEyecareSceneAction', args.scene)
      that.device.call('set_user_scene', [args.scene]).then(result => {
        that.log('Set eyecare scene: ', args.scene);
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

module.exports = YeelightWhiteBulb