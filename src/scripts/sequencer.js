'use strict';

function Sequencer(audioContext, bufferList, tempo, conDestination) {
    this.ctx = audioContext;
    this.buffList = bufferList;
    this.tempo = tempo;
    this.conDest = conDestination;

    this.noteLength = 18.6 / this.tempo;
    this.lookahead = 10.0;
    this.scheduleAheadTime = 0.05;
    this.nextNoteTime = 0.0;
    this.curr16thNotePitch = 0;
    this.currNotePitch = 0;
    this.lastNotePitch = -1;
    this.scaleLength = bufferList.length;
    this.current16thNote = 0;
    this.last16thNoteDrawn = -1;
    this.notesInQueue = [];
    this.direction = 1;
    this.isPlaying = false;
    this.loopOver = false;

    this.timerID = 0;
    this.requestID = 0;
}

Sequencer.prototype._nextNote = function() {
    // advance current note and time by a 16th note...
    var secondsPerBeat = 60.0 / this.tempo;
    // tempo value to calculate beat length
    this.nextNoteTime += 0.25 * secondsPerBeat;

    this.curr16thNotePitch += 1 * this.direction;
    if (this.curr16thNotePitch >= this.scaleLength - 1) this.direction = -1;
    if (this.curr16thNotePitch < 1) this.direction = 1;
    if (this.curr16thNotePitch === 0) {
      this.loopOver = true;
      this.noteLength = 54 / this.tempo;
    } else {
      this.loopOver = false;
      this.noteLength = 18.6 / this.tempo;
    }

    this.current16thNote++;
    if (this.current16thNote == 16) this.current16thNote = 0;
};

Sequencer.prototype._scheduleNote = function(beatNumb, time, pitchNumb, noteLength, isLoopOver) {
    // push the note on the queue, even if we're not playing
    this.notesInQueue.push({
      note: beatNumb,
      time: time,
      pitch: pitchNumb,
      noteLength: noteLength,
      loopOver: isLoopOver
    });

    var source = this.ctx.createBufferSource(),
      gainNode = this.ctx.createGain(),
      zero = 0.000000000000001;

    source.connect(gainNode);
    source.buffer = this.buffList[pitchNumb];
    //console.log(pitchNumb);
    gainNode.connect(this.conDest);
    source.start(time);
    // ADSR shaping
    gainNode.gain.linearRampToValueAtTime(zero, time);
    gainNode.gain.exponentialRampToValueAtTime(1.0, time + 1/this.tempo);
    gainNode.gain.linearRampToValueAtTime(1.0, time + this.noteLength - 1/this.tempo);
    gainNode.gain.exponentialRampToValueAtTime(zero, time + this.noteLength);
    source.stop(time + this.noteLength);
};

Sequencer.prototype._scheduler = function() {
    // while there are notes that will need to play before the next interval,
    // schedule them and advance the pointer
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this._scheduleNote(
        this.current16thNote,
        this.nextNoteTime,
        this.curr16thNotePitch,
        this.noteLength,
        this.loopOver
      );
      this._nextNote();
    }
    this.timerID = setTimeout(this._scheduler.bind(this), this.lookahead);
};

Sequencer.prototype._highlight = function(cb) {
    var currNote = this.last16thNoteDrawn,
      currNotePitch = this.lastNotePitch,
      currentTime = this.ctx.currentTime,
      aNoteLength = this.noteLength,
      isLoopOver = false;

    while (this.notesInQueue.length && this.notesInQueue[0].time < currentTime) {
      currNote = this.notesInQueue[0].note;
      currNotePitch = this.notesInQueue[0].pitch;
      isLoopOver = this.notesInQueue[0].loopOver;
      aNoteLength = this.notesInQueue[0].noteLength;
      // remove note from queue
      this.notesInQueue.splice(0, 1);
    }

    // draw only if the note has moved
    if (this.last16thNoteDrawn !== currNote) {
      isLoopOver && clearTimeout(this.timerID) && (this.isPlaying = false);
      cb && cb(currNotePitch, aNoteLength * 1000, isLoopOver);
      this.last16thNoteDrawn = currNote;
      this.lastNotePitch = currNotePitch;
    }

    this.requestID = requestAnimationFrame(this._highlight.bind(this, cb));
};

Sequencer.prototype.play = function(cb) {
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.requestID = requestAnimationFrame(this._highlight.bind(this, cb));
      this.nextNoteTime = this.ctx.currentTime;
      // kick off scheduling
      this._scheduler();
    } else {
      clearTimeout(this.timerID);
      cancelAnimationFrame(this.requestID);
    }
    return this;
};

module.exports = Sequencer;
