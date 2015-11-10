#ZERO72GRID

##Description
A reusable angular module you can add to any project

##Setup
1. Include the module in your angular app: `var app = angular.module('app', ['z72grid']);
2. Add the core files to your assets/js folder. Make sure you also include all the dependencies (see next chapter)
3. Reference the JavaScript file in your index.html file `<script src="assets/z72grid/z72grid.js"></script>
4. Include the z72grid styles in your project. You can include a reference to z72grid.css in your index.html file, or preferably import the z72grid.scss into your main.scss file, i.e.: `@import "../libs/z72grid/z72grid.scss";
5. Update your Gruntfile.js

##Dependencies
The z72grid requires the following libraries (apart from angular itself):

1. Lodash
2. TweenMax
3. ngDraggable

These libraries are available via the /dependecies folder, but they are not kept up-to-date. It is advisable to manage these packages yourself.

##How to use
In the parent controller you will need a repeating object with modules to place in the grid. Preferably with some initial grid-layout values, i.e.:

```
	$scope.thingsInGrid = [
	{
		"name": "Item 1",
		"grid_config": {
			xPos: 1,
			yPos: 1,
			xUnits: 2,
			yUnits: 2,
			xMinSize: 1,
			yMinSize: 1,
		}
	}, {
	.....
	}, {
		"name": "Item 4",
		"board_config": {
			xPos: 5,
			yPos: 8,
			xUnits: 2,
			yUnits: 2,
			xMinSize: 1,
			yMinSize: 1,
		}
	}];
}]);
```