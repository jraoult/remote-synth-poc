'use strict';

var gulp = require('gulp'),
  gutil = require('gulp-util'),
  merge = require('merge-stream'),
  browserify = require('browserify'),
  path = require('path'),
  source = require('vinyl-source-stream'),
  buffer = require('vinyl-buffer'),
  browserSync = require('browser-sync');

function doBundle(src) {
  var bundler = browserify({
    entries: src,
    debug: true
  });

  return bundler
    .bundle()
    .pipe(source(path.basename(src)))
    .pipe(buffer())
    .on('error', gutil.log);
}

gulp.task('js', function() {
  merge([
    doBundle('./app/client.js'),
    doBundle('./app/server.js')
  ]).pipe(gulp.dest('build'))
});

gulp.task('serve', ['js'], function() {

  gulp.watch('app/*.js', ['js']);

  browserSync({
    server: ['build', 'app'],
    https: true,
    ghostMode: false,
    open: false,
    notify: false
  });
});