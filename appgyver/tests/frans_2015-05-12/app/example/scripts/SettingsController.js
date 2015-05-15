angular.module('example').controller('SettingsController', function($scope, supersonic) {
	$scope.navbarTitle = "Settings";

	$scope.getPosition = function() {
	  supersonic.ui.dialog.alert("Interstellar!");
	};

	$scope.position = undefined;

	$scope.getPosition = function() {
		supersonic.device.geolocation.getPosition().then( function(position){
			$scope.position = position;
		});
	};
});
