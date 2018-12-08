const Homey = require('homey')
const miio = require('miio')

class MiSmartPlugWiFi extends Homey.Device {
  async onInit() {
    this.initialize = this.initialize.bind(this)
    this.driver = this.getDriver()
    this.data = this.getData()
    this.initialize()
    this.log('Mi Homey device init | ' + 'name: ' + this.getName() + ' - ' + 'class: ' + this.getClass() + ' - ' + 'data: ' + JSON.stringify(this.data));
  }

  async initialize() {
    this.registerActions()
    this.registerCapabilities()
    this.getXiaomiStatus()
  }

  registerCapabilities() {
    const { triggers } = this.driver
    this.registerOnOffButton('onoff')
    this.registerLedOnOffButton('onoff.led')
  }

  registerActions() {
    const { actions } = this.driver
  }

  getXiaomiStatus() {
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

      device.call("get_prop", ["temperature"]).then(result => {
        that.setCapabilityValue('measure_temperature', result[0])
      }).catch(function(err) {
      });

      device.call("get_prop", ["wifi_led"]).then(result => {
        var that = this;
        that.setCapabilityValue('onoff.led', result[0] === 'on' ? true : false)
      }).catch(function(err) {
      });

      var update = that.getSetting('updateTimer') || 60;
      that.updateTimer(update);
    }).catch((error) => {
      that.log(error);
      that.setUnavailable(Homey.__('reconnecting'));
      setTimeout(() => {
        that.getXiaomiStatus();
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

      this.device.call("get_prop", ["temperature"]).then(result => {
        that.setCapabilityValue('measure_temperature', result[0])
      }).catch(function(err) {
      });

      this.device.call("get_prop", ["wifi_led"]).then(result => {
        var that = this;
        that.setCapabilityValue('onoff.led', result[0] === 'on' ? true : false)
      }).catch(function(err) {
      });

    }, 1000 * interval);
  }

  onSettings (oldSettings, newSettings, changedKeys, callback) {
    if (changedKeys.includes('updateTimer') || changedKeys.includes('deviceIP') || changedKeys.includes('deviceToken')) {
      this.getXiaomiStatus();
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

  registerLedOnOffButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      var that = this;
      that.device.call('set_wifi_led', [ value ? 'on' : 'off' ]).then(result => {
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

module.exports = MiSmartPlugWiFi