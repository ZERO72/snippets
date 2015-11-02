module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
		'<%= grunt.template.today("yyyy-mm-dd") %>\n' +
		'<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
		'* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %> */\n',
		// Task configuration.
		sass: {
			dist: {
				options: {
					style: 'compressed'
				},
				files: {
					'assets/stylesheets/css/style.css' : 'assets/stylesheets/scss/main.scss'
				}
			}
		},
		watch: {
			options: {
				livereload: 1337
			},
			scripts: {
				files: [
					'Gruntfile.js',
					'assets/js/*.js'
				],
				tasks: ['jshint']
			},
			css: {
				files: ['assets/stylesheets/scss/*.scss', 'assets/stylesheets/scss/*/**.scss'],
				tasks: ['sass'],
				options: {
					spawn: false
				}
			} 
		},
		jshint: {
			all: [
				'Gruntfile.js',
				'app/**/*.js'
			],
			options: {
				'jshintrc': true
			}
		},
		concat: {
			options: { "separator": "\n" },
			build: {
					src: [
						"assets/js/vendor/jquery-1.11.2.min.js",
						"assets/js/vendor/fastclick.js",
						"assets/js/vendor/lazyload.js",
						"assets/js/vendor/gsap/TweenMax.min.js",
						"assets/js/main.js"
					],
					dest: "assets/js/main-concat.js"
			}
		},
		uglify: {
			options: {
				banner: '<%= banner %>',
				mangle: false
			},
			dist: {
				src: "assets/js/main-concat.js",
				dest: 'assets/js/main.min.js'
			}
		}
	});


	// These plugins provide necessary tasks.
	grunt.loadNpmTasks('grunt-contrib-sass');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');

	// Default task.
	grunt.registerTask('default', ['sass', 'jshint', 'watch']);

	// Production task
	grunt.registerTask('prod', ['sass', 'jshint', 'concat','uglify']);
};