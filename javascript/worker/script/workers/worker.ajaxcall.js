/* Worker File - LazyLoad - source: http://toddmotto.com/echo-js-simple-javascript-image-lazy-loading/ */
self.addEventListener('message', function(e){
	self.postMessage(e.data);
}, false);