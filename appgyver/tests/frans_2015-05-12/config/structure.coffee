# Read more about app structure at http://docs.appgyver.com

module.exports =

  # See styling options for tabs and other native components in app/common/native-styles/ios.css or app/common/native-styles/android.css
  tabs: [
    {
      title: "Index"
      id: "index"
      location: "dashboard#index" # Supersonic module#view type navigation
    }
    {
      title: "Photo"
      id: "photo"
      location: "example#getting-started"
    }
    {
      title: "Settings"
      id: "settings"
      location: "example#settings"
    }
  ]

  # rootView:
  #   location: "example#getting-started"

  preloads: [
    {
      id: "dashboard"
      location: "dashboard#detail"
    }
    {
      id: "learn-more"
      location: "example#learn-more"
    }
  ]

  # drawers:
  #   left:
  #     id: "leftDrawer"
  #     location: "example#drawer"
  #     showOnAppLoad: false
  #   options:
  #     animation: "swingingDoor"
  #
  # initialView:
  #   id: "initialView"
  #   location: "example#initial-view"
