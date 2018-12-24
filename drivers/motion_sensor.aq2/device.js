const Homey = require('homey')

class MiMotionSensor extends Homey.Device {
  async onInit() {
    this.initialize = this.initialize.bind(this)
    this.handleStateChange = this.handleStateChange.bind(this)
    this.driver = this.getDriver()
    this.data = this.getData()
    this.initialize()
    this.log('Mi Homey device init | ' + 'name: ' + this.getName() + ' - ' + 'class: ' + this.getClass() + ' - ' + 'data: ' + JSON.stringify(this.data));
  }

  async initialize() {
    if (Homey.app.mihub.hubs) {
      this.registerStateChangeListener()
    } else {
      this.unregisterStateChangeListener()
    }
  }

  handleStateChange(device) {
    if (device['data']['no_motion']) {
      // 120
      // 180
      // 300
      // 600
      // ...
      this.log("NO MOTION: ", device.data.no_motion)
    }
    if (device['data']['voltage']) {
      var battery = (device['data']['voltage'] - 2800) / 5
      if (battery == 160) {
        battery = 100
      }
      var lowBattery
      if (battery > 20) {
        lowBattery = false
      } else {
        lowBattery = true
      }
      this.updateCapabilityValue('measure_battery', battery);
      this.updateCapabilityValue('alarm_battery', lowBattery)
    }

    if (device['data']['status'] == 'motion') {
      this.updateCapabilityValue('alarm_motion', true, null)
      if (this.timeout) {
        clearTimeout(this.timeout)
      }
      this.timeout = setTimeout(() => {
        this.updateCapabilityValue('alarm_motion', false, null);
      }, this.getSetting('alarm_duration_number') * 1000)
    }

    if (device['data']['lux']) {
      this.updateCapabilityValue('measure_luminance', parseInt(device['data']['lux']))
    }

    let gateways = Homey.app.mihub.gateways
    for (let sid in gateways) {
      gateways[sid]['childDevices'].forEach(deviceSid => {
        if (this.data.sid == deviceSid) {
          this.setSettings({
            deviceFromGatewaySid: sid
          })
        }
      })
    }

    this.setSettings({
      deviceSid: device.sid,
      deviceModelName: 'lumi.' + device.model,
      deviceModelCodeName: device.modelCode,
    })
  }

  registerAuthChangeListener() {
    Homey.app.mihub.on('gatewaysList', this.initialize)
  }

  registerStateChangeListener() {
    Homey.app.mihub.on(`${this.data.sid}`, this.handleStateChange)
  }

  unregisterAuthChangeListener() {
    Homey.app.mihub.removeListener('gatewaysList', this.initialize)
  }

  unregisterStateChangeListener() {
    Homey.app.mihub.removeListener(`${this.data.sid}`, this.handleStateChange)
  }

  updateCapabilityValue(name, value, trigger) {
    if (this.getCapabilityValue(name) != value) {
      this.setCapabilityValue(name, value)
      this.triggerFlow(trigger, name, value)
    }
  }

  triggerFlow(trigger, name, value) {
    if (!trigger) {
      return
    }

    this.log('trigger:', name, value)

    switch (name) {
      case 'alarm_motion':
    }
  }

  onAdded() {
    this.log('Device added')
  }

  onDeleted() {
    this.unregisterAuthChangeListener()
    this.unregisterStateChangeListener()
    this.log('Device deleted deleted')
  }
}

module.exports = MiMotionSensor
