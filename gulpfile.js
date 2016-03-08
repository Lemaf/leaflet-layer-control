var gulp = require('gulp');

function readJson(fileName) {
	var fs = require('fs');

	return JSON.parse(fs.readFileSync(fileName, {encoding: 'utf8'}));
}

gulp.task('lint:javascript', function () {
	var jshint = require('gulp-jshint');

	return gulp.src('src/**/*.js')
		.pipe(jshint())
		.pipe(jshint.reporter('default', {verbose: true}))
		.pipe(jshint.reporter('fail'));
});

gulp.task('concat:javascript', ['lint:javascript'], function () {
	var concat = require('gulp-concat'),
	    resolveDeps = require('gulp-resolve-dependencies'),
	    sourceMap = require('gulp-sourcemaps');

	return gulp.src(readJson('jsFiles.json'), {cwd: 'src'})
		.pipe(resolveDeps())
		.pipe(sourceMap.init())
		.pipe(concat('llc.js', {newLine: '\n\n'}))
		.pipe(sourceMap.write('./'))
		.pipe(gulp.dest('dist/'));
});

gulp.task('uglify:javascript', ['concat:javascript'], function () {

	var uglify = require('gulp-uglify'),
	rename = require('gulp-rename');

	return gulp.src('dist/llc.js')
		.pipe(uglify())
		.pipe(rename({extname: '.min.js'}))
		.pipe(gulp.dest('dist/'));

});

gulp.task('less', function () {
	var less = require('gulp-less');

	return gulp.src('less/*.less')
		.pipe(less())
		.pipe(gulp.dest('dist'));
});

gulp.task('serve', ['uglify:javascript', 'less'], function () {

	var connect = require('gulp-connect');

	gulp.watch('src/**/*.js', ['concat:javascript']);
	gulp.watch('less/**/*.less', ['less']);

	connect.server({
		root: ['demo', 'dist', 'bower_components'],
		port: 9010
	});
});

gulp.task('build', ['uglify:javascript', 'less']);