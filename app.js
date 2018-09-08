'use strict';

const Homey = require('homey');
const MiHub = require('./lib/MiHub')

class MiHomey extends Homey.App {
	
	onInit() {
		this.log('MiHomey is running...');
		this.mihub = new MiHub(this.log, Homey.ManagerSettings.get('gatewaysList'))
	}
	
}

module.exports = MiHomey;