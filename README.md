# Mi Homey

Added support for Mi Gateways child devices.

## Version 0.2.3 (BETA TEST - Supported devices:
* Double Button Wirelles Remote Switch (DuplexButton86).
* Motion Sensor 1 version (MotionSensor).
* Leak Sensor (WaterDetector).
* Plug zigbee (PlugBase).
* Contact Sensor (MagnetSensor).
* Button Swotch (Switch).
* Mi Temperature and Humidity Sensor (Sensor_HT).
* Aqara Smart Light Switch With Neutral (SingleSwitchLN).
* Aqara Wirelles Single Switch (SingleButton86).
* Aqara Wall Outlet (PlugBase86).
* Aqara Smart Light Switch With Neutral (DoubleSwitchLN).
* Aqara Smart Light Switch (DoubleSwitch).
* Aqara Smart Light Switch (SingleSwitch).
* Aqara Temperature and Humidity Sensor (WeatherSensor).
* Aqara Door and Window Sensor (MagnetSensor2).
* Aqara Motion Sensor (MotionSensor2).
* Mi / Aqara Cube (Cube).
*
![](https://raw.githubusercontent.com/Maxmudjon/images/master/DuplexButton86.jpg)
![](https://raw.githubusercontent.com/Maxmudjon/images/master/MiMotionSensor.jpg)
![](https://raw.githubusercontent.com/Maxmudjon/images/master/LeakSensor.jpg)
![](https://raw.githubusercontent.com/Maxmudjon/images/master/MiPlugZigbee.jpg)
![](https://raw.githubusercontent.com/Maxmudjon/images/master/MiContactSensor.jpg)
![](https://raw.githubusercontent.com/Maxmudjon/images/master/MiButtonSwtich.jpg)
![](https://raw.githubusercontent.com/Maxmudjon/images/master/MiTempHumSensor.jpg)
![](https://raw.githubusercontent.com/Maxmudjon/images/master/AqaraWallSwitchWithNeutralSingleRocker.jpg)
![](https://raw.githubusercontent.com/Maxmudjon/images/master/SingleButton86.jpg)
![](https://raw.githubusercontent.com/Maxmudjon/images/master/AqaraWallSmartSocketZiGBee.jpg)
![](https://raw.githubusercontent.com/Maxmudjon/images/master/AqaraWallSwitchWithNeutralDoubleRocker2.jpg)
![](https://raw.githubusercontent.com/Maxmudjon/images/master/AqaraWallSwitchDoubleRocker.jpg)
![](https://raw.githubusercontent.com/Maxmudjon/images/master/AqaraWallSwitchSingleRocker.jpg)
![](https://raw.githubusercontent.com/Maxmudjon/images/master/AqaraWeather.jpg)
![](https://raw.githubusercontent.com/Maxmudjon/images/master/AqaraDoorAndWindow.jpg)
![](https://raw.githubusercontent.com/Maxmudjon/images/master/AqaraMotion.jpg)
![](https://raw.githubusercontent.com/Maxmudjon/images/master/MiCube.jpg)

## Add devices
![](https://raw.githubusercontent.com/Maxmudjon/images/master/app-and-show-device2.jpg)

## On Mobile
![](https://raw.githubusercontent.com/Maxmudjon/images/master/on%20mobile.jpg)

## Flow triggers
![](https://raw.githubusercontent.com/Maxmudjon/images/master/flow%20triggers.jpg)

## Version logs
### 0.2.3_beta (2018.09.17)
1. added filter for Mi and Aqara devices.
2. fixed: flow for some devices.

### 0.2.2_beta (2018.09.16)
1. fixed: flow for some devices.
2. added support for Aqara Temperature and Humidity Sensor.
3. added support for Aqara Door and Window Sensor.
4. added support for Aqara Motion Sensor.
5. added support for Mi Cube.

### 0.2.1_beta (2018.09.12)
1. added settings for motion sensor and information for all devices
2. added support for Contact Sensor.
3. added support for Button Switch.
4. added support for Mi Temperature and Humidity Sensor.
5. added support for Aqara Wall Switch With Neutral Single Rocker.
6. added support for Aqara Wirelles Single Switch.
7. added support for Aqara Wall Outlet.
8. added support for Aqara Wall Switch With Neutral Double Rocker.
9. added support for Aqara Wall Switch Single Rocker
10. added support for Aqara Wall Switch Double Rocker.

### 0.2.0_beta (2018.09.10)
1. fixed: device updates by event.
2. added support for Plug zigbee.
3. minor fixes and improvements.
4. fixed: leakage sensor displays status incorrectly.
5. fixed: sometimes Double Button Wirelles Remote Switch was not updated.

### 0.1.1_beta (2018-09-08)
1. added support for Motion Sensor (1 version).
2. added support for Leak Sensor.
3. minor fixes.

### 0.1.0_beta (2018-09-08)
1. fixed: crash when the user did not add anything in the settings in the program.
2. fixed: when the user added a SID and a TOKEN but he had to reboot the application in the application section.
3. added mimorelinks node_module and rewrited mihub.js.
4. added event for ManagerSettings.

### 0.0.1_alpha (2018-09-265)
1. added support for DuplexButton86.
2. added trigger for left, right and both clicks.
3. added Mobile.
4. added support more gateways.
