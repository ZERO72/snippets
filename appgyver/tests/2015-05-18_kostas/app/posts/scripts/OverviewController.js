angular.module('posts').controller('OverviewController', function($scope, supersonic, articles, PostStream, $sce) {

	// Function on click element to send data to Detail.html screen to prefill before doing any calls.
	$scope.pushIt = function(i) {

		var objectId = '';
		var objectTitle = '';
		var objectMedia = '';

		//console.log(i);
		var objectId = i.id;
		var objectTitle = i.title;
		if(i.thumbnail_images.large) {
			var objectMedia = i.thumbnail_images.large;
		}
		window.postMessage({ type: "posts", message: { id: objectId, title: objectTitle, featuredImage: objectMedia} }, "*") 
	};

	$scope.trustAsHtml = $sce.trustAsHtml;

	$scope.theAbused = 'test';

	//$scope.postStream = new PostStream();

	supersonic.data.channel('public_announcements').subscribe( function(message) {

	  $scope.theAbused2 = message.sender;
	  $scope.postStream = new PostStream( $scope.theAbused2 );

	  // Applies the new info
	  $scope.$apply(); 

	});



	$scope.testClick = function() {

		//$scope.theAbused = 'blabla';
		//$scope.postStream = new PostStream('sport');
			
	};




	

	


});

