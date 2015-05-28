var postServices = angular.module('postServices', ['ngResource']);

postServices.factory('articles', ['$resource', function($resource){
	var articles = $resource(global.serverUrl + '/api/get_posts/?page=1&count=20', {}, {
		query: {method:'GET'}
	});

	return articles;

}]);

postServices.factory('article', ['$resource', function($resource){
	var article = $resource(global.serverUrl + '/api/get_post/?post_id=:id', {}, {
		query: {method:'GET'}
	});

	return article;
}]);



postServices.factory('PostStream', function($http){
	var PostStream = function() {
		this.items = [];
		this.busy = false;
		this.page = 1;
	};

	PostStream.prototype.nextPage = function() {
		if (this.busy) return;
		this.busy = true;
		var url = global.serverUrl + '/api/get_posts/?page='+ this.page +'&count=5';

		var url = 'http://api.at5.nl/v1/news.json?token=4cf04da962671ffb01793cfd9fffac46410441a1&callback=1';

		$http.get(url).success(function(data) {

			var items = data.items;

			for (var i = 0; i < items.length; i++) {
				this.items.push(items[i]);
			}

			this.page++;
			this.busy = false;

		}.bind(this));

		//var url = 'http://api.at5.nl/v1/news.json?token=4cf04da962671ffb01793cfd9fffac46410441a1&callback=1'

		// $http.get(url).success(function(data) {

		// 	var items = data.posts;

		// 	for (var i = 0; i < items.length; i++) {
		// 		this.items.push(items[i]);
		// 	}

		// 	this.page++;
		// 	this.busy = false;

		// }.bind(this));
	};

	console.log(PostStream);

	return PostStream;
});