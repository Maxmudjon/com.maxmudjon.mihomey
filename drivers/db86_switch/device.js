const Homey = require('homey')

class DoubleButton86Switch extends Homey.Device {
  async onInit() {
    this.log('Mi Gateway device init')
    this.log('name:', this.getName())
    this.log('class:', this.getClass())
    this.log('data:', this.getData())

    this.initialize = this.initialize.bind(this)
    this.handleStateChange = this.handleStateChange.bind(this)

    this.driver = this.getDriver()
    this.data = this.getData()
    this.initialize()
  }

  async initialize() {
    if (Homey.app.mihub.auth) {
      this.device = await Homey.app.mihub.getDevice(this.data.sid)
      this.registerStateChangeListener()
    } else {
      this.unregisterStateChangeListener()
    }
  }

 
  handleStateChange(deviceIO) {
    const { triggers } = this.driver;
    var battery = (deviceIO.voltage-2800)/5
    var lowBattery
    if(battery > 20) {
      lowBattery = false
    } else {
      lowBattery = true
    }

    this.updateCapabilityValue('get_left_click_db86_switch', deviceIO['channel_0'], triggers.left_click)
    this.updateCapabilityValue('get_right_click_db86_switch', deviceIO['channel_1'], triggers.right_click)
    this.updateCapabilityValue('get_both_click_db86_switch', deviceIO['dual_channel'], triggers.both_click)
    this.setCapabilityValue('measure_battery', battery);
    this.updateCapabilityValue('alarm_battery', lowBattery)


  }

  registerAuthChangeListener() {
    Homey.app.mihub.on('auth', this.initialize)
  }

  registerStateChangeListener() {
    Homey.app.mihub.on(`${this.data.sid}`, this.handleStateChange)
  }

  unregisterAuthChangeListener() {
    Homey.app.mihub.removeListener('auth', this.initialize)
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
