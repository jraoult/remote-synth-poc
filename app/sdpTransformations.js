'use strict';

var sdpTransform = require('sdp-transform');

module.exports = {
  tranform: function(sdp) {
    var sdpObj = sdpTransform.parse(sdp);
    sdpObj.media[0].fmtp[0].config = 'minptime=3; stereo=1;';
    sdpObj.media[0].maxptime = 5;
    var output = sdpTransform.write(sdpObj);
    return output;
  }
};
