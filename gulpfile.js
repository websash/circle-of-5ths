'use strict';

var gulp = require('gulp'),
    browserify = require('browserify'),
    watchify = require('watchify'),
    uglify = require('gulp-uglify'),
    cssmin = require('gulp-cssmin'),
    sourcemaps = require('gulp-sourcemaps'),
    gutil = require('gulp-util'),
    notify = require('gulp-notify'),
    del = require('del'),
    source = require('vinyl-source-stream'),
    streamify = require('gulp-streamify'),
    browserSync = require('browser-sync'),
    concat = require('gulp-concat'),
    inject = require('gulp-inject'),
    dir = require('dir-util'),
    replace = require('gulp-replace'),
    deploy = require('gulp-gh-pages'),
    runSequence = require('run-sequence'),
    argv = require('yargs').argv,
    prod = argv.prod; // --prod

var bundleName = function() {
  var version = require('./package.json').version;
  var name = require('./package.json').name;
  return name + '.' + version;
};

gulp.task('clean:dist', function (cb) {
  del(['./dist/**/*'], cb);
});

gulp.task('calc:sounds', function() {
  dir.getSize('./sounds/', {filters: [/\.ogg$/i], unit: 'by'}, function(err, size) {
    if (err) return;
    gulp.src('./src/scripts/bufferloader.js')
      .pipe(replace(/(this.allBytesTotal = )\d+;/g, '$1'+size+';'))
      .pipe(gulp.dest('./src/scripts'));
  });
});

gulp.task('css', function() {
  return gulp.src(['./src/styles/normalize.css', './src/styles/main.css'])
    .pipe(prod ? gutil.noop() : sourcemaps.init())
    .pipe(concat(bundleName() + '.css'))
    .pipe(prod ? streamify(cssmin()) : gutil.noop())
    .pipe(prod ? gutil.noop() : sourcemaps.write())
    .pipe(gulp.dest('./dist'))
    .pipe(browserSync.reload({stream:true}));
});

gulp.task('js', ['calc:sounds'], function() {
  return browserify('./src/scripts/main.js', { debug: !prod })
    .bundle()
    .pipe(source(bundleName() + '.js'))
    .pipe(prod ? streamify(uglify()) : gutil.noop())
    .pipe(gulp.dest('./dist'));
});

gulp.task('browserSync', ['injector'], function() {
  browserSync({
    server: {
      baseDir: ['./', './dist']
    },
    notify: false,
    browser: ['google chrome'] // firefox
  });
});

gulp.task('injector', ['js', 'css'], function () {
  var target = gulp.src('./src/index.html'),
      sources = gulp.src([
        './dist/' + bundleName() + '.js',
        './dist/' + bundleName() + '.css'], {read: false});

  return target.pipe(inject(sources, {ignorePath: '../dist', relative: true}))
    .pipe(gulp.dest('./dist'));
});

gulp.task('build', ['injector'], function(cb) {
  cb(null);
});

gulp.task('watch', ['js', 'css', 'injector', 'browserSync'], function() {
  var bundler = browserify('./src/scripts/main.js',
    {cache: {}, packageCache: {}, fullPaths: true, debug: true });

  bundler = watchify(bundler).on('update', rebundle);

  function rebundle() {
    var t = Date.now();
    return bundler.bundle()
      .on('error', function() {
        var args = [].slice.call(arguments);
        // send to notification center
        notify.onError({
          title: 'Compile Error', message: '<%= error.message %>'
        }).apply(this, args);
        // keep gulp from hanging on this task
        this.emit('end');
      })
      .pipe(source(bundleName()+'.js'))
      .pipe(gulp.dest('./dist'))
      .on('end', function() {
        gutil.log('Bundled', gutil.colors.cyan(bundleName()+'.js'), 'in',
          gutil.colors.magenta(Date.now() - t + ' ms'));
      })
      .pipe(browserSync.reload({stream:true}));
  }

  gulp.watch('./src/**/*.css', ['css']);
  gulp.watch('./src/index.html', ['build']);

  return rebundle();
});

gulp.task('deploy:copyassets', function() {
  return gulp.src(['./bower_components/**/*.*', './images/**/*.*', './sounds/**/*.*'], {base:'.'})
    .pipe(gulp.dest('./dist'));
});

gulp.task('deploy:gh-pages', function() {
  return gulp.src('./dist/**/*', {base:'./dist'})
    .pipe(deploy({message: 'Update ' + bundleName() + ' ' + new Date().toISOString()}));
});

gulp.task('deploy', function(cb) {
  //console.log(require('path').join(require('os').tmpdir(), 'tmpRepo'));
  runSequence(['build', 'deploy:copyassets'], 'deploy:gh-pages', 'clean:dist', cb);
});
