'use strict';

var channelFactory = require('./channel')(global.PUBNUB),
  SynthServer = require('./SynthServer');

function listMidiOutputs() {
  return navigator.requestMIDIAccess()
    .then(function(midiAccess) {
      return midiAccess.outputs;
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
    .onMessage(function onNewClient(clientId) {
      cb(channelFactory(clientId));
    })
    .subscribe();
}

function listenForConnection(connectedCb) {

  return accept(function onNewClient(channel) {

    var synthServer = new SynthServer();

    synthServer.setSourceAudioDevice('7129e3c46b2d9bd7c4725e807c60e5b9504a3f97975d02ba3b29bc8cbb09b60d');

    channel
      .onMessage(function(data) {
        // no race condition because messages are never received before the subscription is completed
        synthServer.signal(data);
      })
      .subscribe()
      .then(function whenSubscribed() {
        synthServer.onSignal(function(data) {
          channel
            .publish(data)
            .catch(buildSignalingErrorLogger('Could not publish a signal to client channel'));
        });
      })
      .then(function() {
        synthServer.start();
        connectedCb(synthServer);
      });
  });
}

function start(midiOutput) {

  listenForConnection(
    function whenConnected(synthServer) {

      console.log('New peer to peer connection with a client ready');

      synthServer.onMidiMessage(function(evt) {
        midiOutput.send(new Uint8Array(evt.midiMessage));
      });
    })
    .then(function() {
      console.log('Server ready and waiting for client connection');
    })
    .catch(buildSignalingErrorLogger('Could not subscribe to client channel for signals'));
}

module.exports = {
  listMidiOutputs: listMidiOutputs,
  enumerateAudioDevices: SynthServer.enumerateAudioDevices,
  start: start
};