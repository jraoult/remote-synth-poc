'use strict';

var channelFactory = require('./channel')(global.PUBNUB),
  SimplePeer = require('simple-peer'),
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
      simplePeer = new SimplePeer({trickle: false});

    reception
      .publish(channel.id);

    channel
      .subscribe(function onMessage(data) {

        //console.group();
        //console.log('Got signal from server');
        //console.log(data);
        //console.groupEnd();

        simplePeer.signal(data);
      })
      .then(function whenSubscribed() {

        console.log('Client listening to signals from server on channel %s', channel.id);

        return reception
          .publish(channel.id)
          .then(function() {

            simplePeer.on('connect', function() {
              resolve(simplePeer);
            });

            simplePeer.on('signal', function(data) {
              channel
                .publish(data)
                .catch(console.error);
            });
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

        midiInputPromise
          .then(function(midiInput) {
            midiInput.onmidimessage = function(midiEvent) {
              simplePeer.send({
                type: 'midiMessage',
                payload: midiEvent.data
              });
            };
          });
      })
      .catch(function(e) {
        console.log(e);
      });
  }
}

start();