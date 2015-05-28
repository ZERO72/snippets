angular.module('epg').controller('OverviewController', function($scope, supersonic, articles, PostStream, $sce) {

	// Function on click element to send data to Detail.html screen to prefill before doing any calls.
	$scope.pushIt = function(i) {
		//console.log(i);
		var objectId = i.id;
		var objectTitle = i.title;
		var objectMedia = i.thumbnail_images.large;
		window.postMessage({ type: "posts", message: { id: objectId, title: objectTitle, featuredImage: objectMedia} }, "*") 
	};

	$scope.articles = PostStream;

	// var post_data = articles.query(function(data) {
	// 	// use the factory calls to get Ajax data
	// 	$scope.posts = data.posts;

	// 	// Put the object into storage to create an in app Cache system where you can render from.
	// 	// localStorage.setItem('posts', JSON.stringify(data.posts));
	// });

	$scope.trustAsHtml = $sce.trustAsHtml;
	$scope.postStream = new PostStream();

	console.log(new PostStream());
});

// angular.filter('unsafe', function($sce) {
// 	return function(val) {
// 		return $sce.trustAsHtml(val);
// 	};
// });