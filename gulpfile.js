// Gulp packages
var gulp                   = require('gulp');
var filter                 = require('gulp-filter');
var uglify                 = require('gulp-uglify');
var concat                 = require('gulp-concat');
var cleanCSS               = require('gulp-clean-css');
var plumber                = require('gulp-plumber');
var sourcemaps             = require('gulp-sourcemaps');
var sass                   = require('gulp-sass');
var notify                 = require('gulp-notify');
var rename                 = require('gulp-rename');
var clean                  = require('gulp-clean');
var gutil                  = require('gulp-util');
var postcss                = require('gulp-postcss');
var merge                  = require('merge-stream');
var autoprefixer           = require('autoprefixer');
var babel                  = require('gulp-babel');

// Image plugins
var imagemin               = require('gulp-imagemin');
var imageminPngquant       = require('imagemin-pngquant');
var imageminJpegRecompress = require('imagemin-jpeg-recompress');

// Filepaths
var JS_PATH           = './src/js/**/*.js';
var JS_PAGES          = './src/js/pages/**/*.js';
var JS_COMPONENTS     = './src/js/components/**/*.js';
var JS_INTERIOR       = './src/js/interior-pages/**/*.js';
var SCSS_PATH         = './src/scss/**/*.scss';
var IMG_PATH          = './src/img/**/*.{gif,jpg,jpeg,png,svg}';
var FONTS_PATH        = './src/fonts/**/*';
var PAGES_PATH        = './src/pages/**/*';

// Compiled CSS or SCSS paths
var CSS_COMPILE_DIR   = './src/stylesheets/';
var CSS_COMPILED      = './src/stylesheets/*.css';
var CSS_COMPILED_VEND = './src/stylesheets/**/*';

// Distribution filepaths
var CSS_DIST           = './dist/stylesheets/';
var JS_DIST            = './dist/js/';
var JS_PAGES_DIST      = './dist/js/pages';
var JS_COMPONENTS_DIST = './dist/js/components';
var JS_INTERIOR_DIST   = './dist/js/interior-pages'; 
var JS_SOURCEMAPS_DIST = './sourcemaps';
var JS_VENDORS_DIST    = './dist/js/vendor';
var IMG_DIST           = './dist/img/';
var FONTS_DIST         = './dist/fonts/';
var PAGES_DIST         = './dist/pages/';


/*
|-----------------------------------------------------
| Error function for plumber
|-----------------------------------------------------
*/
var onError = function (err) {
    console.log("=================================");
    gutil.beep();
    console.log(err);
    this.emit('end');
};

/*
|-----------------------------------------------------------------------------------
| NOTE: This is a two part task (using merge-stream)
|
| SCSS task 1 -> CREATE -> './src/stylesheets/main.css'
| SCSS task 2 -> CREATE -> './src/stylesheets/*.all of the vendor files'
|
| NOTE: Certain css/scss libraries include fonts, icons, and other static assets
| that can not be compiled.  These assets must be excluded from the scss task.
|
| This task splits up the scss directory into scss assets, and non scss assets.
| Part 1 processes the scss while Part 2 moves the non scss assets.
|
| E.g. 'slick-theme.scss' includes '/fonts' and 'ajax-loader.gif'.  'slick-theme.scss'
| gets compiled with the other .scss files into './src/stylesheets/main.css'.
| The 'fonts' directory and the 'ajax-loader.gif' get moved into './src/stylesheets'
|
| slick-theme.scss that got compiled into 'main.css' references
| associated vendor files in the './src/stylesheets' directory.  Be sure to update
| filepaths accordingly.
|-----------------------------------------------------------------------------------
*/
gulp.task('scss', function(cb) {
    console.log('Starting scss task. Compiling SCSS to ' + CSS_COMPILE_DIR);

    // Part 1: Process scss -> './src/stylesheets/main.css'
    var compile = gulp.src([SCSS_PATH])
      .pipe(plumber({ errorHandler: onError }))
      .pipe(sourcemaps.init())
      .pipe(sass({
        includePaths: require('node-normalize-scss').includePaths
      }))
      .pipe(postcss([ autoprefixer({ browsers: ["> 0%"] }) ]))
      .pipe(sourcemaps.write())
      .pipe(gulp.dest(CSS_COMPILE_DIR))
      .pipe(notify({
        message: 'SCSS task complete.',
        onLast: true
      }));

    // Part 2: Move static assets -> './src/stylesheets/*.all of the vendor files (fonts, gifs, etc.)'

    // remove the assets that are compiled
    var removeSassFiles = filter(['**', '!src/scss/**/*.scss' ]);

    // specify directories with static assets using a glob pattern
    var files = [
      './node_modules/owl.carousel/dist/assets/owl.carousel.min.css'
    ];

    var vendor = gulp.src(files)
      .pipe(plumber({ errorHandler: onError }))
      .pipe(removeSassFiles)
      .pipe(gulp.dest(CSS_COMPILE_DIR))
      .pipe(notify({
        message: 'SCSS Vendors - task complete.',
        onLast: true
      }));

    return merge(compile, vendor);
    cb(err); // the callback is used to make sure this task runs before the 'compile' task
});

