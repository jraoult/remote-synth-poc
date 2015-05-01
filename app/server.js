'use strict';

var PeerJS = require('peerjs'),
  querystring = require('querystring');

function start() {
  var parsedParams = querystring.parse(location.search.substring(1));
  if (parsedParams.output) {
    listen()
      .then(function(peer) {

        var serverId = peer.id;

        console.log('Server waiting for connections (id: %s)', serverId);

        peer.on('connection', function(connection) {

          var clientId = connection.peer;

          console.log('New client connected (id: %s)', clientId);

          Promise.all([
            getAudioStream(),
            listMidiOutputs()
          ])
            .then(function(args) {
              var audioStream = args[0],
                midiOutputs = args[1];

              var midiOutput = midiOutputs.get(parsedParams.output);

              peer.call(clientId, audioStream);

              connection.on('data', function(data) {
                if (data.type === 'midiMessage') {
                  midiOutput.send(new Uint8Array(data.payload));
                }
              });
            });
        });
      });
  }
}

function listen() {
  return new Promise(function(resolve, reject) {

    var peer = new PeerJS({
      key: 'xtpxqw0c606n7b9',
      secure: false
    });

    peer.on('open', function() {
      resolve(peer);
    });

    peer.on('error', function(err) {
      reject(err);
    });
  });
}

function listMidiOutputs() {
  return navigator.requestMIDIAccess()
    .then(function(midiAccess) {
      return midiAccess.outputs;
    });
}

function getAudioStream() {
  return new Promise(function(resolve, reject) {
    navigator.webkitGetUserMedia({video: false, audio: true}, resolve, reject);
  });
}


listMidiOutputs()
  .then(function(midiOutputs) {
    midiOutputs.forEach(function(port) {
      console.log(port);
    });
  });

start();