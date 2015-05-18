'use strict';

var channelFactory = require('./channel')(global.PUBNUB),
  SimplePeer = require('simple-peer'),
  sdpTransform = require('./sdpTransformations').tranform;

function listMidiInputs() {
  return navigator.requestMIDIAccess()
    .then(function(midiAccess) {
      return midiAccess.inputs;
    });
}

/**
 *
 * @param {function(SimplePeer)} init we use a callback here because we need the synchronous nature
 * of it to make sure event listeners are regitered before any event is triggered
 */
function connect(init) {
  var reception = channelFactory('reception'),
    channel = channelFactory(),
    simplePeer;

  return channel
    .onMessage(function(data) {
      simplePeer.signal(data);
    })
    .subscribe()
    .then(function whenSubscribed() {
      console.log('Client listening to signals from server on channel %s', channel.id);

      return new Promise(function(resolve, reject) {

        simplePeer = new SimplePeer({
          sdpTransform: sdpTransform
        });

        simplePeer.on('error', reject);

        simplePeer.on('connect', function() {
          console.log('New peer to peer connection with the server ready');
          resolve();
        });

        init(simplePeer);

        reception
          .publish(channel.id)
          .then(function() {
            simplePeer.on('signal', function(data) {
              channel
                .publish(data)
                .catch(console.error);
            });

            simplePeer.on('close', function() {
              simplePeer.destroy();
              channel.destroy();
            });
          })
          .catch(reject);
      });
    });
}

function start(midiInput) {

  return connect(function init(simplePeer) {

    simplePeer.on('stream', function(remoteStream) {
      var player = new Audio();
      player.src = URL.createObjectURL(remoteStream);
      player.play();
    });

    simplePeer.on('connect', function() {

      var payload = new Array(3);

      midiInput.onmidimessage = function(midiEvent) {
        var midiData = midiEvent.data;

        // reuse the array to avoid gc
        // fastest way to convert a typed array to an array
        payload[0] = midiData[0];
        payload[1] = midiData[1];
        payload[2] = midiData[2];

        simplePeer.send({
          type: 'midiMessage',
          payload: payload
        });
      };
    });
  })
}

module.exports = {
  listMidiInputs: listMidiInputs,
  start: start
};