/*
|------------------------------------------------------------------------------------
| Compile task (for distribution) -> CREATE -> './dist/stylesheets/main.min.css'
| NOTE: sourcemaps won't work for distribution css
|------------------------------------------------------------------------------------
*/
gulp.task('compile', ['scss'], function(cb) {
    console.log('Starting compile task. Compiling CSS to ' + CSS_DIST);

    return gulp.src(CSS_COMPILED)
      .pipe(plumber({ errorHandler: onError }))
      .pipe(concat('main.css'))
      .pipe(cleanCSS())
      .pipe(rename({ suffix: '.min' }))
      .pipe(gulp.dest(CSS_DIST))
      .pipe(notify({
        message: 'Compile task complete.',
        onLast: true
      }))
      cb(err); // the callback is used to make sure this task runs before the 'scss-vendors' task
});

/*
|------------------------------------------------------------------------------------
| SCSS vendors task (for distribution)
| CREATE -> './dist/stylesheets/*.all of the vendor files'
|------------------------------------------------------------------------------------
*/
gulp.task('scss-vendors', ['compile'], function() {
    console.log('Starting SCSS vendors task. Compiling vendor files to ' + CSS_DIST);

    // remove the compiled stylesheet; the rest of the assets will be moved
    var removeCssCompiled = filter(['**', '!src/stylesheets/*.css' ]);

    return gulp.src(CSS_COMPILED_VEND)
      .pipe(plumber({ errorHandler: onError }))
      .pipe(removeCssCompiled)
      .pipe(gulp.dest(CSS_DIST))
      .pipe(notify({
        message: 'SCSS vendors - distribution task complete.',
        onLast: true
      }));
});

/*
|-----------------------------------------------------------
| Javascript task -> CREATE -> './dist/js/main.min.js'
|-----------------------------------------------------------
*/
gulp.task('javascript', function() {
    console.log('Starting javascript task. Compiling JS to ' + JS_DIST);

    var removeVendorFiles = filter([
      '**', 
      '!src/js/vendor/**'
    ]);

    return gulp.src(JS_PATH)
      .pipe(plumber({ errorHandler: onError }))
      .pipe(removeVendorFiles)
      .pipe(sourcemaps.init())
      .pipe(concat('main.js'))
      .pipe(babel({presets:['es2015']}))
      .pipe(uglify())
      .pipe(rename({suffix: '.min'}))
      .pipe(sourcemaps.write({includeContent: false, sourceRoot:'../../src/js'}))
      .pipe(gulp.dest(JS_DIST))
      .pipe(notify({
        message: 'JS task complete.',
        onLast: true
      }));
});

/*
|-------------------------------------------------------------
| Javascript pages task -> CREATE -> './dist/js/pages/*.js
| e.g. './dist/js/home.js'
|-------------------------------------------------------------
*/
gulp.task('js-pages', function() {
    console.log('Starting javascript pages task. Compiling JS pages to ' + JS_PAGES_DIST);

    return gulp.src(JS_PAGES)
      .pipe(plumber({ errorHandler: onError }))
      .pipe(sourcemaps.init())
      .pipe(babel({presets:['es2015']}))
      .pipe(uglify())
      .pipe(sourcemaps.write(JS_SOURCEMAPS_DIST))
      .pipe(gulp.dest(JS_PAGES_DIST))
      .pipe(notify({
        message: 'JS pages task complete.',
        onLast: true
      }));
})

/*
|-------------------------------------------------------------
| Javascript Components task -> CREATE -> './dist/js/components/*.js
| e.g. './dist/js/components/home_slider.js'
|-------------------------------------------------------------
*/
gulp.task('js-components', function() {
    console.log('Starting javascript Components task. Compiling JS components to ' + JS_COMPONENTS_DIST);

    return gulp.src(JS_COMPONENTS)
      .pipe(plumber({ errorHandler: onError }))
      .pipe(sourcemaps.init())
      .pipe(babel({presets:['es2015']}))
      .pipe(uglify())
      .pipe(sourcemaps.write(JS_SOURCEMAPS_DIST))
      .pipe(gulp.dest(JS_COMPONENTS_DIST))
      .pipe(notify({
        message: 'JS components task complete.',
        onLast: true
      }));
})

