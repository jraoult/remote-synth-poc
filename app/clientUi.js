'use strict';

var client = require('./client'),
  querystring = require('querystring'),
  util = require('util');

var listMidiInputsPromise = client.listMidiInputs(),
  midiInputsList = document.querySelector('.midi-inputs-list'),
  connectionStateBadge = document.querySelector('.js-connection-state-badge'),
  midiInputId = null;

var parsedParams = querystring.parse(location.search.substring(1));
if (parsedParams.hasOwnProperty('input')) {
  midiInputId = parsedParams.input;
}

listMidiInputsPromise
  .then(function(midiInput) {
    var html = [];
    midiInput.forEach(function(port) {
      var current = midiInputId === port.id;
      html.push(util.format('<li>%s<a href="?input=%s">%s</a></li>', current ? '→ ' : '', port.id, port.name));
    });
    midiInputsList.innerHTML = html.join('');
  });

if (midiInputId !== null) {
  listMidiInputsPromise
    .then(function(midiInputs) {
      var midiOutput;
      if (midiOutput = midiInputs.get(midiInputId)) {
        client.start(midiOutput)
          .then(function() {
            connectionStateBadge.classList.add('connection-state-badge--connected');
          })
          .catch(function() {
            connectionStateBadge.classList.add('error');
          });
      }
    });
}
