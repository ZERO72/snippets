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
      title: "EPG"
      id: "epg"
      location: "epg#overview" # Supersonic module#view type navigation
    }
    {
      title: "Activiteit"
      id: "activity"
      location: "posts#activity" # Supersonic module#view type navigation
    }
    {
      title: "Meer"
      id: "more"
      location: "posts#more" # Supersonic module#view type navigation
    }
  ]

  # rootView:
  #   location: "example#getting-started"

  preloads: [
    {
      id: "posts-overview"
      location: "posts#overview"
    }
    {
      id: "posts-detail"
      location: "posts#detail"
    }
    {
      id: "epg-overview"
      location: "epg#overview"
    }
  ]

  drawers:
    left:
      id: "leftDrawer"
      location: "menu#menu"
      showOnAppLoad: false
      overrideBackButton: true
    options:
      animation: "parallax"     

  #
  # initialView:
  #   id: "initialView"
  #   location: "example#initial-view"