/*
|-------------------------------------------------------------
| Javascript interior pages task -> CREATE -> './dist/js/interior-pages/*.js
| e.g. './dist/js/interior-pages/our-approach.js'
|-------------------------------------------------------------
*/
gulp.task('js-interior', function() {
    console.log('Starting javascript pages task. Compiling JS pages to ' + JS_INTERIOR_DIST);

    return gulp.src(JS_INTERIOR)
      .pipe(plumber({ errorHandler: onError }))
      .pipe(sourcemaps.init())
      .pipe(babel({presets:['es2015']}))
      .pipe(uglify())
      .pipe(sourcemaps.write(JS_SOURCEMAPS_DIST))
      .pipe(gulp.dest(JS_INTERIOR_DIST))
      .pipe(notify({
        message: 'JS pages task complete.',
        onLast: true
      }));
})



/*
|------------------------------------------------------------------------
| Javascript vendors task -> CREATE -> './dist/js/vendors/vendors.min.js
|------------------------------------------------------------------------
*/
gulp.task('js-vendors', function() {
    console.log('Starting javascript vendors task. Compiling JS pages to ' + JS_VENDORS_DIST);

    // specify order of concatination with an array
    var files = [
      './src/js/vendor/jquery/jquery.color-2.1.2.min.js',
      './node_modules/lethargy/lethargy.min.js',
      './node_modules/owl.carousel/dist/owl.carousel.min.js'
    ];

    return gulp.src(files)
      .pipe(plumber({ errorHandler: onError }))
      //.pipe(uglify())
      .pipe(concat('vendor.js'))
      .pipe(rename({suffix: '.min'}))
      .pipe(gulp.dest(JS_VENDORS_DIST))
      .pipe(notify({
        message: 'JS vendors task complete.',
        onLast: true
      }));
});

/*
|-----------------------------------------------------
| Images task -> Compress (lossy) images.
|-----------------------------------------------------
*/
gulp.task('images', function() {
    console.log('Starting images task. Compressing images to ' + IMG_DIST);

    return gulp.src(IMG_PATH)
      .pipe(plumber({ errorHandler: onError }))
      .pipe(imagemin(
  			[
  				imagemin.gifsicle(),
  				imagemin.jpegtran(),
  				imagemin.optipng(),
  				imagemin.svgo(),
  				imageminPngquant(),
  				imageminJpegRecompress()
  			]
  		))
      .pipe(gulp.dest(IMG_DIST))
      .pipe(notify({
        message: 'Images task complete.',
        onLast: true
      }));
});

/*
|-----------------------------------------------------
| Fonts task -> CREATE -> './dist/fonts/'
|-----------------------------------------------------
*/
gulp.task('fonts', function() {
    console.log('Starting fonts task. Moving fonts to ' + FONTS_DIST);

    return gulp.src(FONTS_PATH)
      .pipe(plumber({ errorHandler: onError }))
      .pipe(gulp.dest(FONTS_DIST))
      .pipe(notify({
        message: 'Fonts task complete.',
        onLast: true
      }));
});

/*
|-----------------------------------------------------
| Pages task -> CREATE -> './dist/pages'
|-----------------------------------------------------
*/
gulp.task('pages', function() {
    console.log('Starting pages task. Moving pages to ' + PAGES_DIST);

    return gulp.src(PAGES_PATH)
      .pipe(plumber({ errorHandler: onError }))
      .pipe(gulp.dest(PAGES_DIST))
      .pipe(notify({
        message: 'Pages task complete.',
        onLast: true
      }));
});

/*
|-------------------------------------------------------
| Watch task
|--------------------------------------------------------
*/
gulp.task('watch', function() {
    gulp.watch(SCSS_PATH, ['compile']);
    gulp.watch(JS_PATH, ['javascript']);
    // gulp.watch(JS_PAGES, ['js-pages']);
    // gulp.watch(JS_COMPONENTS, ['js-components']);
    // gulp.watch(JS_INTERIOR, ['js-interior']);
    gulp.watch(PAGES_PATH, ['pages']);
});

/*
|----------------------------------------------------------------------
| Cleaning task -> DELETE './dist' and './src/stylesheets' directories
|----------------------------------------------------------------------
*/
gulp.task('clean', function () {
  	return gulp.src(['./dist', CSS_COMPILE_DIR], {read: false})
  		.pipe(clean())
      .pipe(notify({
        message: 'Dist & stylesheets directories purged.',
        onLast: true
      }));
});

/*
|-------------------------------------------------------------
| Default task
|-------------------------------------------------------------
*/
var defaultTasks = [
    'scss',
    'compile',
    'scss-vendors',
    'javascript',
    // 'js-pages',
    // 'js-components',
    // 'js-interior',
    'js-vendors',
    'images',
    'fonts',
    'pages'
];

gulp.task('default', defaultTasks , function() {
    console.log('Starting DEFAULT task.');
});
