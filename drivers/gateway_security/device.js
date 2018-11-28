const Homey = require('homey')
const miio = require('miio')

class GatewaySecurity extends Homey.Device {
  async onInit() {
    this.initialize = this.initialize.bind(this)
    this.driver = this.getDriver()
    this.data = this.getData()
    this.initialize()
    this.log('Mi Homey device init | ' + 'name: ' + this.getName() + ' - ' + 'class: ' + this.getClass() + ' - ' + 'data: ' + JSON.stringify(this.data));
  }

  async initialize() {
    this.registerCapabilities()
    this.getRadioStatus()
  }

  registerCapabilities() {
    this.registerHomeAlarmSecurity('homealarm_state')
  }

  getRadioStatus() {
    var that = this;
    let settings  = this.getSettings();
    this.log('---------------------------------------------------')
    this.log('ip from setting: ' + settings.gatewayIP + ' token from settings: ' + settings.gatewayToken)
    this.log('---------------------------------------------------')
    miio.device({
      address: that.getSetting('gatewayIP'),
      token: that.getSetting('gatewayToken')
    }).then(device => {
      if (!that.getAvailable()) {
        that.setAvailable();
      }

      that.device = device;

      device.call('get_arming', []).then(result => {
        if (result[0] == 'on') {
          that.setCapabilityValue('homealarm_state', 'armed')
        } else if (result[0] == 'off') {
          that.setCapabilityValue('homealarm_state', 'disarmed')
        }
      }).catch(function(error) {
        that.log("Sending commmand error: ", error);
      });

      var update = that.getSetting('updateTimer') || 60;
      that.updateTimer(update);
    }).catch((error) => {
      that.log(error);
      that.setUnavailable(Homey.__('reconnecting'));
      setTimeout(() => {
        that.getRadioStatus();
      }, 10000);
    });
  }

  updateTimer(interval) {
    var that = this;
    clearInterval(that.updateInterval);
    that.updateInterval = setInterval(() => {
      that.device.call('get_arming', []).then(result => {
        if (result[0] == 'on') {
          that.setCapabilityValue('homealarm_state', 'armed')
        } else if (result[0] == 'off') {
          that.setCapabilityValue('homealarm_state', 'disarmed')
        }
      }).catch(function(error) {
        that.log("Sending commmand error: ", error);
        clearInterval(that.updateInterval);
        that.setUnavailable(Homey.__('unreachable'));
        setTimeout(() => {
          that.getRadioStatus();
        }, 1000 * interval);
      });
    }, 1000 * interval);
  }

  onSettings (oldSettings, newSettings, changedKeys, callback) {
    if (changedKeys.includes('updateTimer') || changedKeys.includes('gatewayIP') || changedKeys.includes('gatewayToken')) {
      this.getRadioStatus();
      callback(null, true)
    }
  }

  registerHomeAlarmSecurity(name) {
    this.registerCapabilityListener(name, async (value) => {
      const settings = this.getSettings();
      var that = this;
      var state;
      if (value == 'armed') {
        state = 'on'
      } else if (value == 'disarmed') {
        state = 'off'
      } else {
        state = 'off'
      }

      that.device.call('set_arming', [ state ]).then(result => {
        that.log('Sending ' + name + ' commmand: ' + value);
      }).catch(function(error) {
        that.log("Sending commmand error: ", error);
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

module.exports = GatewaySecurity