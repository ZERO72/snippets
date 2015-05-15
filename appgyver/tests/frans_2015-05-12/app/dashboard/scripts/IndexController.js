angular.module('dashboard').controller('IndexController', function($scope, supersonic, articles, Reddit) {

	// Function on click element to send data to Detail.html screen to prefill before doing any calls.
	$scope.pushIt = function(i) {
		var objectId = i.id;
		var objectTitle = i.title;
		var objectMedia = i.attachments[0].url;
		window.postMessage({ type: "dashboard", message: { id: objectId, title: objectTitle, media: objectMedia} }, "*") 
	};

	var post_data = articles.query(function(data) {
		// use the factory calls to get Ajax data
		$scope.posts = data.posts;

		// Put the object into storage to create an in app Cache system where you can render from.
		// localStorage.setItem('posts', JSON.stringify(data.posts));
	});

	$scope.reddit = new Reddit();

});

angular.filter('unsafe', function($sce) {
	return function(val) {
		return $sce.trustAsHtml(val);
	};
});