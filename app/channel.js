'use strict';

function init(Pubnub) {

  var pubnub = Pubnub.init({
    publish_key: 'pub-c-c57b184b-8508-4a64-a64e-e4c855794cd5',
    subscribe_key: 'sub-c-ee2086c6-f13f-11e4-9cd1-0619f8945a4f',
    ssl: true
  });

  return function channelFactory(channelId) {

    if (typeof channelId === 'undefined') {
      channelId = Pubnub.uuid();
    }

    var clientId = Pubnub.uuid();

    return {
      get id() {
        return channelId;
      },

      publish: function(message) {
        return new Promise(function(resolve, reject) {

          pubnub.publish({
            channel: channelId,
            message: {sourceId: clientId, payload: message},
            callback: function() {
              //console.debug('Client %s through channel %s sent %o', clientId, channelId, message);
              resolve();
            },
            error: reject
          });
        });
      },

      subscribe: function(cb) {
        return new Promise(function(resolve, reject) {
          pubnub.subscribe({
            channel: channelId,
            message: function(message) {
              if (message.sourceId !== clientId) {
                //console.debug('Client %s through channel %s from %s got %o', clientId, channelId, message.sourceId, message);
                cb(message.payload);
              }
            },
            connect: resolve,
            error: reject
          });
        });
      }
    };
  };
}

module.exports = init;