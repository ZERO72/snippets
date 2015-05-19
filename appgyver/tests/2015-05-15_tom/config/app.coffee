# Read more about app configs at http://docs.appgyver.com

module.exports =
  app:
    name: "Instawall"

  # steroidsAppId and steroidsApiKey headers are required by Supersonic Data
  # network:
  #   extraResponseHeaders:
  #     "Access-Control-Allow-Origin": "*"
  #     "Access-Control-Allow-Headers": "Content-Type, X-Requested-With, steroidsAppId, steroidsApiKey"

  webView:
    viewsIgnoreStatusBar: false
    enableDoubleTapToFocus: false
    disableOverscroll: false
    enableViewportScale: false
    enablePopGestureRecognition: true
    allowInlineMediaPlayback: true
    backgroundColor:0xff0000ff

  # Applies on iOS only
  statusBar:
    enabled: true
    style: "default"
