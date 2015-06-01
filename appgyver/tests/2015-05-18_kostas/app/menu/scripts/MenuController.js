angular.module('menu').controller('MenuController', function($scope, supersonic) {



	function zPostMessage(param) {

		// Send var through postmessage
		var message = {
	   	 recipient: "showView",
	   	 message: param
	  	};

  		window.postMessage(message);

	}

	function zChannelMessage(param) {

		// Send var through postmessage
		var message = {
		  sender: param,
		  contet: "a new beer brewed"
		};

  		supersonic.data.channel('public_announcements').publish(message);

	}



	// Function to navigate to page
	$scope.goTo = function(location, pageid, param) {

		zPostMessage(param);

		zChannelMessage(param);

		supersonic.logger.log('menu click + ' + location+' '+pageid);

		// Add new location to view (view is appearantly global as it needs no 'var' declaration)
		//view = new supersonic.ui.View(location+ '?' + $.param('teststest'));
		var view = new supersonic.ui.View(location);
 
		// Replace the standard page id layer (coffee structure) with the new view
		supersonic.ui.layers.replace(pageid);

		// Close the drawer
		supersonic.ui.drawers.close();

			
	};

});