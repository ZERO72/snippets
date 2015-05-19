# Read more about app structure at http://docs.appgyver.com

module.exports =

  # See styling options for tabs and other native components in app/common/native-styles/ios.css or app/common/native-styles/android.css
  tabs: [
    {
      title: "Latest"
      id: "latest"
      location: "posts#overview" # Supersonic module#view type navigation
      badge: "1"
    }
    {
      title: "Zoek"
      id: "search"
      location: "posts#career" # Supersonic module#view type navigation
    }
    {
      title: "Trending"
      id: "trending"
      location: "posts#style" # Supersonic module#view type navigation
    }
    {
      title: "Meer"
      id: "more"
      location: "sidemenu#drawer" # Supersonic module#view type navigation
    }
  ]

  # rootView:
  #   location: "example#getting-started"

  preloads: [
    {
      id: "posts"
      location: "posts#detail"
    }
    {
      id: "using-the-scanner"
      location: "example#using-the-scanner"
    }
  ]

  drawers:
    right:
      id: "leftDrawer"
      location: "sidemenu#drawer"
      showOnAppLoad: false
    options:
      animation: "parallax"
  #
  # initialView:
  #   id: "initialView"
  #   location: "example#initial-view"
