#ZERO72GRID

##Description
A reusable angular module you can add to any project

##Setup
1. Include the module in your angular app: ```var app = angular.module('app', ['z72grid']);```
2. Add the core files to your assets/js folder. Make sure you also include all the dependencies (see next chapter)
3. Reference the JavaScript file in your index.html file ```<script src="assets/z72grid/z72grid.js"></script>```
4. Include the z72grid styles in your project. You can include a reference to z72grid.css in your index.html file, or preferably import the z72grid.scss into your main.scss file, i.e.: `@import "../libs/z72grid/z72grid.scss";
5. Update your Gruntfile.js

##Dependencies
The z72grid requires the following libraries (apart from angular itself):

1. Lodash
2. TweenMax
3. ngDraggable

These libraries are available via the /dependecies folder, but they are not kept up-to-date. It is advisable to manage these packages yourself.

##How to use

###Ctrl
In the parent controller you will need a repeating object with modules to place in the grid. Preferably with some initial grid-layout values, i.e.:
```JavaScript
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
	"grid_config": {
		xPos: 5,
		yPos: 8,
		xUnits: 2,
		yUnits: 2,
		xMinSize: 1,
		yMinSize: 1,
	}
}];
```
###View
Your markup should look like this:
```HTML
<div id="gridwrap">
	<z72grid data-x-units="12" data-y-units="12">
		<z72gridmodule ng-repeat="thing in thingsInGrid" module="thing" config-property-name="grid_config">
			<div class="example-content">{{thing.name}} PLACE ANYTHING HERE YOU'D LIKE </div>
		</z72gridmodule>
	</z72grid>
</div>
````
####Where:
- The **#gridwrap** div is a container for the grid that determines the full grid size, the grid will scale to 100% height and width of this container
- **data-x-units** and **data-y-units** refer to the number of horizontal and vertical units the grid wil contain. A low number will mean the grid modules snap to widely distributed points, and a high number will make them snap to points that are closer together.
- **module** is the object you want to be placed in the grid.
- **config-property-name** is the name of the object property where the grid postion and size attributes will be stored. If this property does not exist yet, it will be created for you.
