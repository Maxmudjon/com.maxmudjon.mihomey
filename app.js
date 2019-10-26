"use strict";

const Homey = require("homey");

class MiHomey extends Homey.App {
  onInit() {
    this.log("Mi Homey is running...");
  }
}

module.exports = MiHomey;
