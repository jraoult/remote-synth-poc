'use strict';

var SimplePeer = require('simple-peer'),
  querystring = require('querystring');

var pubnub = PUBNUB.init({
  publish_key: 'pub-c-c57b184b-8508-4a64-a64e-e4c855794cd5',
  subscribe_key: 'sub-c-ee2086c6-f13f-11e4-9cd1-0619f8945a4f',
  ssl: true
});


function start() {
  var parsedParams = querystring.parse(location.search.substring(1));
  if (parsedParams.output) {

    listen(getAudioStream(), function(simplePeer) {

      simplePeer.on('connect', function() {

        console.log('New client connected');

        listMidiOutputs()
          .then(function(midiOutputs) {

            var midiOutput = midiOutputs.get(parsedParams.output);

            simplePeer.on('data', function(data) {
              if (data.type === 'midiMessage') {
                midiOutput.send(new Uint8Array(data.payload));
              }
            });
          });
      });
    });
  }
}

function listen(audioStreamPromise, cb) {

  pubnub.subscribe({
    channel: 'reception',
    message: function(uniqueChannelId) {
      audioStreamPromise.then(function(stream) {

        var simplePeer = new SimplePeer({
          initiator: true,
          trickle:false,
          stream: stream
        });

        pubnub.subscribe({
          channel: uniqueChannelId,
          message: function(data) {
            simplePeer.signal(data);
          },
          error: buildSignalingErrorLogger('Could not listen for client signals because of an error')
        });

        simplePeer.on('signal', function(data) {
            pubnub.publish({
              channel: uniqueChannelId,
              message: data,
              callback: function() {
                console.group();
                console.log('Sent signal to client through channel %s', uniqueChannelId);
                console.log(data);
                console.groupEnd();
              }
          })
        });

        cb(simplePeer);
      });
    },
    error: buildSignalingErrorLogger('Could not listen for client request because of an error in signaling')
  });
}

function buildSignalingErrorLogger(header) {
  return function(error) {
    console.group();
    console.error(header);
    console.error(error);
    console.groupEnd();
  }
}

function listMidiOutputs() {
  return navigator.requestMIDIAccess()
    .then(function(midiAccess) {
      return midiAccess.outputs;
    });
}

function getAudioStream() {

  var constraints = {audio: {optional: []}};

  // make sure the browser applies no transformation to the sound
  ['googEchoCancellation', 'googEchoCancellation2', 'googAutoGainControl',
    'googAutoGainControl2', 'googNoiseSuppression', 'googNoiseSuppression2', 'googBeamforming',
    'googHighpassFilter', 'googTypingNoiseDetection']
    .forEach(function(flag) {
      var cons = {};
      cons[flag] = false;
      constraints.audio.optional.push(cons);
    });

  return new Promise(function(resolve, reject) {
    navigator.webkitGetUserMedia(constraints, resolve, reject);
  });
}


listMidiOutputs()
  .then(function(midiOutputs) {
    midiOutputs.forEach(function(port) {
      console.log(port);
    });
  });

start();