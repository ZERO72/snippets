/* Worker File - LazyLoad - source: http://toddmotto.com/echo-js-simple-javascript-image-lazy-loading/ */
var windowElement, documentEl;

self.addEventListener('message', function(e){
  windowElement = e.data.windowElement;
  documentEl = e.data.documentEl;
	self.postMessage(e.data.msg);
}, false);

windowElement.echo = (function (windowElement, documentEl) {

  'use strict';

  /*
   * Constructor function
   */
  var Echo = function (elem) {
    this.elem = elem;
    this.render();
    this.listen();
  };

  /*
   * Images for echoing
   */
  var echoStore = [];
  
  /*
   * Element in viewport logic
   */
  var scrolledIntoView = function (element) {
    var coords = element.getBoundingClientRect();
    return ((coords.top >= 0 && coords.left >= 0 && coords.top) <= (windowElement.innerHeight || documentEl.documentElement.clientHeight));
  };

  /*
   * Changing src attr logic
   */
  var echoSrc = function (img, callback) {
    img.src = img.getAttribute('data-echo');
    if (callback) {
      callback();
    }
  };

  /*
   * Remove loaded item from array
   */
  var removeEcho = function (element, index) {
    if (echoStore.indexOf(element) !== -1) {
      echoStore.splice(index, 1);
    }
  };

  /*
   * Echo the images and callbacks
   */
  var echoImages = function () {
    for (var i = 0; i < echoStore.length; i++) {
      var self = echoStore[i];
      if (scrolledIntoView(self)) {
        echoSrc(self, removeEcho(self, i));
      }
    }
  };

  /*
   * Prototypal setup
   */
  Echo.prototype = {
    init : function () {
      echoStore.push(this.elem);
    },
    render : function () {
      if (documentEl.addEventListener) {
        documentEl.addEventListener('DOMContentLoaded', echoImages, false);
      } else {
        windowElement.onload = echoImages;
      }
    },
    listen : function () {
      windowElement.onscroll = echoImages;
    }
  };

  /*
   * Initiate the plugin
   */
  var lazyImgs = documentEl.querySelectorAll('img[data-echo]');
  for (var i = 0; i < lazyImgs.length; i++) {
    new Echo(lazyImgs[i]).init();
  }

})(windowElement, documentEl);