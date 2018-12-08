const Homey = require('homey')
const miio = require('miio')

class CHINGMISmartPowerStrip extends Homey.Device {
  async onInit() {
    this.initialize = this.initialize.bind(this)
    this.driver = this.getDriver()
    this.data = this.getData()
    this.initialize()
    this.log('Mi Homey device init | ' + 'name: ' + this.getName() + ' - ' + 'class: ' + this.getClass() + ' - ' + 'data: ' + JSON.stringify(this.data));
  }

  async initialize() {
    this.registerCapabilities()
    this.getXiaomiStatus()
  }

  registerCapabilities() {
    this.registerOnOffButton('onoff')
    this.registerLedOnOffButton('onoff.led')
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
      const { triggers } = this.driver;
      that.device = device;

      device.call("get_prop", ["power"]).then(result => {
        that.setCapabilityValue('onoff', result[0] == 'on' ? true : false)
      }).catch(function(err) {
      });

      device.call("get_prop", ["power_consume_rate"]).then(result => {
        that.setCapabilityValue('measure_power', parseInt(result[0]))
      }).catch(function(err) {
      });

      device.call("get_prop", ["current"]).then(result => {
        that.setCapabilityValue('meter_ampere', result[0])
        let tokens = { 'ampere': result[0] }
        that.triggerFlow(triggers.meterAmpere, 'meterAmpere', tokens)
      }).catch(function(err) {
      });

      device.call("get_prop", ["voltage"]).then(result => {
        that.setCapabilityValue('measure_voltage', result[0])
      }).catch(function(err) {
      });

      device.call("get_prop", ["temperature"]).then(result => {
        that.setCapabilityValue('measure_temperature', result[0])
      }).catch(function(err) {
      });

      device.call("get_prop", ["wifi_led"]).then(result => {
        that.setCapabilityValue('onoff.led', result[0] == 'on' ? true : false)
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
    const { triggers } = this.driver;
    clearInterval(this.updateInterval);
    this.updateInterval = setInterval(() => {
      this.device.call("get_prop", ["power"]).then(result => {
        this.setCapabilityValue('onoff', result[0] == 'on' ? true : false)
      }).catch(function(err) {
      });

      this.device.call("get_prop", ["power_consume_rate"]).then(result => {
        this.setCapabilityValue('measure_power', parseInt(result[0]))
      }).catch(function(err) {
      });

      this.device.call("get_prop", ["current"]).then(result => {
        this.setCapabilityValue('meter_ampere', result[0])
        let tokens = { 'ampere': result[0] }
        this.triggerFlow(triggers.meterAmpere, 'meterAmpere', tokens)
      }).catch(function(err) {
      });

      this.device.call("get_prop", ["voltage"]).then(result => {
        this.setCapabilityValue('measure_voltage', result[0])
      }).catch(function(err) {
      });

      this.device.call("get_prop", ["temperature"]).then(result => {
        this.setCapabilityValue('measure_temperature', result[0])
      }).catch(function(err) {
      });

      this.device.call("get_prop", ["wifi_led"]).then(result => {
        this.setCapabilityValue('onoff.led', result[0] == 'on' ? true : false)
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
      that.device.call('set_power', [value ? 'on' : 'off']).then(result => {
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

  triggerFlow(trigger, name, value) {
    if (!trigger) {
      return
    }

    if(value) {
      trigger.trigger( this, value, true )
    }

    // this.log('trigger:', name, value)

    switch(name) {
      case 'meterAmpere':
    }
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

module.exports = CHINGMISmartPowerStrip