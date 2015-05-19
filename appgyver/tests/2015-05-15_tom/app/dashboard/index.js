angular.module('dashboard', [
  // Declare any module-specific AngularJS dependencies here
  'common',
  'infinite-scroll',
  'postServices',
  'ngSanitize'
]);
// Temporary solution for the above
var global = {
	serverUrl : "http://www.madpac.nl",
	pageIndex : 0, // current index
	toIndex : 0, // where do we go
};

