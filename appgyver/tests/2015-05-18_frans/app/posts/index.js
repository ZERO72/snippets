angular.module('posts', [
	// Declare any module-specific AngularJS dependencies here
	'common',
	'infinite-scroll',
	'postServices',
	'ngSanitize'
]);
// Temporary solution for the above
var global = {
	serverUrl : "http://www.madpac.nl",
	// serverUrl : "http://enfait.dev.10.214.59.106.xip.io",
	pageIndex : 0, // current index
	toIndex : 0, // where do we go
};

