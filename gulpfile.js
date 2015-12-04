var gulp = require('gulp');

gulp.task('concat:javascript', function () {
	var concat = require('gulp-concat');

	return gulp.src([
			'src/LC.js',
			'src/ViewLayers.js'
		])
		.pipe(concat('llc.js', {newLine: '\n\n'}))
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
		port: 8080
	});
});

gulp.task('build', ['uglify:javascript', 'less']);