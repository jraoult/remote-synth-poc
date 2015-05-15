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
 * @param {function(SimplePeer)} cb we use a callback here because we need the synchronous nature
 * of it to make sure event listeners are regitered before any event is triggered
 */
function connect(cb) {
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

      simplePeer = new SimplePeer({
        sdpTransform: sdpTransform
      });

      return reception
        .publish(channel.id)
        .then(function() {

          simplePeer.on('error', console.error);

          simplePeer.on('signal', function(data) {
            channel
              .publish(data)
              .catch(console.error);
          });

          simplePeer.on('close', function() {
            simplePeer.destroy();
            channel.destroy();
          });

          cb(simplePeer);
        });
    });
}

function start(midiInput) {

  return connect(function whenConnected(simplePeer) {

    console.log('New peer to peer connection with the server ready');

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

        simplePeer.send(JSON.stringify({
          type: 'midiMessage',
          payload: payload
        }));
      };
    });
  })
}

module.exports = {
  listMidiInputs: listMidiInputs,
  start: start
};