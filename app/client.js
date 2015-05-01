'use strict';

var PeerJS = require('peerjs'),
  querystring = require('querystring');

function start() {
  var parsedParams = querystring.parse(location.search.substring(1));
  if (parsedParams.server && parsedParams.input) {
    Promise.all([
      listMidiInputs(),
      connectToServer(parsedParams.server)
    ])
      .then(function(args) {
        var midiInputs = args[0],
          connection = args[1];

        console.log('Connected to the server');

        midiInputs.get(parsedParams.input).onmidimessage = function(midiEvent) {
          connection.send({
            type: 'midiMessage',
            payload: midiEvent.data
          });
        };

      })
      .catch(function(e) {
        console.log(e);
      });
  }
}

function connectToServer(serverId) {
  return new Promise(function(resolve, reject) {

    var peer = new PeerJS({
      key: 'xtpxqw0c606n7b9',
      secure: false
    });

    peer.on('open', function(id) {
      console.log('Local peer is %s', id);

      peer.on('call', function(call) {
        call.answer();
        call.on('stream', function(remoteStream) {
          var player = new Audio();
          player.src = URL.createObjectURL(remoteStream);
          player.play();
        });
      });

      var connection = peer.connect(serverId);
      connection.on('open', function() {
        resolve(connection);
      });
    });

    peer.on('error', function(err) {
      reject(err);
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