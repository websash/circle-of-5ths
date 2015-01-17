var Snap = require('snap.svg');
var MUS_KEYS = require('./_conf').MUS_KEYS;

module.exports = {

  draw: function()  {
    'use strict';
    var π = Math.PI;
    var cnv = Snap('#circle-of-5ths').attr({'data-disabled': 'true', 'class': 'loading'}),
      width = 1024, height = 1024,
      count = 12,
      crclMargin = 4,
      innerRadius = 57.5,
      calkedRadius = getOuterRadius(count, innerRadius),
      lineStartR = innerRadius + calkedRadius,
      lineEndR = height/2 - lineStartR + 3.25*calkedRadius;

    var chordTypes = {
      maj: ['#822a1d', '#732116'],
      min: ['#286499', '#1e5187'],
      dim: ['#2c6666', '#1c4d4d']
    };

    var modeColors = {
      'ionian'     : 'rgba(134,32,27,0.7)',
      'dorian'     : 'rgba(77,118,40,0.7)',
      'phrygian'   : 'rgba(123,113,28,0.7)',
      'lydian'     : 'rgba(140,61,23,0.7)',
      'mixolydian' : 'rgba(112,33,98,0.7)',
      'aeolian'    : 'rgba(34,94,123,0.7)'
    };

    var aeolian    = innerRadius + 5*calkedRadius-9,
        mixolydian = innerRadius + 9*calkedRadius-20,
        lydian     = innerRadius + 13*calkedRadius-30,
        phrygian   = innerRadius + 15*calkedRadius-25,
        dorian     = innerRadius + 19*calkedRadius-35,
        ionian     = innerRadius + 23*calkedRadius-45;

    // draw circle helper
    // drawCircle(innerCrclHelper, 'transparent', '#fff', 0);

    // draw lines
    for (var i = 11; i >= 0; i--) {
      cnv.line(
        width/2 + lineStartR * Math.sin(i * 30 * π/180),
        height/2 - lineStartR * Math.cos(i * 30 * π/180),
        width/2 + lineEndR * Math.sin(i * 30 * π/180),
        height/2 - lineEndR * Math.cos(i * 30 * π/180)
      ).attr({
        strokeWidth: 1.5,
        stroke: '#444'
      });
    }

    drawMode(6, innerRadius, chordTypes.dim);
    drawMode(5, innerRadius + 4*calkedRadius-10, chordTypes.min);
    drawMode(4, innerRadius + 8*calkedRadius-20, chordTypes.maj);
    drawMode(3, innerRadius + 12*calkedRadius-30, chordTypes.maj);
    drawMode(2, innerRadius + 14*calkedRadius-25, chordTypes.min);
    drawMode(1, innerRadius + 18*calkedRadius-35, chordTypes.min);
    drawMode(0, innerRadius + 22*calkedRadius-45, chordTypes.maj);

    drawHalfTones(innerRadius + 2*calkedRadius-5);
    drawHalfTones(innerRadius + 6*calkedRadius-15);
    drawHalfTones(innerRadius + 10*calkedRadius-25);
    drawHalfTones(innerRadius + 16*calkedRadius-30);
    drawHalfTones(innerRadius + 20*calkedRadius-40);

    drawArcs(aeolian, modeColors.aeolian, 8.5);
    drawArcs(mixolydian, modeColors.mixolydian, 5.7);
    drawArcs(lydian, modeColors.lydian, 4.25);
    drawArcs(phrygian, modeColors.phrygian, 3.77);
    drawArcs(dorian, modeColors.dorian, 3.12);
    drawArcs(ionian, modeColors.ionian, 2.62);

    function drawArcs(modeR, modeColor, adjustment) {
      for (var i = 0; i < 12; i++) {
        cnv.path(
          'M' + (width/2 + modeR * Math.sin((i*30 + adjustment) * π/180)) + ' '
              + (height/2 - modeR * Math.cos((i*30 + adjustment) * π/180))
              + ' A ' + (modeR) + ' ' + (modeR) + ' 0 0 1 '
              + (width/2 + modeR * Math.sin((i*30+30 - adjustment) * π/180)) + ' '
              + (height/2 - modeR * Math.cos((i*30+30 - adjustment) * π/180))
        ).attr({
          strokeWidth: 3.25,
          fill: 'transparent',
          stroke: modeColor,
          strokeLinecap: 'round'
        });
      }
    }

    function drawMode(mode, r, crclColor) {
      var circles = getOuterCircles({x: width/2, y: height/2, radius: r}, count);
      for (var i = 0, keys = Object.keys(MUS_KEYS), len = keys.length; i < len; i += 1) {
        var crcl = drawCircle(circles[i], crclColor[0], crclColor[1], 3.75);
        cnv.group(
          crcl,
          cnv.text(crcl.attr('cx'),
          parseInt(crcl.attr('cy')) + 6, MUS_KEYS[keys[i]][mode])
              .attr({'class': 'notename', fill: 'rgb(255,255,255)', 'data-fill': 'rgb(255,255,255)'}),
          cnv.image('images/play.svg', crcl.attr('cx') - 11, crcl.attr('cy') - 12)
              .attr({'class': 'playicon'})
        ).attr({'class': 'notecircle ' + keys[i], 'data-degree': (mode + 1)});
      }
    }

    function drawHalfTones(r) {
      var circles = getOuterCircles({x: width/2, y: height/2, radius: r}, count);
      for (var i = 0; i < 12; i += 1) {
        circles[i].radius = circles[i].radius/2;
        drawCircle(circles[i], '#333', '#444', 2);
      }
    }

    function getOuterCircles(innerCircHelper, count) {
      var crcls = [],
          angle = 2*π / count, // angle between circles
          outerRadius = calkedRadius,
          r = innerCircHelper.radius + outerRadius,
          currentAngle;
      // console.log(r);
      for (var i = 0; i < count; i += 1) {
        currentAngle = i * angle;
        crcls.push({
          x: innerCircHelper.x + Math.cos(currentAngle) * r,
          y: innerCircHelper.y + Math.sin(currentAngle) * r,
          radius: outerRadius - crclMargin
        });
      }
      return crcls;
    }

    function getOuterRadius(count, innerRadius) {
      var s = Math.sin(π / count);
      return (s * innerRadius) / (1 - s);
    }

    function drawCircle(crcl, fillColor, strokeColor, strokeWidth) {
      return cnv.circle(crcl.x, crcl.y, crcl.radius).attr({
          fill: fillColor,
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          'data-fill': fillColor,
          'data-stroke': strokeColor
        });
    }

    cnv.group(
        cnv.text(width/2, height/2+7, 'loading').attr({fill: 'rgb(100,100,100)'})
    ).attr({'id': 'load-label', 'class': 'loading'});
  }

};