var postServices = angular.module('postServices', ['ngResource']);
	postServices.factory('articles', ['$resource', function($resource){

		var articles =  $resource(global.serverUrl + '/api/get_posts/?page=1&count=20', {}, {
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


postServices.factory('postStream', function($http){

		

		 var postStream = function() {
		    this.items = [];
		    this.busy = false;
		    this.after = '';
		  };

		  postStream.prototype.nextPage = function() {
		    if (this.busy) return;
		    this.busy = true;
		    var url = global.serverUrl + '/api/get_posts/?page=' + this.after + '&count=20';

		    $http.jsonp(url).success(function(data) {
		      var items = data.posts.data.children;
		      for (var i = 0; i < items.length; i++) {
		        this.items.push(items[i].data);
		      }
		      this.after = "t3_" + this.items[this.items.length - 1].id;
		      this.busy = false;
		    }.bind(this));
		  };

		  return postStream;

});




postServices.factory('Reddit', function($http) {
  var Reddit = function() {
    this.items = [];
    this.busy = false;
    this.after = '';
  };

  Reddit.prototype.nextPage = function() {
    if (this.busy) return;
    this.busy = true;

    var url = "http://api.reddit.com/hot?after=" + this.after + "&jsonp=JSON_CALLBACK";
    $http.jsonp(url).success(function(data) {
      var items = data.data.children;
      for (var i = 0; i < items.length; i++) {
        this.items.push(items[i].data);
      }
      this.after = "t3_" + this.items[this.items.length - 1].id;
      this.busy = false;
    }.bind(this));
  };

  return Reddit;
});