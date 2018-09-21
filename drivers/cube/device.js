const Homey = require('homey')

class DoubleButton86Switch extends Homey.Device {
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
    const { triggers } = this.driver;
    if (device['data']['voltage']) {
      var battery = (device['data']['voltage']-2800)/5
      var lowBattery
      if(battery > 20) {
        lowBattery = false
      } else {
        lowBattery = true
      }
      this.updateCapabilityValue('measure_battery', battery);
      this.updateCapabilityValue('alarm_battery', lowBattery)
    }

    if (device['data']['status'] == 'shake_air') {
      this.triggerFlow(triggers.shake_air, 'shake_air', true)
    }

    if (device['data']['status'] == 'tap_twice') {
      this.triggerFlow(triggers.tap_twice, 'tap_twice', true)
    }

    if (device['data']['status'] == 'move') {
      this.triggerFlow(triggers.move, 'move', true)
    }
    
    if (device['data']['status'] == 'flip180') {
      this.triggerFlow(triggers.flip180, 'flip180', true)
    }
    
    if (device['data']['status'] == 'flip90') {
      this.triggerFlow(triggers.flip90, 'flip90', true)
    }
    
    if (device['data']['status'] == 'free_fall') {
      this.triggerFlow(triggers.free_fall, 'free_fall', true)
    }
    
    if (device['data']['status'] == 'alert') {
      this.triggerFlow(triggers.alert, 'alert', true)
    }
    
    if (parseInt(device['data']['rotate']) > 0) {
      this.triggerFlow(triggers.rotatePositive, 'rotatePositive', true)
    }
    
    if (parseInt(device['data']['rotate']) < 0) {
      this.triggerFlow(triggers.rotateNegative, 'rotateNegative', true)
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
      deviceModelName: 'lumi.sensor_' + device.model,
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
    if(value) {
      trigger.trigger( this, {}, true )
    }

    this.log('trigger:', name, value)

    switch(name) {
      case 'left_click_db86_switch':
      case 'right_click_db86_switch': 
      case 'both_click_db86_switch':   
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

module.exports = DoubleButton86Switch