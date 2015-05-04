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
  if (parsedParams.input) {
    Promise.all([
      listMidiInputs(),
      connectToServer()
    ])
      .then(function(args) {
        var midiInputs = args[0],
          simplePeer = args[1];

        simplePeer.on('stream', function(remoteStream) {
          var player = new Audio();
          player.src = URL.createObjectURL(remoteStream);
          player.play();
        });

        simplePeer.on('connect', function() {
          console.log('Connected to the server');

          midiInputs.get(parsedParams.input).onmidimessage = function(midiEvent) {
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

function connectToServer() {
  return new Promise(function(resolve, reject) {

    var uniqueChannelId = PUBNUB.uuid();
    var simplePeer = new SimplePeer({trickle:false});

    pubnub.subscribe({
      channel: uniqueChannelId,
      message: function(data) {
        console.group();
        console.log('Got signal from server');
        console.log(data);
        console.groupEnd();
        simplePeer.signal(data);
      },
      connect: function(){
        pubnub.publish({
          channel: 'reception',
          message: uniqueChannelId,
          callback: function() {

            console.log('Client listening to signals from server on channel %s', uniqueChannelId);

            simplePeer.on('signal', function(data) {
              console.group();
              console.log('Sending signal to server');
              console.log(data);
              console.groupEnd();

              pubnub.publish({
                channel: uniqueChannelId,
                message: data
              });
            });

            resolve(simplePeer);
          },
          error: function(error) {
            reject(error)
          }
        });
      },
      error: function(error) {
        console.error(error);
      }
    });
  });
}

function listMidiInputs() {
  return navigator.requestMIDIAccess()
    .then(function(midiAccess) {
      return midiAccess.inputs;
    });
}

listMidiInputs()
  .then(function(midiInputs) {
    midiInputs.forEach(function(port) {
      console.log(port);
    });
  });

start();