(function() {
  'use strict';

  var circledrawer = require('./circledrawer');
  var BufferLoader = require('./bufferloader');
  var Sequencer = require('./sequencer');
  var SOUND_MAP = require('./_conf').SOUND_MAP;
  var CIRCLE_MAP = require('./_conf').CIRCLE_MAP;

  var ctx, masterVol, seq, tempo,
    bufferMap,
    isSeqPlaying = false,
    $cof5ths = Snap('#circle-of-5ths'),
    $samplsLoading, $loadlabel, $vol, $tempo,
    $toast, notify, $settings,
    keynodes = Object.create(null);

  function init() {
    circledrawer.draw();

    $settings = document.getElementById('settings');
    window.addEventListener('polymer-ready', function() {
      $settings.removeAttribute('class');
      $samplsLoading = document.getElementById('sampls-loading');
      $toast = document.getElementById('toast');
      $loadlabel = Snap('#load-label');
      $vol = document.getElementById('volfader');
      $tempo = document.getElementById('tempo');
      notify = function(message) {
        $toast.text = message;
        $toast.duration = 1000000;
        $toast.show();
      };

      try {
        ctx = new window.AudioContext() || new window.webkitAudioContext();
      } catch (e) {
        notify('Web Audio API is not supported in this browser');
        return e;
      }

      masterVol = ctx.createGain();
      masterVol.connect(ctx.destination);
      masterVol.gain.value = $vol.value/100;

      tempo = $tempo.value;
      $vol.addEventListener('track', function(e) {masterVol.gain.value = e.target.immediateValue/100;});
      $vol.addEventListener('change', function(e) {masterVol.gain.value = e.target.immediateValue/100;});
      $tempo.addEventListener('track', function(e) {tempo = seq.tempo = e.target.immediateValue});
      $tempo.addEventListener('change', function(e) {tempo = seq.tempo = e.target.immediateValue});

      for (var key in CIRCLE_MAP) {
        keynodes[key] = Snap.selectAll('.' + key).items.reverse();
      }

      $samplsLoading.setAttribute('class', 'active');
      new BufferLoader(ctx, SOUND_MAP)
        .load()
        .finished(function(data) {
          $samplsLoading.removeAttribute('class');
          $loadlabel.removeClass('loading');
          $cof5ths.removeClass('loading');
          $cof5ths.attr('data-disabled', 'false');
          bufferMap = data;
          for (var key in keynodes) {
            keynodes[key].forEach(initCirclEvents(key));
          }
        })
        .progress(function(percent) {
          $samplsLoading.value = percent;
        })
        .error(function() {
          $samplsLoading.removeAttribute('class');
          $loadlabel.removeClass('loading');
          notify(Array.prototype.slice.call(arguments).join(' '));
        });
    });
  }

  function initCirclEvents(key) {
    return function(item) {
      item.node.addEventListener('click', noteClickHandler(key), false);
    };
  }

  function noteClickHandler(key) {
    return function(e) {
      $cof5ths.attr('data-disabled', 'true');
      if (isSeqPlaying) return;

      var degree = e.currentTarget.getAttribute('data-degree') - 1,
        buffList = [];

      for (var j = degree; j < degree + 8; j++) {
        buffList.push( bufferMap[ CIRCLE_MAP[key][j] ] );
      }

      seq = new Sequencer(ctx, buffList, tempo, masterVol).play(modePlayer(key, degree));
    };
  }

  function modePlayer(key, degree) {
    return function(pitch, noteLength, isLoopOver) {
      if (isLoopOver) $cof5ths.attr('data-disabled', 'false');
      isSeqPlaying = !isLoopOver;

      pitch += degree;
      var itemToHilight = (pitch < 7) ? pitch : (pitch - 7);

      noteHilighter(
        keynodes[key][itemToHilight].select('circle'),
        keynodes[key][itemToHilight].select('text'),
        noteLength
      );
    };
  }

  function noteHilighter(nCircle, nText, nLength) {
    var note = Snap.set(nCircle, nText),
        textFill = nText.attr('data-fill'),
        circFill = nCircle.attr('data-fill'),
        circStroke = nCircle.attr('data-stroke'),
        circRGB = Snap.getRGB(circFill),
        circStrokeRGB = Snap.getRGB(circStroke),
        circHSB, circStrokeHSB,
        circleHilightFill, circleHilightStroke;

    var animback = function() {
          setTimeout(function() {
            note.animate(
              [{'fill': circFill, 'stroke': circStroke}, 1/3 * nLength, mina.easeOut],
              [{'fill': textFill }, 1/3 * nLength, mina.easeOut]
            );
          }, 2/3 * nLength);
        };

    circHSB = Snap.rgb2hsb(circRGB.r, circRGB.g, circRGB.b);
    circStrokeHSB = Snap.rgb2hsb(circStrokeRGB.r, circStrokeRGB.g, circStrokeRGB.b);
    circleHilightFill = Snap.hsb(circHSB.h, 0, 1);
    circleHilightStroke = Snap.hsb(circStrokeHSB.h, circStrokeHSB.s - 0.15, 0.55);

    note.animate(
      [{'fill': circleHilightFill, 'stroke': circleHilightStroke}, 10, mina.easeIn, animback],
      [{'fill': circFill}, 10, mina.easeIn, animback]
    );
  }

  return init;

})()();
