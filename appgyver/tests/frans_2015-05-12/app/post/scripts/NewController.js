angular
  .module('post')
  .controller("NewController", function ($scope, Post, supersonic) {
    $scope.post = {};

    $scope.submitForm = function () {
      $scope.showSpinner = true;
      newpost = new Post($scope.post);
      newpost.save().then( function () {
        supersonic.ui.modal.hide();
      });
    };

    $scope.cancel = function () {
      supersonic.ui.modal.hide();
    }

  });