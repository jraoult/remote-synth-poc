'use strict';

var sdpTransform = require('sdp-transform');

module.exports = {
  tranform: function(sdp) {
    var sdpObj = sdpTransform.parse(sdp);
    // turn on stereo and reduce packet time for opus codec (minimum seems to be 10ms)
    sdpObj.media[0].fmtp[0].config = 'ptime=10; stereo=1;';
    var output = sdpTransform.write(sdpObj);
    return output;
  }
};
