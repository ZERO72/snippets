angular.module('menu').controller('_MenuController', function($scope, supersonic) {

	//$('#menu').append('	<super-navigate class="item" location="epg#overview" onclick="steroids.drawers.hide()">EPG</super-navigate>');

	$scope.doIt = function(ref, page, cat) {

		// supersonic.ui.layers.popAll();

		// var view = new supersonic.ui.View("posts#overview");
		// supersonic.ui.layers.push(view);

		// supersonic.ui.layers.popAll();

		// view = new supersonic.ui.View("epg#overview");
		// view.start("latest").then( function(startedView) {
		//   supersonic.ui.layers.replace(startedView);
		// });

		supersonic.logger.log(ref+' '+page);

		// var replacementView = new supersonic.ui.View({
		//     location: ref, 
		//     id: page
		// });
		// replacementView.start().then(function () {
		// 	supersonic.ui.layers.replace(replacementView);
		// });		

		// var rootView = new steroids.views.WebView( { location: ref, id: page } );
		// steroids.layers.replace(rootView);

		// Add new location to view
		view = new supersonic.ui.View(ref);
		// view.start(page).then( function(startedView) {
		//   supersonic.ui.layers.replace(startedView);
		// });

		// Replace the standard page id layer (coffee structure) with the new view
		supersonic.ui.layers.replace(page);

		// Close the drawer
		supersonic.ui.drawers.close();
			
	};

});