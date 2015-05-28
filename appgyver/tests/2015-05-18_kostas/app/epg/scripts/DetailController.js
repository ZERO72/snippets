angular.module('epg').controller('DetailController', function($scope, supersonic, article, $sce) {

	// Window message from index.html to prefill the template with data before doing any calls.
	window.addEventListener("message", function(msg) {

		$scope.busy = false;

		if(msg.data.type == "posts"){
			console.log(msg.data);
			$scope.busy = true;
			$scope.id = msg.data.message.id;
			$scope.title = $sce.trustAsHtml(msg.data.message.title);
			$scope.featured_img = msg.data.message.featuredImage;
			$scope.content = "";
			$scope.$apply();

			var post_data = article.query({ id: $scope.id}, function(data) {
				// use the factory calls to get Ajax data
				$scope.content = $sce.trustAsHtml(data.post.content);


				$scope.$apply();
				$scope.busy = false;

				// Put the object into storage to create an in app Cache system where you can render from.
				// localStorage.setItem('posts', JSON.stringify(data.posts));
			});
		}

	});

});

// Data Post 
// $promise: Object
// $resolved: true
// post: Object
// attachments: Array[1]
// author: Object
// categories: Array[3]
// comment_count: 0
// comment_status: "closed"
// comments: Array[0]
// content: "<p><strong>Ken je <em>Limitless</em> nog uit 2011? Die ene waarin Bradley Cooper een speciale pil neemt en daarna 100 procent van zijn hersencapaciteit kan gebruiken. Verrassend leuke film en daar komt nu een tv-serie van. Waar de meeste van dit soort <em>cash cows </em>zijn gedoemd om te mislukken, zou het met deze nog wel eens kunnen lukken. Zelfs Cooper doet mee.</strong></p>↵<p>Oké, niet in alle afleveringen, de hoofdrol is voor Jake McDorman, maar Cooper komt regelmatig opdagen. En Jennifer Carpenter &#8211; je weet wel Michael C. Hall&#8217;s zus in <em>Dexter </em>- speelt ook een grote rol.</p>↵<p>In de serie speelt McDorman Brian Finch. Finch slikt de drug NZT en krijgt toegang over 100 procent van z&#8217;n hersencapaciteit. Hij gaat voor de overheid werken, maar is tegelijkertijd een dubbelagent voor Bradley Cooper&#8217;s karakter Eddie Morra die intussen senator is.</p>↵<p>Ziet eruit als iets dat best wel eens lekker kan wegkijken. In de VS is <em>Limitless </em>vanaf september op tv, hier waarschijnlijk dit najaar.</p>↵"
// custom_fields: Object
// date: "2015-05-14 10:37:51"
// excerpt: "<p>Ken je Limitless nog uit 2011? Die ene waarin Bradley Cooper een speciale pil neemt en..</p>↵"
// id: 40751
// modified: "2015-05-14 10:37:51"
// slug: "bradley-coopers-limitless-nu-tv-serie"
// status: "publish"
// tags: Array[0]
// title: "Bradley Cooper&#8217;s Limitless nu tv-serie"
// title_plain: "Bradley Cooper&#8217;s Limitless nu tv-serie"
// type: "post"
// url: "http://www.madpac.nl/entertainment/bradley-coopers-limitless-nu-tv-serie/"
// __proto__: Object
// previous_url: "http://www.madpac.nl/entertainment/blatter-mijdt-vs-om-fbi/"
// status: "ok"