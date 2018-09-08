/**
 * Utils
 */
const crypto = require('crypto');

module.exports = {

    isObject (obj) {
        return obj && Object.prototype.toString.apply(obj) === '[object Object]';
    },

    /**
     * Message format assembly
     * Interface requires data field need to do a separate JSON.stringify
     * */
    messageFormat (msg) {
        try {
            let msgData = Object.assign({},msg);
            if (this.isObject(msgData.data)) {
                msgData.data = JSON.stringify(msgData.data);
            }
            return JSON.stringify(msgData);
        } catch (e) {
            console.error('[messageFormat] Bad msg!', msg);
            return '{}';
        }
    },

    /**
     * AES-CBC 128bit
     * After the user receives the 16-byte "token" string in "heartbeat", it encrypts the string with AES-CBC 128.
     * After generating 16 bytes of ciphertext, it is converted to a 32-byte ASCII string.
     *
     * @param token The token of the gateway is delivered with the gateway heartbeat packet
     * @param password Gateway encryption password, obtained in Mijia APP
     * @param iv Initialization vector, convention, external configuration
     * */
    cipher (token, password, iv) {
        let cipher = crypto.createCipheriv('aes-128-cbc', password, iv);
        let key = cipher.update(token, "ascii", "hex");
        cipher.final('hex');
        return key;
    },

    // hsb2rgb([0, 1, 1]) => [255, 0, 0]
    hsb2rgb(hsb) {
        let rgb = [];
        //Saturation and brightness are 100%, adjust hue 
        for(let offset=240,i=0; i<3; i++,offset-=120) {
            // Calculate the difference between the value of the excellent phase h and the center points of the three regions (ie, 0°, 120°, and 240°), and then calculate rgb according to the piecewise function according to the graph. However, because the center of the red zone is unfolded, the center point of the red zone is 0° and it is also 360°. It is not easy to calculate. It is simple to translate the center point of the three zones to 240° to the right.
            let x=Math.abs((hsb[0]+offset)%360-240);
            // If the difference is less than 60° then 255
            if(x<=60) rgb[i]=255;
            // If the difference is between 60° and 120°,
            else if(60<x && x<120) rgb[i]=((1-(x-60)/60)*255);
            // If the difference is greater than 120°, it is 0
            else rgb[i]=0;
        }
        // Re-adjust saturation
        for(let i=0;i<3;i++)
            rgb[i]+=(255-rgb[i])*(1-hsb[1]);
        // Finally adjust the brightness 
        for(let i=0;i<3;i++)
            rgb[i]*=hsb[2];
        // Rounding
        for(let i=0;i<3;i++)
            rgb[i]=Math.round(rgb[i]);
        return rgb;
    },

    // rgb2hsb([255, 0, 0]) => [0, 1, 1]
    rgb2hsb(rgb) {
        let hsb = [];
        let rearranged = rgb.slice(0);
        let maxIndex = 0,minIndex = 0;
        let tmp;
        // Arranging rgb values from small to large, existing in the rearranged array
        for(let i=0;i<2;i++) {
            for(let j=0;j<2-i;j++) {
                if (rearranged[j] > rearranged[j + 1]) {
                    tmp = rearranged[j + 1];
                    rearranged[j + 1] = rearranged[j];
                    rearranged[j] = tmp;
                }
            }
        }
        // The subscripts of rgb are 0, 1, 2 respectively, and the maxIndex and minIndex are used to store the subscripts of the maximum and minimum values in rgb.
        for(let i=0;i<3;i++) {
            if(rearranged[0]===rgb[i]) minIndex=i;
            if(rearranged[2]===rgb[i]) maxIndex=i;
        }
        // Calculate brightness
        hsb[2]=rearranged[2]/255.0;
        // Saturation
        hsb[1]=1-rearranged[0]/rearranged[2];
        // Excellent phase
        hsb[0]=maxIndex*120+60* (rearranged[1]/hsb[1]/rearranged[2]+(1-1/hsb[1])) *((maxIndex-minIndex+3)%3===1?1:-1);
        // Prevent hue from being negative
        hsb[0]=(hsb[0]+360)%360;
        return hsb;
    },

    dec2hex(dec, len) {
        let hex = "";
        while(dec) {
            let last = dec & 15;
            hex = String.fromCharCode(((last>9)?55:48)+last) + hex;
            dec >>= 4;
        }
        if(len) {
            while(hex.length < len) hex = '0' + hex;
        }
        return hex;
    }
};