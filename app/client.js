'use strict';

var channelFactory = require('./channel')(global.PUBNUB),
  SimplePeer = require('simple-peer'),
  sdpTransform = require('./sdpTransformations').tranform,
  querystring = require('querystring');

function listMidiInputs() {
  return navigator.requestMIDIAccess()
    .then(function(midiAccess) {
      return midiAccess.inputs;
    });
}

function connect() {
  return new Promise(function(resolve, reject) {

    var reception = channelFactory('reception'),
      channel = channelFactory(),
      simplePeer = new SimplePeer({
        sdpTransform: sdpTransform
      });

    channel
      .subscribe(function onMessage(data) {
        simplePeer.signal(data);
      })
      .then(function whenSubscribed() {

        console.log('Client listening to signals from server on channel %s', channel.id);

        return reception
          .publish(channel.id)
          .then(function() {

            simplePeer.on('signal', function(data) {
              channel
                .publish(data)
                .catch(console.error);
            });

            resolve(simplePeer);
          });
      })
      .catch(reject);

  });
}

function start() {

  var listMidiInputsPromise = listMidiInputs();

  listMidiInputsPromise
    .then(function(midiPort) {
      midiPort.forEach(function(port) {
        console.log(port);
      });
    });

  var parsedParams = querystring.parse(location.search.substring(1));
  if (parsedParams.input) {

    var midiInputPromise = listMidiInputsPromise
      .then(function(midiInputs) {
        return midiInputs.get(parsedParams.input)
      });

    connect()
      .then(function(simplePeer) {

        console.log('New peer to peer connection with the server ready');

        simplePeer.on('stream', function(remoteStream) {
          var player = new Audio();
          player.src = URL.createObjectURL(remoteStream);
          player.play();
        });

        simplePeer.on('connect', function() {
          midiInputPromise
            .then(function(midiInput) {

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

        });
      })
      .catch(function(e) {
        console.log(e);
      });
  }
}

start();