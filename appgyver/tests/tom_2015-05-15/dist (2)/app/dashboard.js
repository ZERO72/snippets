angular.module('dashboard', [
  // Declare any module-specific AngularJS dependencies here
  'common',
  'postServices'
]);


var postServices = angular.module('postServices', ['ngResource']);
	postServices.factory('ajaxCalls', ['$resource', function($resource){

		var ajaxCalls =  $resource('http://www.madpac.nl/api/get_posts/?page=1&count=20', {}, {
			query: {method:'GET'}
		});

		return ajaxCalls;

	}]);
angular
  .module('dashboard')
  .controller('DetailController', function($scope, supersonic) {

  			// Window message from index.html to prefill the template with data before doing any calls.
			window.addEventListener("message", function(msg) {

				if(msg.data.type == "dashboard"){

						 $scope.title = msg.data.message.title;
						 $scope.media = msg.data.message.media;
						 $scope.$apply();

				}
			});

			
  });

angular
  .module('dashboard')
  .controller('IndexController', function($scope, supersonic, ajaxCalls) {

  	// Function on click element to send data to Detail.html screen to prefill before doing any calls.
		$scope.pushIt = function(i) {
			var objectTitle = i.title;
			var objectMedia = i.attachments[0].url;
			window.postMessage({ type: "dashboard", message: { title: objectTitle, media: objectMedia} }, "*") 
		};

	var post_data = ajaxCalls.query(function(data) {
		// use the factory calls to get Ajax data
		$scope.posts = data.posts;

		// Put the object into storage to create an in app Cache system where you can render from.
		// localStorage.setItem('posts', JSON.stringify(data.posts));

	  });

  });
