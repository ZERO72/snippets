angular.module('z72grid', ['ngDraggable', 'z72grid'])
	/**
	 * This service includes helper functions for the grid.
	 */
	.service('z72gridUtils', [function(){
		// Cache the context
		var self;
		self = this;

		/**
		 * Creates a grid array with given dimensions
		 * @param  {integer}	xUnits	Width in units
		 * @param  {integer}	yUnits	Height in units
		 * @param  {object}	gridEl	The DOM element of the grid
		 */
		self.createGridOfXbyY = function (xUnits, yUnits, gridEl) {
			var gridUnit, grid;
			grid = {
				xUnits              : xUnits,
				yUnits              : yUnits,
				width               : gridEl.offsetWidth,
				height              : gridEl.offsetHeight,
				unitWidthInPx       : gridEl.offsetWidth / xUnits,
				unitHeightInPx      : gridEl.offsetHeight / yUnits,
				unitWidthPercentage : 100 / xUnits,
				unitHeightPercentage: 100 / yUnits,
				dragInProgress      : false,
				resizeInProgress    : false,
				placeAllowed        : true,
				units               : []
			};
			for (var y = 1; y <= yUnits; y++) {
				for (var x = 1; x <= xUnits; x++) {
					grid.units['x'+x+'y'+y] = {
						taken: false,
						uid: null
					};
				}
			}
			return grid;
		};

		/**
		 * Generates a random string used for module uid
		 * @param	{integer}	stringLenght	Length of random string to be created
		 * @return	{string}	randomString	A random String
		 */
		self.generateRandomString = function (stringLenght) {
			var charSet;
			charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
			var randomString = '';
			for (var i = 0; i < stringLenght; i++) {
				var randomPoz = Math.floor(Math.random() * charSet.length);
				randomString += charSet.substring(randomPoz,randomPoz+1);
			}
			return randomString;
		};

		/**
		 * Clears the old grid items for a module and then occopies the new ones
		 * @param {object} conf	The configuration of a module being moved or resized
		 * @param {array} gridUnits	The grid units
		 */
		self.setGridItemsForModule = function (curr, gridUnits, old) {
			var inModuleRange;
			// First clear old positions if needed
			if (old) {
				self.doForGridUnitsInRange(old, gridUnits, 'clear');
			}
			// Take new positions
			self.doForGridUnitsInRange(curr, gridUnits, 'take');
		};

		self.doForGridUnitsInRange = function (conf, gridUnits, action) {
			var gridUnit, hasOverlap;
			// Horizontal range
			hasOverlap = false;
			for (var x = conf.xPos; x < (conf.xPos + conf.xUnits); x++) {
				// Vertical range
				for (var y = conf.yPos; y < (conf.yPos + conf.yUnits); y++) {
					gridUnit = gridUnits['x'+x+'y'+y];
					switch(action) {
						case 'clear':
							gridUnit.uid   = null;
							gridUnit.taken = false;
							break;
						case 'take':
							gridUnit.uid   = conf.uid;
							gridUnit.taken = true;
							break;
						case 'check':
							if (gridUnit.taken && gridUnit.uid !== conf.uid) {
								hasOverlap = true;
							}
							break;
					}
					if (hasOverlap) {
						break;
					}
				}
			}
			if (action==='check') {
				return hasOverlap;
			}
		};

		/**
		 * Puts the grid highlighter element behin the module being moved and takes its size
		 * @param {object} gridHighlighter The grid highlighter object
		 * @param {object} conf	The configuration of a module being moved or resized
		 */
		self.mirrorGridHighlighter = function (gridHighlighter, conf) {
			gridHighlighter.xPos   = gridHighlighter.xPosStart   = conf.xPos;
			gridHighlighter.yPos   = gridHighlighter.yPosStart   = conf.yPos;
			gridHighlighter.xUnits = gridHighlighter.xUnitsStart = conf.xUnits;
			gridHighlighter.yUnits = gridHighlighter.yUnitsStart = conf.yUnits;
			gridHighlighter.uid    = conf.uid;
		};

		/**
		 * Places a module on the highlighted area
		 * @param {object} conf	The configuration of a module being moved or resized
		 * @param {object} gridHighlighter The grid highlighter object
		 */
		self.placeOnGridHighlighter = function(conf, gridHighlighter) {
			conf.xPos   = gridHighlighter.xPos;
			conf.yPos   = gridHighlighter.yPos;
			conf.xUnits = gridHighlighter.xUnits;
			conf.yUnits = gridHighlighter.yUnits;
		};

		/**
		 * Computes inline styles for modules and grid highlighter
		 * @param {object} conf	The configuration of a module being moved or resized, could be gridhighligter object as well
		 * @param {object} grid The grid object
		 */
		self.getPositionAndSize = function (conf, grid) {
			return {
				'left'  : (conf.xPos - 1) * grid.unitWidthPercentage + '%',
				'top'   : (conf.yPos - 1) * grid.unitHeightPercentage + '%',
				'width' : conf.xUnits * grid.unitWidthPercentage + '%',
				'height': conf.yUnits * grid.unitHeightPercentage + '%'
			};
		};

		/**
		 * Checks of the highlighted area overlaps with placed modules
		 * @param  {object}  gridHighlighter The grid highlighter object
		 * @param  {object}  gridUnits The grid units containing positions and availability properties
		 * @return {boolean} hasOverlap Returns true if there is an overlap
		 */
		self.checkForOverlap = function (gridHighlighter, gridUnits) {
			var hasOverlap;
			hasOverlap = self.doForGridUnitsInRange(gridHighlighter, gridUnits, 'check');
			return hasOverlap;
		};

	}])
	.directive('z72grid', function () {
		return {
			restrict: 'AE',
			template: '<div class="z72grid-container"ng-drop="true"ng-drag-start="onDragStart($data, $event)"ng-drag-move="onDragMove($data, $event)"ng-drag-stop="onDragStop($data,$event)"> <ng-transclude grid="grid"></ng-transclude> <div ng-if="grid.dragInProgress || grid.resizeInProgress"class="gridhighlighter"ng-class="{forbidden: !grid.placeAllowed}"ng-style="getHighlighterPositionAndSize()"></div> </div>',
			// templateUrl: 'assets/z72grid/z72grid.html',
			transclude: true,
			replace: true,
			scope: {
				xUnits : '@',
				yUnits : '@',
			},
			controller: ['$scope', '$element', '$window', 'z72gridUtils', function($scope, $element, $window, z72gridUtils) {
				var utils;
				// Shorthand for utility service
				utils = z72gridUtils;
				// Create grid
				$scope.grid = utils.createGridOfXbyY (parseInt($scope.xUnits), parseInt($scope.yUnits), $element[0]);
				// Create gridHighlighter
				$scope.gridHighlighter = {};
				
				//////////////////////////////////
				// Drag and drop functionality  //
				//////////////////////////////////
				
				/**
				 * Listens to dragstart event fired by ngDraggable and responds
				 * @param {object} conf	The configuration of a module being moved or resized
				 * @param {object} event The custom mouse event fired by ngDraggable
				 */
				$scope.onDragStart = function (conf, event) {
					conf.dragging              = true;
					$scope.grid.dragInProgress = true;
					utils.mirrorGridHighlighter($scope.gridHighlighter, conf);
				};

				/**
				 * Listens to dragmove event fired by ngDraggable and responds
				 * @param {object} conf	The configuration of a module being moved or resized
				 * @param  {object} event The custom mouse event fired by ngDraggable
				 */
				$scope.onDragMove = function (conf, event) {
					moveHighlighterInGrid(conf, event);
					$scope.grid.placeAllowed = !utils.checkForOverlap($scope.gridHighlighter, $scope.grid.units);
				};

				/**
				 * Listens to dragstop event fired by ngDraggable and responds
				 * @param {object} conf	The configuration of a module being moved or resized
				 * @param {object} event The custom mouse event fired by ngDraggable
				 */
				$scope.onDragStop = function (conf, event) {
					// Prevents dragStop function to proceed when not actually dragging
					// This prevents console errors on click
					if (!$scope.grid.dragInProgress) {
						return false;
					}
					conf.dragging              = false;
					$scope.grid.dragInProgress = false;
					if ($scope.grid.placeAllowed) {
						var oldConf, originLeft, originTop;
						oldConf	   = _.clone(conf);
						originLeft = (conf.xPos - 1) * $scope.grid.unitWidthInPx;
						originTop  = (conf.yPos - 1)  * $scope.grid.unitHeightInPx;
						utils.placeOnGridHighlighter(conf, $scope.gridHighlighter);
						utils.setGridItemsForModule(conf, $scope.grid.units, oldConf);
						animateDraggedElemToSlot(conf, event, 'place', originLeft, originTop);
					} else {
						animateDraggedElemToSlot(conf, event, 'revert');
					}
				};

				/**
				 * Adds utils function to scope so inline styles are updated dynamically
				 */
				$scope.getHighlighterPositionAndSize = function() {
					return utils.getPositionAndSize($scope.gridHighlighter, $scope.grid);
				};

				/**
				 * Updates pixel based grid properties on window resize
				 */
				$window.addEventListener('resize', function () {
					var gridEl; 
					gridEl = $element[0];
					$scope.grid.width          = gridEl.offsetWidth;
					$scope.grid.height         = gridEl.offsetHeight;
					$scope.grid.unitWidthInPx  = gridEl.offsetWidth / $scope.grid.xUnits;
					$scope.grid.unitHeightInPx = gridEl.offsetHeight / $scope.grid.yUnits;
				});

				/**
				 * Moves the grid highlighter along the grid when the user is dragging
				 * @param {object} conf	The configuration of a module being moved or resized
				 * @param {object} event The custom mouse event fired by ngDraggable
				 */
				function moveHighlighterInGrid (conf, event) {
					var xMovementInUnits, yMovementInUnits, xPos, yPos;
					xMovementInUnits = Math.round(event.tx / $scope.grid.unitWidthInPx);
					yMovementInUnits = Math.round(event.ty / $scope.grid.unitHeightInPx);
					xPos = $scope.gridHighlighter.xPosStart + xMovementInUnits;
					yPos = $scope.gridHighlighter.yPosStart + yMovementInUnits;
					// Only move within the boundaries of the grid
					if (xPos > 0 && xPos + conf.xUnits - 1<= $scope.grid.xUnits) {
						$scope.gridHighlighter.xPos = xPos;
					}
					if (yPos > 0 && yPos + conf.yUnits - 1<= $scope.grid.yUnits) {
						$scope.gridHighlighter.yPos = yPos;
					}
				}

				/**
				 * Gently moves the module onto its target spot
				 * @param {object} conf	The configuration of a module being moved or resized
				 * @param {object} event The custom mouse event fired by ngDraggable
				 * @param {string} action Has value 'revert' if we are returning the module to its orinila spot, otherwise value is 'place' 
				 * @param {integer} originLeft Left position during drag in px
				 * @param {integer} originTop  Right position during drag in px
				 */
				function animateDraggedElemToSlot(conf, event, action, originLeft, originTop) {
					var el, duration, fromLeft, fromTop, toLeft, toTop;
					el     = event.element[0];
					toLeft = (conf.xPos - 1) * $scope.grid.unitWidthInPx;
					toTop  = (conf.yPos - 1) * $scope.grid.unitHeightInPx;
					if (action === 'place') {
						duration = 0.2;
						fromLeft = originLeft + event.tx;
						fromTop  = originTop +event.ty;
					} else {
						duration = 0.5;
						fromLeft = toLeft + event.tx;
						fromTop  = toTop + event.ty;
					}
					// We need percentages again so the Tween ends with inline styles in percentage
					fromLeft = ((fromLeft / $scope.grid.width) * 100) + '%';
					fromTop  = ((fromTop / $scope.grid.height) * 100) + '%';
					toLeft   = ((toLeft / $scope.grid.width) * 100) + '%';
					toTop    = ((toTop / $scope.grid.height) * 100) + '%';
					// Animate
					TweenMax.fromTo(el, duration, {left:fromLeft, top:fromTop}, {left:toLeft, top:toTop, ease:Power2.easeOut});
					
				}

				/**
				 * Bind properties and methods directly to the gridCtrl
				 * so they can be shared with the gridmodule directive
				 */
				this.grid = $scope.grid;
				this.gridHighlighter = $scope.gridHighlighter;
			}]
		};
	})
	.directive('z72gridmodule', function () {
		return {
			restrict: 'AE',
			require: '^z72grid',
			template: '<div class="z72grid-module"ng-drag="true"ng-drag-data="module[configPropertyName]"ng-class="{dragging: isDragging(), resizing: isResising(), editing: isEditing()}"ng-style="getPositionAndSize()"> <div ng-drag-handle class="draghandle"></div> <div class="resizehandle img-set"ng-mousedown="onResizeStart($event)"></div> <div class="content" ng-transclude></div> </div>',
			// templateUrl: 'assets/z72grid/z72gridModule.html',
			transclude: true,
			replace: true,
			scope: {
				module            : "=",
				configPropertyName: "@"
			},
			link: function(scope, element, attrs, gridCtrl) {
				// Bind the gridCtrl to the scope of the gridmoduleCtrl
				scope.grid = gridCtrl.grid;
				scope.gridHighlighter = gridCtrl.gridHighlighter;
			},
			controller: ['$scope', '$document', 'z72gridUtils', function($scope, $document, z72gridUtils) {
				var utils, conf, unbindGridWatcher, resizeStartProps;
				//////////////////////////////////////////////////
				// Initialization funtions and helper variables //
				//////////////////////////////////////////////////
				initializeModuleProperties();
				utils = z72gridUtils;
				conf  = $scope.module[$scope.configPropertyName];
				// Add a uid to the module to cross reference between grid and module
				conf.uid = utils.generateRandomString(6);
				// Wait until the grid has become available via the link function
				unbindGridWatcher = $scope.$watch('grid', function() {
					// Occupy the grid space
					utils.setGridItemsForModule (conf, $scope.grid.units);
					// Stop watching, by calling the watch mathod again
					unbindGridWatcher();
				});
				// A helper object at controller level needed by the resize functions. Will receive properties from initResize
				resizeStartProps = {};

				///////////////////////////////////////////
				// State variables controlling the style //
				///////////////////////////////////////////
				
				/**
				 * Helper for css classes
				 * @return {Boolean} Returns true if drag is in progress
				 */
				$scope.isDragging = function() {
					return conf.dragging;
				}; 
				/**
				 * Helper for css classes
				 * @return {Boolean} Returns true if resize is in progress
				 */
				$scope.isResising = function() {
					return conf.resizing;
				}; 
				/**
				 * Helper for css classes
				 * @return {Boolean} Returns true if drag or resize is in progress
				 */
				$scope.isEditing = function () {
					return conf.resizing || conf.dragging;
				};
				/**
				 * Helper for inline postition and size.
				 * @return {string} Inline top, left, width, and height css properties
				 */
				$scope.getPositionAndSize = function () {
					if ($scope.grid) {
						return utils.getPositionAndSize (conf, $scope.grid);
					} else {
						// Because $scope.grid is not available on first load we return an empty string
						return '';
					}
				};

				////////////////////////////
				// Resizing functionality //
				////////////////////////////
				
				/**
				 * Listens to the mousedown event on the resizehandle, sets some state properies needed by resize and add mousemove and mouseupo event listeners
				 * @param {object} event Native mousedown event
				 */
				$scope.onResizeStart = function (event) {
					conf.resizing                = true;
					$scope.grid.resizeInProgress = true;
					resizeStartProps.pageX       = event.pageX;
					resizeStartProps.pageY       = event.pageY;
					resizeStartProps.xPos        = conf.xPos;
					resizeStartProps.yPos        = conf.yPos;
					resizeStartProps.xUnits      = conf.xUnits;
					resizeStartProps.yUnits      = conf.yUnits;
					resizeStartProps.uid         = conf.uid;
					utils.mirrorGridHighlighter($scope.gridHighlighter, conf);
					// Add event listeners for resizing
					$document.on("mousemove", function (event) {
						onResizeMove(event);
					});
					$document.on("mouseup", function (event) {
						onResizeDone(event);
					});
				};

				/**
				 * Triggered on mousemove after mousedown on a resizehandle. Resizes the grid highlighter on the grid.
				 * @param {object} event Native mousedown event
				 */
				function onResizeMove (event) {
					var xChange, yChange;
					// Only proceed when mousedown was triggered first
					if (!conf.resizing) {
						return false;
					}
					xChange     = event.pageX - resizeStartProps.pageX; 
					yChange     = event.pageY - resizeStartProps.pageY;
					conf.xUnits = resizeStartProps.xUnits + (xChange / $scope.grid.unitWidthInPx);
					conf.yUnits = resizeStartProps.yUnits + (yChange / $scope.grid.unitHeightInPx);
					resizeHighlighterInGrid(event);
					// ResizeHighlighterInGrid will switch the placeAllowed to false if the module becomes smaller than its minimal size
					// So we only check for overlap if this is not the case
					if ($scope.grid.placeAllowed) {
						$scope.grid.placeAllowed = !utils.checkForOverlap($scope.gridHighlighter, $scope.grid.units);
					}
					$scope.$apply();
				}

				/**
				 * Triggered on mouseup after mousedown on a resizehandle. Resizes a module on the grid or returns it to the original size
				 * @param {object} event Native mousedown event
				 */
				function onResizeDone (event) {
					// Remove event listeners that were added before
					$document.off('mousemove');
					$document.off('mouseup');
					conf.resizing                = false;
					$scope.grid.resizeInProgress = false;
					if ($scope.grid.placeAllowed) {
						utils.placeOnGridHighlighter(conf, $scope.gridHighlighter);
						utils.setGridItemsForModule(conf, $scope.grid.units, resizeStartProps);
					} else {
						// Revert back to original size
						conf.xUnits = resizeStartProps.xUnits;
						conf.yUnits = resizeStartProps.yUnits;
					}
					$scope.$apply();
				}
				/**
				 * Helper for the onResizeMove function, does the actual resizing
				 */
				function resizeHighlighterInGrid () {
					if ($scope.gridHighlighter.xPos + conf.xUnits - 1 <= $scope.grid.xUnits && conf.xUnits >= conf.xMinSize) {
						$scope.gridHighlighter.xUnits = Math.round(conf.xUnits);
					}
					if ($scope.gridHighlighter.yPos + conf.yUnits - 1 <= $scope.grid.yUnits && conf.yUnits >= conf.yMinSize) {
						$scope.gridHighlighter.yUnits = Math.round(conf.yUnits);
					}
					if (Math.round(conf.xUnits) < conf.xMinSize || Math.round(conf.yUnits) < conf.yMinSize) {
						$scope.grid.placeAllowed = false;
					} else {
						$scope.grid.placeAllowed = true;
					}
				}

				/**
				 * Check if there is a config property in place with the proper child properties. If not creare defaults
				 */
				function initializeModuleProperties () {
					var moduleConf;
					// Create the config properties if they don't exist yet
					$scope.module[$scope.configPropertyName] = $scope.module[$scope.configPropertyName] || {};
					// Create a shorthand
					moduleConf = $scope.module[$scope.configPropertyName];
					// Check all properties and give a default value if undefined
					moduleConf.xPos     = moduleConf.xPos     || 1;
					moduleConf.yPos     = moduleConf.yPos     || 1;
					moduleConf.xUnits   = moduleConf.xUnits   || 1;
					moduleConf.yUnits   = moduleConf.yUnits   || 1;
					moduleConf.xMinSize = moduleConf.xMinSize || 1;
					moduleConf.yMinSize = moduleConf.yMinSize || 1;
					moduleConf.dragging = moduleConf.dragging || false;
					moduleConf.resizing = moduleConf.resizing || false;
				}
			}]
		};
	});