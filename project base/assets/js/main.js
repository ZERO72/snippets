var itemsLoaded = true; // if data/video's are loaded

$(function(){

	// instantiate FastClick on the body
	FastClick.attach(document.body);

	$(".lazy").lazyload({
		container: $(".items"),
		effect : "fadeIn",
		threshold : 200
	});


});