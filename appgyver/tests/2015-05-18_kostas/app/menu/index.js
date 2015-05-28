angular.module('menu', [
	// Declare any module-specific AngularJS dependencies here
	'common',
	'infinite-scroll',
	'ngSanitize',
	'ngAnimate'
]);
// Temporary solution for the above
var global = {
	serverUrl : "http://www.enfait.nl",
	// serverUrl : "http://enfait.dev.10.214.59.106.xip.io",
	pageIndex : 0, // current index
	toIndex : 0, // where do we go
};
