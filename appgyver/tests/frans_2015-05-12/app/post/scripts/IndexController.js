angular
  .module('post')
  .controller("IndexController", function ($scope, Post, supersonic) {
    $scope.posts = null;
    $scope.showSpinner = true;

    Post.all().whenChanged( function (posts) {
        $scope.$apply( function () {
          $scope.posts = posts;
          $scope.showSpinner = false;
        });
    });
  });