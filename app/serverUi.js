'use strict';

var server = require('./server'),
  querystring = require('querystring'),
  util = require('util');

var listMidiOutputsPromise = server.listMidiOutputs(),
  midiOutputsList = document.querySelector('.midi-outputs-list'),
  midiOutputId = null;

var parsedParams = querystring.parse(location.search.substring(1));
if (parsedParams.hasOwnProperty('output')) {
  midiOutputId = parsedParams.output;
}

listMidiOutputsPromise
  .then(function(midiOutput) {
    var html = [];
    midiOutput.forEach(function(port) {
      var current = midiOutputId === port.id;
      html.push(util.format('<li>%s<a href="?output=%s">%s</a></li>', current ? '→ ' : '', port.id, port.name));
    });
    midiOutputsList.innerHTML = html.join('');
  });

if (midiOutputId !== null) {
  listMidiOutputsPromise
    .then(function(midiOutputs) {
      var midiOutput;
      if (midiOutput = midiOutputs.get(midiOutputId)) {
        server.start(midiOutput);
      }
    });
}

server.enumerateAudioDevices().then(function(devices) {
  console.log(devices);
});
