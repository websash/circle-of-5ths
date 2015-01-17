'use strict';

function BufferLoader(audioContext, soundMap) {
    this.ctx = audioContext;
    this.soundMap = soundMap;
    this._finishedCb = null;
    this._progressCb = null;
    this._errorCb = function(err) { console.log(err) };

    this._mapkeys = Object.keys(this.soundMap);
    this._maplen = this._mapkeys.length;
    this._bufferMap = [];
    this._loadCount = 0;

    this.allBytesTotal = 3965316; // calced with gulp
    this.allBytesLoaded = Array.apply(null, Array(this._maplen)).map(function(){return 0});
}

BufferLoader.prototype._loadBuffer = function(key, url, i) {
    var self = this;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';

    xhr.onload = function() {
      if (xhr.status === 200) {
        self.ctx.decodeAudioData(xhr.response,
          function(buffer) {
            self._bufferMap[key] = buffer;
            (++self._loadCount === self._maplen) &&
              self._finishedCb && self._finishedCb(self._bufferMap);
          },
          function() {
            self._errorCb('BufferLoader: error decoding', url);
          }
        );
      } else {
        self._errorCb('BufferLoader:', url, xhr.statusText.toLowerCase());
      }
    };

    xhr.onerror = function() {
      self._errorCb('BufferLoader: request error');
    };

    xhr.onprogress = function(event) {
      if (event.lengthComputable) {
        self.allBytesLoaded[i] = event.loaded;
        self._updateProgress(self.allBytesLoaded, self.allBytesTotal);
      } else {
        console.log('BufferLoader: unable to compute progress info');
      }
    };

    xhr.send();
};

BufferLoader.prototype._updateProgress = function(loaded, total) {
    this._progressCb &&
      this._progressCb(loaded.reduce(function(p, c) { return p + c }) / total * 100);
};

BufferLoader.prototype.load = function() {
    this._mapkeys.forEach(function(key, i) {
      this._loadBuffer(key, this.soundMap[key], i);
    }, this);
    return this;
};

BufferLoader.prototype.finished = function(cb) {
    this._finishedCb = cb;
    return this;
};

BufferLoader.prototype.progress = function(cb) {
    this._progressCb = cb;
    return this;
};

BufferLoader.prototype.error = function(cb) {
    this._errorCb = cb;
    return this;
};

module.exports = BufferLoader;
