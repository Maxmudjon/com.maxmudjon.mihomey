const Homey = require("homey");

class AqaraLightBulb extends Homey.Device {
  async onInit() {
    this.initialize = this.initialize.bind(this);
    this.driver = this.getDriver();
    this.data = this.getData();
    this.log("Mi Homey device init | " + "name: " + this.getName() + " - " + "class: " + this.getClass() + " - " + "data: " + JSON.stringify(this.data));
  }

  onAdded() {
    this.log("Device added");
  }

  onDeleted() {
    this.log("Device deleted deleted");
  }
}

module.exports = AqaraLightBulb;
