angular
  .module('post')
  .controller("EditController", function ($scope, Post, supersonic) {
    $scope.post = null;
    $scope.showSpinner = true;

    // Fetch an object based on id from the database
    Post.find(steroids.view.params.id).then( function (post) {
      $scope.$apply(function() {
        $scope.post = post;
        $scope.showSpinner = false;
      });
    });

    $scope.submitForm = function() {
      $scope.showSpinner = true;
      $scope.post.save().then( function () {
        supersonic.ui.modal.hide();
      });
    }

    $scope.cancel = function () {
      supersonic.ui.modal.hide();
    }

  });
