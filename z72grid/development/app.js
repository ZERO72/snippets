// MODULE
var hostApp = angular.module('hostApp', ['z72grid']);

// CONTROLLERS
hostApp.controller('mainController', ['$scope', function ($scope) {
	'use strict';
	$scope.thingsInGrid = [
	{
		"name": "Item 1",
		"board_config": {
			xPos: 1,
			yPos: 1,
			xUnits: 2,
			yUnits: 2,
			xMinSize: 1,
			yMinSize: 1,
			dragging: false,
			resizing: false
		}
	}, {
		"name": "Item 2",
		"board_config": {
			xPos: 5,
			yPos: 3,
			xUnits: 2,
			yUnits: 2,
			xMinSize: 1,
			yMinSize: 1,
			dragging: false,
			resizing: false
		}
	}, {
		"name": "Item 3",
		"board_config": {
			xPos: 1,
			yPos: 8,
			xUnits: 2,
			yUnits: 2,
			xMinSize: 1,
			yMinSize: 1,
			dragging: false,
			resizing: false
		}
	}, {
		"name": "Item 4",
		"board_config": {
			xPos: 5,
			yPos: 8,
			xUnits: 2,
			yUnits: 2,
			xMinSize: 1,
			yMinSize: 1,
			dragging: false,
			resizing: false
		}
	}];
}]);



