const Homey = require('homey')

class WleakSensor extends Homey.Device {
  async onInit() {
    this.log('Mi Homey device init')
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
    if (Homey.app.mihub.hubs) {
      this.device = await Homey.app.mihub.getDevice(this.data.sid)
      this.log("initialize: ",this.device)
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

    this.updateCapabilityValue('alarm_water', deviceIO['leaked'])
    this.updateCapabilityValue('measure_battery', battery);
    this.updateCapabilityValue('alarm_battery', lowBattery)
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
    this.log(trigger)
    if(value) {
      trigger.trigger( this, {}, true )
    }

    this.log('trigger:', name, value)

    switch(name) {
      case 'alarm_water':
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

module.exports = WleakSensor
