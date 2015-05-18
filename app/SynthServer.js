'use strict';

var SimplePeer = require('simple-peer');

function enumerateAudioDevices() {
  return new Promise(function(resolve) {
    MediaStreamTrack.getSources(function(sourceInfos) {
      var audioDeviceInfos = [];

      for (var idxInfos = 0; idxInfos !== sourceInfos.length; ++idxInfos) {
        var sourceInfo = sourceInfos[idxInfos];
        if (sourceInfo.kind === 'audio') {
          audioDeviceInfos.push({
            id: sourceInfo.id,
            label: sourceInfo.label
          });
        }
      }

      resolve(audioDeviceInfos);
    });
  });
}

function SynthServer() {

  function getUM() {
    return new Promise(function(resolve, reject) {
      if (synthServer.audioDeviceId === null) {
        reject(new Error('A device has to be specified before calling getUserMedia'));
      } else {
        var constraints = {
          audio: {
            optional: [{
              sourceId: audioDeviceId
            }]
          }
        };

        // make sure the browser applies no transformation to the sound
        ['googEchoCancellation', 'googEchoCancellation2', 'googAutoGainControl',
          'googAutoGainControl2', 'googNoiseSuppression', 'googNoiseSuppression2', 'googBeamforming',
          'googHighpassFilter', 'googTypingNoiseDetection']
          .forEach(function(flag) {
            var cons = {};
            cons[flag] = false;
            constraints.audio.optional.push(cons);
          });

        navigator.webkitGetUserMedia(constraints, resolve, reject);
      }
    });
  }

  var NOOP = function() {};

  var synthServer = this,
    audioDeviceId = null,
    simplePeer,
    onSignalCb = NOOP,
    onMidiMessageCb = NOOP;

  /**
   *
   * @param {{type: string, sdp: string}} data
   */
  synthServer.signal = function(data) {
    simplePeer.signal(data);
  };

  synthServer.onSignal = function(cb) {
    onSignalCb = cb;
  };

  synthServer.setSourceAudioDevice = function(deviceId) {
    audioDeviceId = deviceId;
  };

  synthServer.onMidiMessage = function(cb) {
    onMidiMessageCb = cb;
  };

  synthServer.start = function() {
    return getUM()
      .then(function(stream) {
        return new Promise(function(resolve, reject) {
          simplePeer = new SimplePeer({
            initiator: true,
            stream: stream
          });

          simplePeer.on('error', function(error) {
            stream.stop();
            reject(error);
          });

          simplePeer.on('connect', function() {
            resolve();
          });

          simplePeer.on('signal', function(data) {
            onSignalCb(data);
          });

          simplePeer.on('data', function(data) {
            if (data.type && data.type === 'midiMessage') {
              onMidiMessageCb({
                midiMessage: data.payload
              });
            }
          })
        });
      });
  }
}

SynthServer.enumerateAudioDevices = enumerateAudioDevices;

module.exports = SynthServer;
