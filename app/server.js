'use strict';

var channelFactory = require('./channel')(global.PUBNUB),
  SimplePeer = require('simple-peer'),
  sdpTransform = require('./sdpTransformations').tranform,
  querystring = require('querystring');

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

function buildSignalingErrorLogger(header) {
  return function(error) {
    console.group();
    console.error(header);
    console.error(error);
    if (error.stack) {
      console.log(error.stack);
    }
    console.groupEnd();
  }
}

function accept(cb) {
  return channelFactory('reception')
    .subscribe(function onNewClient(clientId) {
      cb(channelFactory(clientId));
    });
}

function listenForConnection(audioStreamPromise, peerConnectedCb) {

  return accept(function onNewClient(channel) {
    audioStreamPromise
      .then(function whenAudioReady(stream) {

        var simplePeer;

        channel
          .subscribe(function onMessage(data) {
            // no race condition because messages are never received before the subscription is completed
            simplePeer.signal(data);
          })
          .then(function whenSubscribed() {

            simplePeer = new SimplePeer({
              initiator: true,
              stream: stream,
              sdpTransform: sdpTransform
            });

            simplePeer.on('signal', function(data) {
              channel.publish(data)
                .catch(buildSignalingErrorLogger('Could not publish a signal to client channel'));
            });

            simplePeer.on('connect', function() {
              peerConnectedCb(simplePeer);
            });
          });
      });
  });
}

function start() {

  var listMidiOutputsPromise = listMidiOutputs();

  // help to pick the interface id when debugging
  listMidiOutputsPromise
    .then(function(midiPort) {
      midiPort.forEach(function(port) {
        console.log(port);
      });
    });

  var parsedParams = querystring.parse(location.search.substring(1));
  if (parsedParams.output) {

    var midiOutputPromise = listMidiOutputsPromise
      .then(function(midiOutputs) {
        return midiOutputs.get(parsedParams.output)
      });

    listenForConnection(
      getAudioStream(),
      function onPeerConnected(simplePeer) {

        console.log('New peer to peer connection with a client ready');

        midiOutputPromise
          .then(function(midiOutput) {

            simplePeer.on('data', function(data) {
              if (data.type === 'midiMessage') {
                midiOutput.send(new Uint8Array(data.payload));
              }
            });
          });
      })
      .then(function() {
        console.log('Server ready and waiting for client connection');
      })
      .catch(buildSignalingErrorLogger('Could not subscribe to client channel for signals'));
  }
}

start();