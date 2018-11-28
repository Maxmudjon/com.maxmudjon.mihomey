const Homey = require('homey')
const miio = require('miio')
const flows = require('../../lib/flows')

class YeelightColorBulb extends Homey.Device {
  async onInit() {
    this.initialize = this.initialize.bind(this)
    this.driver = this.getDriver()
    this.data = this.getData()
    this.drgb;
    this.brightness;
    this.colorTemperature;
    this.initialize()
    this.log('Mi Homey device init | ' + 'name: ' + this.getName() + ' - ' + 'class: ' + this.getClass() + ' - ' + 'data: ' + JSON.stringify(this.data));
  }

  async initialize() {
    this.registerActions()
    this.registerCapabilities()
    this.getYeelightStatus()
  }

  registerCapabilities() {
    const { triggers } = this.driver
    this.registerOnOffButton('onoff')
    this.registerDimLevel('dim')
    this.registerHueLevel('light_hue')
    this.registerLightTemperatureLevel('light_temperature')
  }

  registerActions() {
    const { actions } = this.driver
    this.registerFavoriteFlowsAction('favorite_flow_color1_bulb', actions.favoriteFlow)
  }

  getYeelightStatus() {
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

      device.call("get_prop", ["bright"]).then(result => {
        that.setCapabilityValue('dim', result[0] / 100)
        that.brightness = result[0] / 100
      }).catch(function(err) {
      });

      device.call("get_prop", ["rgb"]).then(result => {
        that.drgb = result[0];
      }).catch(function(err) {
      });

      device.call("get_prop", ["ct"]).then(result => {
        that.colorTemperature = result[0];
      }).catch(function(err) {
      });

      if (that.drgb != undefined && that.drgb != null) {
        let red = (that.drgb >> 16) & 0xff
        let green = (that.drgb >> 8) & 0xff
        let blue = that.drgb & 0xff
        let hsbc = that.rgb2hsb([red,green,blue])
        const hue = hsbc[0] / 359

        that.setCapabilityValue('light_hue', hue)
        that.setCapabilityValue('light_saturation', that.brightness)
      }

      if (that.colorTemperature != undefined && that.colorTemperature != null) {
        var colorTemp = that.normalize(that.colorTemperature, 1700, 6500)

        that.setCapabilityValue('light_temperature', colorTemp)
      }

      this.device.call("get_prop", ["color_mode"]).then(result => {
        if (result[0] == 2) {
          this.setCapabilityValue('light_mode', 'temperature');
        } else {
          this.setCapabilityValue('light_mode', 'color');
        }
      }).catch(function(err) {
      });

      var update = that.getSetting('updateTimer') || 60;
      that.updateTimer(update);
    }).catch((error) => {
      that.log(error);
      that.setUnavailable(Homey.__('reconnecting'));
      setTimeout(() => {
        that.getYeelightStatus();
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

      this.device.call("get_prop", ["bright"]).then(result => {
        this.setCapabilityValue('dim', result[0] / 100)
        this.brightness = result[0] / 100
      }).catch(function(err) {
      });

      this.device.call("get_prop", ["rgb"]).then(result => {
        var that = this;
        that.drgb = result[0];
      }).catch(function(err) {
      });

      this.device.call("get_prop", ["ct"]).then(result => {
        var that = this;
        that.colorTemperature = result[0];
      }).catch(function(err) {
      });

      if (this.drgb != undefined && this.drgb != null) {
        let red = (this.drgb >> 16) & 0xff
        let green = (this.drgb >> 8) & 0xff
        let blue = this.drgb & 0xff
        let hsbc = this.rgb2hsb([red,green,blue])
        const hue = hsbc[0] / 359

        this.setCapabilityValue('light_hue', hue)
        this.setCapabilityValue('light_saturation', this.brightness)
      }

      if (this.colorTemperature != undefined && this.colorTemperature != null) {
        var colorTemp = this.normalize(this.colorTemperature, 1700, 6500)

        this.setCapabilityValue('light_temperature', colorTemp)
      }

      this.device.call("get_prop", ["color_mode"]).then(result => {
        if (result[0] == 2) {
          this.setCapabilityValue('light_mode', 'temperature');
        } else {
          this.setCapabilityValue('light_mode', 'color');
        }
      }).catch(function(err) {
      });
    }, 1000 * interval);
  }

  normalize(value, min, max) {
    var normalized = (value - min) / (max - min);
    return Number(normalized.toFixed(2));
  }

  rgb2hsb(rgb) {
    var hsb = [];
    var rearranged = rgb.slice(0);
    var maxIndex = 0,minIndex = 0;
    var tmp;        
    for(var i=0;i<2;i++) {
      for(var j=0;j<2-i;j++)
      if(rearranged[j]>rearranged[j+1]) {
        tmp=rearranged[j+1];
        rearranged[j+1]=rearranged[j];
        rearranged[j]=tmp;
      }                
    }
    for(var i=0;i<3;i++) {
      if(rearranged[0]==rgb[i]) minIndex=i;
      if(rearranged[2]==rgb[i]) maxIndex=i;
    }
    hsb[2]=rearranged[2]/255.0;
    hsb[1]=1-rearranged[0]/rearranged[2];
    hsb[0]=maxIndex*120+60* (rearranged[1]/hsb[1]/rearranged[2]+(1-1/hsb[1])) *((maxIndex-minIndex+3)%3==1?1:-1);
    hsb[0]=(hsb[0]+360)%360;
    return hsb;
  }

  onSettings (oldSettings, newSettings, changedKeys, callback) {
    if (changedKeys.includes('updateTimer') || changedKeys.includes('deviceIP') || changedKeys.includes('deviceToken')) {
      this.getYeelightStatus();
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

  registerDimLevel(name) {
    this.registerCapabilityListener(name, async (value) => {
      var that = this;
      if (value * 100 > 0) {
        that.device.call('set_bright', [ value * 100 ]).then(result => {
          that.log('Sending ' + name + ' commmand: ' + value);
        }).catch(function(error) {
          that.log("Sending commmand error: ", error);
        });
      }
    })
  }

  registerHueLevel(name) {
    this.registerCapabilityListener(name, async (value) => {
      var that = this;
      let rgbToSend = this.hsb2rgb([value * 359, 1, 1]);
      let argbToSend = rgbToSend[0] * 65536 + rgbToSend[1] * 256 + rgbToSend[2];
      that.device.call('set_rgb', [ argbToSend ]).then(result => {
        that.log('Sending ' + name + ' commmand: ' + argbToSend);
      }).catch(function(error) {
        that.log("Sending commmand error: ", error);
      });
    })
  }

  hsb2rgb(hsb) {
    let rgb = [];
    for(let offset=240,i=0; i<3; i++,offset-=120) {
        let x=Math.abs((hsb[0]+offset)%360-240);
        if(x<=60) rgb[i]=255;
        else if(60<x && x<120) rgb[i]=((1-(x-60)/60)*255);
        else rgb[i]=0;
    }
    for(let i=0;i<3;i++)
        rgb[i]+=(255-rgb[i])*(1-hsb[1]);
    for(let i=0;i<3;i++)
        rgb[i]*=hsb[2];
    for(let i=0;i<3;i++)
        rgb[i]=Math.round(rgb[i]);
    return rgb;
  }

  registerLightTemperatureLevel(name) {
    this.registerCapabilityListener(name, async (value) => {
      var that = this;
      let color_temp = that.denormalize(value, 1700, 6500);
      that.device.call('set_ct_abx', [color_temp, "smooth", 500]).then(result => {
        that.log('Sending ' + name + ' commmand: ' + color_temp);
      }).catch(function(error) {
        that.log("Sending commmand error: ", error);
      });
    })
  }

  denormalize(normalized, min, max) {
    var denormalized = ((1 - normalized) * (max - min) + min);
    return Number(denormalized.toFixed(0));
  }

  registerFavoriteFlowsAction(name, action) {
    action.favoriteFlow.registerRunListener(async (args, state) => {
      var that = this;
      that.device.call('start_cf', flows[args.favoriteFlowID]).then(result => {
        that.log('Set flow: ', args.favoriteFlowID);
      }).catch(function(error) {
        that.log("Set flow error: ", error);
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

module.exports = YeelightColorBulb