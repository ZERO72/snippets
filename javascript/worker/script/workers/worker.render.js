

self.addEventListener('message', function(e) {

	var test = render.init(e.data);

  	



}, false);



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


		postMessage(outputted);
		//return outputted;




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

