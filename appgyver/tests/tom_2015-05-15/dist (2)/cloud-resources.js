if (window.ag == null) {
  window.ag = {};
}
window.ag.data = {
  "options": {
    "baseUrl": "https://rest-api.appgyver.com/v2/",
    "headers": {
      "steroidsApiKey": "95c3ba01cf3ad32c1e197638ac4b66e84d6af38713688d0f575ec87f0ab16eea",
      "steroidsAppId": 55176
    }
  },
  "resources": {
    "Post": {
      "schema": {
        "fields": {
          "status": {
            "type": "string"
          },
          "count": {
            "type": "integer"
          },
          "count_total": {
            "type": "integer"
          },
          "pages": {
            "type": "integer"
          },
          "posts": {
            "type": "array"
          },
          "query": {
            "type": "object"
          },
          "": {
            "type": "string",
            "identity": true
          }
        },
        "identifier": ""
      }
    }
  }
};