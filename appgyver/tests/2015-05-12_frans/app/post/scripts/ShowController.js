angular
  .module('post')
  .controller("ShowController", function ($scope, Post, supersonic) {
    $scope.post = null;
    $scope.showSpinner = true;
    $scope.dataId = undefined;

    var _refreshViewData = function () {
      Post.find($scope.dataId).then( function (post) {
        $scope.$apply( function () {
          $scope.post = post;
          $scope.showSpinner = false;
        });
      });
    }

    supersonic.ui.views.current.whenVisible( function () {
      if ( $scope.dataId ) {
        _refreshViewData();
      }
    });

    supersonic.ui.views.current.params.onValue( function (values) {
      $scope.dataId = values.id;
      _refreshViewData();
    });

    $scope.remove = function (id) {
      $scope.showSpinner = true;
      $scope.post.delete().then( function () {
        supersonic.ui.layers.pop();
      });
    }
  });