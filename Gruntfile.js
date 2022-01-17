var saveLicense = require('uglify-save-license');
module.exports = function (grunt) {
    var banner = '/* <%= pkg.description %> - v<%= pkg.version %>; Author: <%= pkg.author %>; License: <%= pkg.license %> */' + "\n";
    // Задачи
    grunt.initConfig({
        pkg: grunt.file.readJSON('./package.json'),
        banner: '/* <%= pkg.name %> v<%= pkg.version %> */',
        // Сжимаем
        uglify: {
            options: {
                output: {
                    comments: saveLicense
                }
            },
            main: {
                files: grunt.file.expandMapping([
                    'src/*.js',
                    '!**/*.min.js', "!Gruntfile.js"], './', {
                    rename: function (destBase, destPath) {
                        return destBase + destPath.replace(/(\.np)?\.js/ig, '.min.js');
                    }
                })
            }
        },
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.registerTask('default', ['uglify']);
};