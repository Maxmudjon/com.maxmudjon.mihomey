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
    this.getSecurityStatus()
  }

  registerCapabilities() {
    this.registerHomeAlarmSecurity('homealarm_state')
  }

  getSecurityStatus() {
    miio.device({ address: this.getSetting('gatewayIP'), token: this.getSetting('gatewayToken') })
      .then(device => {
        if (!this.getAvailable()) {
          this.setAvailable();
        }

        this.device = device;

        this.device.call('get_arming', [])
          .then(result => {
            if (result[0] == 'on') {
              this.setCapabilityValue('homealarm_state', 'armed');
            } else if (result[0] == 'off') {
              this.setCapabilityValue('homealarm_state', 'disarmed');
            }
          })
          .catch(error => this.log("Sending commmand 'get_arming' error: ", error));

        var update = this.getSetting('updateTimer') || 60;
        this.updateTimer(update);
      })
      .catch(error => {
        this.log(error);
        this.setUnavailable(Homey.__('reconnecting'));
        setTimeout(() => {
          this.getSecurityStatus();
        }, 10000);
      });
  }

  updateTimer(interval) {
    clearInterval(this.updateInterval);
    this.updateInterval = setInterval(() => {
      this.device.call('get_arming', [])
        .then(result => {
          if (result[0] == 'on') {
            this.setCapabilityValue('homealarm_state', 'armed');
          } else if (result[0] == 'off') {
            this.setCapabilityValue('homealarm_state', 'disarmed');
          }
        })
        .catch(error => {
          this.log("Sending commmand error: ", error);
          clearInterval(this.updateInterval);
          this.setUnavailable(Homey.__('unreachable'));
          setTimeout(() => {
            this.getSecurityStatus();
          }, 1000 * interval);
        });
    }, 1000 * interval);
  }

  onSettings(oldSettings, newSettings, changedKeys, callback) {
    if (changedKeys.includes('updateTimer') || changedKeys.includes('gatewayIP') || changedKeys.includes('gatewayToken')) {
      this.getSecurityStatus();
      callback(null, true)
    }
  }

  registerHomeAlarmSecurity(name) {
    this.registerCapabilityListener(name, async (value) => {
      var state;
      if (value == 'armed') {
        state = 'on'
      } else if (value == 'disarmed') {
        state = 'off'
      } else {
        state = 'off'
      }

      this.device.call('set_arming', [state])
        .then(() => this.log('Sending ' + name + ' commmand: ' + value))
        .catch(error => this.log("Sending commmand error: ", error));
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

module.exports = GatewaySecurity