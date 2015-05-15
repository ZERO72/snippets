/* Main JS file for WebWorker Test */


var pageIndex = 1;

var workerRender = new Worker('script/workers/worker.render.js');

	workerRender.addEventListener('message', function(e) {

	  			//console.log('WorkerRender said: ', e.data);

	  			$('#content-box').append(e.data);
				
	}, false);




$(document).ready(function() {


	$('.btn-get').click(function() {

		var kick = $(this).attr('data-kick');

		data.getNext(kick);
	});


var data = {

	init:function() {

		// get data

	},

	getNext:function(kick) {

		var randomnumber = Math.floor(Math.random() * (1000000 - 1 + 1)) + 1;

		var url = 'data/page'+pageIndex+'.json?var='+randomnumber;

		jQuery.getJSON( url, function( data ) {

			var posts = data.posts;

			// TEST THESE TWO FUNCTIONS
			if (kick == 'worker') {
				workerRender.postMessage(posts);
			} else {
				render.init(posts);
			}

			if (pageIndex == 2 ) {
				pageIndex = 1;
			} else {
				pageIndex++;
			}

		});

	}

}

var render = {

	init:function(data) {

		var self = this;

		var outputted;

		for ( var keys in data) {

			var key = keys;
			var val = data[key];

			var output = self.template(key,val);

			outputted += output;

			for ( var keys in data) {

				var key = keys;
				var val = data[key];

				var output = self.template(key,val);

				for ( var keys in data) {

					var key = keys;
					var val = data[key];

					var output = self.template(key,val);


					for ( var keys in data) {

						var key = keys;
						var val = data[key];

						var output = self.template(key,val);

						for ( var keys in data) {

							var key = keys;
							var val = data[key];

							var output = self.template(key,val);

							for ( var keys in data) {

								var key = keys;
								var val = data[key];

								var output = self.template(key,val);

							};

						};


					};

				};

			};

		};



		$('#content-box').append(outputted);


	},

	template:function(key,val) {

		var self = this;

		var img = self.image(key,val);

		var template = '<article><h3>' + val.title + '</h3>' + img + '</article>';

		return template;

	},

	image:function (key,val) {

		var imgId;
		var imgLink;
		var img;

		// Check if has custom field image
		if (val.custom_fields.img_src[0]) {
			 imgId = val.custom_fields.img_src[0];
			if (val.attachments[0]) {
				// Loop through attachements to find the matching id of imgId
				for (var key in val.attachments) {
				  
					if (val.attachments[key].id == imgId) {
						imgLink = val.attachments[key].images.medium.url;
					} 
				}

				img = "<a class='ctn' href='"+val.url+"'><img src='"+imgLink+"' />"+ +"</a>";

			}
		}

		return img;

	}

}




});






var workerAjaxCall = new Worker('script/workers/worker.ajaxcall.js');
	
	workerAjaxCall.addEventListener('message', function(e){
		console.log("worker said: ", e.data);
	}, false);

	var data = {
		"url" : "http://37.34.57.162/~mpdev/api/get_posts/?page=1",
 		"msg" : "hello world"
	};

	workerAjaxCall.postMessage(data); // Start the worker.
