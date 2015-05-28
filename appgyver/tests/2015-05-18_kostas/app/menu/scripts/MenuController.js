angular.module('menu').controller('MenuController', function($scope, supersonic) {

	//$('#menu').append('	<super-navigate class="item" location="epg#overview" onclick="steroids.drawers.hide()">EPG</super-navigate>');

	$scope.doIt = function(ref) {

		// supersonic.ui.layers.popAll();

		// var view = new supersonic.ui.View("posts#overview");
		// supersonic.ui.layers.push(view);

		// supersonic.ui.layers.popAll();

		// view = new supersonic.ui.View("epg#overview");
		// view.start("latest").then( function(startedView) {
		//   supersonic.ui.layers.replace(startedView);
		// });

		var replacementView = new supersonic.ui.View({
		    location: ref, 
		    id: ref
		});
		replacementView.start().then(function () {
			supersonic.ui.layers.replace(replacementView);
		});		
		steroids.drawers.hide();
			
	};

});