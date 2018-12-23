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
    this.registerOnOffButton('onoff')
    this.registerDimLevel('dim')
  }

  registerActions() {
    const { actions } = this.driver
    this.registerFavoriteFlowsAction('favorite_flow_mono1_bulb', actions.favoriteFlow)
  }

  getYeelightStatus() {
    var that = this;
    miio.device({ address: this.getSetting('deviceIP'), token: this.getSetting('deviceToken') })
      .then(device => {
        if (!this.getAvailable()) {
          this.setAvailable();
        }

        this.device = device;

        this.device.call("get_prop", ["power", "bright"])
          .then(result => {
            that.setCapabilityValue('onoff', result[0] === 'on' ? true : false)
            that.setCapabilityValue('dim', result[1] / 100)
            that.brightness = result[1] / 100
          })
          .catch(error => that.log("Sending commmand 'get_prop' error: ", error));

        var update = this.getSetting('updateTimer') || 60;
        this.updateTimer(update);
      })
      .catch(error => {
        this.log(error);
        this.setUnavailable(Homey.__('reconnecting'));
        setTimeout(() => {
          this.getYeelightStatus();
        }, 10000);
      });
  }

  updateTimer(interval) {
    var that = this;
    clearInterval(this.updateInterval);
    this.updateInterval = setInterval(() => {
      this.device.call("get_prop", ["power", "bright"])
        .then(result => {
          that.setCapabilityValue('onoff', result[0] === 'on' ? true : false)
          that.setCapabilityValue('dim', result[1] / 100)
          that.brightness = result[1] / 100
        })
        .catch(error => that.log("Sending commmand 'get_prop' error: ", error));
    }, 1000 * interval);
  }

  onSettings(oldSettings, newSettings, changedKeys, callback) {
    if (changedKeys.includes('updateTimer') || changedKeys.includes('deviceIP') || changedKeys.includes('deviceToken')) {
      this.getYeelightStatus();
      callback(null, true)
    }
  }

  registerOnOffButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device.call('set_power', [value ? 'on' : 'off'])
        .then(() => this.log('Sending ' + name + ' commmand: ' + value))
        .catch(error => this.log("Sending commmand 'set_power' error: ", error));
    })
  }

  registerDimLevel(name) {
    this.registerCapabilityListener(name, async (value) => {
      if (value * 100 > 0) {
        this.device.call('set_bright', [value * 100])
          .then(() => this.log('Sending ' + name + ' commmand: ' + value))
          .catch(error => this.log("Sending commmand 'set_bright' error: ", error));
      }
    })
  }

  registerFavoriteFlowsAction(name, action) {
    var that = this;
    action.favoriteFlow.registerRunListener(async (args, state) => {
      that.device.call('start_cf', flows[args.favoriteFlowID])
        .then(() => that.log('Set flow: ', args.favoriteFlowID))
        .catch(error => that.log("Set flow error: ", error));
    })
  }

  onAdded() {
    this.log('Device added')
  }

  onDeleted() {
    this.log('Device deleted deleted')
    clearInterval(this.updateInterval);
    if (typeof this.device !== "undefined") {
      this.device.destroy();
    }
  }
}

module.exports = YeelightWhiteBulb