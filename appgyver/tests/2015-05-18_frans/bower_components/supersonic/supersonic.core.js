/**
 * supersonic
 * Version: 1.5.2
 * Published: 2015-05-08
 * Homepage: https://github.com/AppGyver/supersonic
 * License: MIT
 */
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function() {
  var Promise;

  Promise = require('bluebird');

  module.exports = function() {
    var storage;
    storage = {};
    return {
      getItem: function(key) {
        return Promise.resolve(storage[key]);
      },
      setItem: function(key, value) {
        storage[key] = value;
        return Promise.resolve();
      },
      removeItem: function(key) {
        storage[key] = null;
        return Promise.resolve();
      }
    };
  };

}).call(this);

},{"bluebird":166}],2:[function(require,module,exports){
(function() {
  var Promise;

  Promise = require('bluebird');

  module.exports = function(namespace, storage, time) {
    var computeIfAbsent, computeUnlessValid, debug, invalidateIfSuccessful, isValidMeta, keyWithNamespace, metadataKeyForIndex, prop, set;
    debug = require('debug')("ag-data:cached-property:" + namespace);
    if (time == null) {
      time = function() {
        return (new Date()).getTime();
      };
    }
    keyWithNamespace = function(key) {
      return "" + namespace + "(" + (JSON.stringify(key || null)) + ")";
    };
    metadataKeyForIndex = function(index) {
      return "" + index + "[meta]";
    };
    isValidMeta = function(metadata, options) {
      var lifetime;
      if ((options != null ? options.timeToLive : void 0) == null) {
        return false;
      }
      if ((metadata != null ? metadata.lastUpdated : void 0) == null) {
        return false;
      }
      lifetime = time() - metadata.lastUpdated;
      return lifetime < options.timeToLive;
    };
    computeIfAbsent = function(index) {
      return function(compute) {
        return storage.getItem(index).then(function(value) {
          if (value != null) {
            return value;
          } else {
            debug("" + index + " is absent, computing...");
            return Promise.resolve(compute()).then(set(index));
          }
        });
      };
    };
    computeUnlessValid = function(index, timeToLive) {
      return function(compute) {
        return storage.getItem(metadataKeyForIndex(index)).then(function(metadata) {
          if (isValidMeta(metadata, {
            timeToLive: timeToLive
          })) {
            return storage.getItem(index);
          } else {
            debug("" + index + " is invalid, computing...");
            return Promise.resolve(compute()).then(set(index));
          }
        });
      };
    };
    set = function(index) {
      return function(value) {
        return storage.setItem(index, value).then(function() {
          return storage.setItem(metadataKeyForIndex(index), {
            lastUpdated: time()
          }).then(function() {
            return value;
          });
        });
      };
    };
    invalidateIfSuccessful = function(index) {
      return function(operation) {
        return Promise.resolve(operation()).then(function(result) {
          return storage.removeItem(metadataKeyForIndex(index)).then(function() {
            debug("" + index + " invalidated");
            return result;
          });
        });
      };
    };
    prop = function(key, options) {
      var index, timeToLive, _ref;
      index = keyWithNamespace(key);
      timeToLive = (_ref = options != null ? options.timeToLive : void 0) != null ? _ref : 10000;
      return {
        computeIfAbsent: computeIfAbsent(index),
        computeUnlessValid: computeUnlessValid(index, timeToLive),
        set: set(index),
        invalidateIfSuccessful: invalidateIfSuccessful(index),
        timeToLive: timeToLive
      };
    };
    return {
      prop: prop,
      namespace: namespace,
      storage: storage,
      time: time
    };
  };

}).call(this);

},{"bluebird":166,"debug":69}],3:[function(require,module,exports){
(function() {
  var buildModelClass, configureResourceFeatures, data, defaultLoader, restful;

  restful = require('ag-restful')(require('bluebird'));

  defaultLoader = require('ag-resource-loader-json')(restful);

  buildModelClass = require('./model/build-model-class');

  configureResourceFeatures = require('./resource/configure-features')(restful);

  module.exports = data = {
    storages: {
      memory: require('./cache/async-key-value-storage')
    },
    loadResourceBundle: function(object) {
      var bundle;
      bundle = defaultLoader.loadResourceBundle(object);
      return {
        createModel: function(resourceName, options) {
          var resource;
          if (options == null) {
            options = {};
          }
          resource = bundle.createResource(resourceName);
          return data.createModel(resource, options);
        }
      };
    },
    createModel: function(resource, options) {
      if (options == null) {
        options = {};
      }
      resource = configureResourceFeatures(resource, options);
      return buildModelClass(resource, options);
    }
  };

}).call(this);

},{"./cache/async-key-value-storage":1,"./model/build-model-class":4,"./resource/configure-features":10,"ag-resource-loader-json":12,"ag-restful":38,"bluebird":166}],4:[function(require,module,exports){
(function() {
  module.exports = function(resource, defaultRequestOptions) {
    var Model, ModelOps, ResourceGateway;
    ModelOps = require('./model-ops')(resource);
    Model = (function() {
      function Model(data) {
        Object.defineProperties(this, ModelOps.modelInstanceProperties(data));
      }

      return Model;

    })();
    ResourceGateway = require('./resource-gateway')(resource, ModelOps, Model, defaultRequestOptions);
    Object.defineProperties(Model, ModelOps.modelClassProperties(ResourceGateway));
    Object.defineProperties(Model.prototype, ModelOps.modelPrototypeProperties(ResourceGateway));
    return Model;
  };

}).call(this);

},{"./model-ops":7,"./resource-gateway":8}],5:[function(require,module,exports){
(function() {
  var Bacon, Promise, deepEqual,
    __slice = [].slice;

  Promise = require('bluebird');

  Bacon = require('baconjs');

  deepEqual = require('deep-equal');

  module.exports = function(defaultInterval) {
    var fromPromiseF;
    if (defaultInterval == null) {
      defaultInterval = 10000;
    }
    fromPromiseF = function(target) {
      return {
        follow: function() {
          var args, options, shouldUpdate, updates, whenChanged, _i, _ref, _ref1;
          args = 2 <= arguments.length ? __slice.call(arguments, 0, _i = arguments.length - 1) : (_i = 0, []), options = arguments[_i++];
          if (options == null) {
            options = {};
          }
          shouldUpdate = (_ref = options.poll) != null ? _ref : Bacon.interval((_ref1 = options.interval) != null ? _ref1 : defaultInterval, true).startWith(true);
          updates = shouldUpdate.flatMapFirst(function() {
            return Bacon.fromPromise(Promise.resolve(target.apply(null, args)));
          });
          whenChanged = function(listen) {
            var _ref2;
            return updates.skipDuplicates((_ref2 = options.equals) != null ? _ref2 : deepEqual).onValue(listen);
          };
          return {
            updates: updates,
            whenChanged: whenChanged,
            target: target
          };
        }
      };
    };
    return {
      defaultInterval: defaultInterval,
      fromPromiseF: fromPromiseF
    };
  };

}).call(this);

},{"baconjs":165,"bluebird":166,"deep-equal":167}],6:[function(require,module,exports){
(function() {
  var deepEqual, jsonableEquality;

  deepEqual = require('deep-equal');

  module.exports = jsonableEquality = function(self) {
    return function(other) {
      try {
        return deepEqual(self.toJson(), other.toJson());
      } catch (_error) {
        return false;
      }
    };
  };

}).call(this);

},{"deep-equal":167}],7:[function(require,module,exports){
(function() {
  var Promise, jsonableEquality, objectSize;

  Promise = require('bluebird');

  jsonableEquality = require('./jsonable-equality');

  objectSize = function(o) {
    return Object.keys(o || {}).length;
  };

  module.exports = function(resource) {
    var ModelOps;
    return ModelOps = {
      modelClassProperties: function(ResourceGateway) {
        var key, props, value, _fn;
        props = {
          resource: {
            enumerable: true,
            get: function() {
              return resource;
            }
          },
          schema: {
            enumerable: true,
            get: function() {
              return {
                fields: resource.schema.fields,
                identifier: resource.schema.identifier
              };
            }
          }
        };
        _fn = function(key, value) {
          return props[key] = {
            enumerable: true,
            get: function() {
              return value;
            }
          };
        };
        for (key in ResourceGateway) {
          value = ResourceGateway[key];
          _fn(key, value);
        }
        return props;
      },
      modelPrototypeProperties: function(ResourceGateway) {
        return {
          save: {
            enumerable: false,
            get: function() {
              return ModelOps.save;
            }
          },
          "delete": {
            enumerable: false,
            get: function() {
              return ModelOps["delete"];
            }
          },
          whenChanged: {
            enumerable: false,
            get: function() {
              return function(f, options) {
                if (options == null) {
                  options = {};
                }
                return ResourceGateway.one(this.id, options).whenChanged(f);
              };
            }
          },
          equals: {
            enumerable: false,
            get: function() {
              return jsonableEquality(this);
            }
          },
          toJson: {
            enumerable: false,
            get: function() {
              return (function(_this) {
                return function() {
                  return _this.__data;
                };
              })(this);
            }
          }
        };
      },
      modelInstanceProperties: (function() {
        var addNonIdentifierProperties, createMetadata, makeIdentifierProperty, makeMetadataProperties;
        createMetadata = function(data) {
          return {
            __state: 'new',
            __data: data,
            __changed: {},
            __dirty: objectSize(data) > 0
          };
        };
        makeMetadataProperties = function(metadata) {
          var key, props, value, _fn;
          props = {};
          _fn = function(key) {
            return props[key] = {
              enumerable: false,
              get: function() {
                return metadata[key];
              },
              set: function(v) {
                return metadata[key] = v;
              }
            };
          };
          for (key in metadata) {
            value = metadata[key];
            _fn(key);
          }
          return props;
        };
        makeIdentifierProperty = function(identifierFieldName) {
          return {
            get: function() {
              var _ref;
              return (_ref = this.__data) != null ? _ref[identifierFieldName] : void 0;
            },
            enumerable: true
          };
        };
        addNonIdentifierProperties = function(props, fields, identifierFieldName) {
          var key, value;
          for (key in fields) {
            value = fields[key];
            if (key !== identifierFieldName) {
              (function(key) {
                return props[key] != null ? props[key] : props[key] = {
                  get: function() {
                    return this.__data[key];
                  },
                  set: function(v) {
                    this.__data[key] = v;
                    this.__dirty = true;
                    return this.__changed[key] = true;
                  },
                  enumerable: true
                };
              })(key);
            }
          }
          return props;
        };
        return function(data) {
          var metadata, props;
          metadata = createMetadata(data);
          props = makeMetadataProperties(metadata);
          if (resource.schema.identifier != null) {
            props.id = makeIdentifierProperty(resource.schema.identifier);
          }
          return addNonIdentifierProperties(props, resource.schema.fields, resource.schema.identifier);
        };
      })(),
      markAsPersisted: function(instance) {
        instance.__dirty = false;
        instance.__state = 'persisted';
        return null;
      },
      markAsDirty: function(instance) {
        var key, value, _ref;
        instance.__dirty = true;
        _ref = instance.__data;
        for (key in _ref) {
          value = _ref[key];
          if (key !== resource.schema.identifier) {
            instance.__changed[key] = true;
          }
        }
        return null;
      },
      markAsDeleted: function(instance) {
        instance.__state = 'deleted';
        if (resource.schema.identifier != null) {
          delete instance[resource.schema.identifier];
        }
        return null;
      },
      markAsNewed: function(instance, data) {
        instance.__data = data;
        instance.__dirty = false;
        instance.__changed = {};
        instance.__state = 'persisted';
        return null;
      },
      markAsSynced: function(instance, data) {
        instance.__data = data;
        instance.__dirty = false;
        instance.__changed = {};
        return null;
      },
      collectChanges: function(instance) {
        var changes, didChange, key, _ref;
        changes = {};
        _ref = instance.__changed;
        for (key in _ref) {
          didChange = _ref[key];
          if (didChange) {
            changes[key] = instance.__data[key];
          }
        }
        return changes;
      },
      save: function() {
        var changes;
        switch (this.__state) {
          case 'deleted':
            return Promise.reject(new Error("Will not save a deleted instance"));
          case 'new':
            return resource.create(this.__data).then((function(_this) {
              return function(data) {
                ModelOps.markAsNewed(_this, data);
                return _this;
              };
            })(this));
          case 'persisted':
            changes = this.__dirty ? ModelOps.collectChanges(this) : {};
            return resource.update(this.id, changes).then((function(_this) {
              return function(data) {
                ModelOps.markAsSynced(_this, data);
                return _this;
              };
            })(this));
        }
      },
      "delete": function() {
        switch (this.__state) {
          case 'deleted':
            return Promise.reject(new Error("Will not delete an instance that is already deleted"));
          case 'new':
            return Promise.reject(new Error("Will not delete an instance that is not persistent"));
          case 'persisted':
            return resource["delete"](this.id).then((function(_this) {
              return function() {
                ModelOps.markAsDeleted(_this);
                return _this;
              };
            })(this));
        }
      }
    };
  };

}).call(this);

},{"./jsonable-equality":6,"bluebird":166}],8:[function(require,module,exports){
(function() {
  var Bacon, Promise, defaultInterval, followable, jsonableEquality,
    __slice = [].slice;

  Promise = require('bluebird');

  Bacon = require('baconjs');

  jsonableEquality = require('./jsonable-equality');

  followable = require('./followable')(defaultInterval = 10000);

  module.exports = function(resource, ModelOps, Model, defaultRequestOptions) {
    var ResourceGateway;
    return ResourceGateway = (function() {
      var collectionFromPersistentStates, dynamifyCollection, instanceFromPersistentState;
      instanceFromPersistentState = function(state) {
        var instance;
        instance = new Model(state);
        ModelOps.markAsPersisted(instance);
        return instance;
      };
      collectionFromPersistentStates = function(states) {

        /*
        NOTE: Have to do manual decoration instead of extend/mixin because the signature is "array and then some"
        Subclassing array to extend behavior does not seem feasible, see e.g.
        http://perfectionkills.com/how-ecmascript-5-still-does-not-allow-to-subclass-an-array/
         */
        var collection, state;
        collection = (function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = states.length; _i < _len; _i++) {
            state = states[_i];
            _results.push(instanceFromPersistentState(state));
          }
          return _results;
        })();
        collection.save = function() {
          var item;
          return Promise.all((function() {
            var _i, _len, _results;
            _results = [];
            for (_i = 0, _len = this.length; _i < _len; _i++) {
              item = this[_i];
              _results.push(item.save());
            }
            return _results;
          }).call(this));
        };
        collection.equals = jsonableEquality(collection);
        collection.toJson = function() {
          var item, _i, _len, _results;
          _results = [];
          for (_i = 0, _len = collection.length; _i < _len; _i++) {
            item = collection[_i];
            _results.push(item.toJson());
          }
          return _results;
        };
        return collection;
      };
      dynamifyCollection = function(query) {
        return function(collection) {
          collection.whenChanged = function(f, options) {
            if (options == null) {
              options = {};
            }
            return ResourceGateway.all(query, options).whenChanged(f);
          };
          return collection;
        };
      };
      return {
        find: function(id) {
          return resource.find(id).then(instanceFromPersistentState);
        },
        findAll: function(query) {
          if (query == null) {
            query = {};
          }
          return resource.findAll(query).then(collectionFromPersistentStates).then(dynamifyCollection(query));
        },
        all: function(query, options) {
          if (options == null) {
            options = {};
          }
          if (options.equals == null) {
            options.equals = function(left, right) {
              return left != null ? typeof left.equals === "function" ? left.equals(right) : void 0 : void 0;
            };
          }
          return followable.fromPromiseF(function() {
            return ResourceGateway.findAll(query);
          }).follow(options);
        },

        /*
        NOTE: Code smell, looks like copy paste from all()
         */
        one: function(id, options) {
          if (options == null) {
            options = {};
          }
          if (options.equals == null) {
            options.equals = function(left, right) {
              return left != null ? typeof left.equals === "function" ? left.equals(right) : void 0 : void 0;
            };
          }
          return followable.fromPromiseF(function() {
            return ResourceGateway.find(id);
          }).follow(options);
        },
        options: (function() {
          if (typeof resource.setOptions === "function") {
            resource.setOptions(defaultRequestOptions);
          }
          return (typeof resource.getOptions === "function" ? resource.getOptions() : void 0) || {};
        })(),
        fromJson: function(json) {
          var instance;
          instance = instanceFromPersistentState(json);
          ModelOps.markAsDirty(instance);
          return instance;
        },
        create: function() {
          var args;
          args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
          return resource.create.apply(resource, args).then(instanceFromPersistentState);
        },
        update: function() {
          var args;
          args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
          return resource.update.apply(resource, args).then(instanceFromPersistentState);
        }
      };
    })();
  };

}).call(this);

},{"./followable":5,"./jsonable-equality":6,"baconjs":165,"bluebird":166}],9:[function(require,module,exports){
(function() {
  var Bacon, Promise, asyncKeyValueStorage, decorateWithCaching, propertyCache,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  Bacon = require('baconjs');

  Promise = require('bluebird');

  asyncKeyValueStorage = require('../cache/async-key-value-storage');

  propertyCache = require('../cache/property-cache');

  module.exports = decorateWithCaching = function(resource, options) {
    var CachedResource, collectionCache, debug, instanceCache, storage, timeToLive;
    if (options == null) {
      options = {};
    }
    debug = require('debug')("ag-data:resource:caching:" + resource.name);
    timeToLive = (function() {
      switch (false) {
        case options.timeToLive == null:
          return options.timeToLive;
        default:
          return 10000;
      }
    })();
    storage = (function() {
      switch (false) {
        case options.storage == null:
          return options.storage;
        default:
          return asyncKeyValueStorage();
      }
    })();
    collectionCache = propertyCache("collections-" + resource.name, storage);
    instanceCache = propertyCache("records-" + resource.name, storage);
    debug("Resource '" + resource.name + "' cache configured:", {
      timeToLive: timeToLive,
      collectionCacheNamespace: collectionCache.namespace,
      instanceCacheNamespace: instanceCache.namespace
    });
    return CachedResource = (function(_super) {
      __extends(CachedResource, _super);

      function CachedResource() {
        return CachedResource.__super__.constructor.apply(this, arguments);
      }

      CachedResource.find = function(id) {
        return instanceCache.prop(id, {
          timeToLive: timeToLive
        }).computeUnlessValid(function() {
          return resource.find(id);
        });
      };

      CachedResource.findAll = function(query) {
        if (query == null) {
          query = {};
        }
        return collectionCache.prop(query, {
          timeToLive: timeToLive
        }).computeUnlessValid(function() {
          return resource.findAll(query).then(function(collection) {
            var item, _i, _len;
            if (resource.schema.identifier != null) {
              for (_i = 0, _len = collection.length; _i < _len; _i++) {
                item = collection[_i];
                if (item[resource.schema.identifier] != null) {
                  instanceCache.prop(item[resource.schema.identifier]).set(item);
                }
              }
            }
            return collection;
          });
        });
      };

      CachedResource.update = function() {
        var id, rest;
        id = arguments[0], rest = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        return collectionCache.prop({}).invalidateIfSuccessful(function() {
          return instanceCache.prop(id).invalidateIfSuccessful(function() {
            return resource.update.apply(resource, [id].concat(__slice.call(rest)));
          });
        });
      };

      CachedResource.create = function() {
        var args;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        return collectionCache.prop({}).invalidateIfSuccessful(function() {
          return resource.create.apply(resource, args);
        });
      };

      CachedResource["delete"] = function(id) {
        return collectionCache.prop({}).invalidateIfSuccessful(function() {
          return instanceCache.prop(id).invalidateIfSuccessful(function() {
            return resource["delete"](id);
          });
        });
      };

      CachedResource.cache = {
        collectionCache: collectionCache,
        instanceCache: instanceCache,
        timeToLive: timeToLive,
        storage: storage
      };

      return CachedResource;

    })(resource);
  };

}).call(this);

},{"../cache/async-key-value-storage":1,"../cache/property-cache":2,"baconjs":165,"bluebird":166,"debug":69}],10:[function(require,module,exports){
(function() {
  module.exports = function(restful) {
    var decorateWithCaching, decorateWithFileFieldSupport, hasFileFields;
    decorateWithCaching = require('./caching');
    decorateWithFileFieldSupport = require('./file-fields')(restful.http);
    hasFileFields = function(resource) {
      var description, fieldName, _ref;
      _ref = resource.schema.fields;
      for (fieldName in _ref) {
        description = _ref[fieldName];
        if (description.type === 'file') {
          return true;
        }
      }
      return false;
    };

    /*
    Decorate the given resource with extra features:
    - caching is enabled given a config flag in options
    TODO: - file uploads are enabled given a file-typed field in the resource schema
     */
    return function(resource, options) {
      var _ref;
      if (options != null ? (_ref = options.cache) != null ? _ref.enabled : void 0 : void 0) {
        resource = decorateWithCaching(resource, options.cache);
        delete options.cache;
      }
      if (hasFileFields(resource)) {
        resource = decorateWithFileFieldSupport(resource);
      }
      return resource;
    };
  };

}).call(this);

},{"./caching":9,"./file-fields":11}],11:[function(require,module,exports){
(function (Buffer){
(function() {
  var Promise, Transaction, cloneDeep, getExtension,
    __slice = [].slice,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  cloneDeep = require('lodash-node/modern/lang/cloneDeep');

  Promise = require('bluebird');

  Transaction = require('ag-transaction')(Promise);

  getExtension = function(filename) {
    var init, last, _i, _ref;
    _ref = (filename || '').split("."), init = 2 <= _ref.length ? __slice.call(_ref, 0, _i = _ref.length - 1) : (_i = 0, []), last = _ref[_i++];
    return last;
  };

  module.exports = function(http) {
    var decorateWithFileFieldSupport;
    return decorateWithFileFieldSupport = function(resource) {
      var FileFieldSupport, amendDataWithFileUploadUrlRequests, createTransaction, debug, discoverUnuploadedFileFields, doUploadsByInstructions, transactional, updateFinalState, updateTransaction, uploadTransaction, withFileFieldSupport;
      debug = require('debug')("ag-data:resource:file-fields:" + resource.name);
      transactional = {
        create: function(data) {
          return Transaction.step(function() {
            return resource.create(data);
          });
        },
        update: function(id, data) {
          return Transaction.step(function() {
            return resource.update(id, data);
          });
        }
      };
      withFileFieldSupport = function(f) {
        return function() {
          var args, data, dataWithUploadUrlRequests, fieldsToUpload, run, _ref;
          args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
          _ref = f.apply(null, args), data = _ref.data, run = _ref.run;
          fieldsToUpload = discoverUnuploadedFileFields(data);
          if (fieldsToUpload.length === 0) {
            return run(data);
          } else {
            dataWithUploadUrlRequests = amendDataWithFileUploadUrlRequests(data, fieldsToUpload);
            return run(dataWithUploadUrlRequests).flatMapDone(doUploadsByInstructions(data, fieldsToUpload)).flatMapDone(updateFinalState);
          }
        };
      };
      createTransaction = withFileFieldSupport(function(data) {
        return {
          data: data,
          run: transactional.create
        };
      });
      updateTransaction = withFileFieldSupport(function(id, data) {
        return {
          data: data,
          run: function(data) {
            return transactional.update(id, data);
          }
        };
      });
      discoverUnuploadedFileFields = (function() {
        var getFileFieldNames, isUnuploadedFile;
        getFileFieldNames = function(fields) {
          var description, fieldName, _results;
          _results = [];
          for (fieldName in fields) {
            description = fields[fieldName];
            if (description.type === 'file') {
              _results.push(fieldName);
            }
          }
          return _results;
        };
        isUnuploadedFile = function(field) {
          return (field != null) && (field.toString() !== "[object Object]");
        };
        return function(data) {
          var fileFieldName, _i, _len, _ref, _results;
          _ref = getFileFieldNames(resource.schema.fields);
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            fileFieldName = _ref[_i];
            if (isUnuploadedFile(data[fileFieldName])) {
              _results.push(fileFieldName);
            }
          }
          return _results;
        };
      })();
      amendDataWithFileUploadUrlRequests = (function() {
        var addRequestFileUploadUrlFlag;
        addRequestFileUploadUrlFlag = function(data, fieldName) {
          if (data.__files == null) {
            data.__files = {};
          }
          data.__files[fieldName] = false;
          if (data[fieldName].name != null) {
            return data[fieldName] = {
              extension: getExtension(data[fieldName].name)
            };
          }
        };
        return function(data, fieldsToUpload) {
          var fileFieldName, _i, _len;
          data = cloneDeep(data);
          for (_i = 0, _len = fieldsToUpload.length; _i < _len; _i++) {
            fileFieldName = fieldsToUpload[_i];
            addRequestFileUploadUrlFlag(data, fileFieldName);
          }
          return data;
        };
      })();
      uploadTransaction = function(uploadUrl, file) {
        return http.transactional.request('put', uploadUrl, {
          type: 'application/octet-stream',
          data: (function() {
            switch (true) {
              case Buffer.isBuffer(file):
                return file.toString();
              default:
                return file;
            }
          })()
        });
      };
      doUploadsByInstructions = (function() {
        var extractFileUploadUrls;
        extractFileUploadUrls = function(fieldsToUpload, resultWithUploadInstructions) {
          var fieldName, uploadUrls, value;
          uploadUrls = {};
          for (fieldName in resultWithUploadInstructions) {
            value = resultWithUploadInstructions[fieldName];
            if (!((__indexOf.call(fieldsToUpload, fieldName) >= 0))) {
              continue;
            }
            if ((value != null ? value.upload_url : void 0) == null) {
              throw new Error("Missing upload url for field '" + fieldName + "'");
            }
            uploadUrls[fieldName] = value.upload_url;
          }
          return uploadUrls;
        };
        return function(data, fieldsToUpload) {
          return function(resultWithUploadInstructions) {
            var fileFieldName, uploadUrl, uploadUrlsByField, uploads;
            uploadUrlsByField = extractFileUploadUrls(fieldsToUpload, resultWithUploadInstructions);
            uploads = Transaction.unit(resultWithUploadInstructions);
            for (fileFieldName in uploadUrlsByField) {
              uploadUrl = uploadUrlsByField[fileFieldName];
              uploads = uploads.flatMapDone(function(result) {
                return uploadTransaction(uploadUrl, data[fileFieldName]).flatMapDone(function() {
                  debug("Completed upload for " + fileFieldName);
                  result[fileFieldName].uploaded = true;
                  return Transaction.unit(result);
                });
              });
            }
            return uploads;
          };
        };
      })();
      updateFinalState = function(result) {
        return transactional.update(result.id, result);
      };
      return FileFieldSupport = (function(_super) {
        __extends(FileFieldSupport, _super);

        function FileFieldSupport() {
          return FileFieldSupport.__super__.constructor.apply(this, arguments);
        }

        FileFieldSupport.upload = function(uploadUrl, file, transactionHandler) {
          if (transactionHandler == null) {
            transactionHandler = null;
          }
          return uploadTransaction(uploadUrl, file).run(function(t) {
            if (typeof transactionHandler === "function") {
              transactionHandler(t);
            }
            return t.done;
          });
        };

        FileFieldSupport.create = function(data, transactionHandler) {
          if (transactionHandler == null) {
            transactionHandler = null;
          }
          return createTransaction(data).run(function(t) {
            if (typeof transactionHandler === "function") {
              transactionHandler(t);
            }
            return t.done;
          });
        };

        FileFieldSupport.update = function(id, data, transactionHandler) {
          if (transactionHandler == null) {
            transactionHandler = null;
          }
          return updateTransaction(id, data).run(function(t) {
            if (typeof transactionHandler === "function") {
              transactionHandler(t);
            }
            return t.done;
          });
        };

        return FileFieldSupport;

      })(resource);
    };
  };

}).call(this);

}).call(this,require("buffer").Buffer)
},{"ag-transaction":64,"bluebird":166,"buffer":171,"debug":69,"lodash-node/modern/lang/cloneDeep":142}],12:[function(require,module,exports){
(function() {
  var validateResourceBundle;

  validateResourceBundle = require('./resource/bundle-type');

  module.exports = function(restful) {
    var buildResource;
    buildResource = require('./resource/build')(restful);
    return {
      loadResourceBundle: function(object) {
        return validateResourceBundle(object).fold(function(errors) {
          throw new Error("Object did not appear to be a valid resource bundle: " + (JSON.stringify(errors)));
        }, function(bundle) {
          return {
            createResource: buildResource(bundle)
          };
        });
      }
    };
  };

}).call(this);

},{"./resource/build":13,"./resource/bundle-type":14}],13:[function(require,module,exports){
(function() {
  var types;

  types = require('ag-types');

  module.exports = function(restful) {

    /*
    Builds a restful resource from a resource bundle given a resource name
     */
    return function(resourceBundle) {
      return function(resourceName) {
        var CollectionType, DeleteConfirmationType, ItemType, RequestType, pluralRootKey, resourceDescription, resourcePathById, resourceRootPath, singularRootKey;
        if ((resourceBundle != null ? resourceBundle.resources[resourceName] : void 0) == null) {
          throw new Error("Bundle does not define the resource '" + resourceName + "'");
        }
        resourceDescription = resourceBundle.resources[resourceName];
        singularRootKey = 'object';
        pluralRootKey = 'objects';
        CollectionType = types.Property(pluralRootKey, types.List(types.Any));
        ItemType = types.Property(singularRootKey, types.Any);
        RequestType = types.projections.Property(singularRootKey);
        DeleteConfirmationType = types.Any;
        resourceRootPath = function() {
          return "/" + resourceName;
        };
        resourcePathById = function(id) {
          return "/" + resourceName + "/" + id;
        };
        return restful({
          baseUrl: resourceBundle.options.baseUrl,
          headers: resourceBundle.options.headers
        }, function(api) {
          return {
            name: resourceName,
            schema: resourceDescription.schema,
            findAll: api.get({
              path: resourceRootPath,
              receive: api.response(CollectionType)
            }),
            find: api.get({
              path: resourcePathById,
              receive: api.response(ItemType)
            }),
            create: api.post({
              send: api.request(RequestType),
              path: resourceRootPath,
              receive: api.response(ItemType)
            }),
            update: api.put({
              send: api.request(RequestType),
              path: resourcePathById,
              receive: api.response(ItemType)
            }),
            "delete": api["delete"]({
              path: resourcePathById,
              receive: api.response(DeleteConfirmationType)
            })
          };
        });
      };
    };
  };

}).call(this);

},{"ag-types":17}],14:[function(require,module,exports){
(function() {
  var ResourceBundle, types;

  types = require('ag-types');


  /*
  Defines the resource bundle description format
   */

  ResourceBundle = (function(_arg) {
    var Any, Boolean, Map, Object, Optional, String;
    Object = _arg.Object, String = _arg.String, Map = _arg.Map, Optional = _arg.Optional, Boolean = _arg.Boolean, Any = _arg.Any;
    return Object({
      options: Object({
        baseUrl: String,
        headers: Optional(Map(Any))
      }),
      resources: Map(Object({
        schema: Object({
          identifier: Optional(String),
          fields: Map(Object({
            type: Optional(String)
          }))
        })
      }))
    });
  })(types);

  module.exports = ResourceBundle;

}).call(this);

},{"ag-types":17}],15:[function(require,module,exports){
(function() {
  var check;

  check = require('./check');

  module.exports = {
    isFunction: function(input) {
      if (typeof input !== 'function') {
        throw new TypeError("Type constructor argument was of type '" + (check.typeAsString(input)) + "', function expected");
      }
    }
  };

}).call(this);

},{"./check":16}],16:[function(require,module,exports){
(function() {
  module.exports = {
    typeAsString: function(input) {
      return Object.prototype.toString.call(input).match(/\[object ([^\]]+)\]/)[1].toLowerCase();
    },
    isArray: function(input) {
      return (Object.prototype.toString.call(input)) === '[object Array]';
    },
    isObject: function(input) {
      return (Object.prototype.toString.call(input)) === '[object Object]';
    }
  };

}).call(this);

},{}],17:[function(require,module,exports){
(function() {
  var Failure, Success, assign, types, _ref;

  assign = require('lodash-node/modern/object/assign');

  _ref = require('data.validation'), Success = _ref.Success, Failure = _ref.Failure;

  module.exports = types = assign({
    data: {
      Validation: {
        Success: Success,
        Failure: Failure
      }
    },
    projections: require('./types/projections'),
    recursive: require('./types/recursive'),
    Optional: require('./types/optional'),
    List: require('./types/list'),
    json: require('./types/json'),
    Try: require('./types/try')
  }, require('./types/primitives'), require('./types/objects'), require('./types/composites'));

}).call(this);

},{"./types/composites":18,"./types/json":20,"./types/list":21,"./types/objects":22,"./types/optional":23,"./types/primitives":24,"./types/projections":25,"./types/recursive":26,"./types/try":27,"data.validation":28,"lodash-node/modern/object/assign":152}],18:[function(require,module,exports){
(function() {
  var Failure, Success, assert, _ref;

  assert = require('../assert');

  _ref = require('data.validation'), Success = _ref.Success, Failure = _ref.Failure;

  module.exports = {
    OneOf: function(types) {
      var type, _i, _len;
      for (_i = 0, _len = types.length; _i < _len; _i++) {
        type = types[_i];
        assert.isFunction(type);
      }
      return function(input) {
        var fail, validation, _j, _len1;
        fail = Failure([]);
        for (_j = 0, _len1 = types.length; _j < _len1; _j++) {
          type = types[_j];
          validation = type(input);
          if (validation.isSuccess) {
            return validation;
          } else {
            fail = fail.ap(validation);
          }
        }
        return fail;
      };
    }
  };

}).call(this);

},{"../assert":15,"data.validation":28}],19:[function(require,module,exports){
(function() {
  module.exports = {
    objectWithProperty: function(name) {
      return function(value) {
        var object;
        object = {};
        object[name] = value;
        return object;
      };
    }
  };

}).call(this);

},{}],20:[function(require,module,exports){
(function() {
  var List, Optional, arrayTypeFromItemSchema, contains, mapValues, objectTypeFromPropertySchema, objects, primitive, typeFromJsonSchema;

  mapValues = require('lodash-node/modern/object/mapValues');

  contains = require('lodash-node/modern/collection/contains');

  primitive = require('./primitives');

  objects = require('./objects');

  List = require('./list');

  Optional = require('./optional');

  typeFromJsonSchema = function(schema) {
    switch (schema != null ? schema.type : void 0) {
      case "string":
        return primitive.String;
      case "number":
        return primitive.Number;
      case "boolean":
        return primitive.Boolean;
      case "object":
        return objectTypeFromPropertySchema(schema.properties || null, schema.required || []);
      case "array":
        return arrayTypeFromItemSchema(schema.items || {});
      default:
        return primitive.Any;
    }
  };

  arrayTypeFromItemSchema = function(itemSchema) {
    return List(typeFromJsonSchema(itemSchema));
  };

  objectTypeFromPropertySchema = function(propertiesToSchemas, requiredProperties) {
    if (propertiesToSchemas == null) {
      return objects.Map(primitive.Any);
    } else {
      return objects.Object(mapValues(propertiesToSchemas, function(propertySchema, propertyName) {
        var propertyType;
        propertyType = typeFromJsonSchema(propertySchema);
        if ((propertySchema != null ? propertySchema.required : void 0) || (contains(requiredProperties, propertyName))) {
          return propertyType;
        } else {
          return Optional(propertyType);
        }
      }));
    }
  };

  module.exports = {
    fromJsonSchema: typeFromJsonSchema
  };

}).call(this);

},{"./list":21,"./objects":22,"./optional":23,"./primitives":24,"lodash-node/modern/collection/contains":74,"lodash-node/modern/object/mapValues":156}],21:[function(require,module,exports){
(function() {
  var Failure, List, Success, assert, check, listSequence, objectWithProperty, _ref;

  _ref = require('data.validation'), Success = _ref.Success, Failure = _ref.Failure;

  assert = require('../assert');

  check = require('../check');

  objectWithProperty = require('./helpers').objectWithProperty;

  listSequence = function(list) {
    var failures, index, result, validation;
    failures = [];
    result = (function() {
      var _i, _len, _results;
      _results = [];
      for (index = _i = 0, _len = list.length; _i < _len; index = ++_i) {
        validation = list[index];
        _results.push(validation.fold(function(failure) {
          failures = failures.concat(objectWithProperty(index)(failure));
          return null;
        }, function(success) {
          return success;
        }));
      }
      return _results;
    })();
    if (failures.length > 0) {
      return Failure(failures);
    } else {
      return Success(result);
    }
  };

  module.exports = List = function(type) {
    assert.isFunction(type);
    return function(input) {
      var value;
      if (!check.isArray(input)) {
        return Failure(["Input was of type " + (check.typeAsString(input)) + " instead of array"]);
      } else {
        return listSequence((function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = input.length; _i < _len; _i++) {
            value = input[_i];
            _results.push(type(value));
          }
          return _results;
        })());
      }
    };
  };

}).call(this);

},{"../assert":15,"../check":16,"./helpers":19,"data.validation":28}],22:[function(require,module,exports){
(function() {
  var Failure, Success, assert, check, mapValues, objectSequence, objects, pairs, primitive, zipObject, _ref;

  zipObject = require('lodash-node/modern/array/zipObject');

  mapValues = require('lodash-node/modern/object/mapValues');

  pairs = require('lodash-node/modern/object/pairs');

  _ref = require('data.validation'), Success = _ref.Success, Failure = _ref.Failure;

  assert = require('../assert');

  check = require('../check');

  primitive = require('./primitives');

  objectSequence = function(nameValidationPairs) {
    var failures, name, result, validation;
    failures = [];
    result = (function() {
      var _i, _len, _ref1, _results;
      _results = [];
      for (_i = 0, _len = nameValidationPairs.length; _i < _len; _i++) {
        _ref1 = nameValidationPairs[_i], name = _ref1[0], validation = _ref1[1];
        _results.push(validation.fold(function(failure) {
          failures = failures.concat(failure);
          return [name, null];
        }, function(success) {
          return [name, success];
        }));
      }
      return _results;
    })();
    if (failures.length > 0) {
      return Failure(failures);
    } else {
      return Success(zipObject(result));
    }
  };

  module.exports = objects = {
    Property: function(name, type) {
      if (type == null) {
        type = primitive.Any;
      }
      assert.isFunction(type);
      return function(object) {
        return ((object != null ? object[name] : void 0) != null ? type(object[name]) : type(null)).leftMap(function(errors) {
          var result;
          result = {};
          result[name] = errors;
          return result;
        });
      };
    },
    Object: function(memberTypes) {
      var propertyNamesToTypes;
      propertyNamesToTypes = mapValues(memberTypes, function(type, name) {
        assert.isFunction(type);
        return objects.Property(name, type);
      });
      return function(object) {
        return objectSequence(pairs(mapValues(propertyNamesToTypes, function(propertyType) {
          return propertyType(object);
        })));
      };
    },
    Map: function(type) {
      assert.isFunction(type);
      return function(input) {
        if (!check.isObject(input)) {
          return Failure(["Input was of type " + (check.typeAsString(input)) + " instead of object"]);
        } else {
          return objectSequence(pairs(mapValues(input, function(throwawayValue, propertyName) {
            return objects.Property(propertyName, type)(input);
          })));
        }
      };
    }
  };

}).call(this);

},{"../assert":15,"../check":16,"./primitives":24,"data.validation":28,"lodash-node/modern/array/zipObject":72,"lodash-node/modern/object/mapValues":156,"lodash-node/modern/object/pairs":158}],23:[function(require,module,exports){
(function() {
  var Success, assert;

  assert = require('../assert');

  Success = require('data.validation').Success;

  module.exports = function(type) {
    assert.isFunction(type);
    return function(input) {
      if (input != null) {
        return type(input);
      } else {
        return Success(null);
      }
    };
  };

}).call(this);

},{"../assert":15,"data.validation":28}],24:[function(require,module,exports){
(function() {
  var Failure, Success, check, nativeTypeValidator, types, _ref;

  _ref = require('data.validation'), Success = _ref.Success, Failure = _ref.Failure;

  check = require('../check');

  nativeTypeValidator = function(expectedType) {
    return function(input) {
      var actualType;
      actualType = check.typeAsString(input);
      if (expectedType === actualType) {
        return Success(input);
      } else {
        return Failure(["Input was of type " + actualType + " instead of " + expectedType]);
      }
    };
  };

  module.exports = types = {
    Any: function(input) {
      if (input != null) {
        return Success(input);
      } else {
        return Failure(["Input was undefined"]);
      }
    },
    Nothing: function(input) {
      return Failure(["Not accepting input"]);
    },
    String: nativeTypeValidator('string'),
    Boolean: nativeTypeValidator('boolean'),
    Number: nativeTypeValidator('number')
  };

}).call(this);

},{"../check":16,"data.validation":28}],25:[function(require,module,exports){
(function() {
  var assert, objectWithProperty, primitive;

  assert = require('../assert');

  primitive = require('./primitives');

  objectWithProperty = require('./helpers').objectWithProperty;

  module.exports = {
    Property: function(name, type) {
      if (type == null) {
        type = primitive.Any;
      }
      assert.isFunction(type);
      return function(value) {
        return type(value).map(objectWithProperty(name));
      };
    }
  };

}).call(this);

},{"../assert":15,"./helpers":19,"./primitives":24}],26:[function(require,module,exports){
(function() {
  var assert;

  assert = require('../assert');

  module.exports = function(typeProvider) {
    var type;
    type = null;
    return function(input) {
      if (type == null) {
        type = typeProvider();
        assert.isFunction(type);
      }
      return type(input);
    };
  };

}).call(this);

},{"../assert":15}],27:[function(require,module,exports){
(function() {
  var Failure, Success, Try, _ref;

  _ref = require('data.validation'), Success = _ref.Success, Failure = _ref.Failure;

  module.exports = Try = function(f) {
    return function(v) {
      var e;
      try {
        return Success(f(v));
      } catch (_error) {
        e = _error;
        return Failure([e.message || e.toString()]);
      }
    };
  };

}).call(this);

},{"data.validation":28}],28:[function(require,module,exports){
// Copyright (c) 2013-2014 Quildreen Motta <quildreen@gmail.com>
//
// Permission is hereby granted, free of charge, to any person
// obtaining a copy of this software and associated documentation files
// (the "Software"), to deal in the Software without restriction,
// including without limitation the rights to use, copy, modify, merge,
// publish, distribute, sublicense, and/or sell copies of the Software,
// and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = require('./validation')
},{"./validation":29}],29:[function(require,module,exports){
// Copyright (c) 2013-2014 Quildreen Motta <quildreen@gmail.com>
//
// Permission is hereby granted, free of charge, to any person
// obtaining a copy of this software and associated documentation files
// (the "Software"), to deal in the Software without restriction,
// including without limitation the rights to use, copy, modify, merge,
// publish, distribute, sublicense, and/or sell copies of the Software,
// and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

/**
 * @module lib/validation
 */
module.exports = Validation

// -- Aliases ----------------------------------------------------------
var clone         = Object.create
var unimplemented = function(){ throw new Error('Not implemented.') }
var noop          = function(){ return this                         }


// -- Implementation ---------------------------------------------------

/**
 * The `Validation[α, β]` is a disjunction that's more appropriate for
 * validating inputs, or any use case where you want to aggregate failures. Not
 * only does the `Validation` provide a better terminology for working with
 * such cases (`Failure` and `Success` versus `Failure` and `Success`), it also
 * allows one to easily aggregate failures and successes as an Applicative
 * Functor.
 *
 * @class
 * @summary
 * Validation[α, β] <: Applicative[β]
 *                   , Functor[β]
 *                   , Show
 *                   , Eq
 */
function Validation() { }

Failure.prototype = clone(Validation.prototype)
function Failure(a) {
  this.value = a
}

Success.prototype = clone(Validation.prototype)
function Success(a) {
  this.value = a
}

// -- Constructors -----------------------------------------------------

/**
 * Constructs a new `Validation[α, β]` structure holding a `Failure` value.
 *
 * @summary a → Validation[α, β]
 */
Validation.Failure = function(a) {
  return new Failure(a)
}
Validation.prototype.Failure = Validation.Failure

/**
 * Constructs a new `Etiher[α, β]` structure holding a `Success` value.
 *
 * @summary β → Validation[α, β]
 */
Validation.Success = function(a) {
  return new Success(a)
}
Validation.prototype.Success = Validation.Success


// -- Conversions ------------------------------------------------------

/**
 * Constructs a new `Validation[α, β]` structure from a nullable type.
 *
 * Takes the `Failure` case if the value is `null` or `undefined`. Takes the
 * `Success` case otherwise.
 *
 * @summary α → Validation[α, α]
 */
Validation.fromNullable = function(a) {
  return a != null?       this.Success(a)
  :      /* otherwise */  this.Failure(a)
}
Validation.prototype.fromNullable = Validation.fromNullable

/**
 * Constructs a new `Either[α, β]` structure from a `Validation[α, β]` type.
 *
 * @summary Either[α, β] → Validation[α, β]
 */
Validation.fromEither = function(a) {
  return a.fold(this.Failure.bind(this), this.Success.bind(this))
}


// -- Predicates -------------------------------------------------------

/**
 * True if the `Validation[α, β]` contains a `Failure` value.
 *
 * @summary Boolean
 */
Validation.prototype.isFailure = false
Failure.prototype.isFailure    = true

/**
 * True if the `Validation[α, β]` contains a `Success` value.
 *
 * @summary Boolean
 */
Validation.prototype.isSuccess = false
Success.prototype.isSuccess    = true


// -- Applicative ------------------------------------------------------

/**
 * Creates a new `Validation[α, β]` instance holding the `Success` value `b`.
 *
 * `b` can be any value, including `null`, `undefined` or another
 * `Validation[α, β]` structure.
 *
 * @summary β → Validation[α, β]
 */
Validation.of = function(a) {
  return this.Success(a)
}
Validation.prototype.of = Validation.of


/**
 * Applies the function inside the `Success` case of the `Validation[α, β]` structure
 * to another applicative type.
 *
 * The `Validation[α, β]` should contain a function value, otherwise a `TypeError`
 * is thrown.
 *
 * @method
 * @summary (@Validation[α, β → γ], f:Applicative[_]) => f[β] → f[γ]
 */
Validation.prototype.ap = unimplemented

Failure.prototype.ap = function(b) {
  return b.isFailure?     this.Failure(this.value.concat(b.value))
  :      /* otherwise */  this
}

Success.prototype.ap = function(b) {
  return b.isFailure?     b
  :      /* otherwise */  b.map(this.value)
}


// -- Functor ----------------------------------------------------------

/**
 * Transforms the `Success` value of the `Validation[α, β]` structure using a regular
 * unary function.
 *
 * @method
 * @summary (@Validation[α, β]) => (β → γ) → Validation[α, γ]
 */
Validation.prototype.map = unimplemented
Failure.prototype.map    = noop

Success.prototype.map = function(f) {
  return this.of(f(this.value))
}


// -- Show -------------------------------------------------------------

/**
 * Returns a textual representation of the `Validation[α, β]` structure.
 *
 * @method
 * @summary (@Validation[α, β]) => Void → String
 */
Validation.prototype.toString = unimplemented

Failure.prototype.toString = function() {
  return 'Validation.Failure(' + this.value + ')'
}

Success.prototype.toString = function() {
  return 'Validation.Success(' + this.value + ')'
}


// -- Eq ---------------------------------------------------------------

/**
 * Tests if an `Validation[α, β]` structure is equal to another `Validation[α, β]`
 * structure.
 *
 * @method
 * @summary (@Validation[α, β]) => Validation[α, β] → Boolean
 */
Validation.prototype.isEqual = unimplemented

Failure.prototype.isEqual = function(a) {
  return a.isFailure && (a.value === this.value)
}

Success.prototype.isEqual = function(a) {
  return a.isSuccess && (a.value === this.value)
}


// -- Extracting and recovering ----------------------------------------

/**
 * Extracts the `Success` value out of the `Validation[α, β]` structure, if it
 * exists. Otherwise throws a `TypeError`.
 *
 * @method
 * @summary (@Validation[α, β]) => Void → β         :: partial, throws
 * @see {@link module:lib/validation~Validation#getOrElse} — A getter that can handle failures.
 * @see {@link module:lib/validation~Validation#merge} — The convergence of both values.
 * @throws {TypeError} if the structure has no `Success` value.
 */
Validation.prototype.get = unimplemented

Failure.prototype.get = function() {
  throw new TypeError("Can't extract the value of a Failure(a).")
}

Success.prototype.get = function() {
  return this.value
}


/**
 * Extracts the `Success` value out of the `Validation[α, β]` structure. If the
 * structure doesn't have a `Success` value, returns the given default.
 *
 * @method
 * @summary (@Validation[α, β]) => β → β
 */
Validation.prototype.getOrElse = unimplemented

Failure.prototype.getOrElse = function(a) {
  return a
}

Success.prototype.getOrElse = function(_) {
  return this.value
}


/**
 * Transforms a `Failure` value into a new `Validation[α, β]` structure. Does nothing
 * if the structure contain a `Success` value.
 *
 * @method
 * @summary (@Validation[α, β]) => (α → Validation[γ, β]) → Validation[γ, β]
 */
Validation.prototype.orElse = unimplemented
Success.prototype.orElse    = noop

Failure.prototype.orElse = function(f) {
  return f(this.value)
}


/**
 * Returns the value of whichever side of the disjunction that is present.
 *
 * @summary (@Validation[α, α]) => Void → α
 */
Validation.prototype.merge = function() {
  return this.value
}


// -- Folds and Extended Transformations -------------------------------

/**
 * Applies a function to each case in this data structure.
 *
 * @method
 * @summary (@Validation[α, β]) => (α → γ), (β → γ) → γ
 */
Validation.prototype.fold = unimplemented

Failure.prototype.fold = function(f, _) {
  return f(this.value)
}

Success.prototype.fold = function(_, g) {
  return g(this.value)
}

/**
 * Catamorphism.
 * 
 * @method
 * @summary (@Validation[α, β]) => { Success: α → γ, Failure: α → γ } → γ
 */
Validation.prototype.cata = unimplemented

Failure.prototype.cata = function(pattern) {
  return pattern.Failure(this.value)
}

Success.prototype.cata = function(pattern) {
  return pattern.Success(this.value)
}


/**
 * Swaps the disjunction values.
 *
 * @method
 * @summary (@Validation[α, β]) => Void → Validation[β, α]
 */
Validation.prototype.swap = unimplemented

Failure.prototype.swap = function() {
  return this.Success(this.value)
}

Success.prototype.swap = function() {
  return this.Failure(this.value)
}


/**
 * Maps both sides of the disjunction.
 *
 * @method
 * @summary (@Validation[α, β]) => (α → γ), (β → δ) → Validation[γ, δ]
 */
Validation.prototype.bimap = unimplemented

Failure.prototype.bimap = function(f, _) {
  return this.Failure(f(this.value))
}

Success.prototype.bimap = function(_, g) {
  return this.Success(g(this.value))
}


/**
 * Maps the failure side of the disjunction.
 *
 * @method
 * @summary (@Validation[α, β]) => (α → γ) → Validation[γ, β]
 */
Validation.prototype.failureMap = unimplemented
Success.prototype.failureMap    = noop

Failure.prototype.failureMap = function(f) {
  return this.Failure(f(this.value))
}

/**
 * Maps the failure side of the disjunction.
 *
 * @method
 * @deprecated in favour of {@link module:lib/validation~Validation#failureMap}
 * @summary (@Validation[α, β]) => (α → γ) → Validation[γ, β]
 */
Validation.prototype.leftMap = Validation.prototype.failureMap
Success.prototype.leftMap    = Success.prototype.failureMap
Failure.prototype.leftMap    = Failure.prototype.failureMap
},{}],30:[function(require,module,exports){
(function (Buffer){
(function() {
  var assert, types, urlify, _,
    __slice = [].slice;

  _ = {
    defaults: require('lodash-node/modern/object/defaults')
  };

  assert = require('assert-plus');

  types = require('ag-types');

  urlify = require('./urlify');

  module.exports = function(http, validations) {
    return {
      getter: function(_arg) {
        var options, path, receive;
        path = _arg.path, receive = _arg.receive, options = _arg.options;
        assert.func(path, 'path');
        assert.func(receive, 'receive');
        assert.optionalFunc(options, 'options');
        return function() {
          var args, head, query, tail, url, urlArgs, _i, _ref;
          args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
          head = 2 <= args.length ? __slice.call(args, 0, _i = args.length - 1) : (_i = 0, []), tail = args[_i++];
          _ref = typeof tail === 'object' ? [head, tail] : [args, {}], urlArgs = _ref[0], query = _ref[1];
          url = path.apply(null, urlify(urlArgs));
          return http.request('get', url, _.defaults({
            query: query
          }, (typeof options === "function" ? options() : void 0) || {})).then(validations.validatorToPromised(receive));
        };
      },
      poster: function(_arg) {
        var doPostRequest, options, path, receive, send;
        path = _arg.path, send = _arg.send, receive = _arg.receive, options = _arg.options;
        assert.func(path, 'path');
        assert.func(send, 'send');
        assert.func(receive, 'receive');
        assert.optionalFunc(options, 'options');
        doPostRequest = function(data) {
          var url;
          url = path(urlify(data));
          return http.request('post', url, _.defaults({
            data: data
          }, (typeof options === "function" ? options() : void 0) || {}));
        };
        return function(data) {
          return validations.validationToPromise(send(data)).then(doPostRequest).then(validations.validatorToPromised(receive));
        };
      },
      deleter: function(_arg) {
        var options, path, receive;
        path = _arg.path, options = _arg.options, receive = _arg.receive;
        assert.func(path, 'path');
        assert.optionalFunc(options, 'options');
        assert.optionalFunc(receive, 'receive');
        return function() {
          var args, url;
          args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
          url = path.apply(null, urlify(args));
          return http.request('del', url, (typeof options === "function" ? options() : void 0) || {}).then(validations.validatorToPromised(receive || types.Optional(types.Any)));
        };
      },
      putter: function(_arg) {
        var doPutRequest, options, path, receive, send;
        path = _arg.path, send = _arg.send, receive = _arg.receive, options = _arg.options;
        assert.func(path, 'path');
        assert.func(send, 'send');
        assert.func(receive, 'receive');
        assert.optionalFunc(options, 'options');
        doPutRequest = function(args) {
          var url;
          url = path.apply(null, urlify(args));
          return function(data) {
            return http.request('put', url, _.defaults({
              data: data
            }, (typeof options === "function" ? options() : void 0) || {}));
          };
        };
        return function() {
          var args, data, _i;
          args = 2 <= arguments.length ? __slice.call(arguments, 0, _i = arguments.length - 1) : (_i = 0, []), data = arguments[_i++];
          return validations.validationToPromise(send(data)).then(doPutRequest(args)).then(validations.validatorToPromised(receive));
        };
      },
      uploader: function(_arg) {
        var receive;
        receive = _arg.receive;
        assert.func(receive, 'receive');
        return function(url, file, options) {
          if (options == null) {
            options = {};
          }
          return http.request('put', url, _.defaults({
            type: 'application/octet-stream',
            data: (function() {
              switch (true) {
                case Buffer.isBuffer(file):
                  return file.toString();
                default:
                  return file;
              }
            })()
          }, options || {})).then(validations.validatorToPromised(receive));
        };
      }
    };
  };

}).call(this);

}).call(this,require("buffer").Buffer)
},{"./urlify":40,"ag-types":47,"assert-plus":60,"buffer":171,"lodash-node/modern/object/defaults":153}],31:[function(require,module,exports){
(function() {
  var deepDefaults, merge;

  merge = require('lodash-node/modern/object/merge');

  deepDefaults = require('./options/deep-defaults');

  module.exports = function(buildRestful, validateResponseBody) {

    /*
    (defaultRequestOptions: { baseUrl?: String, headers?: Object })
    -> {
      get, post, delete, put, response, request
    }
     */
    var buildRestfulObject, restMethodBuilder;
    restMethodBuilder = function(defaultRequestOptions) {
      var currentOptions, withOptions;
      currentOptions = defaultRequestOptions || {};
      withOptions = function(resourceBuilder) {
        return function(resourceDescription) {
          return resourceBuilder(deepDefaults(resourceDescription, {
            options: function() {
              return currentOptions;
            }
          }));
        };
      };
      return {
        getOptions: function() {
          return currentOptions;
        },
        setOptions: function(options) {
          currentOptions = deepDefaults(options, defaultRequestOptions);
          return currentOptions;
        },
        get: withOptions(buildRestful.getter),
        post: withOptions(buildRestful.poster),
        "delete": withOptions(buildRestful.deleter),
        put: withOptions(buildRestful.putter),
        upload: buildRestful.uploader,
        response: validateResponseBody,
        request: function(projection) {
          return function(data) {
            var key, sikrits, value;
            sikrits = {};
            for (key in data) {
              value = data[key];
              if (!(0 === key.indexOf('__'))) {
                continue;
              }
              sikrits[key] = value;
              delete data[key];
            }
            return projection(data).map(function(requestBody) {
              return merge({}, requestBody, sikrits);
            });
          };
        }
      };
    };
    return buildRestfulObject = function(defaultRequestOptions, doSetup) {
      var builder, restfulObject;
      builder = restMethodBuilder(defaultRequestOptions);
      restfulObject = doSetup(builder);
      if (restfulObject.getOptions == null) {
        restfulObject.getOptions = builder.getOptions;
      }
      if (restfulObject.setOptions == null) {
        restfulObject.setOptions = builder.setOptions;
      }
      return restfulObject;
    };
  };

}).call(this);

},{"./options/deep-defaults":39,"lodash-node/modern/object/merge":157}],32:[function(require,module,exports){
(function() {
  var extractResponseBody,
    __slice = [].slice;

  extractResponseBody = require('./http/extract-response-body');

  module.exports = function(Promise) {
    var asyncJobRequestRunner, http, requestDataByMethod, runRequest;
    asyncJobRequestRunner = require('./http/async-job-request-runner')(Promise);
    runRequest = function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return asyncJobRequestRunner.apply(null, args).run(function(t) {
        return t.done;
      });
    };
    requestDataByMethod = function(method) {
      return function(path, options) {
        if (options == null) {
          options = {};
        }
        return runRequest(method, path, options).then(extractResponseBody);
      };
    };
    return http = {
      transactional: {
        request: asyncJobRequestRunner
      },

      /*
      Runs a request and returns the raw superagent response object
      
      (method, url, options?) -> Promise Response
       */
      request: runRequest,

      /*
      Convenience functions that run a request and return its body as JSON
      
      (url, data?) -> Promise Object
       */
      get: requestDataByMethod('get'),
      post: requestDataByMethod('post'),
      del: requestDataByMethod('del'),
      put: requestDataByMethod('put')
    };
  };

}).call(this);

},{"./http/async-job-request-runner":33,"./http/extract-response-body":35}],33:[function(require,module,exports){
(function() {
  var allowAsyncJobResponse, buildRequest, isAsyncJobResponse, jobs, markAsAsyncJobMonitorRequest;

  jobs = require('./jobs');

  buildRequest = require('./build-request');


  /*
  Allow the server to respond with an async job by enabling the corresponding feature header
   */

  allowAsyncJobResponse = function(requestOptions) {
    if (requestOptions.headers == null) {
      requestOptions.headers = {};
    }
    return requestOptions.headers[jobs.ASYNC_JOB_FEATURE_HEADER] = true;
  };


  /*
  Check a response for the signature of an async job
   */

  isAsyncJobResponse = function(response) {
    var _ref, _ref1;
    return (response.status === jobs.JOB_HTTP_STATUS) && (((_ref = response.body) != null ? (_ref1 = _ref[jobs.JOB_ROOT_KEY]) != null ? _ref1.id : void 0 : void 0) != null);
  };


  /*
  Given an async job response, mark a request as a monitor on the async job by setting a header
   */

  markAsAsyncJobMonitorRequest = function(asyncJobResponse, requestOptions) {
    if (requestOptions.headers == null) {
      requestOptions.headers = {};
    }
    return requestOptions.headers[jobs.JOB_ID_HEADER] = asyncJobResponse.body[jobs.JOB_ROOT_KEY].id;
  };

  module.exports = function(Promise) {
    var Transaction, asyncJobRequestRunner, requestRunner;
    Transaction = require('ag-transaction')(Promise);
    requestRunner = require('./request-runner')(Promise, Transaction);
    return asyncJobRequestRunner = (function() {
      return function(method, path, options) {
        var retryUntilComplete;
        if (options == null) {
          options = {};
        }
        allowAsyncJobResponse(options);

        /*
        (f: () ->
          TransactionRunner ((superagent.Response & asyncJob) | superagent.Response)
        ) -> TransactionRunner superagent.Response
         */
        retryUntilComplete = function(f) {
          return f().flatMapDone(function(response) {
            if (!isAsyncJobResponse(response)) {
              return Transaction.unit(response);
            } else {
              markAsAsyncJobMonitorRequest(response, options);
              return retryUntilComplete(f);
            }
          });
        };
        return Transaction.empty.flatMapDone(function() {
          return retryUntilComplete(function() {
            return requestRunner(buildRequest(method, path, options));
          });
        });
      };
    })();
  };

}).call(this);

},{"./build-request":34,"./jobs":36,"./request-runner":37,"ag-transaction":64}],34:[function(require,module,exports){
(function() {
  var buildRequest, superagent;

  superagent = require('superagent');


  /*
  (
    method: String
    path: String
    options: Object?
  ) -> superagent
   */

  module.exports = buildRequest = function(method, path, options) {
    var header, part, partBuilder, requestBuilder, value, _i, _len, _ref, _ref1, _ref2;
    if (options == null) {
      options = {};
    }
    if (superagent[method] == null) {
      throw new Error("No such request builder method: " + method);
    }
    requestBuilder = superagent[method](options.baseUrl != null ? [options.baseUrl, path].join('') : path);
    if (options.headers) {
      _ref = options.headers || {};
      for (header in _ref) {
        value = _ref[header];
        requestBuilder.set(header, value);
      }
    }
    if (options.query) {
      requestBuilder.query(options.query);
    }
    if (options.type != null) {
      requestBuilder.type(options.type);
    }
    if (options.accept != null) {
      requestBuilder.accept(options.accept);
    }
    if (options.parts != null) {
      _ref1 = options.parts;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        part = _ref1[_i];
        partBuilder = requestBuilder.part();
        _ref2 = part.headers || {};
        for (header in _ref2) {
          value = _ref2[header];
          partBuilder.set(header, value);
        }
        if (part.data != null) {
          partBuilder.write(part.data);
        }
      }
    } else if (options.data != null) {
      requestBuilder.send(options.data);
    }
    if (options.buffer && (requestBuilder.buffer != null)) {
      requestBuilder.buffer();
    }
    return requestBuilder;
  };

}).call(this);

},{"superagent":61}],35:[function(require,module,exports){

/*
extractResponseBody: (response: Object) -> Object | Error
 */

(function() {
  var extractResponseBody;

  module.exports = extractResponseBody = function(response) {
    if (response.error) {
      throw new Error(response.status);
    } else if (response.body) {
      return response.body;
    } else if (response.text) {
      return response.text;
    } else {
      throw new Error("Empty response");
    }
  };

}).call(this);

},{}],36:[function(require,module,exports){
(function() {
  module.exports = {
    JOB_HTTP_STATUS: 202,
    JOB_ID_HEADER: 'X-Job-Id',
    JOB_ROOT_KEY: 'job',
    ASYNC_JOB_FEATURE_HEADER: 'X-Feature-Jobs'
  };

}).call(this);

},{}],37:[function(require,module,exports){
(function() {
  var debug;

  debug = require('debug')('ag-restful:http');

  module.exports = function(Promise, Transaction) {

    /*
    requestRunner: (request: superagent.Request) -> TransactionRunner superagent.Response
     */
    var requestRunner;
    return requestRunner = function(request) {
      return Transaction.step(function(_arg) {
        var abort;
        abort = _arg.abort;
        abort(function() {
          return new Promise(function(resolve) {
            request.once('abort', resolve);
            return request.abort();
          });
        });
        return new Promise(function(resolve, reject) {
          debug("Firing HTTP request", request);
          return request.end(function(err, res) {
            if (err) {
              debug("HTTP request error", err);
              return reject(err);
            } else {
              debug("HTTP request completed", res);
              return resolve(res);
            }
          });
        });
      });
    };
  };

}).call(this);

},{"debug":69}],38:[function(require,module,exports){
(function() {
  module.exports = function(Promise) {
    var buildRestful, http, restful, validations;
    http = require('./http')(Promise);
    validations = require('./validations')(Promise);
    buildRestful = require('./build-restful-method')(http, validations);
    restful = require('./build-restful-object')(buildRestful, validations.validateResponseBody);
    restful.http = http;
    return restful;
  };

}).call(this);

},{"./build-restful-method":30,"./build-restful-object":31,"./http":32,"./validations":41}],39:[function(require,module,exports){
(function() {
  var deepDefaults, isArray, isDate, merge, partialRight, recursiveDefaults;

  partialRight = require('lodash-node/modern/function/partialRight');

  merge = require('lodash-node/modern/object/merge');

  isArray = require('lodash-node/modern/lang/isArray');

  isDate = require('lodash-node/modern/lang/isDate');


  /*
  Recursive version of _.defaults
  
  See: https://github.com/balderdashy/merge-defaults
  
  Inlined here because the repo linked has a hard dependency on the 'lodash' module.
   */

  recursiveDefaults = function(left, right) {
    if (isArray(left) || isDate(left)) {
      return left;
    } else {
      return merge(left, right, recursiveDefaults);
    }
  };

  module.exports = deepDefaults = partialRight(merge, recursiveDefaults);

}).call(this);

},{"lodash-node/modern/function/partialRight":77,"lodash-node/modern/lang/isArray":144,"lodash-node/modern/lang/isDate":145,"lodash-node/modern/object/merge":157}],40:[function(require,module,exports){
(function() {
  var mapValues, urlify;

  mapValues = require('lodash-node/modern/object/mapValues');


  /*
  Make sure that all scalar values in an input object graph are encoded and ready to be output in a URL
   */

  module.exports = urlify = function(input) {
    var item, _i, _len, _results;
    if (input == null) {
      return '';
    }
    switch (Object.prototype.toString.call(input)) {
      case '[object Object]':
        return mapValues(input, urlify);
      case '[object Array]':
        _results = [];
        for (_i = 0, _len = input.length; _i < _len; _i++) {
          item = input[_i];
          _results.push(urlify(item));
        }
        return _results;
      default:
        return encodeURIComponent(input);
    }
  };

}).call(this);

},{"lodash-node/modern/object/mapValues":156}],41:[function(require,module,exports){
(function() {
  module.exports = function(Promise) {
    var validateResponseBody, validationToPromise, validatorToPromised;
    validationToPromise = require('./validation-to-promise')(Promise);
    validatorToPromised = require('./validator-to-promised')(validationToPromise);
    validateResponseBody = require('./validate-response-body');
    return {
      validateResponseBody: validateResponseBody,
      validationToPromise: validationToPromise,
      validatorToPromised: validatorToPromised
    };
  };

}).call(this);

},{"./validate-response-body":42,"./validation-to-promise":43,"./validator-to-promised":44}],42:[function(require,module,exports){
(function() {
  var Failure, responseValidator, types, validatorToResponseValidator;

  types = require('ag-types');

  Failure = types.data.Validation.Failure;

  validatorToResponseValidator = function(validator) {
    var responseBodyValidator, responseCode;
    if (typeof validator === 'function') {
      return types.OneOf([types.Property('body', validator), types.Property('text', validator)]);
    } else {
      return types.OneOf((function() {
        var _results;
        _results = [];
        for (responseCode in validator) {
          responseBodyValidator = validator[responseCode];
          _results.push(validatorToResponseValidator(responseBodyValidator));
        }
        return _results;
      })());
    }
  };

  module.exports = responseValidator = function(responseDataValidator) {
    return (function(validateResponse) {
      return function(response) {
        if (response.error) {
          return Failure([response.error]);
        } else {
          return validateResponse(response);
        }
      };
    })(validatorToResponseValidator(responseDataValidator));
  };

}).call(this);

},{"ag-types":47}],43:[function(require,module,exports){
(function() {
  module.exports = function(Promise) {
    var validationToPromise;
    return validationToPromise = function(validation) {
      return validation.fold(function(errors) {
        return Promise.reject(new Error(JSON.stringify(errors)));
      }, function(value) {
        return Promise.resolve(value);
      });
    };
  };

}).call(this);

},{}],44:[function(require,module,exports){
(function() {
  var __slice = [].slice;

  module.exports = function(validationToPromise) {
    var validatorToPromised;
    return validatorToPromised = function(validator) {
      return function() {
        var args;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        return validationToPromise(validator.apply(null, args));
      };
    };
  };

}).call(this);

},{}],45:[function(require,module,exports){
module.exports=require(15)
},{"./check":46}],46:[function(require,module,exports){
module.exports=require(16)
},{}],47:[function(require,module,exports){
module.exports=require(17)
},{"./types/composites":48,"./types/json":50,"./types/list":51,"./types/objects":52,"./types/optional":53,"./types/primitives":54,"./types/projections":55,"./types/recursive":56,"./types/try":57,"data.validation":58,"lodash-node/modern/object/assign":152}],48:[function(require,module,exports){
module.exports=require(18)
},{"../assert":45,"data.validation":58}],49:[function(require,module,exports){
module.exports=require(19)
},{}],50:[function(require,module,exports){
module.exports=require(20)
},{"./list":51,"./objects":52,"./optional":53,"./primitives":54,"lodash-node/modern/collection/contains":74,"lodash-node/modern/object/mapValues":156}],51:[function(require,module,exports){
module.exports=require(21)
},{"../assert":45,"../check":46,"./helpers":49,"data.validation":58}],52:[function(require,module,exports){
module.exports=require(22)
},{"../assert":45,"../check":46,"./primitives":54,"data.validation":58,"lodash-node/modern/array/zipObject":72,"lodash-node/modern/object/mapValues":156,"lodash-node/modern/object/pairs":158}],53:[function(require,module,exports){
module.exports=require(23)
},{"../assert":45,"data.validation":58}],54:[function(require,module,exports){
module.exports=require(24)
},{"../check":46,"data.validation":58}],55:[function(require,module,exports){
module.exports=require(25)
},{"../assert":45,"./helpers":49,"./primitives":54}],56:[function(require,module,exports){
module.exports=require(26)
},{"../assert":45}],57:[function(require,module,exports){
module.exports=require(27)
},{"data.validation":58}],58:[function(require,module,exports){
module.exports=require(28)
},{"./validation":59}],59:[function(require,module,exports){
module.exports=require(29)
},{}],60:[function(require,module,exports){
(function (process,Buffer){
// Copyright (c) 2012, Mark Cavage. All rights reserved.

var assert = require('assert');
var Stream = require('stream').Stream;
var util = require('util');



///--- Globals

var NDEBUG = process.env.NODE_NDEBUG || false;
var UUID_REGEXP = /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/;



///--- Messages

var ARRAY_TYPE_REQUIRED = '%s ([%s]) required';
var TYPE_REQUIRED = '%s (%s) is required';



///--- Internal

function capitalize(str) {
        return (str.charAt(0).toUpperCase() + str.slice(1));
}

function uncapitalize(str) {
        return (str.charAt(0).toLowerCase() + str.slice(1));
}

function _() {
        return (util.format.apply(util, arguments));
}


function _assert(arg, type, name, stackFunc) {
        if (!NDEBUG) {
                name = name || type;
                stackFunc = stackFunc || _assert.caller;
                var t = typeof (arg);

                if (t !== type) {
                        throw new assert.AssertionError({
                                message: _(TYPE_REQUIRED, name, type),
                                actual: t,
                                expected: type,
                                operator: '===',
                                stackStartFunction: stackFunc
                        });
                }
        }
}


function _instanceof(arg, type, name, stackFunc) {
        if (!NDEBUG) {
                name = name || type;
                stackFunc = stackFunc || _instanceof.caller;

                if (!(arg instanceof type)) {
                        throw new assert.AssertionError({
                                message: _(TYPE_REQUIRED, name, type.name),
                                actual: _getClass(arg),
                                expected: type.name,
                                operator: 'instanceof',
                                stackStartFunction: stackFunc
                        });
                }
        }
}

function _getClass(object) {
        return (Object.prototype.toString.call(object).slice(8, -1));
};



///--- API

function array(arr, type, name) {
        if (!NDEBUG) {
                name = name || type;

                if (!Array.isArray(arr)) {
                        throw new assert.AssertionError({
                                message: _(ARRAY_TYPE_REQUIRED, name, type),
                                actual: typeof (arr),
                                expected: 'array',
                                operator: 'Array.isArray',
                                stackStartFunction: array.caller
                        });
                }

                for (var i = 0; i < arr.length; i++) {
                        _assert(arr[i], type, name, array);
                }
        }
}


function bool(arg, name) {
        _assert(arg, 'boolean', name, bool);
}


function buffer(arg, name) {
        if (!Buffer.isBuffer(arg)) {
                throw new assert.AssertionError({
                        message: _(TYPE_REQUIRED, name || '', 'Buffer'),
                        actual: typeof (arg),
                        expected: 'buffer',
                        operator: 'Buffer.isBuffer',
                        stackStartFunction: buffer
                });
        }
}


function func(arg, name) {
        _assert(arg, 'function', name);
}


function number(arg, name) {
        _assert(arg, 'number', name);
        if (!NDEBUG && (isNaN(arg) || !isFinite(arg))) {
                throw new assert.AssertionError({
                        message: _(TYPE_REQUIRED, name, 'number'),
                        actual: arg,
                        expected: 'number',
                        operator: 'isNaN',
                        stackStartFunction: number
                });
        }
}


function object(arg, name) {
        _assert(arg, 'object', name);
}


function stream(arg, name) {
        _instanceof(arg, Stream, name);
}


function date(arg, name) {
        _instanceof(arg, Date, name);
}

function regexp(arg, name) {
        _instanceof(arg, RegExp, name);
}


function string(arg, name) {
        _assert(arg, 'string', name);
}


function uuid(arg, name) {
        string(arg, name);
        if (!NDEBUG && !UUID_REGEXP.test(arg)) {
                throw new assert.AssertionError({
                        message: _(TYPE_REQUIRED, name, 'uuid'),
                        actual: 'string',
                        expected: 'uuid',
                        operator: 'test',
                        stackStartFunction: uuid
                });
        }
}


///--- Exports

module.exports = {
        bool: bool,
        buffer: buffer,
        date: date,
        func: func,
        number: number,
        object: object,
        regexp: regexp,
        stream: stream,
        string: string,
        uuid: uuid
};


Object.keys(module.exports).forEach(function (k) {
        if (k === 'buffer')
                return;

        var name = 'arrayOf' + capitalize(k);

        if (k === 'bool')
                k = 'boolean';
        if (k === 'func')
                k = 'function';
        module.exports[name] = function (arg, name) {
                array(arg, k, name);
        };
});

Object.keys(module.exports).forEach(function (k) {
        var _name = 'optional' + capitalize(k);
        var s = uncapitalize(k.replace('arrayOf', ''));
        if (s === 'bool')
                s = 'boolean';
        if (s === 'func')
                s = 'function';

        if (k.indexOf('arrayOf') !== -1) {
          module.exports[_name] = function (arg, name) {
                  if (!NDEBUG && arg !== undefined) {
                          array(arg, s, name);
                  }
          };
        } else {
          module.exports[_name] = function (arg, name) {
                  if (!NDEBUG && arg !== undefined) {
                          _assert(arg, s, name);
                  }
          };
        }
});


// Reexport built-in assertions
Object.keys(assert).forEach(function (k) {
        if (k === 'AssertionError') {
                module.exports[k] = assert[k];
                return;
        }

        module.exports[k] = function () {
                if (!NDEBUG) {
                        assert[k].apply(assert[k], arguments);
                }
        };
});

}).call(this,require("oMfpAn"),require("buffer").Buffer)
},{"assert":170,"buffer":171,"oMfpAn":176,"stream":178,"util":186}],61:[function(require,module,exports){
/**
 * Module dependencies.
 */

var Emitter = require('emitter');
var reduce = require('reduce');

/**
 * Root reference for iframes.
 */

var root = 'undefined' == typeof window
  ? (this || self)
  : window;

/**
 * Noop.
 */

function noop(){};

/**
 * Check if `obj` is a host object,
 * we don't want to serialize these :)
 *
 * TODO: future proof, move to compoent land
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isHost(obj) {
  var str = {}.toString.call(obj);

  switch (str) {
    case '[object File]':
    case '[object Blob]':
    case '[object FormData]':
      return true;
    default:
      return false;
  }
}

/**
 * Determine XHR.
 */

request.getXHR = function () {
  if (root.XMLHttpRequest
      && (!root.location || 'file:' != root.location.protocol
          || !root.ActiveXObject)) {
    return new XMLHttpRequest;
  } else {
    try { return new ActiveXObject('Microsoft.XMLHTTP'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP.6.0'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP.3.0'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP'); } catch(e) {}
  }
  return false;
};

/**
 * Removes leading and trailing whitespace, added to support IE.
 *
 * @param {String} s
 * @return {String}
 * @api private
 */

var trim = ''.trim
  ? function(s) { return s.trim(); }
  : function(s) { return s.replace(/(^\s*|\s*$)/g, ''); };

/**
 * Check if `obj` is an object.
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isObject(obj) {
  return obj === Object(obj);
}

/**
 * Serialize the given `obj`.
 *
 * @param {Object} obj
 * @return {String}
 * @api private
 */

function serialize(obj) {
  if (!isObject(obj)) return obj;
  var pairs = [];
  for (var key in obj) {
    if (null != obj[key]) {
      pairs.push(encodeURIComponent(key)
        + '=' + encodeURIComponent(obj[key]));
    }
  }
  return pairs.join('&');
}

/**
 * Expose serialization method.
 */

 request.serializeObject = serialize;

 /**
  * Parse the given x-www-form-urlencoded `str`.
  *
  * @param {String} str
  * @return {Object}
  * @api private
  */

function parseString(str) {
  var obj = {};
  var pairs = str.split('&');
  var parts;
  var pair;

  for (var i = 0, len = pairs.length; i < len; ++i) {
    pair = pairs[i];
    parts = pair.split('=');
    obj[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
  }

  return obj;
}

/**
 * Expose parser.
 */

request.parseString = parseString;

/**
 * Default MIME type map.
 *
 *     superagent.types.xml = 'application/xml';
 *
 */

request.types = {
  html: 'text/html',
  json: 'application/json',
  xml: 'application/xml',
  urlencoded: 'application/x-www-form-urlencoded',
  'form': 'application/x-www-form-urlencoded',
  'form-data': 'application/x-www-form-urlencoded'
};

/**
 * Default serialization map.
 *
 *     superagent.serialize['application/xml'] = function(obj){
 *       return 'generated xml here';
 *     };
 *
 */

 request.serialize = {
   'application/x-www-form-urlencoded': serialize,
   'application/json': JSON.stringify
 };

 /**
  * Default parsers.
  *
  *     superagent.parse['application/xml'] = function(str){
  *       return { object parsed from str };
  *     };
  *
  */

request.parse = {
  'application/x-www-form-urlencoded': parseString,
  'application/json': JSON.parse
};

/**
 * Parse the given header `str` into
 * an object containing the mapped fields.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function parseHeader(str) {
  var lines = str.split(/\r?\n/);
  var fields = {};
  var index;
  var line;
  var field;
  var val;

  lines.pop(); // trailing CRLF

  for (var i = 0, len = lines.length; i < len; ++i) {
    line = lines[i];
    index = line.indexOf(':');
    field = line.slice(0, index).toLowerCase();
    val = trim(line.slice(index + 1));
    fields[field] = val;
  }

  return fields;
}

/**
 * Return the mime type for the given `str`.
 *
 * @param {String} str
 * @return {String}
 * @api private
 */

function type(str){
  return str.split(/ *; */).shift();
};

/**
 * Return header field parameters.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function params(str){
  return reduce(str.split(/ *; */), function(obj, str){
    var parts = str.split(/ *= */)
      , key = parts.shift()
      , val = parts.shift();

    if (key && val) obj[key] = val;
    return obj;
  }, {});
};

/**
 * Initialize a new `Response` with the given `xhr`.
 *
 *  - set flags (.ok, .error, etc)
 *  - parse header
 *
 * Examples:
 *
 *  Aliasing `superagent` as `request` is nice:
 *
 *      request = superagent;
 *
 *  We can use the promise-like API, or pass callbacks:
 *
 *      request.get('/').end(function(res){});
 *      request.get('/', function(res){});
 *
 *  Sending data can be chained:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' })
 *        .end(function(res){});
 *
 *  Or passed to `.send()`:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' }, function(res){});
 *
 *  Or passed to `.post()`:
 *
 *      request
 *        .post('/user', { name: 'tj' })
 *        .end(function(res){});
 *
 * Or further reduced to a single call for simple cases:
 *
 *      request
 *        .post('/user', { name: 'tj' }, function(res){});
 *
 * @param {XMLHTTPRequest} xhr
 * @param {Object} options
 * @api private
 */

function Response(req, options) {
  options = options || {};
  this.req = req;
  this.xhr = this.req.xhr;
  // responseText is accessible only if responseType is '' or 'text' and on older browsers
  this.text = ((this.req.method !='HEAD' && (this.xhr.responseType === '' || this.xhr.responseType === 'text')) || typeof this.xhr.responseType === 'undefined')
     ? this.xhr.responseText
     : null;
  this.statusText = this.req.xhr.statusText;
  this.setStatusProperties(this.xhr.status);
  this.header = this.headers = parseHeader(this.xhr.getAllResponseHeaders());
  // getAllResponseHeaders sometimes falsely returns "" for CORS requests, but
  // getResponseHeader still works. so we get content-type even if getting
  // other headers fails.
  this.header['content-type'] = this.xhr.getResponseHeader('content-type');
  this.setHeaderProperties(this.header);
  this.body = this.req.method != 'HEAD'
    ? this.parseBody(this.text ? this.text : this.xhr.response)
    : null;
}

/**
 * Get case-insensitive `field` value.
 *
 * @param {String} field
 * @return {String}
 * @api public
 */

Response.prototype.get = function(field){
  return this.header[field.toLowerCase()];
};

/**
 * Set header related properties:
 *
 *   - `.type` the content type without params
 *
 * A response of "Content-Type: text/plain; charset=utf-8"
 * will provide you with a `.type` of "text/plain".
 *
 * @param {Object} header
 * @api private
 */

Response.prototype.setHeaderProperties = function(header){
  // content-type
  var ct = this.header['content-type'] || '';
  this.type = type(ct);

  // params
  var obj = params(ct);
  for (var key in obj) this[key] = obj[key];
};

/**
 * Parse the given body `str`.
 *
 * Used for auto-parsing of bodies. Parsers
 * are defined on the `superagent.parse` object.
 *
 * @param {String} str
 * @return {Mixed}
 * @api private
 */

Response.prototype.parseBody = function(str){
  var parse = request.parse[this.type];
  return parse && str && (str.length || str instanceof Object)
    ? parse(str)
    : null;
};

/**
 * Set flags such as `.ok` based on `status`.
 *
 * For example a 2xx response will give you a `.ok` of __true__
 * whereas 5xx will be __false__ and `.error` will be __true__. The
 * `.clientError` and `.serverError` are also available to be more
 * specific, and `.statusType` is the class of error ranging from 1..5
 * sometimes useful for mapping respond colors etc.
 *
 * "sugar" properties are also defined for common cases. Currently providing:
 *
 *   - .noContent
 *   - .badRequest
 *   - .unauthorized
 *   - .notAcceptable
 *   - .notFound
 *
 * @param {Number} status
 * @api private
 */

Response.prototype.setStatusProperties = function(status){
  // handle IE9 bug: http://stackoverflow.com/questions/10046972/msie-returns-status-code-of-1223-for-ajax-request
  if (status === 1223) {
    status = 204;
  }

  var type = status / 100 | 0;

  // status / class
  this.status = status;
  this.statusType = type;

  // basics
  this.info = 1 == type;
  this.ok = 2 == type;
  this.clientError = 4 == type;
  this.serverError = 5 == type;
  this.error = (4 == type || 5 == type)
    ? this.toError()
    : false;

  // sugar
  this.accepted = 202 == status;
  this.noContent = 204 == status;
  this.badRequest = 400 == status;
  this.unauthorized = 401 == status;
  this.notAcceptable = 406 == status;
  this.notFound = 404 == status;
  this.forbidden = 403 == status;
};

/**
 * Return an `Error` representative of this response.
 *
 * @return {Error}
 * @api public
 */

Response.prototype.toError = function(){
  var req = this.req;
  var method = req.method;
  var url = req.url;

  var msg = 'cannot ' + method + ' ' + url + ' (' + this.status + ')';
  var err = new Error(msg);
  err.status = this.status;
  err.method = method;
  err.url = url;

  return err;
};

/**
 * Expose `Response`.
 */

request.Response = Response;

/**
 * Initialize a new `Request` with the given `method` and `url`.
 *
 * @param {String} method
 * @param {String} url
 * @api public
 */

function Request(method, url) {
  var self = this;
  Emitter.call(this);
  this._query = this._query || [];
  this.method = method;
  this.url = url;
  this.header = {};
  this._header = {};
  this.on('end', function(){
    var err = null;
    var res = null;

    try {
      res = new Response(self);
    } catch(e) {
      err = new Error('Parser is unable to parse the response');
      err.parse = true;
      err.original = e;
      return self.callback(err);
    }

    self.emit('response', res);

    if (err) {
      return self.callback(err, res);
    }

    if (res.status >= 200 && res.status < 300) {
      return self.callback(err, res);
    }

    var new_err = new Error(res.statusText || 'Unsuccessful HTTP response');
    new_err.original = err;
    new_err.response = res;
    new_err.status = res.status;

    self.callback(err || new_err, res);
  });
}

/**
 * Mixin `Emitter`.
 */

Emitter(Request.prototype);

/**
 * Allow for extension
 */

Request.prototype.use = function(fn) {
  fn(this);
  return this;
}

/**
 * Set timeout to `ms`.
 *
 * @param {Number} ms
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.timeout = function(ms){
  this._timeout = ms;
  return this;
};

/**
 * Clear previous timeout.
 *
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.clearTimeout = function(){
  this._timeout = 0;
  clearTimeout(this._timer);
  return this;
};

/**
 * Abort the request, and clear potential timeout.
 *
 * @return {Request}
 * @api public
 */

Request.prototype.abort = function(){
  if (this.aborted) return;
  this.aborted = true;
  this.xhr.abort();
  this.clearTimeout();
  this.emit('abort');
  return this;
};

/**
 * Set header `field` to `val`, or multiple fields with one object.
 *
 * Examples:
 *
 *      req.get('/')
 *        .set('Accept', 'application/json')
 *        .set('X-API-Key', 'foobar')
 *        .end(callback);
 *
 *      req.get('/')
 *        .set({ Accept: 'application/json', 'X-API-Key': 'foobar' })
 *        .end(callback);
 *
 * @param {String|Object} field
 * @param {String} val
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.set = function(field, val){
  if (isObject(field)) {
    for (var key in field) {
      this.set(key, field[key]);
    }
    return this;
  }
  this._header[field.toLowerCase()] = val;
  this.header[field] = val;
  return this;
};

/**
 * Remove header `field`.
 *
 * Example:
 *
 *      req.get('/')
 *        .unset('User-Agent')
 *        .end(callback);
 *
 * @param {String} field
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.unset = function(field){
  delete this._header[field.toLowerCase()];
  delete this.header[field];
  return this;
};

/**
 * Get case-insensitive header `field` value.
 *
 * @param {String} field
 * @return {String}
 * @api private
 */

Request.prototype.getHeader = function(field){
  return this._header[field.toLowerCase()];
};

/**
 * Set Content-Type to `type`, mapping values from `request.types`.
 *
 * Examples:
 *
 *      superagent.types.xml = 'application/xml';
 *
 *      request.post('/')
 *        .type('xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 *      request.post('/')
 *        .type('application/xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 * @param {String} type
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.type = function(type){
  this.set('Content-Type', request.types[type] || type);
  return this;
};

/**
 * Set Accept to `type`, mapping values from `request.types`.
 *
 * Examples:
 *
 *      superagent.types.json = 'application/json';
 *
 *      request.get('/agent')
 *        .accept('json')
 *        .end(callback);
 *
 *      request.get('/agent')
 *        .accept('application/json')
 *        .end(callback);
 *
 * @param {String} accept
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.accept = function(type){
  this.set('Accept', request.types[type] || type);
  return this;
};

/**
 * Set Authorization field value with `user` and `pass`.
 *
 * @param {String} user
 * @param {String} pass
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.auth = function(user, pass){
  var str = btoa(user + ':' + pass);
  this.set('Authorization', 'Basic ' + str);
  return this;
};

/**
* Add query-string `val`.
*
* Examples:
*
*   request.get('/shoes')
*     .query('size=10')
*     .query({ color: 'blue' })
*
* @param {Object|String} val
* @return {Request} for chaining
* @api public
*/

Request.prototype.query = function(val){
  if ('string' != typeof val) val = serialize(val);
  if (val) this._query.push(val);
  return this;
};

/**
 * Write the field `name` and `val` for "multipart/form-data"
 * request bodies.
 *
 * ``` js
 * request.post('/upload')
 *   .field('foo', 'bar')
 *   .end(callback);
 * ```
 *
 * @param {String} name
 * @param {String|Blob|File} val
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.field = function(name, val){
  if (!this._formData) this._formData = new root.FormData();
  this._formData.append(name, val);
  return this;
};

/**
 * Queue the given `file` as an attachment to the specified `field`,
 * with optional `filename`.
 *
 * ``` js
 * request.post('/upload')
 *   .attach(new Blob(['<a id="a"><b id="b">hey!</b></a>'], { type: "text/html"}))
 *   .end(callback);
 * ```
 *
 * @param {String} field
 * @param {Blob|File} file
 * @param {String} filename
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.attach = function(field, file, filename){
  if (!this._formData) this._formData = new root.FormData();
  this._formData.append(field, file, filename);
  return this;
};

/**
 * Send `data`, defaulting the `.type()` to "json" when
 * an object is given.
 *
 * Examples:
 *
 *       // querystring
 *       request.get('/search')
 *         .end(callback)
 *
 *       // multiple data "writes"
 *       request.get('/search')
 *         .send({ search: 'query' })
 *         .send({ range: '1..5' })
 *         .send({ order: 'desc' })
 *         .end(callback)
 *
 *       // manual json
 *       request.post('/user')
 *         .type('json')
 *         .send('{"name":"tj"})
 *         .end(callback)
 *
 *       // auto json
 *       request.post('/user')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // manual x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send('name=tj')
 *         .end(callback)
 *
 *       // auto x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // defaults to x-www-form-urlencoded
  *      request.post('/user')
  *        .send('name=tobi')
  *        .send('species=ferret')
  *        .end(callback)
 *
 * @param {String|Object} data
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.send = function(data){
  var obj = isObject(data);
  var type = this.getHeader('Content-Type');

  // merge
  if (obj && isObject(this._data)) {
    for (var key in data) {
      this._data[key] = data[key];
    }
  } else if ('string' == typeof data) {
    if (!type) this.type('form');
    type = this.getHeader('Content-Type');
    if ('application/x-www-form-urlencoded' == type) {
      this._data = this._data
        ? this._data + '&' + data
        : data;
    } else {
      this._data = (this._data || '') + data;
    }
  } else {
    this._data = data;
  }

  if (!obj || isHost(data)) return this;
  if (!type) this.type('json');
  return this;
};

/**
 * Invoke the callback with `err` and `res`
 * and handle arity check.
 *
 * @param {Error} err
 * @param {Response} res
 * @api private
 */

Request.prototype.callback = function(err, res){
  var fn = this._callback;
  this.clearTimeout();
  fn(err, res);
};

/**
 * Invoke callback with x-domain error.
 *
 * @api private
 */

Request.prototype.crossDomainError = function(){
  var err = new Error('Origin is not allowed by Access-Control-Allow-Origin');
  err.crossDomain = true;
  this.callback(err);
};

/**
 * Invoke callback with timeout error.
 *
 * @api private
 */

Request.prototype.timeoutError = function(){
  var timeout = this._timeout;
  var err = new Error('timeout of ' + timeout + 'ms exceeded');
  err.timeout = timeout;
  this.callback(err);
};

/**
 * Enable transmission of cookies with x-domain requests.
 *
 * Note that for this to work the origin must not be
 * using "Access-Control-Allow-Origin" with a wildcard,
 * and also must set "Access-Control-Allow-Credentials"
 * to "true".
 *
 * @api public
 */

Request.prototype.withCredentials = function(){
  this._withCredentials = true;
  return this;
};

/**
 * Initiate request, invoking callback `fn(res)`
 * with an instanceof `Response`.
 *
 * @param {Function} fn
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.end = function(fn){
  var self = this;
  var xhr = this.xhr = request.getXHR();
  var query = this._query.join('&');
  var timeout = this._timeout;
  var data = this._formData || this._data;

  // store callback
  this._callback = fn || noop;

  // state change
  xhr.onreadystatechange = function(){
    if (4 != xhr.readyState) return;

    // In IE9, reads to any property (e.g. status) off of an aborted XHR will
    // result in the error "Could not complete the operation due to error c00c023f"
    var status;
    try { status = xhr.status } catch(e) { status = 0; }

    if (0 == status) {
      if (self.timedout) return self.timeoutError();
      if (self.aborted) return;
      return self.crossDomainError();
    }
    self.emit('end');
  };

  // progress
  var handleProgress = function(e){
    if (e.total > 0) {
      e.percent = e.loaded / e.total * 100;
    }
    self.emit('progress', e);
  };
  if (this.hasListeners('progress')) {
    xhr.onprogress = handleProgress;
  }
  try {
    if (xhr.upload && this.hasListeners('progress')) {
      xhr.upload.onprogress = handleProgress;
    }
  } catch(e) {
    // Accessing xhr.upload fails in IE from a web worker, so just pretend it doesn't exist.
    // Reported here:
    // https://connect.microsoft.com/IE/feedback/details/837245/xmlhttprequest-upload-throws-invalid-argument-when-used-from-web-worker-context
  }

  // timeout
  if (timeout && !this._timer) {
    this._timer = setTimeout(function(){
      self.timedout = true;
      self.abort();
    }, timeout);
  }

  // querystring
  if (query) {
    query = request.serializeObject(query);
    this.url += ~this.url.indexOf('?')
      ? '&' + query
      : '?' + query;
  }

  // initiate request
  xhr.open(this.method, this.url, true);

  // CORS
  if (this._withCredentials) xhr.withCredentials = true;

  // body
  if ('GET' != this.method && 'HEAD' != this.method && 'string' != typeof data && !isHost(data)) {
    // serialize stuff
    var serialize = request.serialize[this.getHeader('Content-Type')];
    if (serialize) data = serialize(data);
  }

  // set header fields
  for (var field in this.header) {
    if (null == this.header[field]) continue;
    xhr.setRequestHeader(field, this.header[field]);
  }

  // send stuff
  this.emit('request', this);
  xhr.send(data);
  return this;
};

/**
 * Expose `Request`.
 */

request.Request = Request;

/**
 * Issue a request:
 *
 * Examples:
 *
 *    request('GET', '/users').end(callback)
 *    request('/users').end(callback)
 *    request('/users', callback)
 *
 * @param {String} method
 * @param {String|Function} url or callback
 * @return {Request}
 * @api public
 */

function request(method, url) {
  // callback
  if ('function' == typeof url) {
    return new Request('GET', method).end(url);
  }

  // url first
  if (1 == arguments.length) {
    return new Request('GET', method);
  }

  return new Request(method, url);
}

/**
 * GET `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.get = function(url, data, fn){
  var req = request('GET', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.query(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * HEAD `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.head = function(url, data, fn){
  var req = request('HEAD', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * DELETE `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.del = function(url, fn){
  var req = request('DELETE', url);
  if (fn) req.end(fn);
  return req;
};

/**
 * PATCH `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} data
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.patch = function(url, data, fn){
  var req = request('PATCH', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * POST `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} data
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.post = function(url, data, fn){
  var req = request('POST', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * PUT `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.put = function(url, data, fn){
  var req = request('PUT', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * Expose `request`.
 */

module.exports = request;

},{"emitter":62,"reduce":63}],62:[function(require,module,exports){

/**
 * Expose `Emitter`.
 */

module.exports = Emitter;

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on =
Emitter.prototype.addEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks[event] = this._callbacks[event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  var self = this;
  this._callbacks = this._callbacks || {};

  function on() {
    self.off(event, on);
    fn.apply(this, arguments);
  }

  on.fn = fn;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners =
Emitter.prototype.removeEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks[event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks[event];
    return this;
  }

  // remove specific handler
  var cb;
  for (var i = 0; i < callbacks.length; i++) {
    cb = callbacks[i];
    if (cb === fn || cb.fn === fn) {
      callbacks.splice(i, 1);
      break;
    }
  }
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks[event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks[event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

},{}],63:[function(require,module,exports){

/**
 * Reduce `arr` with `fn`.
 *
 * @param {Array} arr
 * @param {Function} fn
 * @param {Mixed} initial
 *
 * TODO: combatible error handling?
 */

module.exports = function(arr, fn, initial){  
  var idx = 0;
  var len = arr.length;
  var curr = arguments.length == 3
    ? initial
    : arr[idx++];

  while (idx < len) {
    curr = fn.call(null, curr, arr[idx], ++idx, arr);
  }
  
  return curr;
};
},{}],64:[function(require,module,exports){
(function() {
  module.exports = function(Promise) {
    var PreparedTransaction, Transaction, TransactionRunner, promises;
    promises = require('./promises')(Promise);
    Transaction = require('./transaction')(promises);
    PreparedTransaction = require('./prepared-transaction')(promises, Transaction);
    TransactionRunner = require('./transaction-runner')(Promise, Transaction, PreparedTransaction);
    return TransactionRunner;
  };

}).call(this);

},{"./prepared-transaction":65,"./promises":66,"./transaction":68,"./transaction-runner":67}],65:[function(require,module,exports){
(function() {
  module.exports = function(promises, Transaction) {
    var PreparedTransaction, noop;
    noop = function() {};

    /*
    PreparedTransaction a :: {
      done: Promise a
      rollback: () -> Promise
      abort: () -> Promise
    }
     */
    return PreparedTransaction = (function() {

      /*
      fromCreator :: (f: ({ done, rollback, abort }) -> ()) -> Transaction
       */
      PreparedTransaction.fromCreator = function(f) {
        var t;
        t = {
          done: null,
          rollback: null,
          abort: null
        };
        return new PreparedTransaction(function() {
          t.done = promises.resolve(f({
            rollback: function(v) {
              return t.rollback = v;
            },
            abort: function(v) {
              return t.abort = v;
            }
          }));
          return Transaction.create(t);
        });
      };

      PreparedTransaction.empty = new PreparedTransaction(function() {
        return Transaction.empty;
      });

      PreparedTransaction.unit = function(v) {
        return new PreparedTransaction(function() {
          return Transaction.unit(v);
        });
      };


      /*
      startEventually: Promise (() -> Transaction a)
       */

      function PreparedTransaction(startEventually) {
        var abort, done, rollback;
        done = promises.defer();
        rollback = promises.defer();
        abort = promises.defer();
        this.done = done.promise;
        this.rollback = function() {
          return rollback.promise.then(function(f) {
            return f();
          });
        };
        this.abort = function() {
          return abort.promise.then(function(f) {
            return f();
          });
        };
        promises.resolve(startEventually).then(function(start) {
          return start();
        }).then(function(t) {
          t.done.then(done.resolve, done.reject);
          abort.resolve(t.abort);
          return rollback.resolve(t.rollback);
        });
      }

      PreparedTransaction.prototype.done = null;

      PreparedTransaction.prototype.rollback = null;

      PreparedTransaction.prototype.abort = null;


      /*
      flatMapDone: (f: (a) -> PreparedTransaction b) -> PreparedTransaction b
       */

      PreparedTransaction.prototype.flatMapDone = function(f) {
        return new PreparedTransaction((function(_this) {
          return function() {
            var aborted, ta, tb;
            ta = new Transaction(_this);
            tb = ta.flatMapDone(function(a) {
              return new Transaction(f(a));
            });
            aborted = promises.defer();
            return new Transaction({
              done: tb.done,
              abort: function() {
                aborted.resolve();
                return tb.abort();
              },
              rollback: function() {
                return promises.ifCompleted(aborted.promise, ta.rollback, tb.rollback);
              }
            });
          };
        })(this));
      };

      return PreparedTransaction;

    })();
  };

}).call(this);

},{}],66:[function(require,module,exports){
(function() {
  module.exports = function(Promise) {
    var abortAndRejectUnlessCompleted, defer, ifCompleted, rollbackIfCompleted;
    defer = function() {
      var deferred;
      deferred = {
        promise: null,
        resolve: null,
        reject: null
      };
      deferred.promise = new Promise(function(resolve, reject) {
        deferred.resolve = resolve;
        return deferred.reject = reject;
      });
      return deferred;
    };
    rollbackIfCompleted = function(done, rollback) {
      return done.then(rollback, function() {
        return Promise.reject(new Error("Can't roll back a transaction that did not complete"));
      });
    };
    ifCompleted = function(promise, thenDo, elseDo) {
      return Promise.race([
        promise.then(function() {
          return thenDo;
        }, function() {
          return thenDo;
        }), Promise.resolve(elseDo).delay(0)
      ]).then(function(choice) {
        return choice();
      });
    };
    abortAndRejectUnlessCompleted = function(done, abort, rejectDone) {
      return ifCompleted(done, function() {
        return Promise.reject(new Error("Can't abort a transaction that did complete"));
      }, function() {
        rejectDone(new Error('Transaction aborted'));
        return abort();
      });
    };
    return {
      resolve: function(v) {
        return Promise.resolve(v);
      },
      reject: function(v) {
        return Promise.reject(v);
      },
      defer: defer,
      rollbackIfCompleted: rollbackIfCompleted,
      ifCompleted: ifCompleted,
      abortAndRejectUnlessCompleted: abortAndRejectUnlessCompleted
    };
  };

}).call(this);

},{}],67:[function(require,module,exports){
(function() {
  module.exports = function(Promise, Transaction, PreparedTransaction) {

    /*
    TransactionRunner a :: {
      run :: (f: (Transaction a) -> (b | Promise b)) -> Promise b
    }
     */
    var TransactionRunner;
    return TransactionRunner = (function() {
      TransactionRunner.empty = new TransactionRunner(function() {
        return Transaction.empty;
      });

      TransactionRunner.unit = function(v) {
        return new TransactionRunner(function() {
          return Transaction.unit(v);
        });
      };


      /*
      TransactionRunner.step :: (f: ({ rollback, abort }) -> Promise a) -> TransactionRunner a
       */

      TransactionRunner.step = function(creator) {
        return new TransactionRunner(function() {
          return PreparedTransaction.fromCreator(creator);
        });
      };


      /*
      start :: (() -> Transaction a) | Promise (() -> Transaction a)
       */

      function TransactionRunner(start) {

        /*
        g: (PreparedTransaction a) -> (b | Promise b)
         */
        this.run = function(g) {
          return Promise.resolve(g(new PreparedTransaction(start)));
        };
      }


      /*
      (f: (a) -> TransactionRunner b) -> TransactionRunner b
       */

      TransactionRunner.prototype.flatMapDone = function(f) {
        return new TransactionRunner((function(_this) {
          return function() {
            return _this.run(function(ta) {
              return ta.flatMapDone(function(a) {
                return PreparedTransaction.fromCreator(function(arg) {
                  var abort, rollback;
                  abort = arg.abort, rollback = arg.rollback;
                  return f(a).run(function(tb) {
                    abort(tb.abort);
                    rollback(tb.rollback);
                    return tb.done;
                  });
                });
              });
            });
          };
        })(this));
      };


      /*
      run :: (f: (PreparedTransaction a) -> (b | Promise b)) -> Promise b
       */

      TransactionRunner.prototype.run = function() {
        throw new Error('not implemented');
      };

      return TransactionRunner;

    })();
  };

}).call(this);

},{}],68:[function(require,module,exports){
(function() {
  module.exports = function(promises) {

    /*
    Transaction a :: {
      rollback: () -> Promise
      abort: () -> Promise
      done: Promise a
    }
     */
    var Transaction;
    return Transaction = (function() {
      Transaction.create = function(arg) {
        var abort, dfd, done, ref, rollback, t;
        ref = arg != null ? arg : {}, done = ref.done, rollback = ref.rollback, abort = ref.abort;
        t = {
          done: null,
          rollback: null,
          abort: null
        };
        dfd = promises.defer();
        t.done = dfd.promise;
        switch (done != null) {
          case true:
            promises.resolve(done).then(dfd.resolve, dfd.reject);
            break;
          default:
            dfd.reject(new Error("Transaction did not declare a 'done' condition"));
        }
        if (rollback != null) {
          t.rollback = function() {
            return promises.rollbackIfCompleted(t.done, rollback);
          };
        }
        if (abort != null) {
          t.abort = function() {
            return promises.abortAndRejectUnlessCompleted(t.done, abort, dfd.reject);
          };
        }
        return new Transaction(t);
      };


      /*
      Transaction null
       */

      Transaction.empty = Transaction.create({
        done: promises.resolve()
      });


      /*
      (a) -> Transaction a
       */

      Transaction.unit = function(v) {
        return Transaction.create({
          done: promises.resolve(v)
        });
      };

      function Transaction(arg) {
        var abort, done, ref, rollback;
        ref = arg != null ? arg : {}, done = ref.done, rollback = ref.rollback, abort = ref.abort;
        this.done = (function() {
          switch (done != null) {
            case true:
              return done;
            default:
              return promises.reject(new Error("Transaction did not declare a 'done' condition"));
          }
        })();
        if (rollback != null) {
          this.rollback = rollback;
        }
        if (abort != null) {
          this.abort = abort;
        }
      }


      /*
      Signal transaction completion; no longer abortable, but might be rollbackable
       */

      Transaction.prototype.done = null;


      /*
      Attempt to undo transaction if it's complete
       */

      Transaction.prototype.rollback = function() {
        return promises.reject(new Error('Transaction did not declare a rollback instruction'));
      };


      /*
      Attempt to signal transaction abortion if it's in progress
       */

      Transaction.prototype.abort = function() {
        return promises.reject(new Error('Transaction did not declare an abort instruction'));
      };


      /*
      f: (a -> Transaction b) -> Transaction b
       */

      Transaction.prototype.flatMapDone = function(f) {
        var next, nextDone;
        next = this.done.then(f);
        nextDone = next.then(function(t) {
          return t.done;
        });
        return new Transaction({
          done: nextDone,
          rollback: (function(_this) {
            return function() {
              return nextDone.then(function() {
                return next.value().rollback().then(function() {
                  return _this.rollback();
                });
              }, _this.rollback);
            };
          })(this),
          abort: (function(_this) {
            return function() {
              return promises.ifCompleted(_this.done, function() {
                return next.then(function(tb) {
                  return tb.abort();
                });
              }, _this.abort);
            };
          })(this)
        });
      };

      return Transaction;

    })();
  };

}).call(this);

},{}],69:[function(require,module,exports){

/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = require('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;

/**
 * Use chrome.storage.local if we are in an app
 */

var storage;

if (typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined')
  storage = chrome.storage.local;
else
  storage = localstorage();

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // is webkit? http://stackoverflow.com/a/16459606/376773
  return ('WebkitAppearance' in document.documentElement.style) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (window.console && (console.firebug || (console.exception && console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  return JSON.stringify(v);
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs() {
  var args = arguments;
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return args;

  var c = 'color: ' + this.color;
  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
  return args;
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      storage.removeItem('debug');
    } else {
      storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = storage.debug;
  } catch(e) {}
  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage(){
  try {
    return window.localStorage;
  } catch (e) {}
}

},{"./debug":70}],70:[function(require,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = debug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = require('ms');

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lowercased letter, i.e. "n".
 */

exports.formatters = {};

/**
 * Previously assigned color.
 */

var prevColor = 0;

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 *
 * @return {Number}
 * @api private
 */

function selectColor() {
  return exports.colors[prevColor++ % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function debug(namespace) {

  // define the `disabled` version
  function disabled() {
  }
  disabled.enabled = false;

  // define the `enabled` version
  function enabled() {

    var self = enabled;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // add the `color` if not set
    if (null == self.useColors) self.useColors = exports.useColors();
    if (null == self.color && self.useColors) self.color = selectColor();

    var args = Array.prototype.slice.call(arguments);

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %o
      args = ['%o'].concat(args);
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    if ('function' === typeof exports.formatArgs) {
      args = exports.formatArgs.apply(self, args);
    }
    var logFn = enabled.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }
  enabled.enabled = true;

  var fn = exports.enabled(namespace) ? enabled : disabled;

  fn.namespace = namespace;

  return fn;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  var split = (namespaces || '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

},{"ms":71}],71:[function(require,module,exports){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} options
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options){
  options = options || {};
  if ('string' == typeof val) return parse(val);
  return options.long
    ? long(val)
    : short(val);
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str);
  if (!match) return;
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function short(ms) {
  if (ms >= d) return Math.round(ms / d) + 'd';
  if (ms >= h) return Math.round(ms / h) + 'h';
  if (ms >= m) return Math.round(ms / m) + 'm';
  if (ms >= s) return Math.round(ms / s) + 's';
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function long(ms) {
  return plural(ms, d, 'day')
    || plural(ms, h, 'hour')
    || plural(ms, m, 'minute')
    || plural(ms, s, 'second')
    || ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) return;
  if (ms < n * 1.5) return Math.floor(ms / n) + ' ' + name;
  return Math.ceil(ms / n) + ' ' + name + 's';
}

},{}],72:[function(require,module,exports){
var isArray = require('../lang/isArray');

/**
 * The inverse of `_.pairs`; this method returns an object composed from arrays
 * of property names and values. Provide either a single two dimensional array,
 * e.g. `[[key1, value1], [key2, value2]]` or two arrays, one of property names
 * and one of corresponding values.
 *
 * @static
 * @memberOf _
 * @alias object
 * @category Array
 * @param {Array} props The property names.
 * @param {Array} [values=[]] The property values.
 * @returns {Object} Returns the new object.
 * @example
 *
 * _.zipObject([['fred', 30], ['barney', 40]]);
 * // => { 'fred': 30, 'barney': 40 }
 *
 * _.zipObject(['fred', 'barney'], [30, 40]);
 * // => { 'fred': 30, 'barney': 40 }
 */
function zipObject(props, values) {
  var index = -1,
      length = props ? props.length : 0,
      result = {};

  if (length && !values && !isArray(props[0])) {
    values = [];
  }
  while (++index < length) {
    var key = props[index];
    if (values) {
      result[key] = values[index];
    } else if (key) {
      result[key[0]] = key[1];
    }
  }
  return result;
}

module.exports = zipObject;

},{"../lang/isArray":144}],73:[function(require,module,exports){
var LazyWrapper = require('../internal/LazyWrapper'),
    LodashWrapper = require('../internal/LodashWrapper'),
    baseLodash = require('../internal/baseLodash'),
    isArray = require('../lang/isArray'),
    isObjectLike = require('../internal/isObjectLike'),
    wrapperClone = require('../internal/wrapperClone');

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Creates a `lodash` object which wraps `value` to enable implicit chaining.
 * Methods that operate on and return arrays, collections, and functions can
 * be chained together. Methods that return a boolean or single value will
 * automatically end the chain returning the unwrapped value. Explicit chaining
 * may be enabled using `_.chain`. The execution of chained methods is lazy,
 * that is, execution is deferred until `_#value` is implicitly or explicitly
 * called.
 *
 * Lazy evaluation allows several methods to support shortcut fusion. Shortcut
 * fusion is an optimization that merges iteratees to avoid creating intermediate
 * arrays and reduce the number of iteratee executions.
 *
 * Chaining is supported in custom builds as long as the `_#value` method is
 * directly or indirectly included in the build.
 *
 * In addition to lodash methods, wrappers have `Array` and `String` methods.
 *
 * The wrapper `Array` methods are:
 * `concat`, `join`, `pop`, `push`, `reverse`, `shift`, `slice`, `sort`,
 * `splice`, and `unshift`
 *
 * The wrapper `String` methods are:
 * `replace` and `split`
 *
 * The wrapper methods that support shortcut fusion are:
 * `compact`, `drop`, `dropRight`, `dropRightWhile`, `dropWhile`, `filter`,
 * `first`, `initial`, `last`, `map`, `pluck`, `reject`, `rest`, `reverse`,
 * `slice`, `take`, `takeRight`, `takeRightWhile`, `takeWhile`, `toArray`,
 * and `where`
 *
 * The chainable wrapper methods are:
 * `after`, `ary`, `assign`, `at`, `before`, `bind`, `bindAll`, `bindKey`,
 * `callback`, `chain`, `chunk`, `commit`, `compact`, `concat`, `constant`,
 * `countBy`, `create`, `curry`, `debounce`, `defaults`, `defer`, `delay`,
 * `difference`, `drop`, `dropRight`, `dropRightWhile`, `dropWhile`, `fill`,
 * `filter`, `flatten`, `flattenDeep`, `flow`, `flowRight`, `forEach`,
 * `forEachRight`, `forIn`, `forInRight`, `forOwn`, `forOwnRight`, `functions`,
 * `groupBy`, `indexBy`, `initial`, `intersection`, `invert`, `invoke`, `keys`,
 * `keysIn`, `map`, `mapValues`, `matches`, `matchesProperty`, `memoize`, `merge`,
 * `mixin`, `negate`, `noop`, `omit`, `once`, `pairs`, `partial`, `partialRight`,
 * `partition`, `pick`, `plant`, `pluck`, `property`, `propertyOf`, `pull`,
 * `pullAt`, `push`, `range`, `rearg`, `reject`, `remove`, `rest`, `reverse`,
 * `shuffle`, `slice`, `sort`, `sortBy`, `sortByAll`, `sortByOrder`, `splice`,
 * `spread`, `take`, `takeRight`, `takeRightWhile`, `takeWhile`, `tap`,
 * `throttle`, `thru`, `times`, `toArray`, `toPlainObject`, `transform`,
 * `union`, `uniq`, `unshift`, `unzip`, `values`, `valuesIn`, `where`,
 * `without`, `wrap`, `xor`, `zip`, and `zipObject`
 *
 * The wrapper methods that are **not** chainable by default are:
 * `add`, `attempt`, `camelCase`, `capitalize`, `clone`, `cloneDeep`, `deburr`,
 * `endsWith`, `escape`, `escapeRegExp`, `every`, `find`, `findIndex`, `findKey`,
 * `findLast`, `findLastIndex`, `findLastKey`, `findWhere`, `first`, `has`,
 * `identity`, `includes`, `indexOf`, `inRange`, `isArguments`, `isArray`,
 * `isBoolean`, `isDate`, `isElement`, `isEmpty`, `isEqual`, `isError`,
 * `isFinite`,`isFunction`, `isMatch`, `isNative`, `isNaN`, `isNull`, `isNumber`,
 * `isObject`, `isPlainObject`, `isRegExp`, `isString`, `isUndefined`,
 * `isTypedArray`, `join`, `kebabCase`, `last`, `lastIndexOf`, `max`, `min`,
 * `noConflict`, `now`, `pad`, `padLeft`, `padRight`, `parseInt`, `pop`,
 * `random`, `reduce`, `reduceRight`, `repeat`, `result`, `runInContext`,
 * `shift`, `size`, `snakeCase`, `some`, `sortedIndex`, `sortedLastIndex`,
 * `startCase`, `startsWith`, `sum`, `template`, `trim`, `trimLeft`,
 * `trimRight`, `trunc`, `unescape`, `uniqueId`, `value`, and `words`
 *
 * The wrapper method `sample` will return a wrapped value when `n` is provided,
 * otherwise an unwrapped value is returned.
 *
 * @name _
 * @constructor
 * @category Chain
 * @param {*} value The value to wrap in a `lodash` instance.
 * @returns {Object} Returns the new `lodash` wrapper instance.
 * @example
 *
 * var wrapped = _([1, 2, 3]);
 *
 * // returns an unwrapped value
 * wrapped.reduce(function(sum, n) {
 *   return sum + n;
 * });
 * // => 6
 *
 * // returns a wrapped value
 * var squares = wrapped.map(function(n) {
 *   return n * n;
 * });
 *
 * _.isArray(squares);
 * // => false
 *
 * _.isArray(squares.value());
 * // => true
 */
function lodash(value) {
  if (isObjectLike(value) && !isArray(value) && !(value instanceof LazyWrapper)) {
    if (value instanceof LodashWrapper) {
      return value;
    }
    if (hasOwnProperty.call(value, '__chain__') && hasOwnProperty.call(value, '__wrapped__')) {
      return wrapperClone(value);
    }
  }
  return new LodashWrapper(value);
}

// Ensure wrappers are instances of `baseLodash`.
lodash.prototype = baseLodash.prototype;

module.exports = lodash;

},{"../internal/LazyWrapper":79,"../internal/LodashWrapper":80,"../internal/baseLodash":96,"../internal/isObjectLike":130,"../internal/wrapperClone":141,"../lang/isArray":144}],74:[function(require,module,exports){
module.exports = require('./includes');

},{"./includes":75}],75:[function(require,module,exports){
var baseIndexOf = require('../internal/baseIndexOf'),
    isArray = require('../lang/isArray'),
    isIterateeCall = require('../internal/isIterateeCall'),
    isLength = require('../internal/isLength'),
    isString = require('../lang/isString'),
    values = require('../object/values');

/* Native method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * Checks if `value` is in `collection` using `SameValueZero` for equality
 * comparisons. If `fromIndex` is negative, it is used as the offset from
 * the end of `collection`.
 *
 * **Note:** [`SameValueZero`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-samevaluezero)
 * comparisons are like strict equality comparisons, e.g. `===`, except that
 * `NaN` matches `NaN`.
 *
 * @static
 * @memberOf _
 * @alias contains, include
 * @category Collection
 * @param {Array|Object|string} collection The collection to search.
 * @param {*} target The value to search for.
 * @param {number} [fromIndex=0] The index to search from.
 * @param- {Object} [guard] Enables use as a callback for functions like `_.reduce`.
 * @returns {boolean} Returns `true` if a matching element is found, else `false`.
 * @example
 *
 * _.includes([1, 2, 3], 1);
 * // => true
 *
 * _.includes([1, 2, 3], 1, 2);
 * // => false
 *
 * _.includes({ 'user': 'fred', 'age': 40 }, 'fred');
 * // => true
 *
 * _.includes('pebbles', 'eb');
 * // => true
 */
function includes(collection, target, fromIndex, guard) {
  var length = collection ? collection.length : 0;
  if (!isLength(length)) {
    collection = values(collection);
    length = collection.length;
  }
  if (!length) {
    return false;
  }
  if (typeof fromIndex != 'number' || (guard && isIterateeCall(target, fromIndex, guard))) {
    fromIndex = 0;
  } else {
    fromIndex = fromIndex < 0 ? nativeMax(length + fromIndex, 0) : (fromIndex || 0);
  }
  return (typeof collection == 'string' || !isArray(collection) && isString(collection))
    ? (fromIndex < length && collection.indexOf(target, fromIndex) > -1)
    : (baseIndexOf(collection, target, fromIndex) > -1);
}

module.exports = includes;

},{"../internal/baseIndexOf":92,"../internal/isIterateeCall":127,"../internal/isLength":129,"../lang/isArray":144,"../lang/isString":149,"../object/values":159}],76:[function(require,module,exports){
var isNative = require('../lang/isNative');

/* Native method references for those with the same name as other `lodash` methods. */
var nativeNow = isNative(nativeNow = Date.now) && nativeNow;

/**
 * Gets the number of milliseconds that have elapsed since the Unix epoch
 * (1 January 1970 00:00:00 UTC).
 *
 * @static
 * @memberOf _
 * @category Date
 * @example
 *
 * _.defer(function(stamp) {
 *   console.log(_.now() - stamp);
 * }, _.now());
 * // => logs the number of milliseconds it took for the deferred function to be invoked
 */
var now = nativeNow || function() {
  return new Date().getTime();
};

module.exports = now;

},{"../lang/isNative":146}],77:[function(require,module,exports){
var createPartial = require('../internal/createPartial');

/** Used to compose bitmasks for wrapper metadata. */
var PARTIAL_RIGHT_FLAG = 64;

/**
 * This method is like `_.partial` except that partially applied arguments
 * are appended to those provided to the new function.
 *
 * The `_.partialRight.placeholder` value, which defaults to `_` in monolithic
 * builds, may be used as a placeholder for partially applied arguments.
 *
 * **Note:** This method does not set the `length` property of partially
 * applied functions.
 *
 * @static
 * @memberOf _
 * @category Function
 * @param {Function} func The function to partially apply arguments to.
 * @param {...*} [partials] The arguments to be partially applied.
 * @returns {Function} Returns the new partially applied function.
 * @example
 *
 * var greet = function(greeting, name) {
 *   return greeting + ' ' + name;
 * };
 *
 * var greetFred = _.partialRight(greet, 'fred');
 * greetFred('hi');
 * // => 'hi fred'
 *
 * // using placeholders
 * var sayHelloTo = _.partialRight(greet, 'hello', _);
 * sayHelloTo('fred');
 * // => 'hello fred'
 */
var partialRight = createPartial(PARTIAL_RIGHT_FLAG);

// Assign default placeholders.
partialRight.placeholder = {};

module.exports = partialRight;

},{"../internal/createPartial":114}],78:[function(require,module,exports){
/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/* Native method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * Creates a function that invokes `func` with the `this` binding of the
 * created function and arguments from `start` and beyond provided as an array.
 *
 * **Note:** This method is based on the [rest parameter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters).
 *
 * @static
 * @memberOf _
 * @category Function
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @returns {Function} Returns the new function.
 * @example
 *
 * var say = _.restParam(function(what, names) {
 *   return what + ' ' + _.initial(names).join(', ') +
 *     (_.size(names) > 1 ? ', & ' : '') + _.last(names);
 * });
 *
 * say('hello', 'fred', 'barney', 'pebbles');
 * // => 'hello fred, barney, & pebbles'
 */
function restParam(func, start) {
  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  start = nativeMax(typeof start == 'undefined' ? (func.length - 1) : (+start || 0), 0);
  return function() {
    var args = arguments,
        index = -1,
        length = nativeMax(args.length - start, 0),
        rest = Array(length);

    while (++index < length) {
      rest[index] = args[start + index];
    }
    switch (start) {
      case 0: return func.call(this, rest);
      case 1: return func.call(this, args[0], rest);
      case 2: return func.call(this, args[0], args[1], rest);
    }
    var otherArgs = Array(start + 1);
    index = -1;
    while (++index < start) {
      otherArgs[index] = args[index];
    }
    otherArgs[start] = rest;
    return func.apply(this, otherArgs);
  };
}

module.exports = restParam;

},{}],79:[function(require,module,exports){
var baseCreate = require('./baseCreate'),
    baseLodash = require('./baseLodash');

/** Used as references for `-Infinity` and `Infinity`. */
var POSITIVE_INFINITY = Number.POSITIVE_INFINITY;

/**
 * Creates a lazy wrapper object which wraps `value` to enable lazy evaluation.
 *
 * @private
 * @param {*} value The value to wrap.
 */
function LazyWrapper(value) {
  this.__wrapped__ = value;
  this.__actions__ = null;
  this.__dir__ = 1;
  this.__dropCount__ = 0;
  this.__filtered__ = false;
  this.__iteratees__ = null;
  this.__takeCount__ = POSITIVE_INFINITY;
  this.__views__ = null;
}

LazyWrapper.prototype = baseCreate(baseLodash.prototype);
LazyWrapper.prototype.constructor = LazyWrapper;

module.exports = LazyWrapper;

},{"./baseCreate":88,"./baseLodash":96}],80:[function(require,module,exports){
var baseCreate = require('./baseCreate'),
    baseLodash = require('./baseLodash');

/**
 * The base constructor for creating `lodash` wrapper objects.
 *
 * @private
 * @param {*} value The value to wrap.
 * @param {boolean} [chainAll] Enable chaining for all wrapper methods.
 * @param {Array} [actions=[]] Actions to peform to resolve the unwrapped value.
 */
function LodashWrapper(value, chainAll, actions) {
  this.__wrapped__ = value;
  this.__actions__ = actions || [];
  this.__chain__ = !!chainAll;
}

LodashWrapper.prototype = baseCreate(baseLodash.prototype);
LodashWrapper.prototype.constructor = LodashWrapper;

module.exports = LodashWrapper;

},{"./baseCreate":88,"./baseLodash":96}],81:[function(require,module,exports){
/**
 * Copies the values of `source` to `array`.
 *
 * @private
 * @param {Array} source The array to copy values from.
 * @param {Array} [array=[]] The array to copy values to.
 * @returns {Array} Returns `array`.
 */
function arrayCopy(source, array) {
  var index = -1,
      length = source.length;

  array || (array = Array(length));
  while (++index < length) {
    array[index] = source[index];
  }
  return array;
}

module.exports = arrayCopy;

},{}],82:[function(require,module,exports){
/**
 * A specialized version of `_.forEach` for arrays without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Array} array The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns `array`.
 */
function arrayEach(array, iteratee) {
  var index = -1,
      length = array.length;

  while (++index < length) {
    if (iteratee(array[index], index, array) === false) {
      break;
    }
  }
  return array;
}

module.exports = arrayEach;

},{}],83:[function(require,module,exports){
/**
 * Used by `_.defaults` to customize its `_.assign` use.
 *
 * @private
 * @param {*} objectValue The destination object property value.
 * @param {*} sourceValue The source object property value.
 * @returns {*} Returns the value to assign to the destination object.
 */
function assignDefaults(objectValue, sourceValue) {
  return typeof objectValue == 'undefined' ? sourceValue : objectValue;
}

module.exports = assignDefaults;

},{}],84:[function(require,module,exports){
var baseCopy = require('./baseCopy'),
    keys = require('../object/keys');

/**
 * The base implementation of `_.assign` without support for argument juggling,
 * multiple sources, and `this` binding `customizer` functions.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @param {Function} [customizer] The function to customize assigning values.
 * @returns {Object} Returns the destination object.
 */
function baseAssign(object, source, customizer) {
  var props = keys(source);
  if (!customizer) {
    return baseCopy(source, object, props);
  }
  var index = -1,
      length = props.length;

  while (++index < length) {
    var key = props[index],
        value = object[key],
        result = customizer(value, source[key], key, object, source);

    if ((result === result ? (result !== value) : (value === value)) ||
        (typeof value == 'undefined' && !(key in object))) {
      object[key] = result;
    }
  }
  return object;
}

module.exports = baseAssign;

},{"../object/keys":154,"./baseCopy":87}],85:[function(require,module,exports){
var baseMatches = require('./baseMatches'),
    baseMatchesProperty = require('./baseMatchesProperty'),
    baseProperty = require('./baseProperty'),
    bindCallback = require('./bindCallback'),
    identity = require('../utility/identity');

/**
 * The base implementation of `_.callback` which supports specifying the
 * number of arguments to provide to `func`.
 *
 * @private
 * @param {*} [func=_.identity] The value to convert to a callback.
 * @param {*} [thisArg] The `this` binding of `func`.
 * @param {number} [argCount] The number of arguments to provide to `func`.
 * @returns {Function} Returns the callback.
 */
function baseCallback(func, thisArg, argCount) {
  var type = typeof func;
  if (type == 'function') {
    return typeof thisArg == 'undefined'
      ? func
      : bindCallback(func, thisArg, argCount);
  }
  if (func == null) {
    return identity;
  }
  if (type == 'object') {
    return baseMatches(func);
  }
  return typeof thisArg == 'undefined'
    ? baseProperty(func + '')
    : baseMatchesProperty(func + '', thisArg);
}

module.exports = baseCallback;

},{"../utility/identity":163,"./baseMatches":97,"./baseMatchesProperty":98,"./baseProperty":101,"./bindCallback":105}],86:[function(require,module,exports){
var arrayCopy = require('./arrayCopy'),
    arrayEach = require('./arrayEach'),
    baseCopy = require('./baseCopy'),
    baseForOwn = require('./baseForOwn'),
    initCloneArray = require('./initCloneArray'),
    initCloneByTag = require('./initCloneByTag'),
    initCloneObject = require('./initCloneObject'),
    isArray = require('../lang/isArray'),
    isObject = require('../lang/isObject'),
    keys = require('../object/keys');

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    arrayTag = '[object Array]',
    boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    errorTag = '[object Error]',
    funcTag = '[object Function]',
    mapTag = '[object Map]',
    numberTag = '[object Number]',
    objectTag = '[object Object]',
    regexpTag = '[object RegExp]',
    setTag = '[object Set]',
    stringTag = '[object String]',
    weakMapTag = '[object WeakMap]';

var arrayBufferTag = '[object ArrayBuffer]',
    float32Tag = '[object Float32Array]',
    float64Tag = '[object Float64Array]',
    int8Tag = '[object Int8Array]',
    int16Tag = '[object Int16Array]',
    int32Tag = '[object Int32Array]',
    uint8Tag = '[object Uint8Array]',
    uint8ClampedTag = '[object Uint8ClampedArray]',
    uint16Tag = '[object Uint16Array]',
    uint32Tag = '[object Uint32Array]';

/** Used to identify `toStringTag` values supported by `_.clone`. */
var cloneableTags = {};
cloneableTags[argsTag] = cloneableTags[arrayTag] =
cloneableTags[arrayBufferTag] = cloneableTags[boolTag] =
cloneableTags[dateTag] = cloneableTags[float32Tag] =
cloneableTags[float64Tag] = cloneableTags[int8Tag] =
cloneableTags[int16Tag] = cloneableTags[int32Tag] =
cloneableTags[numberTag] = cloneableTags[objectTag] =
cloneableTags[regexpTag] = cloneableTags[stringTag] =
cloneableTags[uint8Tag] = cloneableTags[uint8ClampedTag] =
cloneableTags[uint16Tag] = cloneableTags[uint32Tag] = true;
cloneableTags[errorTag] = cloneableTags[funcTag] =
cloneableTags[mapTag] = cloneableTags[setTag] =
cloneableTags[weakMapTag] = false;

/** Used for native method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/**
 * The base implementation of `_.clone` without support for argument juggling
 * and `this` binding `customizer` functions.
 *
 * @private
 * @param {*} value The value to clone.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @param {Function} [customizer] The function to customize cloning values.
 * @param {string} [key] The key of `value`.
 * @param {Object} [object] The object `value` belongs to.
 * @param {Array} [stackA=[]] Tracks traversed source objects.
 * @param {Array} [stackB=[]] Associates clones with source counterparts.
 * @returns {*} Returns the cloned value.
 */
function baseClone(value, isDeep, customizer, key, object, stackA, stackB) {
  var result;
  if (customizer) {
    result = object ? customizer(value, key, object) : customizer(value);
  }
  if (typeof result != 'undefined') {
    return result;
  }
  if (!isObject(value)) {
    return value;
  }
  var isArr = isArray(value);
  if (isArr) {
    result = initCloneArray(value);
    if (!isDeep) {
      return arrayCopy(value, result);
    }
  } else {
    var tag = objToString.call(value),
        isFunc = tag == funcTag;

    if (tag == objectTag || tag == argsTag || (isFunc && !object)) {
      result = initCloneObject(isFunc ? {} : value);
      if (!isDeep) {
        return baseCopy(value, result, keys(value));
      }
    } else {
      return cloneableTags[tag]
        ? initCloneByTag(value, tag, isDeep)
        : (object ? value : {});
    }
  }
  // Check for circular references and return corresponding clone.
  stackA || (stackA = []);
  stackB || (stackB = []);

  var length = stackA.length;
  while (length--) {
    if (stackA[length] == value) {
      return stackB[length];
    }
  }
  // Add the source value to the stack of traversed objects and associate it with its clone.
  stackA.push(value);
  stackB.push(result);

  // Recursively populate clone (susceptible to call stack limits).
  (isArr ? arrayEach : baseForOwn)(value, function(subValue, key) {
    result[key] = baseClone(subValue, isDeep, customizer, key, value, stackA, stackB);
  });
  return result;
}

module.exports = baseClone;

},{"../lang/isArray":144,"../lang/isObject":147,"../object/keys":154,"./arrayCopy":81,"./arrayEach":82,"./baseCopy":87,"./baseForOwn":91,"./initCloneArray":123,"./initCloneByTag":124,"./initCloneObject":125}],87:[function(require,module,exports){
/**
 * Copies the properties of `source` to `object`.
 *
 * @private
 * @param {Object} source The object to copy properties from.
 * @param {Object} [object={}] The object to copy properties to.
 * @param {Array} props The property names to copy.
 * @returns {Object} Returns `object`.
 */
function baseCopy(source, object, props) {
  if (!props) {
    props = object;
    object = {};
  }
  var index = -1,
      length = props.length;

  while (++index < length) {
    var key = props[index];
    object[key] = source[key];
  }
  return object;
}

module.exports = baseCopy;

},{}],88:[function(require,module,exports){
(function (global){
var isObject = require('../lang/isObject');

/**
 * The base implementation of `_.create` without support for assigning
 * properties to the created object.
 *
 * @private
 * @param {Object} prototype The object to inherit from.
 * @returns {Object} Returns the new object.
 */
var baseCreate = (function() {
  function Object() {}
  return function(prototype) {
    if (isObject(prototype)) {
      Object.prototype = prototype;
      var result = new Object;
      Object.prototype = null;
    }
    return result || global.Object();
  };
}());

module.exports = baseCreate;

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../lang/isObject":147}],89:[function(require,module,exports){
var createBaseFor = require('./createBaseFor');

/**
 * The base implementation of `baseForIn` and `baseForOwn` which iterates
 * over `object` properties returned by `keysFunc` invoking `iteratee` for
 * each property. Iterator functions may exit iteration early by explicitly
 * returning `false`.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @param {Function} keysFunc The function to get the keys of `object`.
 * @returns {Object} Returns `object`.
 */
var baseFor = createBaseFor();

module.exports = baseFor;

},{"./createBaseFor":110}],90:[function(require,module,exports){
var baseFor = require('./baseFor'),
    keysIn = require('../object/keysIn');

/**
 * The base implementation of `_.forIn` without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Object} Returns `object`.
 */
function baseForIn(object, iteratee) {
  return baseFor(object, iteratee, keysIn);
}

module.exports = baseForIn;

},{"../object/keysIn":155,"./baseFor":89}],91:[function(require,module,exports){
var baseFor = require('./baseFor'),
    keys = require('../object/keys');

/**
 * The base implementation of `_.forOwn` without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Object} Returns `object`.
 */
function baseForOwn(object, iteratee) {
  return baseFor(object, iteratee, keys);
}

module.exports = baseForOwn;

},{"../object/keys":154,"./baseFor":89}],92:[function(require,module,exports){
var indexOfNaN = require('./indexOfNaN');

/**
 * The base implementation of `_.indexOf` without support for binary searches.
 *
 * @private
 * @param {Array} array The array to search.
 * @param {*} value The value to search for.
 * @param {number} fromIndex The index to search from.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function baseIndexOf(array, value, fromIndex) {
  if (value !== value) {
    return indexOfNaN(array, fromIndex);
  }
  var index = fromIndex - 1,
      length = array.length;

  while (++index < length) {
    if (array[index] === value) {
      return index;
    }
  }
  return -1;
}

module.exports = baseIndexOf;

},{"./indexOfNaN":122}],93:[function(require,module,exports){
var baseIsEqualDeep = require('./baseIsEqualDeep');

/**
 * The base implementation of `_.isEqual` without support for `this` binding
 * `customizer` functions.
 *
 * @private
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @param {Function} [customizer] The function to customize comparing values.
 * @param {boolean} [isLoose] Specify performing partial comparisons.
 * @param {Array} [stackA] Tracks traversed `value` objects.
 * @param {Array} [stackB] Tracks traversed `other` objects.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 */
function baseIsEqual(value, other, customizer, isLoose, stackA, stackB) {
  // Exit early for identical values.
  if (value === other) {
    // Treat `+0` vs. `-0` as not equal.
    return value !== 0 || (1 / value == 1 / other);
  }
  var valType = typeof value,
      othType = typeof other;

  // Exit early for unlike primitive values.
  if ((valType != 'function' && valType != 'object' && othType != 'function' && othType != 'object') ||
      value == null || other == null) {
    // Return `false` unless both values are `NaN`.
    return value !== value && other !== other;
  }
  return baseIsEqualDeep(value, other, baseIsEqual, customizer, isLoose, stackA, stackB);
}

module.exports = baseIsEqual;

},{"./baseIsEqualDeep":94}],94:[function(require,module,exports){
var equalArrays = require('./equalArrays'),
    equalByTag = require('./equalByTag'),
    equalObjects = require('./equalObjects'),
    isArray = require('../lang/isArray'),
    isTypedArray = require('../lang/isTypedArray');

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    arrayTag = '[object Array]',
    funcTag = '[object Function]',
    objectTag = '[object Object]';

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the [`toStringTag`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/**
 * A specialized version of `baseIsEqual` for arrays and objects which performs
 * deep comparisons and tracks traversed objects enabling objects with circular
 * references to be compared.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Function} [customizer] The function to customize comparing objects.
 * @param {boolean} [isLoose] Specify performing partial comparisons.
 * @param {Array} [stackA=[]] Tracks traversed `value` objects.
 * @param {Array} [stackB=[]] Tracks traversed `other` objects.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function baseIsEqualDeep(object, other, equalFunc, customizer, isLoose, stackA, stackB) {
  var objIsArr = isArray(object),
      othIsArr = isArray(other),
      objTag = arrayTag,
      othTag = arrayTag;

  if (!objIsArr) {
    objTag = objToString.call(object);
    if (objTag == argsTag) {
      objTag = objectTag;
    } else if (objTag != objectTag) {
      objIsArr = isTypedArray(object);
    }
  }
  if (!othIsArr) {
    othTag = objToString.call(other);
    if (othTag == argsTag) {
      othTag = objectTag;
    } else if (othTag != objectTag) {
      othIsArr = isTypedArray(other);
    }
  }
  var objIsObj = (objTag == objectTag || (isLoose && objTag == funcTag)),
      othIsObj = (othTag == objectTag || (isLoose && othTag == funcTag)),
      isSameTag = objTag == othTag;

  if (isSameTag && !(objIsArr || objIsObj)) {
    return equalByTag(object, other, objTag);
  }
  if (isLoose) {
    if (!isSameTag && !(objIsObj && othIsObj)) {
      return false;
    }
  } else {
    var valWrapped = objIsObj && hasOwnProperty.call(object, '__wrapped__'),
        othWrapped = othIsObj && hasOwnProperty.call(other, '__wrapped__');

    if (valWrapped || othWrapped) {
      return equalFunc(valWrapped ? object.value() : object, othWrapped ? other.value() : other, customizer, isLoose, stackA, stackB);
    }
    if (!isSameTag) {
      return false;
    }
  }
  // Assume cyclic values are equal.
  // For more information on detecting circular references see https://es5.github.io/#JO.
  stackA || (stackA = []);
  stackB || (stackB = []);

  var length = stackA.length;
  while (length--) {
    if (stackA[length] == object) {
      return stackB[length] == other;
    }
  }
  // Add `object` and `other` to the stack of traversed objects.
  stackA.push(object);
  stackB.push(other);

  var result = (objIsArr ? equalArrays : equalObjects)(object, other, equalFunc, customizer, isLoose, stackA, stackB);

  stackA.pop();
  stackB.pop();

  return result;
}

module.exports = baseIsEqualDeep;

},{"../lang/isArray":144,"../lang/isTypedArray":150,"./equalArrays":117,"./equalByTag":118,"./equalObjects":119}],95:[function(require,module,exports){
var baseIsEqual = require('./baseIsEqual');

/**
 * The base implementation of `_.isMatch` without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Object} object The object to inspect.
 * @param {Array} props The source property names to match.
 * @param {Array} values The source values to match.
 * @param {Array} strictCompareFlags Strict comparison flags for source values.
 * @param {Function} [customizer] The function to customize comparing objects.
 * @returns {boolean} Returns `true` if `object` is a match, else `false`.
 */
function baseIsMatch(object, props, values, strictCompareFlags, customizer) {
  var index = -1,
      length = props.length,
      noCustomizer = !customizer;

  while (++index < length) {
    if ((noCustomizer && strictCompareFlags[index])
          ? values[index] !== object[props[index]]
          : !(props[index] in object)
        ) {
      return false;
    }
  }
  index = -1;
  while (++index < length) {
    var key = props[index],
        objValue = object[key],
        srcValue = values[index];

    if (noCustomizer && strictCompareFlags[index]) {
      var result = typeof objValue != 'undefined' || (key in object);
    } else {
      result = customizer ? customizer(objValue, srcValue, key) : undefined;
      if (typeof result == 'undefined') {
        result = baseIsEqual(srcValue, objValue, customizer, true);
      }
    }
    if (!result) {
      return false;
    }
  }
  return true;
}

module.exports = baseIsMatch;

},{"./baseIsEqual":93}],96:[function(require,module,exports){
/**
 * The function whose prototype all chaining wrappers inherit from.
 *
 * @private
 */
function baseLodash() {
  // No operation performed.
}

module.exports = baseLodash;

},{}],97:[function(require,module,exports){
var baseIsMatch = require('./baseIsMatch'),
    constant = require('../utility/constant'),
    isStrictComparable = require('./isStrictComparable'),
    keys = require('../object/keys'),
    toObject = require('./toObject');

/**
 * The base implementation of `_.matches` which does not clone `source`.
 *
 * @private
 * @param {Object} source The object of property values to match.
 * @returns {Function} Returns the new function.
 */
function baseMatches(source) {
  var props = keys(source),
      length = props.length;

  if (!length) {
    return constant(true);
  }
  if (length == 1) {
    var key = props[0],
        value = source[key];

    if (isStrictComparable(value)) {
      return function(object) {
        return object != null && object[key] === value &&
          (typeof value != 'undefined' || (key in toObject(object)));
      };
    }
  }
  var values = Array(length),
      strictCompareFlags = Array(length);

  while (length--) {
    value = source[props[length]];
    values[length] = value;
    strictCompareFlags[length] = isStrictComparable(value);
  }
  return function(object) {
    return object != null && baseIsMatch(toObject(object), props, values, strictCompareFlags);
  };
}

module.exports = baseMatches;

},{"../object/keys":154,"../utility/constant":162,"./baseIsMatch":95,"./isStrictComparable":131,"./toObject":140}],98:[function(require,module,exports){
var baseIsEqual = require('./baseIsEqual'),
    isStrictComparable = require('./isStrictComparable'),
    toObject = require('./toObject');

/**
 * The base implementation of `_.matchesProperty` which does not coerce `key`
 * to a string.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @param {*} value The value to compare.
 * @returns {Function} Returns the new function.
 */
function baseMatchesProperty(key, value) {
  if (isStrictComparable(value)) {
    return function(object) {
      return object != null && object[key] === value &&
        (typeof value != 'undefined' || (key in toObject(object)));
    };
  }
  return function(object) {
    return object != null && baseIsEqual(value, object[key], null, true);
  };
}

module.exports = baseMatchesProperty;

},{"./baseIsEqual":93,"./isStrictComparable":131,"./toObject":140}],99:[function(require,module,exports){
var arrayEach = require('./arrayEach'),
    baseForOwn = require('./baseForOwn'),
    baseMergeDeep = require('./baseMergeDeep'),
    isArray = require('../lang/isArray'),
    isLength = require('./isLength'),
    isObject = require('../lang/isObject'),
    isObjectLike = require('./isObjectLike'),
    isTypedArray = require('../lang/isTypedArray');

/**
 * The base implementation of `_.merge` without support for argument juggling,
 * multiple sources, and `this` binding `customizer` functions.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @param {Function} [customizer] The function to customize merging properties.
 * @param {Array} [stackA=[]] Tracks traversed source objects.
 * @param {Array} [stackB=[]] Associates values with source counterparts.
 * @returns {Object} Returns the destination object.
 */
function baseMerge(object, source, customizer, stackA, stackB) {
  if (!isObject(object)) {
    return object;
  }
  var isSrcArr = isLength(source.length) && (isArray(source) || isTypedArray(source));
  (isSrcArr ? arrayEach : baseForOwn)(source, function(srcValue, key, source) {
    if (isObjectLike(srcValue)) {
      stackA || (stackA = []);
      stackB || (stackB = []);
      return baseMergeDeep(object, source, key, baseMerge, customizer, stackA, stackB);
    }
    var value = object[key],
        result = customizer ? customizer(value, srcValue, key, object, source) : undefined,
        isCommon = typeof result == 'undefined';

    if (isCommon) {
      result = srcValue;
    }
    if ((isSrcArr || typeof result != 'undefined') &&
        (isCommon || (result === result ? (result !== value) : (value === value)))) {
      object[key] = result;
    }
  });
  return object;
}

module.exports = baseMerge;

},{"../lang/isArray":144,"../lang/isObject":147,"../lang/isTypedArray":150,"./arrayEach":82,"./baseForOwn":91,"./baseMergeDeep":100,"./isLength":129,"./isObjectLike":130}],100:[function(require,module,exports){
var arrayCopy = require('./arrayCopy'),
    isArguments = require('../lang/isArguments'),
    isArray = require('../lang/isArray'),
    isLength = require('./isLength'),
    isPlainObject = require('../lang/isPlainObject'),
    isTypedArray = require('../lang/isTypedArray'),
    toPlainObject = require('../lang/toPlainObject');

/**
 * A specialized version of `baseMerge` for arrays and objects which performs
 * deep merges and tracks traversed objects enabling objects with circular
 * references to be merged.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @param {string} key The key of the value to merge.
 * @param {Function} mergeFunc The function to merge values.
 * @param {Function} [customizer] The function to customize merging properties.
 * @param {Array} [stackA=[]] Tracks traversed source objects.
 * @param {Array} [stackB=[]] Associates values with source counterparts.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function baseMergeDeep(object, source, key, mergeFunc, customizer, stackA, stackB) {
  var length = stackA.length,
      srcValue = source[key];

  while (length--) {
    if (stackA[length] == srcValue) {
      object[key] = stackB[length];
      return;
    }
  }
  var value = object[key],
      result = customizer ? customizer(value, srcValue, key, object, source) : undefined,
      isCommon = typeof result == 'undefined';

  if (isCommon) {
    result = srcValue;
    if (isLength(srcValue.length) && (isArray(srcValue) || isTypedArray(srcValue))) {
      result = isArray(value)
        ? value
        : ((value && value.length) ? arrayCopy(value) : []);
    }
    else if (isPlainObject(srcValue) || isArguments(srcValue)) {
      result = isArguments(value)
        ? toPlainObject(value)
        : (isPlainObject(value) ? value : {});
    }
    else {
      isCommon = false;
    }
  }
  // Add the source value to the stack of traversed objects and associate
  // it with its merged value.
  stackA.push(srcValue);
  stackB.push(result);

  if (isCommon) {
    // Recursively merge objects and arrays (susceptible to call stack limits).
    object[key] = mergeFunc(result, srcValue, customizer, stackA, stackB);
  } else if (result === result ? (result !== value) : (value === value)) {
    object[key] = result;
  }
}

module.exports = baseMergeDeep;

},{"../lang/isArguments":143,"../lang/isArray":144,"../lang/isPlainObject":148,"../lang/isTypedArray":150,"../lang/toPlainObject":151,"./arrayCopy":81,"./isLength":129}],101:[function(require,module,exports){
/**
 * The base implementation of `_.property` which does not coerce `key` to a string.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

module.exports = baseProperty;

},{}],102:[function(require,module,exports){
var identity = require('../utility/identity'),
    metaMap = require('./metaMap');

/**
 * The base implementation of `setData` without support for hot loop detection.
 *
 * @private
 * @param {Function} func The function to associate metadata with.
 * @param {*} data The metadata.
 * @returns {Function} Returns `func`.
 */
var baseSetData = !metaMap ? identity : function(func, data) {
  metaMap.set(func, data);
  return func;
};

module.exports = baseSetData;

},{"../utility/identity":163,"./metaMap":133}],103:[function(require,module,exports){
/**
 * Converts `value` to a string if it is not one. An empty string is returned
 * for `null` or `undefined` values.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 */
function baseToString(value) {
  if (typeof value == 'string') {
    return value;
  }
  return value == null ? '' : (value + '');
}

module.exports = baseToString;

},{}],104:[function(require,module,exports){
/**
 * The base implementation of `_.values` and `_.valuesIn` which creates an
 * array of `object` property values corresponding to the property names
 * returned by `keysFunc`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Array} props The property names to get values for.
 * @returns {Object} Returns the array of property values.
 */
function baseValues(object, props) {
  var index = -1,
      length = props.length,
      result = Array(length);

  while (++index < length) {
    result[index] = object[props[index]];
  }
  return result;
}

module.exports = baseValues;

},{}],105:[function(require,module,exports){
var identity = require('../utility/identity');

/**
 * A specialized version of `baseCallback` which only supports `this` binding
 * and specifying the number of arguments to provide to `func`.
 *
 * @private
 * @param {Function} func The function to bind.
 * @param {*} thisArg The `this` binding of `func`.
 * @param {number} [argCount] The number of arguments to provide to `func`.
 * @returns {Function} Returns the callback.
 */
function bindCallback(func, thisArg, argCount) {
  if (typeof func != 'function') {
    return identity;
  }
  if (typeof thisArg == 'undefined') {
    return func;
  }
  switch (argCount) {
    case 1: return function(value) {
      return func.call(thisArg, value);
    };
    case 3: return function(value, index, collection) {
      return func.call(thisArg, value, index, collection);
    };
    case 4: return function(accumulator, value, index, collection) {
      return func.call(thisArg, accumulator, value, index, collection);
    };
    case 5: return function(value, other, key, object, source) {
      return func.call(thisArg, value, other, key, object, source);
    };
  }
  return function() {
    return func.apply(thisArg, arguments);
  };
}

module.exports = bindCallback;

},{"../utility/identity":163}],106:[function(require,module,exports){
(function (global){
var constant = require('../utility/constant'),
    isNative = require('../lang/isNative');

/** Native method references. */
var ArrayBuffer = isNative(ArrayBuffer = global.ArrayBuffer) && ArrayBuffer,
    bufferSlice = isNative(bufferSlice = ArrayBuffer && new ArrayBuffer(0).slice) && bufferSlice,
    floor = Math.floor,
    Uint8Array = isNative(Uint8Array = global.Uint8Array) && Uint8Array;

/** Used to clone array buffers. */
var Float64Array = (function() {
  // Safari 5 errors when using an array buffer to initialize a typed array
  // where the array buffer's `byteLength` is not a multiple of the typed
  // array's `BYTES_PER_ELEMENT`.
  try {
    var func = isNative(func = global.Float64Array) && func,
        result = new func(new ArrayBuffer(10), 0, 1) && func;
  } catch(e) {}
  return result;
}());

/** Used as the size, in bytes, of each `Float64Array` element. */
var FLOAT64_BYTES_PER_ELEMENT = Float64Array ? Float64Array.BYTES_PER_ELEMENT : 0;

/**
 * Creates a clone of the given array buffer.
 *
 * @private
 * @param {ArrayBuffer} buffer The array buffer to clone.
 * @returns {ArrayBuffer} Returns the cloned array buffer.
 */
function bufferClone(buffer) {
  return bufferSlice.call(buffer, 0);
}
if (!bufferSlice) {
  // PhantomJS has `ArrayBuffer` and `Uint8Array` but not `Float64Array`.
  bufferClone = !(ArrayBuffer && Uint8Array) ? constant(null) : function(buffer) {
    var byteLength = buffer.byteLength,
        floatLength = Float64Array ? floor(byteLength / FLOAT64_BYTES_PER_ELEMENT) : 0,
        offset = floatLength * FLOAT64_BYTES_PER_ELEMENT,
        result = new ArrayBuffer(byteLength);

    if (floatLength) {
      var view = new Float64Array(result, 0, floatLength);
      view.set(new Float64Array(buffer, 0, floatLength));
    }
    if (byteLength != offset) {
      view = new Uint8Array(result, offset);
      view.set(new Uint8Array(buffer, offset));
    }
    return result;
  };
}

module.exports = bufferClone;

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../lang/isNative":146,"../utility/constant":162}],107:[function(require,module,exports){
/* Native method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * Creates an array that is the composition of partially applied arguments,
 * placeholders, and provided arguments into a single array of arguments.
 *
 * @private
 * @param {Array|Object} args The provided arguments.
 * @param {Array} partials The arguments to prepend to those provided.
 * @param {Array} holders The `partials` placeholder indexes.
 * @returns {Array} Returns the new array of composed arguments.
 */
function composeArgs(args, partials, holders) {
  var holdersLength = holders.length,
      argsIndex = -1,
      argsLength = nativeMax(args.length - holdersLength, 0),
      leftIndex = -1,
      leftLength = partials.length,
      result = Array(argsLength + leftLength);

  while (++leftIndex < leftLength) {
    result[leftIndex] = partials[leftIndex];
  }
  while (++argsIndex < holdersLength) {
    result[holders[argsIndex]] = args[argsIndex];
  }
  while (argsLength--) {
    result[leftIndex++] = args[argsIndex++];
  }
  return result;
}

module.exports = composeArgs;

},{}],108:[function(require,module,exports){
/* Native method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * This function is like `composeArgs` except that the arguments composition
 * is tailored for `_.partialRight`.
 *
 * @private
 * @param {Array|Object} args The provided arguments.
 * @param {Array} partials The arguments to append to those provided.
 * @param {Array} holders The `partials` placeholder indexes.
 * @returns {Array} Returns the new array of composed arguments.
 */
function composeArgsRight(args, partials, holders) {
  var holdersIndex = -1,
      holdersLength = holders.length,
      argsIndex = -1,
      argsLength = nativeMax(args.length - holdersLength, 0),
      rightIndex = -1,
      rightLength = partials.length,
      result = Array(argsLength + rightLength);

  while (++argsIndex < argsLength) {
    result[argsIndex] = args[argsIndex];
  }
  var pad = argsIndex;
  while (++rightIndex < rightLength) {
    result[pad + rightIndex] = partials[rightIndex];
  }
  while (++holdersIndex < holdersLength) {
    result[pad + holders[holdersIndex]] = args[argsIndex++];
  }
  return result;
}

module.exports = composeArgsRight;

},{}],109:[function(require,module,exports){
var bindCallback = require('./bindCallback'),
    isIterateeCall = require('./isIterateeCall');

/**
 * Creates a function that assigns properties of source object(s) to a given
 * destination object.
 *
 * **Note:** This function is used to create `_.assign`, `_.defaults`, and `_.merge`.
 *
 * @private
 * @param {Function} assigner The function to assign values.
 * @returns {Function} Returns the new assigner function.
 */
function createAssigner(assigner) {
  return function() {
    var args = arguments,
        length = args.length,
        object = args[0];

    if (length < 2 || object == null) {
      return object;
    }
    var customizer = args[length - 2],
        thisArg = args[length - 1],
        guard = args[3];

    if (length > 3 && typeof customizer == 'function') {
      customizer = bindCallback(customizer, thisArg, 5);
      length -= 2;
    } else {
      customizer = (length > 2 && typeof thisArg == 'function') ? thisArg : null;
      length -= (customizer ? 1 : 0);
    }
    if (guard && isIterateeCall(args[1], args[2], guard)) {
      customizer = length == 3 ? null : customizer;
      length = 2;
    }
    var index = 0;
    while (++index < length) {
      var source = args[index];
      if (source) {
        assigner(object, source, customizer);
      }
    }
    return object;
  };
}

module.exports = createAssigner;

},{"./bindCallback":105,"./isIterateeCall":127}],110:[function(require,module,exports){
var toObject = require('./toObject');

/**
 * Creates a base function for `_.forIn` or `_.forInRight`.
 *
 * @private
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Function} Returns the new base function.
 */
function createBaseFor(fromRight) {
  return function(object, iteratee, keysFunc) {
    var iterable = toObject(object),
        props = keysFunc(object),
        length = props.length,
        index = fromRight ? length : -1;

    while ((fromRight ? index-- : ++index < length)) {
      var key = props[index];
      if (iteratee(iterable[key], key, iterable) === false) {
        break;
      }
    }
    return object;
  };
}

module.exports = createBaseFor;

},{"./toObject":140}],111:[function(require,module,exports){
(function (global){
var createCtorWrapper = require('./createCtorWrapper');

/**
 * Creates a function that wraps `func` and invokes it with the `this`
 * binding of `thisArg`.
 *
 * @private
 * @param {Function} func The function to bind.
 * @param {*} [thisArg] The `this` binding of `func`.
 * @returns {Function} Returns the new bound function.
 */
function createBindWrapper(func, thisArg) {
  var Ctor = createCtorWrapper(func);

  function wrapper() {
    var fn = (this && this !== global && this instanceof wrapper) ? Ctor : func;
    return fn.apply(thisArg, arguments);
  }
  return wrapper;
}

module.exports = createBindWrapper;

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./createCtorWrapper":112}],112:[function(require,module,exports){
var baseCreate = require('./baseCreate'),
    isObject = require('../lang/isObject');

/**
 * Creates a function that produces an instance of `Ctor` regardless of
 * whether it was invoked as part of a `new` expression or by `call` or `apply`.
 *
 * @private
 * @param {Function} Ctor The constructor to wrap.
 * @returns {Function} Returns the new wrapped function.
 */
function createCtorWrapper(Ctor) {
  return function() {
    var thisBinding = baseCreate(Ctor.prototype),
        result = Ctor.apply(thisBinding, arguments);

    // Mimic the constructor's `return` behavior.
    // See https://es5.github.io/#x13.2.2 for more details.
    return isObject(result) ? result : thisBinding;
  };
}

module.exports = createCtorWrapper;

},{"../lang/isObject":147,"./baseCreate":88}],113:[function(require,module,exports){
(function (global){
var arrayCopy = require('./arrayCopy'),
    composeArgs = require('./composeArgs'),
    composeArgsRight = require('./composeArgsRight'),
    createCtorWrapper = require('./createCtorWrapper'),
    isLaziable = require('./isLaziable'),
    reorder = require('./reorder'),
    replaceHolders = require('./replaceHolders'),
    setData = require('./setData');

/** Used to compose bitmasks for wrapper metadata. */
var BIND_FLAG = 1,
    BIND_KEY_FLAG = 2,
    CURRY_BOUND_FLAG = 4,
    CURRY_FLAG = 8,
    CURRY_RIGHT_FLAG = 16,
    PARTIAL_FLAG = 32,
    PARTIAL_RIGHT_FLAG = 64,
    ARY_FLAG = 128;

/* Native method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * Creates a function that wraps `func` and invokes it with optional `this`
 * binding of, partial application, and currying.
 *
 * @private
 * @param {Function|string} func The function or method name to reference.
 * @param {number} bitmask The bitmask of flags. See `createWrapper` for more details.
 * @param {*} [thisArg] The `this` binding of `func`.
 * @param {Array} [partials] The arguments to prepend to those provided to the new function.
 * @param {Array} [holders] The `partials` placeholder indexes.
 * @param {Array} [partialsRight] The arguments to append to those provided to the new function.
 * @param {Array} [holdersRight] The `partialsRight` placeholder indexes.
 * @param {Array} [argPos] The argument positions of the new function.
 * @param {number} [ary] The arity cap of `func`.
 * @param {number} [arity] The arity of `func`.
 * @returns {Function} Returns the new wrapped function.
 */
function createHybridWrapper(func, bitmask, thisArg, partials, holders, partialsRight, holdersRight, argPos, ary, arity) {
  var isAry = bitmask & ARY_FLAG,
      isBind = bitmask & BIND_FLAG,
      isBindKey = bitmask & BIND_KEY_FLAG,
      isCurry = bitmask & CURRY_FLAG,
      isCurryBound = bitmask & CURRY_BOUND_FLAG,
      isCurryRight = bitmask & CURRY_RIGHT_FLAG;

  var Ctor = !isBindKey && createCtorWrapper(func),
      key = func;

  function wrapper() {
    // Avoid `arguments` object use disqualifying optimizations by
    // converting it to an array before providing it to other functions.
    var length = arguments.length,
        index = length,
        args = Array(length);

    while (index--) {
      args[index] = arguments[index];
    }
    if (partials) {
      args = composeArgs(args, partials, holders);
    }
    if (partialsRight) {
      args = composeArgsRight(args, partialsRight, holdersRight);
    }
    if (isCurry || isCurryRight) {
      var placeholder = wrapper.placeholder,
          argsHolders = replaceHolders(args, placeholder);

      length -= argsHolders.length;
      if (length < arity) {
        var newArgPos = argPos ? arrayCopy(argPos) : null,
            newArity = nativeMax(arity - length, 0),
            newsHolders = isCurry ? argsHolders : null,
            newHoldersRight = isCurry ? null : argsHolders,
            newPartials = isCurry ? args : null,
            newPartialsRight = isCurry ? null : args;

        bitmask |= (isCurry ? PARTIAL_FLAG : PARTIAL_RIGHT_FLAG);
        bitmask &= ~(isCurry ? PARTIAL_RIGHT_FLAG : PARTIAL_FLAG);

        if (!isCurryBound) {
          bitmask &= ~(BIND_FLAG | BIND_KEY_FLAG);
        }
        var newData = [func, bitmask, thisArg, newPartials, newsHolders, newPartialsRight, newHoldersRight, newArgPos, ary, newArity],
            result = createHybridWrapper.apply(undefined, newData);

        if (isLaziable(func)) {
          setData(result, newData);
        }
        result.placeholder = placeholder;
        return result;
      }
    }
    var thisBinding = isBind ? thisArg : this;
    if (isBindKey) {
      func = thisBinding[key];
    }
    if (argPos) {
      args = reorder(args, argPos);
    }
    if (isAry && ary < args.length) {
      args.length = ary;
    }
    var fn = (this && this !== global && this instanceof wrapper) ? (Ctor || createCtorWrapper(func)) : func;
    return fn.apply(thisBinding, args);
  }
  return wrapper;
}

module.exports = createHybridWrapper;

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./arrayCopy":81,"./composeArgs":107,"./composeArgsRight":108,"./createCtorWrapper":112,"./isLaziable":128,"./reorder":135,"./replaceHolders":136,"./setData":137}],114:[function(require,module,exports){
var createWrapper = require('./createWrapper'),
    replaceHolders = require('./replaceHolders'),
    restParam = require('../function/restParam');

/**
 * Creates a `_.partial` or `_.partialRight` function.
 *
 * @private
 * @param {boolean} flag The partial bit flag.
 * @returns {Function} Returns the new partial function.
 */
function createPartial(flag) {
  var partialFunc = restParam(function(func, partials) {
    var holders = replaceHolders(partials, partialFunc.placeholder);
    return createWrapper(func, flag, null, partials, holders);
  });
  return partialFunc;
}

module.exports = createPartial;

},{"../function/restParam":78,"./createWrapper":116,"./replaceHolders":136}],115:[function(require,module,exports){
(function (global){
var createCtorWrapper = require('./createCtorWrapper');

/** Used to compose bitmasks for wrapper metadata. */
var BIND_FLAG = 1;

/**
 * Creates a function that wraps `func` and invokes it with the optional `this`
 * binding of `thisArg` and the `partials` prepended to those provided to
 * the wrapper.
 *
 * @private
 * @param {Function} func The function to partially apply arguments to.
 * @param {number} bitmask The bitmask of flags. See `createWrapper` for more details.
 * @param {*} thisArg The `this` binding of `func`.
 * @param {Array} partials The arguments to prepend to those provided to the new function.
 * @returns {Function} Returns the new bound function.
 */
function createPartialWrapper(func, bitmask, thisArg, partials) {
  var isBind = bitmask & BIND_FLAG,
      Ctor = createCtorWrapper(func);

  function wrapper() {
    // Avoid `arguments` object use disqualifying optimizations by
    // converting it to an array before providing it `func`.
    var argsIndex = -1,
        argsLength = arguments.length,
        leftIndex = -1,
        leftLength = partials.length,
        args = Array(argsLength + leftLength);

    while (++leftIndex < leftLength) {
      args[leftIndex] = partials[leftIndex];
    }
    while (argsLength--) {
      args[leftIndex++] = arguments[++argsIndex];
    }
    var fn = (this && this !== global && this instanceof wrapper) ? Ctor : func;
    return fn.apply(isBind ? thisArg : this, args);
  }
  return wrapper;
}

module.exports = createPartialWrapper;

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./createCtorWrapper":112}],116:[function(require,module,exports){
var baseSetData = require('./baseSetData'),
    createBindWrapper = require('./createBindWrapper'),
    createHybridWrapper = require('./createHybridWrapper'),
    createPartialWrapper = require('./createPartialWrapper'),
    getData = require('./getData'),
    mergeData = require('./mergeData'),
    setData = require('./setData');

/** Used to compose bitmasks for wrapper metadata. */
var BIND_FLAG = 1,
    BIND_KEY_FLAG = 2,
    PARTIAL_FLAG = 32,
    PARTIAL_RIGHT_FLAG = 64;

/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/* Native method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * Creates a function that either curries or invokes `func` with optional
 * `this` binding and partially applied arguments.
 *
 * @private
 * @param {Function|string} func The function or method name to reference.
 * @param {number} bitmask The bitmask of flags.
 *  The bitmask may be composed of the following flags:
 *     1 - `_.bind`
 *     2 - `_.bindKey`
 *     4 - `_.curry` or `_.curryRight` of a bound function
 *     8 - `_.curry`
 *    16 - `_.curryRight`
 *    32 - `_.partial`
 *    64 - `_.partialRight`
 *   128 - `_.rearg`
 *   256 - `_.ary`
 * @param {*} [thisArg] The `this` binding of `func`.
 * @param {Array} [partials] The arguments to be partially applied.
 * @param {Array} [holders] The `partials` placeholder indexes.
 * @param {Array} [argPos] The argument positions of the new function.
 * @param {number} [ary] The arity cap of `func`.
 * @param {number} [arity] The arity of `func`.
 * @returns {Function} Returns the new wrapped function.
 */
function createWrapper(func, bitmask, thisArg, partials, holders, argPos, ary, arity) {
  var isBindKey = bitmask & BIND_KEY_FLAG;
  if (!isBindKey && typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  var length = partials ? partials.length : 0;
  if (!length) {
    bitmask &= ~(PARTIAL_FLAG | PARTIAL_RIGHT_FLAG);
    partials = holders = null;
  }
  length -= (holders ? holders.length : 0);
  if (bitmask & PARTIAL_RIGHT_FLAG) {
    var partialsRight = partials,
        holdersRight = holders;

    partials = holders = null;
  }
  var data = isBindKey ? null : getData(func),
      newData = [func, bitmask, thisArg, partials, holders, partialsRight, holdersRight, argPos, ary, arity];

  if (data) {
    mergeData(newData, data);
    bitmask = newData[1];
    arity = newData[9];
  }
  newData[9] = arity == null
    ? (isBindKey ? 0 : func.length)
    : (nativeMax(arity - length, 0) || 0);

  if (bitmask == BIND_FLAG) {
    var result = createBindWrapper(newData[0], newData[2]);
  } else if ((bitmask == PARTIAL_FLAG || bitmask == (BIND_FLAG | PARTIAL_FLAG)) && !newData[4].length) {
    result = createPartialWrapper.apply(undefined, newData);
  } else {
    result = createHybridWrapper.apply(undefined, newData);
  }
  var setter = data ? baseSetData : setData;
  return setter(result, newData);
}

module.exports = createWrapper;

},{"./baseSetData":102,"./createBindWrapper":111,"./createHybridWrapper":113,"./createPartialWrapper":115,"./getData":120,"./mergeData":132,"./setData":137}],117:[function(require,module,exports){
/**
 * A specialized version of `baseIsEqualDeep` for arrays with support for
 * partial deep comparisons.
 *
 * @private
 * @param {Array} array The array to compare.
 * @param {Array} other The other array to compare.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Function} [customizer] The function to customize comparing arrays.
 * @param {boolean} [isLoose] Specify performing partial comparisons.
 * @param {Array} [stackA] Tracks traversed `value` objects.
 * @param {Array} [stackB] Tracks traversed `other` objects.
 * @returns {boolean} Returns `true` if the arrays are equivalent, else `false`.
 */
function equalArrays(array, other, equalFunc, customizer, isLoose, stackA, stackB) {
  var index = -1,
      arrLength = array.length,
      othLength = other.length,
      result = true;

  if (arrLength != othLength && !(isLoose && othLength > arrLength)) {
    return false;
  }
  // Deep compare the contents, ignoring non-numeric properties.
  while (result && ++index < arrLength) {
    var arrValue = array[index],
        othValue = other[index];

    result = undefined;
    if (customizer) {
      result = isLoose
        ? customizer(othValue, arrValue, index)
        : customizer(arrValue, othValue, index);
    }
    if (typeof result == 'undefined') {
      // Recursively compare arrays (susceptible to call stack limits).
      if (isLoose) {
        var othIndex = othLength;
        while (othIndex--) {
          othValue = other[othIndex];
          result = (arrValue && arrValue === othValue) || equalFunc(arrValue, othValue, customizer, isLoose, stackA, stackB);
          if (result) {
            break;
          }
        }
      } else {
        result = (arrValue && arrValue === othValue) || equalFunc(arrValue, othValue, customizer, isLoose, stackA, stackB);
      }
    }
  }
  return !!result;
}

module.exports = equalArrays;

},{}],118:[function(require,module,exports){
/** `Object#toString` result references. */
var boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    errorTag = '[object Error]',
    numberTag = '[object Number]',
    regexpTag = '[object RegExp]',
    stringTag = '[object String]';

/**
 * A specialized version of `baseIsEqualDeep` for comparing objects of
 * the same `toStringTag`.
 *
 * **Note:** This function only supports comparing values with tags of
 * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
 *
 * @private
 * @param {Object} value The object to compare.
 * @param {Object} other The other object to compare.
 * @param {string} tag The `toStringTag` of the objects to compare.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function equalByTag(object, other, tag) {
  switch (tag) {
    case boolTag:
    case dateTag:
      // Coerce dates and booleans to numbers, dates to milliseconds and booleans
      // to `1` or `0` treating invalid dates coerced to `NaN` as not equal.
      return +object == +other;

    case errorTag:
      return object.name == other.name && object.message == other.message;

    case numberTag:
      // Treat `NaN` vs. `NaN` as equal.
      return (object != +object)
        ? other != +other
        // But, treat `-0` vs. `+0` as not equal.
        : (object == 0 ? ((1 / object) == (1 / other)) : object == +other);

    case regexpTag:
    case stringTag:
      // Coerce regexes to strings and treat strings primitives and string
      // objects as equal. See https://es5.github.io/#x15.10.6.4 for more details.
      return object == (other + '');
  }
  return false;
}

module.exports = equalByTag;

},{}],119:[function(require,module,exports){
var keys = require('../object/keys');

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * A specialized version of `baseIsEqualDeep` for objects with support for
 * partial deep comparisons.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Function} [customizer] The function to customize comparing values.
 * @param {boolean} [isLoose] Specify performing partial comparisons.
 * @param {Array} [stackA] Tracks traversed `value` objects.
 * @param {Array} [stackB] Tracks traversed `other` objects.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function equalObjects(object, other, equalFunc, customizer, isLoose, stackA, stackB) {
  var objProps = keys(object),
      objLength = objProps.length,
      othProps = keys(other),
      othLength = othProps.length;

  if (objLength != othLength && !isLoose) {
    return false;
  }
  var skipCtor = isLoose,
      index = -1;

  while (++index < objLength) {
    var key = objProps[index],
        result = isLoose ? key in other : hasOwnProperty.call(other, key);

    if (result) {
      var objValue = object[key],
          othValue = other[key];

      result = undefined;
      if (customizer) {
        result = isLoose
          ? customizer(othValue, objValue, key)
          : customizer(objValue, othValue, key);
      }
      if (typeof result == 'undefined') {
        // Recursively compare objects (susceptible to call stack limits).
        result = (objValue && objValue === othValue) || equalFunc(objValue, othValue, customizer, isLoose, stackA, stackB);
      }
    }
    if (!result) {
      return false;
    }
    skipCtor || (skipCtor = key == 'constructor');
  }
  if (!skipCtor) {
    var objCtor = object.constructor,
        othCtor = other.constructor;

    // Non `Object` object instances with different constructors are not equal.
    if (objCtor != othCtor &&
        ('constructor' in object && 'constructor' in other) &&
        !(typeof objCtor == 'function' && objCtor instanceof objCtor &&
          typeof othCtor == 'function' && othCtor instanceof othCtor)) {
      return false;
    }
  }
  return true;
}

module.exports = equalObjects;

},{"../object/keys":154}],120:[function(require,module,exports){
var metaMap = require('./metaMap'),
    noop = require('../utility/noop');

/**
 * Gets metadata for `func`.
 *
 * @private
 * @param {Function} func The function to query.
 * @returns {*} Returns the metadata for `func`.
 */
var getData = !metaMap ? noop : function(func) {
  return metaMap.get(func);
};

module.exports = getData;

},{"../utility/noop":164,"./metaMap":133}],121:[function(require,module,exports){
var baseProperty = require('./baseProperty'),
    constant = require('../utility/constant'),
    realNames = require('./realNames'),
    support = require('../support');

/**
 * Gets the name of `func`.
 *
 * @private
 * @param {Function} func The function to query.
 * @returns {string} Returns the function name.
 */
var getFuncName = (function() {
  if (!support.funcNames) {
    return constant('');
  }
  if (constant.name == 'constant') {
    return baseProperty('name');
  }
  return function(func) {
    var result = func.name,
        array = realNames[result],
        length = array ? array.length : 0;

    while (length--) {
      var data = array[length],
          otherFunc = data.func;

      if (otherFunc == null || otherFunc == func) {
        return data.name;
      }
    }
    return result;
  };
}());

module.exports = getFuncName;

},{"../support":161,"../utility/constant":162,"./baseProperty":101,"./realNames":134}],122:[function(require,module,exports){
/**
 * Gets the index at which the first occurrence of `NaN` is found in `array`.
 *
 * @private
 * @param {Array} array The array to search.
 * @param {number} fromIndex The index to search from.
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {number} Returns the index of the matched `NaN`, else `-1`.
 */
function indexOfNaN(array, fromIndex, fromRight) {
  var length = array.length,
      index = fromIndex + (fromRight ? 0 : -1);

  while ((fromRight ? index-- : ++index < length)) {
    var other = array[index];
    if (other !== other) {
      return index;
    }
  }
  return -1;
}

module.exports = indexOfNaN;

},{}],123:[function(require,module,exports){
/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Initializes an array clone.
 *
 * @private
 * @param {Array} array The array to clone.
 * @returns {Array} Returns the initialized clone.
 */
function initCloneArray(array) {
  var length = array.length,
      result = new array.constructor(length);

  // Add array properties assigned by `RegExp#exec`.
  if (length && typeof array[0] == 'string' && hasOwnProperty.call(array, 'index')) {
    result.index = array.index;
    result.input = array.input;
  }
  return result;
}

module.exports = initCloneArray;

},{}],124:[function(require,module,exports){
var bufferClone = require('./bufferClone');

/** `Object#toString` result references. */
var boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    numberTag = '[object Number]',
    regexpTag = '[object RegExp]',
    stringTag = '[object String]';

var arrayBufferTag = '[object ArrayBuffer]',
    float32Tag = '[object Float32Array]',
    float64Tag = '[object Float64Array]',
    int8Tag = '[object Int8Array]',
    int16Tag = '[object Int16Array]',
    int32Tag = '[object Int32Array]',
    uint8Tag = '[object Uint8Array]',
    uint8ClampedTag = '[object Uint8ClampedArray]',
    uint16Tag = '[object Uint16Array]',
    uint32Tag = '[object Uint32Array]';

/** Used to match `RegExp` flags from their coerced string values. */
var reFlags = /\w*$/;

/**
 * Initializes an object clone based on its `toStringTag`.
 *
 * **Note:** This function only supports cloning values with tags of
 * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
 *
 *
 * @private
 * @param {Object} object The object to clone.
 * @param {string} tag The `toStringTag` of the object to clone.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @returns {Object} Returns the initialized clone.
 */
function initCloneByTag(object, tag, isDeep) {
  var Ctor = object.constructor;
  switch (tag) {
    case arrayBufferTag:
      return bufferClone(object);

    case boolTag:
    case dateTag:
      return new Ctor(+object);

    case float32Tag: case float64Tag:
    case int8Tag: case int16Tag: case int32Tag:
    case uint8Tag: case uint8ClampedTag: case uint16Tag: case uint32Tag:
      var buffer = object.buffer;
      return new Ctor(isDeep ? bufferClone(buffer) : buffer, object.byteOffset, object.length);

    case numberTag:
    case stringTag:
      return new Ctor(object);

    case regexpTag:
      var result = new Ctor(object.source, reFlags.exec(object));
      result.lastIndex = object.lastIndex;
  }
  return result;
}

module.exports = initCloneByTag;

},{"./bufferClone":106}],125:[function(require,module,exports){
/**
 * Initializes an object clone.
 *
 * @private
 * @param {Object} object The object to clone.
 * @returns {Object} Returns the initialized clone.
 */
function initCloneObject(object) {
  var Ctor = object.constructor;
  if (!(typeof Ctor == 'function' && Ctor instanceof Ctor)) {
    Ctor = Object;
  }
  return new Ctor;
}

module.exports = initCloneObject;

},{}],126:[function(require,module,exports){
/**
 * Used as the [maximum length](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = Math.pow(2, 53) - 1;

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  value = +value;
  length = length == null ? MAX_SAFE_INTEGER : length;
  return value > -1 && value % 1 == 0 && value < length;
}

module.exports = isIndex;

},{}],127:[function(require,module,exports){
var isIndex = require('./isIndex'),
    isLength = require('./isLength'),
    isObject = require('../lang/isObject');

/**
 * Checks if the provided arguments are from an iteratee call.
 *
 * @private
 * @param {*} value The potential iteratee value argument.
 * @param {*} index The potential iteratee index or key argument.
 * @param {*} object The potential iteratee object argument.
 * @returns {boolean} Returns `true` if the arguments are from an iteratee call, else `false`.
 */
function isIterateeCall(value, index, object) {
  if (!isObject(object)) {
    return false;
  }
  var type = typeof index;
  if (type == 'number') {
    var length = object.length,
        prereq = isLength(length) && isIndex(index, length);
  } else {
    prereq = type == 'string' && index in object;
  }
  if (prereq) {
    var other = object[index];
    return value === value ? (value === other) : (other !== other);
  }
  return false;
}

module.exports = isIterateeCall;

},{"../lang/isObject":147,"./isIndex":126,"./isLength":129}],128:[function(require,module,exports){
var LazyWrapper = require('./LazyWrapper'),
    getFuncName = require('./getFuncName'),
    lodash = require('../chain/lodash');

/**
 * Checks if `func` has a lazy counterpart.
 *
 * @private
 * @param {Function} func The function to check.
 * @returns {boolean} Returns `true` if `func` has a lazy counterpart, else `false`.
 */
function isLaziable(func) {
  var funcName = getFuncName(func);
  return !!funcName && func === lodash[funcName] && funcName in LazyWrapper.prototype;
}

module.exports = isLaziable;

},{"../chain/lodash":73,"./LazyWrapper":79,"./getFuncName":121}],129:[function(require,module,exports){
/**
 * Used as the [maximum length](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = Math.pow(2, 53) - 1;

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

module.exports = isLength;

},{}],130:[function(require,module,exports){
/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

module.exports = isObjectLike;

},{}],131:[function(require,module,exports){
var isObject = require('../lang/isObject');

/**
 * Checks if `value` is suitable for strict equality comparisons, i.e. `===`.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` if suitable for strict
 *  equality comparisons, else `false`.
 */
function isStrictComparable(value) {
  return value === value && (value === 0 ? ((1 / value) > 0) : !isObject(value));
}

module.exports = isStrictComparable;

},{"../lang/isObject":147}],132:[function(require,module,exports){
var arrayCopy = require('./arrayCopy'),
    composeArgs = require('./composeArgs'),
    composeArgsRight = require('./composeArgsRight'),
    replaceHolders = require('./replaceHolders');

/** Used to compose bitmasks for wrapper metadata. */
var BIND_FLAG = 1,
    CURRY_BOUND_FLAG = 4,
    CURRY_FLAG = 8,
    ARY_FLAG = 128,
    REARG_FLAG = 256;

/** Used as the internal argument placeholder. */
var PLACEHOLDER = '__lodash_placeholder__';

/* Native method references for those with the same name as other `lodash` methods. */
var nativeMin = Math.min;

/**
 * Merges the function metadata of `source` into `data`.
 *
 * Merging metadata reduces the number of wrappers required to invoke a function.
 * This is possible because methods like `_.bind`, `_.curry`, and `_.partial`
 * may be applied regardless of execution order. Methods like `_.ary` and `_.rearg`
 * augment function arguments, making the order in which they are executed important,
 * preventing the merging of metadata. However, we make an exception for a safe
 * common case where curried functions have `_.ary` and or `_.rearg` applied.
 *
 * @private
 * @param {Array} data The destination metadata.
 * @param {Array} source The source metadata.
 * @returns {Array} Returns `data`.
 */
function mergeData(data, source) {
  var bitmask = data[1],
      srcBitmask = source[1],
      newBitmask = bitmask | srcBitmask,
      isCommon = newBitmask < ARY_FLAG;

  var isCombo =
    (srcBitmask == ARY_FLAG && bitmask == CURRY_FLAG) ||
    (srcBitmask == ARY_FLAG && bitmask == REARG_FLAG && data[7].length <= source[8]) ||
    (srcBitmask == (ARY_FLAG | REARG_FLAG) && bitmask == CURRY_FLAG);

  // Exit early if metadata can't be merged.
  if (!(isCommon || isCombo)) {
    return data;
  }
  // Use source `thisArg` if available.
  if (srcBitmask & BIND_FLAG) {
    data[2] = source[2];
    // Set when currying a bound function.
    newBitmask |= (bitmask & BIND_FLAG) ? 0 : CURRY_BOUND_FLAG;
  }
  // Compose partial arguments.
  var value = source[3];
  if (value) {
    var partials = data[3];
    data[3] = partials ? composeArgs(partials, value, source[4]) : arrayCopy(value);
    data[4] = partials ? replaceHolders(data[3], PLACEHOLDER) : arrayCopy(source[4]);
  }
  // Compose partial right arguments.
  value = source[5];
  if (value) {
    partials = data[5];
    data[5] = partials ? composeArgsRight(partials, value, source[6]) : arrayCopy(value);
    data[6] = partials ? replaceHolders(data[5], PLACEHOLDER) : arrayCopy(source[6]);
  }
  // Use source `argPos` if available.
  value = source[7];
  if (value) {
    data[7] = arrayCopy(value);
  }
  // Use source `ary` if it's smaller.
  if (srcBitmask & ARY_FLAG) {
    data[8] = data[8] == null ? source[8] : nativeMin(data[8], source[8]);
  }
  // Use source `arity` if one is not provided.
  if (data[9] == null) {
    data[9] = source[9];
  }
  // Use source `func` and merge bitmasks.
  data[0] = source[0];
  data[1] = newBitmask;

  return data;
}

module.exports = mergeData;

},{"./arrayCopy":81,"./composeArgs":107,"./composeArgsRight":108,"./replaceHolders":136}],133:[function(require,module,exports){
(function (global){
var isNative = require('../lang/isNative');

/** Native method references. */
var WeakMap = isNative(WeakMap = global.WeakMap) && WeakMap;

/** Used to store function metadata. */
var metaMap = WeakMap && new WeakMap;

module.exports = metaMap;

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../lang/isNative":146}],134:[function(require,module,exports){
/** Used to lookup unminified function names. */
var realNames = {};

module.exports = realNames;

},{}],135:[function(require,module,exports){
var arrayCopy = require('./arrayCopy'),
    isIndex = require('./isIndex');

/* Native method references for those with the same name as other `lodash` methods. */
var nativeMin = Math.min;

/**
 * Reorder `array` according to the specified indexes where the element at
 * the first index is assigned as the first element, the element at
 * the second index is assigned as the second element, and so on.
 *
 * @private
 * @param {Array} array The array to reorder.
 * @param {Array} indexes The arranged array indexes.
 * @returns {Array} Returns `array`.
 */
function reorder(array, indexes) {
  var arrLength = array.length,
      length = nativeMin(indexes.length, arrLength),
      oldArray = arrayCopy(array);

  while (length--) {
    var index = indexes[length];
    array[length] = isIndex(index, arrLength) ? oldArray[index] : undefined;
  }
  return array;
}

module.exports = reorder;

},{"./arrayCopy":81,"./isIndex":126}],136:[function(require,module,exports){
/** Used as the internal argument placeholder. */
var PLACEHOLDER = '__lodash_placeholder__';

/**
 * Replaces all `placeholder` elements in `array` with an internal placeholder
 * and returns an array of their indexes.
 *
 * @private
 * @param {Array} array The array to modify.
 * @param {*} placeholder The placeholder to replace.
 * @returns {Array} Returns the new array of placeholder indexes.
 */
function replaceHolders(array, placeholder) {
  var index = -1,
      length = array.length,
      resIndex = -1,
      result = [];

  while (++index < length) {
    if (array[index] === placeholder) {
      array[index] = PLACEHOLDER;
      result[++resIndex] = index;
    }
  }
  return result;
}

module.exports = replaceHolders;

},{}],137:[function(require,module,exports){
var baseSetData = require('./baseSetData'),
    now = require('../date/now');

/** Used to detect when a function becomes hot. */
var HOT_COUNT = 150,
    HOT_SPAN = 16;

/**
 * Sets metadata for `func`.
 *
 * **Note:** If this function becomes hot, i.e. is invoked a lot in a short
 * period of time, it will trip its breaker and transition to an identity function
 * to avoid garbage collection pauses in V8. See [V8 issue 2070](https://code.google.com/p/v8/issues/detail?id=2070)
 * for more details.
 *
 * @private
 * @param {Function} func The function to associate metadata with.
 * @param {*} data The metadata.
 * @returns {Function} Returns `func`.
 */
var setData = (function() {
  var count = 0,
      lastCalled = 0;

  return function(key, value) {
    var stamp = now(),
        remaining = HOT_SPAN - (stamp - lastCalled);

    lastCalled = stamp;
    if (remaining > 0) {
      if (++count >= HOT_COUNT) {
        return key;
      }
    } else {
      count = 0;
    }
    return baseSetData(key, value);
  };
}());

module.exports = setData;

},{"../date/now":76,"./baseSetData":102}],138:[function(require,module,exports){
var baseForIn = require('./baseForIn'),
    isObjectLike = require('./isObjectLike');

/** `Object#toString` result references. */
var objectTag = '[object Object]';

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the [`toStringTag`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/**
 * A fallback implementation of `_.isPlainObject` which checks if `value`
 * is an object created by the `Object` constructor or has a `[[Prototype]]`
 * of `null`.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
 */
function shimIsPlainObject(value) {
  var Ctor;

  // Exit early for non `Object` objects.
  if (!(isObjectLike(value) && objToString.call(value) == objectTag) ||
      (!hasOwnProperty.call(value, 'constructor') &&
        (Ctor = value.constructor, typeof Ctor == 'function' && !(Ctor instanceof Ctor)))) {
    return false;
  }
  // IE < 9 iterates inherited properties before own properties. If the first
  // iterated property is an object's own property then there are no inherited
  // enumerable properties.
  var result;
  // In most environments an object's own properties are iterated before
  // its inherited properties. If the last iterated property is an object's
  // own property then there are no inherited enumerable properties.
  baseForIn(value, function(subValue, key) {
    result = key;
  });
  return typeof result == 'undefined' || hasOwnProperty.call(value, result);
}

module.exports = shimIsPlainObject;

},{"./baseForIn":90,"./isObjectLike":130}],139:[function(require,module,exports){
var isArguments = require('../lang/isArguments'),
    isArray = require('../lang/isArray'),
    isIndex = require('./isIndex'),
    isLength = require('./isLength'),
    keysIn = require('../object/keysIn'),
    support = require('../support');

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * A fallback implementation of `Object.keys` which creates an array of the
 * own enumerable property names of `object`.
 *
 * @private
 * @param {Object} object The object to inspect.
 * @returns {Array} Returns the array of property names.
 */
function shimKeys(object) {
  var props = keysIn(object),
      propsLength = props.length,
      length = propsLength && object.length;

  var allowIndexes = length && isLength(length) &&
    (isArray(object) || (support.nonEnumArgs && isArguments(object)));

  var index = -1,
      result = [];

  while (++index < propsLength) {
    var key = props[index];
    if ((allowIndexes && isIndex(key, length)) || hasOwnProperty.call(object, key)) {
      result.push(key);
    }
  }
  return result;
}

module.exports = shimKeys;

},{"../lang/isArguments":143,"../lang/isArray":144,"../object/keysIn":155,"../support":161,"./isIndex":126,"./isLength":129}],140:[function(require,module,exports){
var isObject = require('../lang/isObject');

/**
 * Converts `value` to an object if it is not one.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {Object} Returns the object.
 */
function toObject(value) {
  return isObject(value) ? value : Object(value);
}

module.exports = toObject;

},{"../lang/isObject":147}],141:[function(require,module,exports){
var LazyWrapper = require('./LazyWrapper'),
    LodashWrapper = require('./LodashWrapper'),
    arrayCopy = require('./arrayCopy');

/**
 * Creates a clone of `wrapper`.
 *
 * @private
 * @param {Object} wrapper The wrapper to clone.
 * @returns {Object} Returns the cloned wrapper.
 */
function wrapperClone(wrapper) {
  return wrapper instanceof LazyWrapper
    ? wrapper.clone()
    : new LodashWrapper(wrapper.__wrapped__, wrapper.__chain__, arrayCopy(wrapper.__actions__));
}

module.exports = wrapperClone;

},{"./LazyWrapper":79,"./LodashWrapper":80,"./arrayCopy":81}],142:[function(require,module,exports){
var baseClone = require('../internal/baseClone'),
    bindCallback = require('../internal/bindCallback');

/**
 * Creates a deep clone of `value`. If `customizer` is provided it is invoked
 * to produce the cloned values. If `customizer` returns `undefined` cloning
 * is handled by the method instead. The `customizer` is bound to `thisArg`
 * and invoked with two argument; (value [, index|key, object]).
 *
 * **Note:** This method is loosely based on the
 * [structured clone algorithm](http://www.w3.org/TR/html5/infrastructure.html#internal-structured-cloning-algorithm).
 * The enumerable properties of `arguments` objects and objects created by
 * constructors other than `Object` are cloned to plain `Object` objects. An
 * empty object is returned for uncloneable values such as functions, DOM nodes,
 * Maps, Sets, and WeakMaps.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to deep clone.
 * @param {Function} [customizer] The function to customize cloning values.
 * @param {*} [thisArg] The `this` binding of `customizer`.
 * @returns {*} Returns the deep cloned value.
 * @example
 *
 * var users = [
 *   { 'user': 'barney' },
 *   { 'user': 'fred' }
 * ];
 *
 * var deep = _.cloneDeep(users);
 * deep[0] === users[0];
 * // => false
 *
 * // using a customizer callback
 * var el = _.cloneDeep(document.body, function(value) {
 *   if (_.isElement(value)) {
 *     return value.cloneNode(true);
 *   }
 * });
 *
 * el === document.body
 * // => false
 * el.nodeName
 * // => BODY
 * el.childNodes.length;
 * // => 20
 */
function cloneDeep(value, customizer, thisArg) {
  customizer = typeof customizer == 'function' && bindCallback(customizer, thisArg, 1);
  return baseClone(value, true, customizer);
}

module.exports = cloneDeep;

},{"../internal/baseClone":86,"../internal/bindCallback":105}],143:[function(require,module,exports){
var isLength = require('../internal/isLength'),
    isObjectLike = require('../internal/isObjectLike');

/** `Object#toString` result references. */
var argsTag = '[object Arguments]';

/** Used for native method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/**
 * Checks if `value` is classified as an `arguments` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
function isArguments(value) {
  var length = isObjectLike(value) ? value.length : undefined;
  return isLength(length) && objToString.call(value) == argsTag;
}

module.exports = isArguments;

},{"../internal/isLength":129,"../internal/isObjectLike":130}],144:[function(require,module,exports){
var isLength = require('../internal/isLength'),
    isNative = require('./isNative'),
    isObjectLike = require('../internal/isObjectLike');

/** `Object#toString` result references. */
var arrayTag = '[object Array]';

/** Used for native method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/* Native method references for those with the same name as other `lodash` methods. */
var nativeIsArray = isNative(nativeIsArray = Array.isArray) && nativeIsArray;

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(function() { return arguments; }());
 * // => false
 */
var isArray = nativeIsArray || function(value) {
  return isObjectLike(value) && isLength(value.length) && objToString.call(value) == arrayTag;
};

module.exports = isArray;

},{"../internal/isLength":129,"../internal/isObjectLike":130,"./isNative":146}],145:[function(require,module,exports){
var isObjectLike = require('../internal/isObjectLike');

/** `Object#toString` result references. */
var dateTag = '[object Date]';

/** Used for native method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/**
 * Checks if `value` is classified as a `Date` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isDate(new Date);
 * // => true
 *
 * _.isDate('Mon April 23 2012');
 * // => false
 */
function isDate(value) {
  return isObjectLike(value) && objToString.call(value) == dateTag;
}

module.exports = isDate;

},{"../internal/isObjectLike":130}],146:[function(require,module,exports){
var escapeRegExp = require('../string/escapeRegExp'),
    isObjectLike = require('../internal/isObjectLike');

/** `Object#toString` result references. */
var funcTag = '[object Function]';

/** Used to detect host constructors (Safari > 5). */
var reHostCtor = /^\[object .+?Constructor\]$/;

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var fnToString = Function.prototype.toString;

/**
 * Used to resolve the [`toStringTag`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/** Used to detect if a method is native. */
var reNative = RegExp('^' +
  escapeRegExp(objToString)
  .replace(/toString|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/**
 * Checks if `value` is a native function.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function, else `false`.
 * @example
 *
 * _.isNative(Array.prototype.push);
 * // => true
 *
 * _.isNative(_);
 * // => false
 */
function isNative(value) {
  if (value == null) {
    return false;
  }
  if (objToString.call(value) == funcTag) {
    return reNative.test(fnToString.call(value));
  }
  return isObjectLike(value) && reHostCtor.test(value);
}

module.exports = isNative;

},{"../internal/isObjectLike":130,"../string/escapeRegExp":160}],147:[function(require,module,exports){
/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return type == 'function' || (!!value && type == 'object');
}

module.exports = isObject;

},{}],148:[function(require,module,exports){
var isNative = require('./isNative'),
    shimIsPlainObject = require('../internal/shimIsPlainObject');

/** `Object#toString` result references. */
var objectTag = '[object Object]';

/** Used for native method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/** Native method references. */
var getPrototypeOf = isNative(getPrototypeOf = Object.getPrototypeOf) && getPrototypeOf;

/**
 * Checks if `value` is a plain object, that is, an object created by the
 * `Object` constructor or one with a `[[Prototype]]` of `null`.
 *
 * **Note:** This method assumes objects created by the `Object` constructor
 * have no inherited enumerable properties.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 * }
 *
 * _.isPlainObject(new Foo);
 * // => false
 *
 * _.isPlainObject([1, 2, 3]);
 * // => false
 *
 * _.isPlainObject({ 'x': 0, 'y': 0 });
 * // => true
 *
 * _.isPlainObject(Object.create(null));
 * // => true
 */
var isPlainObject = !getPrototypeOf ? shimIsPlainObject : function(value) {
  if (!(value && objToString.call(value) == objectTag)) {
    return false;
  }
  var valueOf = value.valueOf,
      objProto = isNative(valueOf) && (objProto = getPrototypeOf(valueOf)) && getPrototypeOf(objProto);

  return objProto
    ? (value == objProto || getPrototypeOf(value) == objProto)
    : shimIsPlainObject(value);
};

module.exports = isPlainObject;

},{"../internal/shimIsPlainObject":138,"./isNative":146}],149:[function(require,module,exports){
var isObjectLike = require('../internal/isObjectLike');

/** `Object#toString` result references. */
var stringTag = '[object String]';

/** Used for native method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/**
 * Checks if `value` is classified as a `String` primitive or object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isString('abc');
 * // => true
 *
 * _.isString(1);
 * // => false
 */
function isString(value) {
  return typeof value == 'string' || (isObjectLike(value) && objToString.call(value) == stringTag);
}

module.exports = isString;

},{"../internal/isObjectLike":130}],150:[function(require,module,exports){
var isLength = require('../internal/isLength'),
    isObjectLike = require('../internal/isObjectLike');

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    arrayTag = '[object Array]',
    boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    errorTag = '[object Error]',
    funcTag = '[object Function]',
    mapTag = '[object Map]',
    numberTag = '[object Number]',
    objectTag = '[object Object]',
    regexpTag = '[object RegExp]',
    setTag = '[object Set]',
    stringTag = '[object String]',
    weakMapTag = '[object WeakMap]';

var arrayBufferTag = '[object ArrayBuffer]',
    float32Tag = '[object Float32Array]',
    float64Tag = '[object Float64Array]',
    int8Tag = '[object Int8Array]',
    int16Tag = '[object Int16Array]',
    int32Tag = '[object Int32Array]',
    uint8Tag = '[object Uint8Array]',
    uint8ClampedTag = '[object Uint8ClampedArray]',
    uint16Tag = '[object Uint16Array]',
    uint32Tag = '[object Uint32Array]';

/** Used to identify `toStringTag` values of typed arrays. */
var typedArrayTags = {};
typedArrayTags[float32Tag] = typedArrayTags[float64Tag] =
typedArrayTags[int8Tag] = typedArrayTags[int16Tag] =
typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] =
typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] =
typedArrayTags[uint32Tag] = true;
typedArrayTags[argsTag] = typedArrayTags[arrayTag] =
typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] =
typedArrayTags[dateTag] = typedArrayTags[errorTag] =
typedArrayTags[funcTag] = typedArrayTags[mapTag] =
typedArrayTags[numberTag] = typedArrayTags[objectTag] =
typedArrayTags[regexpTag] = typedArrayTags[setTag] =
typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;

/** Used for native method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/**
 * Checks if `value` is classified as a typed array.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isTypedArray(new Uint8Array);
 * // => true
 *
 * _.isTypedArray([]);
 * // => false
 */
function isTypedArray(value) {
  return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[objToString.call(value)];
}

module.exports = isTypedArray;

},{"../internal/isLength":129,"../internal/isObjectLike":130}],151:[function(require,module,exports){
var baseCopy = require('../internal/baseCopy'),
    keysIn = require('../object/keysIn');

/**
 * Converts `value` to a plain object flattening inherited enumerable
 * properties of `value` to own properties of the plain object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to convert.
 * @returns {Object} Returns the converted plain object.
 * @example
 *
 * function Foo() {
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.assign({ 'a': 1 }, new Foo);
 * // => { 'a': 1, 'b': 2 }
 *
 * _.assign({ 'a': 1 }, _.toPlainObject(new Foo));
 * // => { 'a': 1, 'b': 2, 'c': 3 }
 */
function toPlainObject(value) {
  return baseCopy(value, keysIn(value));
}

module.exports = toPlainObject;

},{"../internal/baseCopy":87,"../object/keysIn":155}],152:[function(require,module,exports){
var baseAssign = require('../internal/baseAssign'),
    createAssigner = require('../internal/createAssigner');

/**
 * Assigns own enumerable properties of source object(s) to the destination
 * object. Subsequent sources overwrite property assignments of previous sources.
 * If `customizer` is provided it is invoked to produce the assigned values.
 * The `customizer` is bound to `thisArg` and invoked with five arguments:
 * (objectValue, sourceValue, key, object, source).
 *
 * @static
 * @memberOf _
 * @alias extend
 * @category Object
 * @param {Object} object The destination object.
 * @param {...Object} [sources] The source objects.
 * @param {Function} [customizer] The function to customize assigning values.
 * @param {*} [thisArg] The `this` binding of `customizer`.
 * @returns {Object} Returns `object`.
 * @example
 *
 * _.assign({ 'user': 'barney' }, { 'age': 40 }, { 'user': 'fred' });
 * // => { 'user': 'fred', 'age': 40 }
 *
 * // using a customizer callback
 * var defaults = _.partialRight(_.assign, function(value, other) {
 *   return typeof value == 'undefined' ? other : value;
 * });
 *
 * defaults({ 'user': 'barney' }, { 'age': 36 }, { 'user': 'fred' });
 * // => { 'user': 'barney', 'age': 36 }
 */
var assign = createAssigner(baseAssign);

module.exports = assign;

},{"../internal/baseAssign":84,"../internal/createAssigner":109}],153:[function(require,module,exports){
var assign = require('./assign'),
    assignDefaults = require('../internal/assignDefaults'),
    restParam = require('../function/restParam');

/**
 * Assigns own enumerable properties of source object(s) to the destination
 * object for all destination properties that resolve to `undefined`. Once a
 * property is set, additional values of the same property are ignored.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The destination object.
 * @param {...Object} [sources] The source objects.
 * @returns {Object} Returns `object`.
 * @example
 *
 * _.defaults({ 'user': 'barney' }, { 'age': 36 }, { 'user': 'fred' });
 * // => { 'user': 'barney', 'age': 36 }
 */
var defaults = restParam(function(args) {
  var object = args[0];
  if (object == null) {
    return object;
  }
  args.push(assignDefaults);
  return assign.apply(undefined, args);
});

module.exports = defaults;

},{"../function/restParam":78,"../internal/assignDefaults":83,"./assign":152}],154:[function(require,module,exports){
var isLength = require('../internal/isLength'),
    isNative = require('../lang/isNative'),
    isObject = require('../lang/isObject'),
    shimKeys = require('../internal/shimKeys');

/* Native method references for those with the same name as other `lodash` methods. */
var nativeKeys = isNative(nativeKeys = Object.keys) && nativeKeys;

/**
 * Creates an array of the own enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects. See the
 * [ES spec](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.keys)
 * for more details.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to inspect.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keys(new Foo);
 * // => ['a', 'b'] (iteration order is not guaranteed)
 *
 * _.keys('hi');
 * // => ['0', '1']
 */
var keys = !nativeKeys ? shimKeys : function(object) {
  if (object) {
    var Ctor = object.constructor,
        length = object.length;
  }
  if ((typeof Ctor == 'function' && Ctor.prototype === object) ||
      (typeof object != 'function' && (length && isLength(length)))) {
    return shimKeys(object);
  }
  return isObject(object) ? nativeKeys(object) : [];
};

module.exports = keys;

},{"../internal/isLength":129,"../internal/shimKeys":139,"../lang/isNative":146,"../lang/isObject":147}],155:[function(require,module,exports){
var isArguments = require('../lang/isArguments'),
    isArray = require('../lang/isArray'),
    isIndex = require('../internal/isIndex'),
    isLength = require('../internal/isLength'),
    isObject = require('../lang/isObject'),
    support = require('../support');

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Creates an array of the own and inherited enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to inspect.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keysIn(new Foo);
 * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
 */
function keysIn(object) {
  if (object == null) {
    return [];
  }
  if (!isObject(object)) {
    object = Object(object);
  }
  var length = object.length;
  length = (length && isLength(length) &&
    (isArray(object) || (support.nonEnumArgs && isArguments(object))) && length) || 0;

  var Ctor = object.constructor,
      index = -1,
      isProto = typeof Ctor == 'function' && Ctor.prototype === object,
      result = Array(length),
      skipIndexes = length > 0;

  while (++index < length) {
    result[index] = (index + '');
  }
  for (var key in object) {
    if (!(skipIndexes && isIndex(key, length)) &&
        !(key == 'constructor' && (isProto || !hasOwnProperty.call(object, key)))) {
      result.push(key);
    }
  }
  return result;
}

module.exports = keysIn;

},{"../internal/isIndex":126,"../internal/isLength":129,"../lang/isArguments":143,"../lang/isArray":144,"../lang/isObject":147,"../support":161}],156:[function(require,module,exports){
var baseCallback = require('../internal/baseCallback'),
    baseForOwn = require('../internal/baseForOwn');

/**
 * Creates an object with the same keys as `object` and values generated by
 * running each own enumerable property of `object` through `iteratee`. The
 * iteratee function is bound to `thisArg` and invoked with three arguments:
 * (value, key, object).
 *
 * If a property name is provided for `iteratee` the created `_.property`
 * style callback returns the property value of the given element.
 *
 * If a value is also provided for `thisArg` the created `_.matchesProperty`
 * style callback returns `true` for elements that have a matching property
 * value, else `false`.
 *
 * If an object is provided for `iteratee` the created `_.matches` style
 * callback returns `true` for elements that have the properties of the given
 * object, else `false`.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to iterate over.
 * @param {Function|Object|string} [iteratee=_.identity] The function invoked
 *  per iteration.
 * @param {*} [thisArg] The `this` binding of `iteratee`.
 * @returns {Object} Returns the new mapped object.
 * @example
 *
 * _.mapValues({ 'a': 1, 'b': 2 }, function(n) {
 *   return n * 3;
 * });
 * // => { 'a': 3, 'b': 6 }
 *
 * var users = {
 *   'fred':    { 'user': 'fred',    'age': 40 },
 *   'pebbles': { 'user': 'pebbles', 'age': 1 }
 * };
 *
 * // using the `_.property` callback shorthand
 * _.mapValues(users, 'age');
 * // => { 'fred': 40, 'pebbles': 1 } (iteration order is not guaranteed)
 */
function mapValues(object, iteratee, thisArg) {
  var result = {};
  iteratee = baseCallback(iteratee, thisArg, 3);

  baseForOwn(object, function(value, key, object) {
    result[key] = iteratee(value, key, object);
  });
  return result;
}

module.exports = mapValues;

},{"../internal/baseCallback":85,"../internal/baseForOwn":91}],157:[function(require,module,exports){
var baseMerge = require('../internal/baseMerge'),
    createAssigner = require('../internal/createAssigner');

/**
 * Recursively merges own enumerable properties of the source object(s), that
 * don't resolve to `undefined` into the destination object. Subsequent sources
 * overwrite property assignments of previous sources. If `customizer` is
 * provided it is invoked to produce the merged values of the destination and
 * source properties. If `customizer` returns `undefined` merging is handled
 * by the method instead. The `customizer` is bound to `thisArg` and invoked
 * with five arguments: (objectValue, sourceValue, key, object, source).
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The destination object.
 * @param {...Object} [sources] The source objects.
 * @param {Function} [customizer] The function to customize merging properties.
 * @param {*} [thisArg] The `this` binding of `customizer`.
 * @returns {Object} Returns `object`.
 * @example
 *
 * var users = {
 *   'data': [{ 'user': 'barney' }, { 'user': 'fred' }]
 * };
 *
 * var ages = {
 *   'data': [{ 'age': 36 }, { 'age': 40 }]
 * };
 *
 * _.merge(users, ages);
 * // => { 'data': [{ 'user': 'barney', 'age': 36 }, { 'user': 'fred', 'age': 40 }] }
 *
 * // using a customizer callback
 * var object = {
 *   'fruits': ['apple'],
 *   'vegetables': ['beet']
 * };
 *
 * var other = {
 *   'fruits': ['banana'],
 *   'vegetables': ['carrot']
 * };
 *
 * _.merge(object, other, function(a, b) {
 *   if (_.isArray(a)) {
 *     return a.concat(b);
 *   }
 * });
 * // => { 'fruits': ['apple', 'banana'], 'vegetables': ['beet', 'carrot'] }
 */
var merge = createAssigner(baseMerge);

module.exports = merge;

},{"../internal/baseMerge":99,"../internal/createAssigner":109}],158:[function(require,module,exports){
var keys = require('./keys');

/**
 * Creates a two dimensional array of the key-value pairs for `object`,
 * e.g. `[[key1, value1], [key2, value2]]`.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to inspect.
 * @returns {Array} Returns the new array of key-value pairs.
 * @example
 *
 * _.pairs({ 'barney': 36, 'fred': 40 });
 * // => [['barney', 36], ['fred', 40]] (iteration order is not guaranteed)
 */
function pairs(object) {
  var index = -1,
      props = keys(object),
      length = props.length,
      result = Array(length);

  while (++index < length) {
    var key = props[index];
    result[index] = [key, object[key]];
  }
  return result;
}

module.exports = pairs;

},{"./keys":154}],159:[function(require,module,exports){
var baseValues = require('../internal/baseValues'),
    keys = require('./keys');

/**
 * Creates an array of the own enumerable property values of `object`.
 *
 * **Note:** Non-object values are coerced to objects.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property values.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.values(new Foo);
 * // => [1, 2] (iteration order is not guaranteed)
 *
 * _.values('hi');
 * // => ['h', 'i']
 */
function values(object) {
  return baseValues(object, keys(object));
}

module.exports = values;

},{"../internal/baseValues":104,"./keys":154}],160:[function(require,module,exports){
var baseToString = require('../internal/baseToString');

/**
 * Used to match `RegExp` [special characters](http://www.regular-expressions.info/characters.html#special).
 * In addition to special characters the forward slash is escaped to allow for
 * easier `eval` use and `Function` compilation.
 */
var reRegExpChars = /[.*+?^${}()|[\]\/\\]/g,
    reHasRegExpChars = RegExp(reRegExpChars.source);

/**
 * Escapes the `RegExp` special characters "\", "/", "^", "$", ".", "|", "?",
 * "*", "+", "(", ")", "[", "]", "{" and "}" in `string`.
 *
 * @static
 * @memberOf _
 * @category String
 * @param {string} [string=''] The string to escape.
 * @returns {string} Returns the escaped string.
 * @example
 *
 * _.escapeRegExp('[lodash](https://lodash.com/)');
 * // => '\[lodash\]\(https:\/\/lodash\.com\/\)'
 */
function escapeRegExp(string) {
  string = baseToString(string);
  return (string && reHasRegExpChars.test(string))
    ? string.replace(reRegExpChars, '\\$&')
    : string;
}

module.exports = escapeRegExp;

},{"../internal/baseToString":103}],161:[function(require,module,exports){
(function (global){
/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to detect DOM support. */
var document = (document = global.window) && document.document;

/** Native method references. */
var propertyIsEnumerable = objectProto.propertyIsEnumerable;

/**
 * An object environment feature flags.
 *
 * @static
 * @memberOf _
 * @type Object
 */
var support = {};

(function(x) {

  /**
   * Detect if functions can be decompiled by `Function#toString`
   * (all but Firefox OS certified apps, older Opera mobile browsers, and
   * the PlayStation 3; forced `false` for Windows 8 apps).
   *
   * @memberOf _.support
   * @type boolean
   */
  support.funcDecomp = /\bthis\b/.test(function() { return this; });

  /**
   * Detect if `Function#name` is supported (all but IE).
   *
   * @memberOf _.support
   * @type boolean
   */
  support.funcNames = typeof Function.name == 'string';

  /**
   * Detect if the DOM is supported.
   *
   * @memberOf _.support
   * @type boolean
   */
  try {
    support.dom = document.createDocumentFragment().nodeType === 11;
  } catch(e) {
    support.dom = false;
  }

  /**
   * Detect if `arguments` object indexes are non-enumerable.
   *
   * In Firefox < 4, IE < 9, PhantomJS, and Safari < 5.1 `arguments` object
   * indexes are non-enumerable. Chrome < 25 and Node.js < 0.11.0 treat
   * `arguments` object indexes as non-enumerable and fail `hasOwnProperty`
   * checks for indexes that exceed their function's formal parameters with
   * associated values of `0`.
   *
   * @memberOf _.support
   * @type boolean
   */
  try {
    support.nonEnumArgs = !propertyIsEnumerable.call(arguments, 1);
  } catch(e) {
    support.nonEnumArgs = true;
  }
}(0, 0));

module.exports = support;

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],162:[function(require,module,exports){
/**
 * Creates a function that returns `value`.
 *
 * @static
 * @memberOf _
 * @category Utility
 * @param {*} value The value to return from the new function.
 * @returns {Function} Returns the new function.
 * @example
 *
 * var object = { 'user': 'fred' };
 * var getter = _.constant(object);
 *
 * getter() === object;
 * // => true
 */
function constant(value) {
  return function() {
    return value;
  };
}

module.exports = constant;

},{}],163:[function(require,module,exports){
/**
 * This method returns the first argument provided to it.
 *
 * @static
 * @memberOf _
 * @category Utility
 * @param {*} value Any value.
 * @returns {*} Returns `value`.
 * @example
 *
 * var object = { 'user': 'fred' };
 *
 * _.identity(object) === object;
 * // => true
 */
function identity(value) {
  return value;
}

module.exports = identity;

},{}],164:[function(require,module,exports){
/**
 * A no-operation function which returns `undefined` regardless of the
 * arguments it receives.
 *
 * @static
 * @memberOf _
 * @category Utility
 * @example
 *
 * var object = { 'user': 'fred' };
 *
 * _.noop(object) === undefined;
 * // => true
 */
function noop() {
  // No operation performed.
}

module.exports = noop;

},{}],165:[function(require,module,exports){
(function (global){
(function() {
  var Bacon, BufferingSource, Bus, CompositeUnsubscribe, ConsumingSource, Desc, Dispatcher, End, Error, Event, EventStream, Exception, Initial, Next, None, Observable, Property, PropertyDispatcher, Some, Source, UpdateBarrier, addPropertyInitValueToStream, assert, assertArray, assertEventStream, assertFunction, assertNoArguments, assertString, cloneArray, compositeUnsubscribe, containsDuplicateDeps, convertArgsToFunction, describe, end, eventIdCounter, findDeps, flatMap_, former, idCounter, initial, isArray, isFieldKey, isFunction, isObservable, latter, liftCallback, makeFunction, makeFunctionArgs, makeFunction_, makeObservable, makeSpawner, next, nop, partiallyApplied, recursionDepth, registerObs, spys, toCombinator, toEvent, toFieldExtractor, toFieldKey, toOption, toSimpleExtractor, withDescription, withMethodCallSupport, _, _ref,
    __slice = [].slice,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Bacon = {
    toString: function() {
      return "Bacon";
    }
  };

  Bacon.version = '0.7.34';

  Exception = (typeof global !== "undefined" && global !== null ? global : this).Error;

  Bacon.fromBinder = function(binder, eventTransformer) {
    if (eventTransformer == null) {
      eventTransformer = _.id;
    }
    return new EventStream(describe(Bacon, "fromBinder", binder, eventTransformer), function(sink) {
      var unbind, unbinder, unbound;
      unbound = false;
      unbind = function() {
        if (typeof unbinder !== "undefined" && unbinder !== null) {
          if (!unbound) {
            unbinder();
          }
          return unbound = true;
        }
      };
      unbinder = binder(function() {
        var args, event, reply, value, _i, _len;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        value = eventTransformer.apply(this, args);
        if (!(isArray(value) && _.last(value) instanceof Event)) {
          value = [value];
        }
        reply = Bacon.more;
        for (_i = 0, _len = value.length; _i < _len; _i++) {
          event = value[_i];
          reply = sink(event = toEvent(event));
          if (reply === Bacon.noMore || event.isEnd()) {
            if (unbinder != null) {
              unbind();
            } else {
              Bacon.scheduler.setTimeout(unbind, 0);
            }
            return reply;
          }
        }
        return reply;
      });
      return unbind;
    });
  };

  Bacon.$ = {};

  Bacon.$.asEventStream = function(eventName, selector, eventTransformer) {
    var _ref;
    if (isFunction(selector)) {
      _ref = [selector, void 0], eventTransformer = _ref[0], selector = _ref[1];
    }
    return withDescription(this.selector || this, "asEventStream", eventName, Bacon.fromBinder((function(_this) {
      return function(handler) {
        _this.on(eventName, selector, handler);
        return function() {
          return _this.off(eventName, selector, handler);
        };
      };
    })(this), eventTransformer));
  };

  if ((_ref = typeof jQuery !== "undefined" && jQuery !== null ? jQuery : typeof Zepto !== "undefined" && Zepto !== null ? Zepto : void 0) != null) {
    _ref.fn.asEventStream = Bacon.$.asEventStream;
  }

  Bacon.fromEventTarget = function(target, eventName, eventTransformer) {
    var sub, unsub, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6;
    sub = (_ref1 = (_ref2 = (_ref3 = target.addEventListener) != null ? _ref3 : target.addListener) != null ? _ref2 : target.bind) != null ? _ref1 : target.on;
    unsub = (_ref4 = (_ref5 = (_ref6 = target.removeEventListener) != null ? _ref6 : target.removeListener) != null ? _ref5 : target.unbind) != null ? _ref4 : target.off;
    return withDescription(Bacon, "fromEventTarget", target, eventName, Bacon.fromBinder(function(handler) {
      sub.call(target, eventName, handler);
      return function() {
        return unsub.call(target, eventName, handler);
      };
    }, eventTransformer));
  };

  Bacon.fromPromise = function(promise, abort) {
    return withDescription(Bacon, "fromPromise", promise, Bacon.fromBinder(function(handler) {
      promise.then(handler, function(e) {
        return handler(new Error(e));
      });
      return function() {
        if (abort) {
          return typeof promise.abort === "function" ? promise.abort() : void 0;
        }
      };
    }, (function(value) {
      return [value, end()];
    })));
  };

  Bacon.noMore = ["<no-more>"];

  Bacon.more = ["<more>"];

  Bacon.later = function(delay, value) {
    return withDescription(Bacon, "later", delay, value, Bacon.fromPoll(delay, function() {
      return [value, end()];
    }));
  };

  Bacon.sequentially = function(delay, values) {
    var index;
    index = 0;
    return withDescription(Bacon, "sequentially", delay, values, Bacon.fromPoll(delay, function() {
      var value;
      value = values[index++];
      if (index < values.length) {
        return value;
      } else if (index === values.length) {
        return [value, end()];
      } else {
        return end();
      }
    }));
  };

  Bacon.repeatedly = function(delay, values) {
    var index;
    index = 0;
    return withDescription(Bacon, "repeatedly", delay, values, Bacon.fromPoll(delay, function() {
      return values[index++ % values.length];
    }));
  };

  Bacon.spy = function(spy) {
    return spys.push(spy);
  };

  spys = [];

  registerObs = function(obs) {
    var spy, _i, _len;
    if (spys.length) {
      if (!registerObs.running) {
        try {
          registerObs.running = true;
          for (_i = 0, _len = spys.length; _i < _len; _i++) {
            spy = spys[_i];
            spy(obs);
          }
        } finally {
          delete registerObs.running;
        }
      }
    }
    return void 0;
  };

  withMethodCallSupport = function(wrapped) {
    return function() {
      var args, context, f, methodName;
      f = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (typeof f === "object" && args.length) {
        context = f;
        methodName = args[0];
        f = function() {
          return context[methodName].apply(context, arguments);
        };
        args = args.slice(1);
      }
      return wrapped.apply(null, [f].concat(__slice.call(args)));
    };
  };

  liftCallback = function(desc, wrapped) {
    return withMethodCallSupport(function() {
      var args, f, stream;
      f = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      stream = partiallyApplied(wrapped, [
        function(values, callback) {
          return f.apply(null, __slice.call(values).concat([callback]));
        }
      ]);
      return withDescription.apply(null, [Bacon, desc, f].concat(__slice.call(args), [Bacon.combineAsArray(args).flatMap(stream)]));
    });
  };

  Bacon.fromCallback = liftCallback("fromCallback", function() {
    var args, f;
    f = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    return Bacon.fromBinder(function(handler) {
      makeFunction(f, args)(handler);
      return nop;
    }, (function(value) {
      return [value, end()];
    }));
  });

  Bacon.fromNodeCallback = liftCallback("fromNodeCallback", function() {
    var args, f;
    f = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    return Bacon.fromBinder(function(handler) {
      makeFunction(f, args)(handler);
      return nop;
    }, function(error, value) {
      if (error) {
        return [new Error(error), end()];
      }
      return [value, end()];
    });
  });

  Bacon.fromPoll = function(delay, poll) {
    return withDescription(Bacon, "fromPoll", delay, poll, Bacon.fromBinder((function(handler) {
      var id;
      id = Bacon.scheduler.setInterval(handler, delay);
      return function() {
        return Bacon.scheduler.clearInterval(id);
      };
    }), poll));
  };

  Bacon.interval = function(delay, value) {
    if (value == null) {
      value = {};
    }
    return withDescription(Bacon, "interval", delay, value, Bacon.fromPoll(delay, function() {
      return next(value);
    }));
  };

  Bacon.constant = function(value) {
    return new Property(describe(Bacon, "constant", value), function(sink) {
      sink(initial(value));
      sink(end());
      return nop;
    });
  };

  Bacon.never = function() {
    return new EventStream(describe(Bacon, "never"), function(sink) {
      sink(end());
      return nop;
    });
  };

  Bacon.once = function(value) {
    return new EventStream(describe(Bacon, "once", value), function(sink) {
      sink(toEvent(value));
      sink(end());
      return nop;
    });
  };

  Bacon.fromArray = function(values) {
    var i;
    assertArray(values);
    i = 0;
    return new EventStream(describe(Bacon, "fromArray", values), function(sink) {
      var reply, unsubd, value;
      unsubd = false;
      reply = Bacon.more;
      while ((reply !== Bacon.noMore) && !unsubd) {
        if (i >= values.length) {
          sink(end());
          reply = Bacon.noMore;
        } else {
          value = values[i++];
          reply = sink(toEvent(value));
        }
      }
      return function() {
        return unsubd = true;
      };
    });
  };

  Bacon.mergeAll = function() {
    var streams;
    streams = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    if (isArray(streams[0])) {
      streams = streams[0];
    }
    if (streams.length) {
      return new EventStream(describe.apply(null, [Bacon, "mergeAll"].concat(__slice.call(streams))), function(sink) {
        var ends, sinks, smartSink;
        ends = 0;
        smartSink = function(obs) {
          return function(unsubBoth) {
            return obs.dispatcher.subscribe(function(event) {
              var reply;
              if (event.isEnd()) {
                ends++;
                if (ends === streams.length) {
                  return sink(end());
                } else {
                  return Bacon.more;
                }
              } else {
                reply = sink(event);
                if (reply === Bacon.noMore) {
                  unsubBoth();
                }
                return reply;
              }
            });
          };
        };
        sinks = _.map(smartSink, streams);
        return compositeUnsubscribe.apply(null, sinks);
      });
    } else {
      return Bacon.never();
    }
  };

  Bacon.zipAsArray = function() {
    var streams;
    streams = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    if (isArray(streams[0])) {
      streams = streams[0];
    }
    return withDescription.apply(null, [Bacon, "zipAsArray"].concat(__slice.call(streams), [Bacon.zipWith(streams, function() {
      var xs;
      xs = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return xs;
    })]));
  };

  Bacon.zipWith = function() {
    var f, streams, _ref1;
    f = arguments[0], streams = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    if (!isFunction(f)) {
      _ref1 = [f, streams[0]], streams = _ref1[0], f = _ref1[1];
    }
    streams = _.map((function(s) {
      return s.toEventStream();
    }), streams);
    return withDescription.apply(null, [Bacon, "zipWith", f].concat(__slice.call(streams), [Bacon.when(streams, f)]));
  };

  Bacon.groupSimultaneous = function() {
    var s, sources, streams;
    streams = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    if (streams.length === 1 && isArray(streams[0])) {
      streams = streams[0];
    }
    sources = (function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = streams.length; _i < _len; _i++) {
        s = streams[_i];
        _results.push(new BufferingSource(s));
      }
      return _results;
    })();
    return withDescription.apply(null, [Bacon, "groupSimultaneous"].concat(__slice.call(streams), [Bacon.when(sources, (function() {
      var xs;
      xs = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return xs;
    }))]));
  };

  Bacon.combineAsArray = function() {
    var index, s, sources, stream, streams, _i, _len;
    streams = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    if (streams.length === 1 && isArray(streams[0])) {
      streams = streams[0];
    }
    for (index = _i = 0, _len = streams.length; _i < _len; index = ++_i) {
      stream = streams[index];
      if (!(isObservable(stream))) {
        streams[index] = Bacon.constant(stream);
      }
    }
    if (streams.length) {
      sources = (function() {
        var _j, _len1, _results;
        _results = [];
        for (_j = 0, _len1 = streams.length; _j < _len1; _j++) {
          s = streams[_j];
          _results.push(new Source(s, true));
        }
        return _results;
      })();
      return withDescription.apply(null, [Bacon, "combineAsArray"].concat(__slice.call(streams), [Bacon.when(sources, (function() {
        var xs;
        xs = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        return xs;
      })).toProperty()]));
    } else {
      return Bacon.constant([]);
    }
  };

  Bacon.onValues = function() {
    var f, streams, _i;
    streams = 2 <= arguments.length ? __slice.call(arguments, 0, _i = arguments.length - 1) : (_i = 0, []), f = arguments[_i++];
    return Bacon.combineAsArray(streams).onValues(f);
  };

  Bacon.combineWith = function() {
    var f, streams;
    f = arguments[0], streams = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    return withDescription.apply(null, [Bacon, "combineWith", f].concat(__slice.call(streams), [Bacon.combineAsArray(streams).map(function(values) {
      return f.apply(null, values);
    })]));
  };

  Bacon.combineTemplate = function(template) {
    var applyStreamValue, combinator, compile, compileTemplate, constantValue, current, funcs, mkContext, setValue, streams;
    funcs = [];
    streams = [];
    current = function(ctxStack) {
      return ctxStack[ctxStack.length - 1];
    };
    setValue = function(ctxStack, key, value) {
      return current(ctxStack)[key] = value;
    };
    applyStreamValue = function(key, index) {
      return function(ctxStack, values) {
        return setValue(ctxStack, key, values[index]);
      };
    };
    constantValue = function(key, value) {
      return function(ctxStack) {
        return setValue(ctxStack, key, value);
      };
    };
    mkContext = function(template) {
      if (isArray(template)) {
        return [];
      } else {
        return {};
      }
    };
    compile = function(key, value) {
      var popContext, pushContext;
      if (isObservable(value)) {
        streams.push(value);
        return funcs.push(applyStreamValue(key, streams.length - 1));
      } else if (value === Object(value) && typeof value !== "function" && !(value instanceof RegExp) && !(value instanceof Date)) {
        pushContext = function(key) {
          return function(ctxStack) {
            var newContext;
            newContext = mkContext(value);
            setValue(ctxStack, key, newContext);
            return ctxStack.push(newContext);
          };
        };
        popContext = function(ctxStack) {
          return ctxStack.pop();
        };
        funcs.push(pushContext(key));
        compileTemplate(value);
        return funcs.push(popContext);
      } else {
        return funcs.push(constantValue(key, value));
      }
    };
    compileTemplate = function(template) {
      return _.each(template, compile);
    };
    compileTemplate(template);
    combinator = function(values) {
      var ctxStack, f, rootContext, _i, _len;
      rootContext = mkContext(template);
      ctxStack = [rootContext];
      for (_i = 0, _len = funcs.length; _i < _len; _i++) {
        f = funcs[_i];
        f(ctxStack, values);
      }
      return rootContext;
    };
    return withDescription(Bacon, "combineTemplate", template, Bacon.combineAsArray(streams).map(combinator));
  };

  Bacon.retry = function(options) {
    var delay, isRetryable, maxRetries, retries, retry, source;
    if (!isFunction(options.source)) {
      throw new Exception("'source' option has to be a function");
    }
    source = options.source;
    retries = options.retries || 0;
    maxRetries = options.maxRetries || retries;
    delay = options.delay || function() {
      return 0;
    };
    isRetryable = options.isRetryable || function() {
      return true;
    };
    retry = function(context) {
      var delayedRetry, nextAttemptOptions;
      nextAttemptOptions = {
        source: source,
        retries: retries - 1,
        maxRetries: maxRetries,
        delay: delay,
        isRetryable: isRetryable
      };
      delayedRetry = function() {
        return Bacon.retry(nextAttemptOptions);
      };
      return Bacon.later(delay(context)).filter(false).concat(Bacon.once().flatMap(delayedRetry));
    };
    return withDescription(Bacon, "retry", options, source().flatMapError(function(e) {
      if (isRetryable(e) && retries > 0) {
        return retry({
          error: e,
          retriesDone: maxRetries - retries
        });
      } else {
        return Bacon.once(new Error(e));
      }
    }));
  };

  eventIdCounter = 0;

  Event = (function() {
    function Event() {
      this.id = ++eventIdCounter;
    }

    Event.prototype.isEvent = function() {
      return true;
    };

    Event.prototype.isEnd = function() {
      return false;
    };

    Event.prototype.isInitial = function() {
      return false;
    };

    Event.prototype.isNext = function() {
      return false;
    };

    Event.prototype.isError = function() {
      return false;
    };

    Event.prototype.hasValue = function() {
      return false;
    };

    Event.prototype.filter = function() {
      return true;
    };

    Event.prototype.inspect = function() {
      return this.toString();
    };

    Event.prototype.log = function() {
      return this.toString();
    };

    return Event;

  })();

  Next = (function(_super) {
    __extends(Next, _super);

    function Next(valueF, eager) {
      Next.__super__.constructor.call(this);
      if (!eager && isFunction(valueF) || valueF instanceof Next) {
        this.valueF = valueF;
        this.valueInternal = void 0;
      } else {
        this.valueF = void 0;
        this.valueInternal = valueF;
      }
    }

    Next.prototype.isNext = function() {
      return true;
    };

    Next.prototype.hasValue = function() {
      return true;
    };

    Next.prototype.value = function() {
      if (this.valueF instanceof Next) {
        this.valueInternal = this.valueF.value();
        this.valueF = void 0;
      } else if (this.valueF) {
        this.valueInternal = this.valueF();
        this.valueF = void 0;
      }
      return this.valueInternal;
    };

    Next.prototype.fmap = function(f) {
      var event, value;
      if (this.valueInternal) {
        value = this.valueInternal;
        return this.apply(function() {
          return f(value);
        });
      } else {
        event = this;
        return this.apply(function() {
          return f(event.value());
        });
      }
    };

    Next.prototype.apply = function(value) {
      return new Next(value);
    };

    Next.prototype.filter = function(f) {
      return f(this.value());
    };

    Next.prototype.toString = function() {
      return _.toString(this.value());
    };

    Next.prototype.log = function() {
      return this.value();
    };

    return Next;

  })(Event);

  Initial = (function(_super) {
    __extends(Initial, _super);

    function Initial() {
      return Initial.__super__.constructor.apply(this, arguments);
    }

    Initial.prototype.isInitial = function() {
      return true;
    };

    Initial.prototype.isNext = function() {
      return false;
    };

    Initial.prototype.apply = function(value) {
      return new Initial(value);
    };

    Initial.prototype.toNext = function() {
      return new Next(this);
    };

    return Initial;

  })(Next);

  End = (function(_super) {
    __extends(End, _super);

    function End() {
      return End.__super__.constructor.apply(this, arguments);
    }

    End.prototype.isEnd = function() {
      return true;
    };

    End.prototype.fmap = function() {
      return this;
    };

    End.prototype.apply = function() {
      return this;
    };

    End.prototype.toString = function() {
      return "<end>";
    };

    return End;

  })(Event);

  Error = (function(_super) {
    __extends(Error, _super);

    function Error(error) {
      this.error = error;
    }

    Error.prototype.isError = function() {
      return true;
    };

    Error.prototype.fmap = function() {
      return this;
    };

    Error.prototype.apply = function() {
      return this;
    };

    Error.prototype.toString = function() {
      return "<error> " + _.toString(this.error);
    };

    return Error;

  })(Event);

  idCounter = 0;

  Observable = (function() {
    function Observable(desc) {
      this.id = ++idCounter;
      withDescription(desc, this);
      this.initialDesc = this.desc;
    }

    Observable.prototype.subscribe = function(sink) {
      return UpdateBarrier.wrappedSubscribe(this, sink);
    };

    Observable.prototype.subscribeInternal = function(sink) {
      return this.dispatcher.subscribe(sink);
    };

    Observable.prototype.onValue = function() {
      var f;
      f = makeFunctionArgs(arguments);
      return this.subscribe(function(event) {
        if (event.hasValue()) {
          return f(event.value());
        }
      });
    };

    Observable.prototype.onValues = function(f) {
      return this.onValue(function(args) {
        return f.apply(null, args);
      });
    };

    Observable.prototype.onError = function() {
      var f;
      f = makeFunctionArgs(arguments);
      return this.subscribe(function(event) {
        if (event.isError()) {
          return f(event.error);
        }
      });
    };

    Observable.prototype.onEnd = function() {
      var f;
      f = makeFunctionArgs(arguments);
      return this.subscribe(function(event) {
        if (event.isEnd()) {
          return f();
        }
      });
    };

    Observable.prototype.errors = function() {
      return withDescription(this, "errors", this.filter(function() {
        return false;
      }));
    };

    Observable.prototype.filter = function() {
      var args, f;
      f = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return convertArgsToFunction(this, f, args, function(f) {
        return withDescription(this, "filter", f, this.withHandler(function(event) {
          if (event.filter(f)) {
            return this.push(event);
          } else {
            return Bacon.more;
          }
        }));
      });
    };

    Observable.prototype.takeWhile = function() {
      var args, f;
      f = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return convertArgsToFunction(this, f, args, function(f) {
        return withDescription(this, "takeWhile", f, this.withHandler(function(event) {
          if (event.filter(f)) {
            return this.push(event);
          } else {
            this.push(end());
            return Bacon.noMore;
          }
        }));
      });
    };

    Observable.prototype.endOnError = function() {
      var args, f;
      f = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (f == null) {
        f = true;
      }
      return convertArgsToFunction(this, f, args, function(f) {
        return withDescription(this, "endOnError", this.withHandler(function(event) {
          if (event.isError() && f(event.error)) {
            this.push(event);
            return this.push(end());
          } else {
            return this.push(event);
          }
        }));
      });
    };

    Observable.prototype.take = function(count) {
      if (count <= 0) {
        return Bacon.never();
      }
      return withDescription(this, "take", count, this.withHandler(function(event) {
        if (!event.hasValue()) {
          return this.push(event);
        } else {
          count--;
          if (count > 0) {
            return this.push(event);
          } else {
            if (count === 0) {
              this.push(event);
            }
            this.push(end());
            return Bacon.noMore;
          }
        }
      }));
    };

    Observable.prototype.map = function() {
      var args, p;
      p = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (p instanceof Property) {
        return p.sampledBy(this, former);
      } else {
        return convertArgsToFunction(this, p, args, function(f) {
          return withDescription(this, "map", f, this.withHandler(function(event) {
            return this.push(event.fmap(f));
          }));
        });
      }
    };

    Observable.prototype.mapError = function() {
      var f;
      f = makeFunctionArgs(arguments);
      return withDescription(this, "mapError", f, this.withHandler(function(event) {
        if (event.isError()) {
          return this.push(next(f(event.error)));
        } else {
          return this.push(event);
        }
      }));
    };

    Observable.prototype.mapEnd = function() {
      var f;
      f = makeFunctionArgs(arguments);
      return withDescription(this, "mapEnd", f, this.withHandler(function(event) {
        if (event.isEnd()) {
          this.push(next(f(event)));
          this.push(end());
          return Bacon.noMore;
        } else {
          return this.push(event);
        }
      }));
    };

    Observable.prototype.doAction = function() {
      var f;
      f = makeFunctionArgs(arguments);
      return withDescription(this, "doAction", f, this.withHandler(function(event) {
        if (event.hasValue()) {
          f(event.value());
        }
        return this.push(event);
      }));
    };

    Observable.prototype.skip = function(count) {
      return withDescription(this, "skip", count, this.withHandler(function(event) {
        if (!event.hasValue()) {
          return this.push(event);
        } else if (count > 0) {
          count--;
          return Bacon.more;
        } else {
          return this.push(event);
        }
      }));
    };

    Observable.prototype.skipDuplicates = function(isEqual) {
      if (isEqual == null) {
        isEqual = function(a, b) {
          return a === b;
        };
      }
      return withDescription(this, "skipDuplicates", this.withStateMachine(None, function(prev, event) {
        if (!event.hasValue()) {
          return [prev, [event]];
        } else if (event.isInitial() || prev === None || !isEqual(prev.get(), event.value())) {
          return [new Some(event.value()), [event]];
        } else {
          return [prev, []];
        }
      }));
    };

    Observable.prototype.skipErrors = function() {
      return withDescription(this, "skipErrors", this.withHandler(function(event) {
        if (event.isError()) {
          return Bacon.more;
        } else {
          return this.push(event);
        }
      }));
    };

    Observable.prototype.withStateMachine = function(initState, f) {
      var state;
      state = initState;
      return withDescription(this, "withStateMachine", initState, f, this.withHandler(function(event) {
        var fromF, newState, output, outputs, reply, _i, _len;
        fromF = f(state, event);
        newState = fromF[0], outputs = fromF[1];
        state = newState;
        reply = Bacon.more;
        for (_i = 0, _len = outputs.length; _i < _len; _i++) {
          output = outputs[_i];
          reply = this.push(output);
          if (reply === Bacon.noMore) {
            return reply;
          }
        }
        return reply;
      }));
    };

    Observable.prototype.scan = function(seed, f) {
      var acc, resultProperty, subscribe;
      f = toCombinator(f);
      acc = toOption(seed);
      subscribe = (function(_this) {
        return function(sink) {
          var initSent, reply, sendInit, unsub;
          initSent = false;
          unsub = nop;
          reply = Bacon.more;
          sendInit = function() {
            if (!initSent) {
              return acc.forEach(function(value) {
                initSent = true;
                reply = sink(new Initial(function() {
                  return value;
                }));
                if (reply === Bacon.noMore) {
                  unsub();
                  return unsub = nop;
                }
              });
            }
          };
          unsub = _this.dispatcher.subscribe(function(event) {
            var next, prev;
            if (event.hasValue()) {
              if (initSent && event.isInitial()) {
                return Bacon.more;
              } else {
                if (!event.isInitial()) {
                  sendInit();
                }
                initSent = true;
                prev = acc.getOrElse(void 0);
                next = f(prev, event.value());
                acc = new Some(next);
                return sink(event.apply(function() {
                  return next;
                }));
              }
            } else {
              if (event.isEnd()) {
                reply = sendInit();
              }
              if (reply !== Bacon.noMore) {
                return sink(event);
              }
            }
          });
          UpdateBarrier.whenDoneWith(resultProperty, sendInit);
          return unsub;
        };
      })(this);
      return resultProperty = new Property(describe(this, "scan", seed, f), subscribe);
    };

    Observable.prototype.fold = function(seed, f) {
      return withDescription(this, "fold", seed, f, this.scan(seed, f).sampledBy(this.filter(false).mapEnd().toProperty()));
    };

    Observable.prototype.zip = function(other, f) {
      if (f == null) {
        f = Array;
      }
      return withDescription(this, "zip", other, Bacon.zipWith([this, other], f));
    };

    Observable.prototype.diff = function(start, f) {
      f = toCombinator(f);
      return withDescription(this, "diff", start, f, this.scan([start], function(prevTuple, next) {
        return [next, f(prevTuple[0], next)];
      }).filter(function(tuple) {
        return tuple.length === 2;
      }).map(function(tuple) {
        return tuple[1];
      }));
    };

    Observable.prototype.flatMap = function() {
      return flatMap_(this, makeSpawner(arguments));
    };

    Observable.prototype.flatMapFirst = function() {
      return flatMap_(this, makeSpawner(arguments), true);
    };

    Observable.prototype.flatMapWithConcurrencyLimit = function() {
      var args, limit;
      limit = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return withDescription.apply(null, [this, "flatMapWithConcurrencyLimit", limit].concat(__slice.call(args), [flatMap_(this, makeSpawner(args), false, limit)]));
    };

    Observable.prototype.flatMapLatest = function() {
      var f, stream;
      f = makeSpawner(arguments);
      stream = this.toEventStream();
      return withDescription(this, "flatMapLatest", f, stream.flatMap(function(value) {
        return makeObservable(f(value)).takeUntil(stream);
      }));
    };

    Observable.prototype.flatMapError = function(fn) {
      return withDescription(this, "flatMapError", fn, this.mapError(function(err) {
        return new Error(err);
      }).flatMap(function(x) {
        if (x instanceof Error) {
          return fn(x.error);
        } else {
          return Bacon.once(x);
        }
      }));
    };

    Observable.prototype.flatMapConcat = function() {
      return withDescription.apply(null, [this, "flatMapConcat"].concat(__slice.call(arguments), [this.flatMapWithConcurrencyLimit.apply(this, [1].concat(__slice.call(arguments)))]));
    };

    Observable.prototype.bufferingThrottle = function(minimumInterval) {
      return withDescription(this, "bufferingThrottle", minimumInterval, this.flatMapConcat(function(x) {
        return Bacon.once(x).concat(Bacon.later(minimumInterval).filter(false));
      }));
    };

    Observable.prototype.not = function() {
      return withDescription(this, "not", this.map(function(x) {
        return !x;
      }));
    };

    Observable.prototype.log = function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      this.subscribe(function(event) {
        return typeof console !== "undefined" && console !== null ? typeof console.log === "function" ? console.log.apply(console, __slice.call(args).concat([event.log()])) : void 0 : void 0;
      });
      return this;
    };

    Observable.prototype.slidingWindow = function(n, minValues) {
      if (minValues == null) {
        minValues = 0;
      }
      return withDescription(this, "slidingWindow", n, minValues, this.scan([], (function(window, value) {
        return window.concat([value]).slice(-n);
      })).filter((function(values) {
        return values.length >= minValues;
      })));
    };

    Observable.prototype.combine = function(other, f) {
      var combinator;
      combinator = toCombinator(f);
      return withDescription(this, "combine", other, f, Bacon.combineAsArray(this, other).map(function(values) {
        return combinator(values[0], values[1]);
      }));
    };

    Observable.prototype.decode = function(cases) {
      return withDescription(this, "decode", cases, this.combine(Bacon.combineTemplate(cases), function(key, values) {
        return values[key];
      }));
    };

    Observable.prototype.awaiting = function(other) {
      return withDescription(this, "awaiting", other, Bacon.groupSimultaneous(this, other).map(function(_arg) {
        var myValues, otherValues;
        myValues = _arg[0], otherValues = _arg[1];
        return otherValues.length === 0;
      }).toProperty(false).skipDuplicates());
    };

    Observable.prototype.name = function(name) {
      this._name = name;
      return this;
    };

    Observable.prototype.withDescription = function() {
      return describe.apply(null, arguments).apply(this);
    };

    Observable.prototype.toString = function() {
      if (this._name) {
        return this._name;
      } else {
        return this.desc.toString();
      }
    };

    Observable.prototype.internalDeps = function() {
      return this.initialDesc.deps();
    };

    return Observable;

  })();

  Observable.prototype.reduce = Observable.prototype.fold;

  Observable.prototype.assign = Observable.prototype.onValue;

  Observable.prototype.inspect = Observable.prototype.toString;

  flatMap_ = function(root, f, firstOnly, limit) {
    var childDeps, result, rootDep;
    rootDep = [root];
    childDeps = [];
    result = new EventStream(describe(root, "flatMap" + (firstOnly ? "First" : ""), f), function(sink) {
      var checkEnd, checkQueue, composite, queue, spawn;
      composite = new CompositeUnsubscribe();
      queue = [];
      spawn = function(event) {
        var child;
        child = makeObservable(f(event.value()));
        childDeps.push(child);
        return composite.add(function(unsubAll, unsubMe) {
          return child.dispatcher.subscribe(function(event) {
            var reply;
            if (event.isEnd()) {
              _.remove(child, childDeps);
              checkQueue();
              checkEnd(unsubMe);
              return Bacon.noMore;
            } else {
              if (event instanceof Initial) {
                event = event.toNext();
              }
              reply = sink(event);
              if (reply === Bacon.noMore) {
                unsubAll();
              }
              return reply;
            }
          });
        });
      };
      checkQueue = function() {
        var event;
        event = queue.shift();
        if (event) {
          return spawn(event);
        }
      };
      checkEnd = function(unsub) {
        unsub();
        if (composite.empty()) {
          return sink(end());
        }
      };
      composite.add(function(__, unsubRoot) {
        return root.dispatcher.subscribe(function(event) {
          if (event.isEnd()) {
            return checkEnd(unsubRoot);
          } else if (event.isError()) {
            return sink(event);
          } else if (firstOnly && composite.count() > 1) {
            return Bacon.more;
          } else {
            if (composite.unsubscribed) {
              return Bacon.noMore;
            }
            if (limit && composite.count() > limit) {
              return queue.push(event);
            } else {
              return spawn(event);
            }
          }
        });
      });
      return composite.unsubscribe;
    });
    result.internalDeps = function() {
      if (childDeps.length) {
        return rootDep.concat(childDeps);
      } else {
        return rootDep;
      }
    };
    return result;
  };

  EventStream = (function(_super) {
    __extends(EventStream, _super);

    function EventStream(desc, subscribe, handler) {
      if (isFunction(desc)) {
        handler = subscribe;
        subscribe = desc;
        desc = [];
      }
      EventStream.__super__.constructor.call(this, desc);
      assertFunction(subscribe);
      this.dispatcher = new Dispatcher(subscribe, handler);
      registerObs(this);
    }

    EventStream.prototype.delay = function(delay) {
      return withDescription(this, "delay", delay, this.flatMap(function(value) {
        return Bacon.later(delay, value);
      }));
    };

    EventStream.prototype.debounce = function(delay) {
      return withDescription(this, "debounce", delay, this.flatMapLatest(function(value) {
        return Bacon.later(delay, value);
      }));
    };

    EventStream.prototype.debounceImmediate = function(delay) {
      return withDescription(this, "debounceImmediate", delay, this.flatMapFirst(function(value) {
        return Bacon.once(value).concat(Bacon.later(delay).filter(false));
      }));
    };

    EventStream.prototype.throttle = function(delay) {
      return withDescription(this, "throttle", delay, this.bufferWithTime(delay).map(function(values) {
        return values[values.length - 1];
      }));
    };

    EventStream.prototype.bufferWithTime = function(delay) {
      return withDescription(this, "bufferWithTime", delay, this.bufferWithTimeOrCount(delay, Number.MAX_VALUE));
    };

    EventStream.prototype.bufferWithCount = function(count) {
      return withDescription(this, "bufferWithCount", count, this.bufferWithTimeOrCount(void 0, count));
    };

    EventStream.prototype.bufferWithTimeOrCount = function(delay, count) {
      var flushOrSchedule;
      flushOrSchedule = function(buffer) {
        if (buffer.values.length === count) {
          return buffer.flush();
        } else if (delay !== void 0) {
          return buffer.schedule();
        }
      };
      return withDescription(this, "bufferWithTimeOrCount", delay, count, this.buffer(delay, flushOrSchedule, flushOrSchedule));
    };

    EventStream.prototype.buffer = function(delay, onInput, onFlush) {
      var buffer, delayMs, reply;
      if (onInput == null) {
        onInput = nop;
      }
      if (onFlush == null) {
        onFlush = nop;
      }
      buffer = {
        scheduled: false,
        end: void 0,
        values: [],
        flush: function() {
          var reply;
          this.scheduled = false;
          if (this.values.length > 0) {
            reply = this.push(next(this.values));
            this.values = [];
            if (this.end != null) {
              return this.push(this.end);
            } else if (reply !== Bacon.noMore) {
              return onFlush(this);
            }
          } else {
            if (this.end != null) {
              return this.push(this.end);
            }
          }
        },
        schedule: function() {
          if (!this.scheduled) {
            this.scheduled = true;
            return delay((function(_this) {
              return function() {
                return _this.flush();
              };
            })(this));
          }
        }
      };
      reply = Bacon.more;
      if (!isFunction(delay)) {
        delayMs = delay;
        delay = function(f) {
          return Bacon.scheduler.setTimeout(f, delayMs);
        };
      }
      return withDescription(this, "buffer", this.withHandler(function(event) {
        buffer.push = (function(_this) {
          return function(event) {
            return _this.push(event);
          };
        })(this);
        if (event.isError()) {
          reply = this.push(event);
        } else if (event.isEnd()) {
          buffer.end = event;
          if (!buffer.scheduled) {
            buffer.flush();
          }
        } else {
          buffer.values.push(event.value());
          onInput(buffer);
        }
        return reply;
      }));
    };

    EventStream.prototype.merge = function(right) {
      var left;
      assertEventStream(right);
      left = this;
      return withDescription(left, "merge", right, Bacon.mergeAll(this, right));
    };

    EventStream.prototype.toProperty = function(initValue_) {
      var disp, initValue;
      initValue = arguments.length === 0 ? None : toOption(function() {
        return initValue_;
      });
      disp = this.dispatcher;
      return new Property(describe(this, "toProperty", initValue_), function(sink) {
        var initSent, reply, sendInit, unsub;
        initSent = false;
        unsub = nop;
        reply = Bacon.more;
        sendInit = function() {
          if (!initSent) {
            return initValue.forEach(function(value) {
              initSent = true;
              reply = sink(new Initial(value));
              if (reply === Bacon.noMore) {
                unsub();
                return unsub = nop;
              }
            });
          }
        };
        unsub = disp.subscribe(function(event) {
          if (event.hasValue()) {
            if (initSent && event.isInitial()) {
              return Bacon.more;
            } else {
              if (!event.isInitial()) {
                sendInit();
              }
              initSent = true;
              initValue = new Some(event);
              return sink(event);
            }
          } else {
            if (event.isEnd()) {
              reply = sendInit();
            }
            if (reply !== Bacon.noMore) {
              return sink(event);
            }
          }
        });
        sendInit();
        return unsub;
      });
    };

    EventStream.prototype.toEventStream = function() {
      return this;
    };

    EventStream.prototype.sampledBy = function(sampler, combinator) {
      return withDescription(this, "sampledBy", sampler, combinator, this.toProperty().sampledBy(sampler, combinator));
    };

    EventStream.prototype.concat = function(right) {
      var left;
      left = this;
      return new EventStream(describe(left, "concat", right), function(sink) {
        var unsubLeft, unsubRight;
        unsubRight = nop;
        unsubLeft = left.dispatcher.subscribe(function(e) {
          if (e.isEnd()) {
            return unsubRight = right.dispatcher.subscribe(sink);
          } else {
            return sink(e);
          }
        });
        return function() {
          unsubLeft();
          return unsubRight();
        };
      });
    };

    EventStream.prototype.takeUntil = function(stopper) {
      var endMarker;
      endMarker = {};
      return withDescription(this, "takeUntil", stopper, Bacon.groupSimultaneous(this.mapEnd(endMarker), stopper.skipErrors()).withHandler(function(event) {
        var data, reply, value, _i, _len, _ref1;
        if (!event.hasValue()) {
          return this.push(event);
        } else {
          _ref1 = event.value(), data = _ref1[0], stopper = _ref1[1];
          if (stopper.length) {
            return this.push(end());
          } else {
            reply = Bacon.more;
            for (_i = 0, _len = data.length; _i < _len; _i++) {
              value = data[_i];
              if (value === endMarker) {
                reply = this.push(end());
              } else {
                reply = this.push(next(value));
              }
            }
            return reply;
          }
        }
      }));
    };

    EventStream.prototype.skipUntil = function(starter) {
      var started;
      started = starter.take(1).map(true).toProperty(false);
      return withDescription(this, "skipUntil", starter, this.filter(started));
    };

    EventStream.prototype.skipWhile = function() {
      var args, f, ok;
      f = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      ok = false;
      return convertArgsToFunction(this, f, args, function(f) {
        return withDescription(this, "skipWhile", f, this.withHandler(function(event) {
          if (ok || !event.hasValue() || !f(event.value())) {
            if (event.hasValue()) {
              ok = true;
            }
            return this.push(event);
          } else {
            return Bacon.more;
          }
        }));
      });
    };

    EventStream.prototype.holdWhen = function(valve) {
      var putToHold, releaseHold, valve_;
      valve_ = valve.startWith(false);
      releaseHold = valve_.filter(function(x) {
        return !x;
      });
      putToHold = valve_.filter(_.id);
      return withDescription(this, "holdWhen", valve, this.filter(false).merge(valve_.flatMapConcat((function(_this) {
        return function(shouldHold) {
          if (!shouldHold) {
            return _this.takeUntil(putToHold);
          } else {
            return _this.scan([], (function(xs, x) {
              return xs.concat(x);
            })).sampledBy(releaseHold).take(1).flatMap(Bacon.fromArray);
          }
        };
      })(this))));
    };

    EventStream.prototype.startWith = function(seed) {
      return withDescription(this, "startWith", seed, Bacon.once(seed).concat(this));
    };

    EventStream.prototype.withHandler = function(handler) {
      return new EventStream(describe(this, "withHandler", handler), this.dispatcher.subscribe, handler);
    };

    return EventStream;

  })(Observable);

  Property = (function(_super) {
    __extends(Property, _super);

    function Property(desc, subscribe, handler) {
      if (isFunction(desc)) {
        handler = subscribe;
        subscribe = desc;
        desc = [];
      }
      Property.__super__.constructor.call(this, desc);
      assertFunction(subscribe);
      this.dispatcher = new PropertyDispatcher(this, subscribe, handler);
      registerObs(this);
    }

    Property.prototype.sampledBy = function(sampler, combinator) {
      var lazy, result, samplerSource, stream, thisSource;
      if (combinator != null) {
        combinator = toCombinator(combinator);
      } else {
        lazy = true;
        combinator = function(f) {
          return f.value();
        };
      }
      thisSource = new Source(this, false, lazy);
      samplerSource = new Source(sampler, true, lazy);
      stream = Bacon.when([thisSource, samplerSource], combinator);
      result = sampler instanceof Property ? stream.toProperty() : stream;
      return withDescription(this, "sampledBy", sampler, combinator, result);
    };

    Property.prototype.sample = function(interval) {
      return withDescription(this, "sample", interval, this.sampledBy(Bacon.interval(interval, {})));
    };

    Property.prototype.changes = function() {
      return new EventStream(describe(this, "changes"), (function(_this) {
        return function(sink) {
          return _this.dispatcher.subscribe(function(event) {
            if (!event.isInitial()) {
              return sink(event);
            }
          });
        };
      })(this));
    };

    Property.prototype.withHandler = function(handler) {
      return new Property(describe(this, "withHandler", handler), this.dispatcher.subscribe, handler);
    };

    Property.prototype.toProperty = function() {
      assertNoArguments(arguments);
      return this;
    };

    Property.prototype.toEventStream = function() {
      return new EventStream(describe(this, "toEventStream"), (function(_this) {
        return function(sink) {
          return _this.dispatcher.subscribe(function(event) {
            if (event.isInitial()) {
              event = event.toNext();
            }
            return sink(event);
          });
        };
      })(this));
    };

    Property.prototype.and = function(other) {
      return withDescription(this, "and", other, this.combine(other, function(x, y) {
        return x && y;
      }));
    };

    Property.prototype.or = function(other) {
      return withDescription(this, "or", other, this.combine(other, function(x, y) {
        return x || y;
      }));
    };

    Property.prototype.delay = function(delay) {
      return this.delayChanges("delay", delay, function(changes) {
        return changes.delay(delay);
      });
    };

    Property.prototype.debounce = function(delay) {
      return this.delayChanges("debounce", delay, function(changes) {
        return changes.debounce(delay);
      });
    };

    Property.prototype.throttle = function(delay) {
      return this.delayChanges("throttle", delay, function(changes) {
        return changes.throttle(delay);
      });
    };

    Property.prototype.delayChanges = function() {
      var desc, f, _i;
      desc = 2 <= arguments.length ? __slice.call(arguments, 0, _i = arguments.length - 1) : (_i = 0, []), f = arguments[_i++];
      return withDescription.apply(null, [this].concat(__slice.call(desc), [addPropertyInitValueToStream(this, f(this.changes()))]));
    };

    Property.prototype.takeUntil = function(stopper) {
      var changes;
      changes = this.changes().takeUntil(stopper);
      return withDescription(this, "takeUntil", stopper, addPropertyInitValueToStream(this, changes));
    };

    Property.prototype.startWith = function(value) {
      return withDescription(this, "startWith", value, this.scan(value, function(prev, next) {
        return next;
      }));
    };

    Property.prototype.bufferingThrottle = function() {
      var _ref1;
      return (_ref1 = Property.__super__.bufferingThrottle.apply(this, arguments)).bufferingThrottle.apply(_ref1, arguments).toProperty();
    };

    return Property;

  })(Observable);

  convertArgsToFunction = function(obs, f, args, method) {
    var sampled;
    if (f instanceof Property) {
      sampled = f.sampledBy(obs, function(p, s) {
        return [p, s];
      });
      return method.call(sampled, function(_arg) {
        var p, s;
        p = _arg[0], s = _arg[1];
        return p;
      }).map(function(_arg) {
        var p, s;
        p = _arg[0], s = _arg[1];
        return s;
      });
    } else {
      f = makeFunction(f, args);
      return method.call(obs, f);
    }
  };

  addPropertyInitValueToStream = function(property, stream) {
    var justInitValue;
    justInitValue = new EventStream(describe(property, "justInitValue"), function(sink) {
      var unsub, value;
      value = void 0;
      unsub = property.dispatcher.subscribe(function(event) {
        if (!event.isEnd()) {
          value = event;
        }
        return Bacon.noMore;
      });
      UpdateBarrier.whenDoneWith(justInitValue, function() {
        if (value != null) {
          sink(value);
        }
        return sink(end());
      });
      return unsub;
    });
    return justInitValue.concat(stream).toProperty();
  };

  Dispatcher = (function() {
    function Dispatcher(_subscribe, _handleEvent) {
      this._subscribe = _subscribe;
      this._handleEvent = _handleEvent;
      this.subscribe = __bind(this.subscribe, this);
      this.handleEvent = __bind(this.handleEvent, this);
      this.subscriptions = [];
      this.queue = [];
      this.pushing = false;
      this.ended = false;
      this.prevError = void 0;
      this.unsubSrc = void 0;
    }

    Dispatcher.prototype.hasSubscribers = function() {
      return this.subscriptions.length > 0;
    };

    Dispatcher.prototype.removeSub = function(subscription) {
      return this.subscriptions = _.without(subscription, this.subscriptions);
    };

    Dispatcher.prototype.push = function(event) {
      if (event.isEnd()) {
        this.ended = true;
      }
      return UpdateBarrier.inTransaction(event, this, this.pushIt, [event]);
    };

    Dispatcher.prototype.pushIt = function(event) {
      var reply, sub, success, tmp, _i, _len;
      if (!this.pushing) {
        if (event === this.prevError) {
          return;
        }
        if (event.isError()) {
          this.prevError = event;
        }
        success = false;
        try {
          this.pushing = true;
          tmp = this.subscriptions;
          for (_i = 0, _len = tmp.length; _i < _len; _i++) {
            sub = tmp[_i];
            reply = sub.sink(event);
            if (reply === Bacon.noMore || event.isEnd()) {
              this.removeSub(sub);
            }
          }
          success = true;
        } finally {
          this.pushing = false;
          if (!success) {
            this.queue = [];
          }
        }
        success = true;
        while (this.queue.length) {
          event = this.queue.shift();
          this.push(event);
        }
        if (this.hasSubscribers()) {
          return Bacon.more;
        } else {
          this.unsubscribeFromSource();
          return Bacon.noMore;
        }
      } else {
        this.queue.push(event);
        return Bacon.more;
      }
    };

    Dispatcher.prototype.handleEvent = function(event) {
      if (this._handleEvent) {
        return this._handleEvent(event);
      } else {
        return this.push(event);
      }
    };

    Dispatcher.prototype.unsubscribeFromSource = function() {
      if (this.unsubSrc) {
        this.unsubSrc();
      }
      return this.unsubSrc = void 0;
    };

    Dispatcher.prototype.subscribe = function(sink) {
      var subscription;
      if (this.ended) {
        sink(end());
        return nop;
      } else {
        assertFunction(sink);
        subscription = {
          sink: sink
        };
        this.subscriptions.push(subscription);
        if (this.subscriptions.length === 1) {
          this.unsubSrc = this._subscribe(this.handleEvent);
          assertFunction(this.unsubSrc);
        }
        return (function(_this) {
          return function() {
            _this.removeSub(subscription);
            if (!_this.hasSubscribers()) {
              return _this.unsubscribeFromSource();
            }
          };
        })(this);
      }
    };

    return Dispatcher;

  })();

  PropertyDispatcher = (function(_super) {
    __extends(PropertyDispatcher, _super);

    function PropertyDispatcher(property, subscribe, handleEvent) {
      this.property = property;
      this.subscribe = __bind(this.subscribe, this);
      PropertyDispatcher.__super__.constructor.call(this, subscribe, handleEvent);
      this.current = None;
      this.currentValueRootId = void 0;
      this.propertyEnded = false;
    }

    PropertyDispatcher.prototype.push = function(event) {
      if (event.isEnd()) {
        this.propertyEnded = true;
      }
      if (event.hasValue()) {
        this.current = new Some(event);
        this.currentValueRootId = UpdateBarrier.currentEventId();
      }
      return PropertyDispatcher.__super__.push.call(this, event);
    };

    PropertyDispatcher.prototype.maybeSubSource = function(sink, reply) {
      if (reply === Bacon.noMore) {
        return nop;
      } else if (this.propertyEnded) {
        sink(end());
        return nop;
      } else {
        return Dispatcher.prototype.subscribe.call(this, sink);
      }
    };

    PropertyDispatcher.prototype.subscribe = function(sink) {
      var dispatchingId, initSent, reply, valId;
      initSent = false;
      reply = Bacon.more;
      if (this.current.isDefined && (this.hasSubscribers() || this.propertyEnded)) {
        dispatchingId = UpdateBarrier.currentEventId();
        valId = this.currentValueRootId;
        if (!this.propertyEnded && valId && dispatchingId && dispatchingId !== valId) {
          UpdateBarrier.whenDoneWith(this.property, (function(_this) {
            return function() {
              if (_this.currentValueRootId === valId) {
                return sink(initial(_this.current.get().value()));
              }
            };
          })(this));
          return this.maybeSubSource(sink, reply);
        } else {
          UpdateBarrier.inTransaction(void 0, this, (function() {
            return reply = (function() {
              try {
                return sink(initial(this.current.get().value()));
              } catch (_error) {
                return Bacon.more;
              }
            }).call(this);
          }), []);
          return this.maybeSubSource(sink, reply);
        }
      } else {
        return this.maybeSubSource(sink, reply);
      }
    };

    return PropertyDispatcher;

  })(Dispatcher);

  Bus = (function(_super) {
    __extends(Bus, _super);

    function Bus() {
      this.guardedSink = __bind(this.guardedSink, this);
      this.subscribeAll = __bind(this.subscribeAll, this);
      this.unsubAll = __bind(this.unsubAll, this);
      this.sink = void 0;
      this.subscriptions = [];
      this.ended = false;
      Bus.__super__.constructor.call(this, describe(Bacon, "Bus"), this.subscribeAll);
    }

    Bus.prototype.unsubAll = function() {
      var sub, _i, _len, _ref1;
      _ref1 = this.subscriptions;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        sub = _ref1[_i];
        if (typeof sub.unsub === "function") {
          sub.unsub();
        }
      }
      return void 0;
    };

    Bus.prototype.subscribeAll = function(newSink) {
      var subscription, _i, _len, _ref1;
      this.sink = newSink;
      _ref1 = cloneArray(this.subscriptions);
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        subscription = _ref1[_i];
        this.subscribeInput(subscription);
      }
      return this.unsubAll;
    };

    Bus.prototype.guardedSink = function(input) {
      return (function(_this) {
        return function(event) {
          if (event.isEnd()) {
            _this.unsubscribeInput(input);
            return Bacon.noMore;
          } else {
            return _this.sink(event);
          }
        };
      })(this);
    };

    Bus.prototype.subscribeInput = function(subscription) {
      return subscription.unsub = subscription.input.dispatcher.subscribe(this.guardedSink(subscription.input));
    };

    Bus.prototype.unsubscribeInput = function(input) {
      var i, sub, _i, _len, _ref1;
      _ref1 = this.subscriptions;
      for (i = _i = 0, _len = _ref1.length; _i < _len; i = ++_i) {
        sub = _ref1[i];
        if (sub.input === input) {
          if (typeof sub.unsub === "function") {
            sub.unsub();
          }
          this.subscriptions.splice(i, 1);
          return;
        }
      }
    };

    Bus.prototype.plug = function(input) {
      var sub;
      if (this.ended) {
        return;
      }
      sub = {
        input: input
      };
      this.subscriptions.push(sub);
      if ((this.sink != null)) {
        this.subscribeInput(sub);
      }
      return (function(_this) {
        return function() {
          return _this.unsubscribeInput(input);
        };
      })(this);
    };

    Bus.prototype.end = function() {
      this.ended = true;
      this.unsubAll();
      return typeof this.sink === "function" ? this.sink(end()) : void 0;
    };

    Bus.prototype.push = function(value) {
      return typeof this.sink === "function" ? this.sink(next(value)) : void 0;
    };

    Bus.prototype.error = function(error) {
      return typeof this.sink === "function" ? this.sink(new Error(error)) : void 0;
    };

    return Bus;

  })(EventStream);

  Source = (function() {
    function Source(obs, sync, lazy) {
      this.obs = obs;
      this.sync = sync;
      this.lazy = lazy != null ? lazy : false;
      this.queue = [];
    }

    Source.prototype.subscribe = function(sink) {
      return this.obs.dispatcher.subscribe(sink);
    };

    Source.prototype.toString = function() {
      return this.obs.toString();
    };

    Source.prototype.markEnded = function() {
      return this.ended = true;
    };

    Source.prototype.consume = function() {
      if (this.lazy) {
        return {
          value: _.always(this.queue[0])
        };
      } else {
        return this.queue[0];
      }
    };

    Source.prototype.push = function(x) {
      return this.queue = [x];
    };

    Source.prototype.mayHave = function() {
      return true;
    };

    Source.prototype.hasAtLeast = function() {
      return this.queue.length;
    };

    Source.prototype.flatten = true;

    return Source;

  })();

  ConsumingSource = (function(_super) {
    __extends(ConsumingSource, _super);

    function ConsumingSource() {
      return ConsumingSource.__super__.constructor.apply(this, arguments);
    }

    ConsumingSource.prototype.consume = function() {
      return this.queue.shift();
    };

    ConsumingSource.prototype.push = function(x) {
      return this.queue.push(x);
    };

    ConsumingSource.prototype.mayHave = function(c) {
      return !this.ended || this.queue.length >= c;
    };

    ConsumingSource.prototype.hasAtLeast = function(c) {
      return this.queue.length >= c;
    };

    ConsumingSource.prototype.flatten = false;

    return ConsumingSource;

  })(Source);

  BufferingSource = (function(_super) {
    __extends(BufferingSource, _super);

    function BufferingSource(obs) {
      BufferingSource.__super__.constructor.call(this, obs, true);
    }

    BufferingSource.prototype.consume = function() {
      var values;
      values = this.queue;
      this.queue = [];
      return {
        value: function() {
          return values;
        }
      };
    };

    BufferingSource.prototype.push = function(x) {
      return this.queue.push(x.value());
    };

    BufferingSource.prototype.hasAtLeast = function() {
      return true;
    };

    return BufferingSource;

  })(Source);

  Source.isTrigger = function(s) {
    if (s instanceof Source) {
      return s.sync;
    } else {
      return s instanceof EventStream;
    }
  };

  Source.fromObservable = function(s) {
    if (s instanceof Source) {
      return s;
    } else if (s instanceof Property) {
      return new Source(s, false);
    } else {
      return new ConsumingSource(s, true);
    }
  };

  describe = function() {
    var args, context, method;
    context = arguments[0], method = arguments[1], args = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
    if ((context || method) instanceof Desc) {
      return context || method;
    } else {
      return new Desc(context, method, args);
    }
  };

  findDeps = function(x) {
    if (isArray(x)) {
      return _.flatMap(findDeps, x);
    } else if (isObservable(x)) {
      return [x];
    } else if (x instanceof Source) {
      return [x.obs];
    } else {
      return [];
    }
  };

  Desc = (function() {
    function Desc(context, method, args) {
      this.context = context;
      this.method = method;
      this.args = args;
      this.cached = void 0;
    }

    Desc.prototype.deps = function() {
      return this.cached || (this.cached = findDeps([this.context].concat(this.args)));
    };

    Desc.prototype.apply = function(obs) {
      obs.desc = this;
      return obs;
    };

    Desc.prototype.toString = function() {
      return _.toString(this.context) + "." + _.toString(this.method) + "(" + _.map(_.toString, this.args) + ")";
    };

    return Desc;

  })();

  withDescription = function() {
    var desc, obs, _i;
    desc = 2 <= arguments.length ? __slice.call(arguments, 0, _i = arguments.length - 1) : (_i = 0, []), obs = arguments[_i++];
    return describe.apply(null, desc).apply(obs);
  };

  Bacon.when = function() {
    var f, i, index, ix, len, needsBarrier, pat, patSources, pats, patterns, resultStream, s, sources, triggerFound, usage, _i, _j, _len, _len1, _ref1;
    if (arguments.length === 0) {
      return Bacon.never();
    }
    len = arguments.length;
    usage = "when: expecting arguments in the form (Observable+,function)+";
    assert(usage, len % 2 === 0);
    sources = [];
    pats = [];
    i = 0;
    patterns = [];
    while (i < len) {
      patterns[i] = arguments[i];
      patterns[i + 1] = arguments[i + 1];
      patSources = _.toArray(arguments[i]);
      f = arguments[i + 1];
      pat = {
        f: (isFunction(f) ? f : (function() {
          return f;
        })),
        ixs: []
      };
      triggerFound = false;
      for (_i = 0, _len = patSources.length; _i < _len; _i++) {
        s = patSources[_i];
        index = _.indexOf(sources, s);
        if (!triggerFound) {
          triggerFound = Source.isTrigger(s);
        }
        if (index < 0) {
          sources.push(s);
          index = sources.length - 1;
        }
        _ref1 = pat.ixs;
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          ix = _ref1[_j];
          if (ix.index === index) {
            ix.count++;
          }
        }
        pat.ixs.push({
          index: index,
          count: 1
        });
      }
      assert("At least one EventStream required", triggerFound || (!patSources.length));
      if (patSources.length > 0) {
        pats.push(pat);
      }
      i = i + 2;
    }
    if (!sources.length) {
      return Bacon.never();
    }
    sources = _.map(Source.fromObservable, sources);
    needsBarrier = (_.any(sources, function(s) {
      return s.flatten;
    })) && (containsDuplicateDeps(_.map((function(s) {
      return s.obs;
    }), sources)));
    return resultStream = new EventStream(describe.apply(null, [Bacon, "when"].concat(__slice.call(patterns))), function(sink) {
      var cannotMatch, cannotSync, ends, match, nonFlattened, part, triggers;
      triggers = [];
      ends = false;
      match = function(p) {
        var _k, _len2, _ref2;
        _ref2 = p.ixs;
        for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
          i = _ref2[_k];
          if (!sources[i.index].hasAtLeast(i.count)) {
            return false;
          }
        }
        return true;
      };
      cannotSync = function(source) {
        return !source.sync || source.ended;
      };
      cannotMatch = function(p) {
        var _k, _len2, _ref2;
        _ref2 = p.ixs;
        for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
          i = _ref2[_k];
          if (!sources[i.index].mayHave(i.count)) {
            return true;
          }
        }
      };
      nonFlattened = function(trigger) {
        return !trigger.source.flatten;
      };
      part = function(source) {
        return function(unsubAll) {
          var flush, flushLater, flushWhileTriggers;
          flushLater = function() {
            return UpdateBarrier.whenDoneWith(resultStream, flush);
          };
          flushWhileTriggers = function() {
            var events, p, reply, trigger, _k, _len2;
            if (triggers.length > 0) {
              reply = Bacon.more;
              trigger = triggers.pop();
              for (_k = 0, _len2 = pats.length; _k < _len2; _k++) {
                p = pats[_k];
                if (match(p)) {
                  events = (function() {
                    var _l, _len3, _ref2, _results;
                    _ref2 = p.ixs;
                    _results = [];
                    for (_l = 0, _len3 = _ref2.length; _l < _len3; _l++) {
                      i = _ref2[_l];
                      _results.push(sources[i.index].consume());
                    }
                    return _results;
                  })();
                  reply = sink(trigger.e.apply(function() {
                    var event, values;
                    values = (function() {
                      var _l, _len3, _results;
                      _results = [];
                      for (_l = 0, _len3 = events.length; _l < _len3; _l++) {
                        event = events[_l];
                        _results.push(event.value());
                      }
                      return _results;
                    })();
                    return p.f.apply(p, values);
                  }));
                  if (triggers.length) {
                    triggers = _.filter(nonFlattened, triggers);
                  }
                  if (reply === Bacon.noMore) {
                    return reply;
                  } else {
                    return flushWhileTriggers();
                  }
                }
              }
            } else {
              return Bacon.more;
            }
          };
          flush = function() {
            var reply;
            reply = flushWhileTriggers();
            if (ends) {
              ends = false;
              if (_.all(sources, cannotSync) || _.all(pats, cannotMatch)) {
                reply = Bacon.noMore;
                sink(end());
              }
            }
            if (reply === Bacon.noMore) {
              unsubAll();
            }
            return reply;
          };
          return source.subscribe(function(e) {
            var reply;
            if (e.isEnd()) {
              ends = true;
              source.markEnded();
              flushLater();
            } else if (e.isError()) {
              reply = sink(e);
            } else {
              source.push(e);
              if (source.sync) {
                triggers.push({
                  source: source,
                  e: e
                });
                if (needsBarrier || UpdateBarrier.hasWaiters()) {
                  flushLater();
                } else {
                  flush();
                }
              }
            }
            if (reply === Bacon.noMore) {
              unsubAll();
            }
            return reply || Bacon.more;
          });
        };
      };
      return compositeUnsubscribe.apply(null, (function() {
        var _k, _len2, _results;
        _results = [];
        for (_k = 0, _len2 = sources.length; _k < _len2; _k++) {
          s = sources[_k];
          _results.push(part(s));
        }
        return _results;
      })());
    });
  };

  containsDuplicateDeps = function(observables, state) {
    var checkObservable;
    if (state == null) {
      state = [];
    }
    checkObservable = function(obs) {
      var deps;
      if (_.contains(state, obs)) {
        return true;
      } else {
        deps = obs.internalDeps();
        if (deps.length) {
          state.push(obs);
          return _.any(deps, checkObservable);
        } else {
          state.push(obs);
          return false;
        }
      }
    };
    return _.any(observables, checkObservable);
  };

  Bacon.update = function() {
    var i, initial, lateBindFirst, patterns;
    initial = arguments[0], patterns = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    lateBindFirst = function(f) {
      return function() {
        var args;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        return function(i) {
          return f.apply(null, [i].concat(args));
        };
      };
    };
    i = patterns.length - 1;
    while (i > 0) {
      if (!(patterns[i] instanceof Function)) {
        patterns[i] = (function(x) {
          return function() {
            return x;
          };
        })(patterns[i]);
      }
      patterns[i] = lateBindFirst(patterns[i]);
      i = i - 2;
    }
    return withDescription.apply(null, [Bacon, "update", initial].concat(__slice.call(patterns), [Bacon.when.apply(Bacon, patterns).scan(initial, (function(x, f) {
      return f(x);
    }))]));
  };

  compositeUnsubscribe = function() {
    var ss;
    ss = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return new CompositeUnsubscribe(ss).unsubscribe;
  };

  CompositeUnsubscribe = (function() {
    function CompositeUnsubscribe(ss) {
      var s, _i, _len;
      if (ss == null) {
        ss = [];
      }
      this.unsubscribe = __bind(this.unsubscribe, this);
      this.unsubscribed = false;
      this.subscriptions = [];
      this.starting = [];
      for (_i = 0, _len = ss.length; _i < _len; _i++) {
        s = ss[_i];
        this.add(s);
      }
    }

    CompositeUnsubscribe.prototype.add = function(subscription) {
      var ended, unsub, unsubMe;
      if (this.unsubscribed) {
        return;
      }
      ended = false;
      unsub = nop;
      this.starting.push(subscription);
      unsubMe = (function(_this) {
        return function() {
          if (_this.unsubscribed) {
            return;
          }
          ended = true;
          _this.remove(unsub);
          return _.remove(subscription, _this.starting);
        };
      })(this);
      unsub = subscription(this.unsubscribe, unsubMe);
      if (!(this.unsubscribed || ended)) {
        this.subscriptions.push(unsub);
      }
      _.remove(subscription, this.starting);
      return unsub;
    };

    CompositeUnsubscribe.prototype.remove = function(unsub) {
      if (this.unsubscribed) {
        return;
      }
      if ((_.remove(unsub, this.subscriptions)) !== void 0) {
        return unsub();
      }
    };

    CompositeUnsubscribe.prototype.unsubscribe = function() {
      var s, _i, _len, _ref1;
      if (this.unsubscribed) {
        return;
      }
      this.unsubscribed = true;
      _ref1 = this.subscriptions;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        s = _ref1[_i];
        s();
      }
      this.subscriptions = [];
      return this.starting = [];
    };

    CompositeUnsubscribe.prototype.count = function() {
      if (this.unsubscribed) {
        return 0;
      }
      return this.subscriptions.length + this.starting.length;
    };

    CompositeUnsubscribe.prototype.empty = function() {
      return this.count() === 0;
    };

    return CompositeUnsubscribe;

  })();

  Bacon.CompositeUnsubscribe = CompositeUnsubscribe;

  Some = (function() {
    function Some(value) {
      this.value = value;
    }

    Some.prototype.getOrElse = function() {
      return this.value;
    };

    Some.prototype.get = function() {
      return this.value;
    };

    Some.prototype.filter = function(f) {
      if (f(this.value)) {
        return new Some(this.value);
      } else {
        return None;
      }
    };

    Some.prototype.map = function(f) {
      return new Some(f(this.value));
    };

    Some.prototype.forEach = function(f) {
      return f(this.value);
    };

    Some.prototype.isDefined = true;

    Some.prototype.toArray = function() {
      return [this.value];
    };

    Some.prototype.inspect = function() {
      return "Some(" + this.value + ")";
    };

    Some.prototype.toString = function() {
      return this.inspect();
    };

    return Some;

  })();

  None = {
    getOrElse: function(value) {
      return value;
    },
    filter: function() {
      return None;
    },
    map: function() {
      return None;
    },
    forEach: function() {},
    isDefined: false,
    toArray: function() {
      return [];
    },
    inspect: function() {
      return "None";
    },
    toString: function() {
      return this.inspect();
    }
  };

  UpdateBarrier = (function() {
    var afterTransaction, afters, currentEventId, flush, flushDepsOf, flushWaiters, hasWaiters, inTransaction, rootEvent, waiterObs, waiters, whenDoneWith, wrappedSubscribe;
    rootEvent = void 0;
    waiterObs = [];
    waiters = {};
    afters = [];
    afterTransaction = function(f) {
      if (rootEvent) {
        return afters.push(f);
      } else {
        return f();
      }
    };
    whenDoneWith = function(obs, f) {
      var obsWaiters;
      if (rootEvent) {
        obsWaiters = waiters[obs.id];
        if (obsWaiters == null) {
          obsWaiters = waiters[obs.id] = [f];
          return waiterObs.push(obs);
        } else {
          return obsWaiters.push(f);
        }
      } else {
        return f();
      }
    };
    flush = function() {
      while (waiterObs.length > 0) {
        flushWaiters(0);
      }
      return void 0;
    };
    flushWaiters = function(index) {
      var f, obs, obsId, obsWaiters, _i, _len;
      obs = waiterObs[index];
      obsId = obs.id;
      obsWaiters = waiters[obsId];
      waiterObs.splice(index, 1);
      delete waiters[obsId];
      flushDepsOf(obs);
      for (_i = 0, _len = obsWaiters.length; _i < _len; _i++) {
        f = obsWaiters[_i];
        f();
      }
      return void 0;
    };
    flushDepsOf = function(obs) {
      var dep, deps, index, _i, _len;
      deps = obs.internalDeps();
      for (_i = 0, _len = deps.length; _i < _len; _i++) {
        dep = deps[_i];
        flushDepsOf(dep);
        if (waiters[dep.id]) {
          index = _.indexOf(waiterObs, dep);
          flushWaiters(index);
        }
      }
      return void 0;
    };
    inTransaction = function(event, context, f, args) {
      var result;
      if (rootEvent) {
        return f.apply(context, args);
      } else {
        rootEvent = event;
        result = f.apply(context, args);
        flush();
        rootEvent = void 0;
        while (afters.length > 0) {
          afters.shift()();
        }
        return result;
      }
    };
    currentEventId = function() {
      if (rootEvent) {
        return rootEvent.id;
      } else {
        return void 0;
      }
    };
    wrappedSubscribe = function(obs, sink) {
      var doUnsub, unsub, unsubd;
      unsubd = false;
      doUnsub = function() {};
      unsub = function() {
        unsubd = true;
        return doUnsub();
      };
      doUnsub = obs.dispatcher.subscribe(function(event) {
        return afterTransaction(function() {
          var reply;
          if (!unsubd) {
            reply = sink(event);
            if (reply === Bacon.noMore) {
              return unsub();
            }
          }
        });
      });
      return unsub;
    };
    hasWaiters = function() {
      return waiterObs.length > 0;
    };
    return {
      whenDoneWith: whenDoneWith,
      hasWaiters: hasWaiters,
      inTransaction: inTransaction,
      currentEventId: currentEventId,
      wrappedSubscribe: wrappedSubscribe
    };
  })();

  Bacon.EventStream = EventStream;

  Bacon.Property = Property;

  Bacon.Observable = Observable;

  Bacon.Bus = Bus;

  Bacon.Initial = Initial;

  Bacon.Next = Next;

  Bacon.End = End;

  Bacon.Error = Error;

  nop = function() {};

  latter = function(_, x) {
    return x;
  };

  former = function(x, _) {
    return x;
  };

  initial = function(value) {
    return new Initial(value, true);
  };

  next = function(value) {
    return new Next(value, true);
  };

  end = function() {
    return new End();
  };

  toEvent = function(x) {
    if (x instanceof Event) {
      return x;
    } else {
      return next(x);
    }
  };

  cloneArray = function(xs) {
    return xs.slice(0);
  };

  assert = function(message, condition) {
    if (!condition) {
      throw new Exception(message);
    }
  };

  assertEventStream = function(event) {
    if (!(event instanceof EventStream)) {
      throw new Exception("not an EventStream : " + event);
    }
  };

  assertFunction = function(f) {
    return assert("not a function : " + f, isFunction(f));
  };

  isFunction = function(f) {
    return typeof f === "function";
  };

  isArray = function(xs) {
    return xs instanceof Array;
  };

  isObservable = function(x) {
    return x instanceof Observable;
  };

  assertArray = function(xs) {
    if (!isArray(xs)) {
      throw new Exception("not an array : " + xs);
    }
  };

  assertNoArguments = function(args) {
    return assert("no arguments supported", args.length === 0);
  };

  assertString = function(x) {
    if (typeof x !== "string") {
      throw new Exception("not a string : " + x);
    }
  };

  partiallyApplied = function(f, applied) {
    return function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return f.apply(null, applied.concat(args));
    };
  };

  makeSpawner = function(args) {
    if (args.length === 1 && isObservable(args[0])) {
      return _.always(args[0]);
    } else {
      return makeFunctionArgs(args);
    }
  };

  makeFunctionArgs = function(args) {
    args = Array.prototype.slice.call(args);
    return makeFunction_.apply(null, args);
  };

  makeFunction_ = withMethodCallSupport(function() {
    var args, f;
    f = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    if (isFunction(f)) {
      if (args.length) {
        return partiallyApplied(f, args);
      } else {
        return f;
      }
    } else if (isFieldKey(f)) {
      return toFieldExtractor(f, args);
    } else {
      return _.always(f);
    }
  });

  makeFunction = function(f, args) {
    return makeFunction_.apply(null, [f].concat(__slice.call(args)));
  };

  makeObservable = function(x) {
    if (isObservable(x)) {
      return x;
    } else {
      return Bacon.once(x);
    }
  };

  isFieldKey = function(f) {
    return (typeof f === "string") && f.length > 1 && f.charAt(0) === ".";
  };

  Bacon.isFieldKey = isFieldKey;

  toFieldExtractor = function(f, args) {
    var partFuncs, parts;
    parts = f.slice(1).split(".");
    partFuncs = _.map(toSimpleExtractor(args), parts);
    return function(value) {
      var _i, _len;
      for (_i = 0, _len = partFuncs.length; _i < _len; _i++) {
        f = partFuncs[_i];
        value = f(value);
      }
      return value;
    };
  };

  toSimpleExtractor = function(args) {
    return function(key) {
      return function(value) {
        var fieldValue;
        if (value == null) {
          return void 0;
        } else {
          fieldValue = value[key];
          if (isFunction(fieldValue)) {
            return fieldValue.apply(value, args);
          } else {
            return fieldValue;
          }
        }
      };
    };
  };

  toFieldKey = function(f) {
    return f.slice(1);
  };

  toCombinator = function(f) {
    var key;
    if (isFunction(f)) {
      return f;
    } else if (isFieldKey(f)) {
      key = toFieldKey(f);
      return function(left, right) {
        return left[key](right);
      };
    } else {
      return assert("not a function or a field key: " + f, false);
    }
  };

  toOption = function(v) {
    if (v instanceof Some || v === None) {
      return v;
    } else {
      return new Some(v);
    }
  };

  _ = {
    indexOf: Array.prototype.indexOf ? function(xs, x) {
      return xs.indexOf(x);
    } : function(xs, x) {
      var i, y, _i, _len;
      for (i = _i = 0, _len = xs.length; _i < _len; i = ++_i) {
        y = xs[i];
        if (x === y) {
          return i;
        }
      }
      return -1;
    },
    indexWhere: function(xs, f) {
      var i, y, _i, _len;
      for (i = _i = 0, _len = xs.length; _i < _len; i = ++_i) {
        y = xs[i];
        if (f(y)) {
          return i;
        }
      }
      return -1;
    },
    head: function(xs) {
      return xs[0];
    },
    always: function(x) {
      return function() {
        return x;
      };
    },
    negate: function(f) {
      return function(x) {
        return !f(x);
      };
    },
    empty: function(xs) {
      return xs.length === 0;
    },
    tail: function(xs) {
      return xs.slice(1, xs.length);
    },
    filter: function(f, xs) {
      var filtered, x, _i, _len;
      filtered = [];
      for (_i = 0, _len = xs.length; _i < _len; _i++) {
        x = xs[_i];
        if (f(x)) {
          filtered.push(x);
        }
      }
      return filtered;
    },
    map: function(f, xs) {
      var x, _i, _len, _results;
      _results = [];
      for (_i = 0, _len = xs.length; _i < _len; _i++) {
        x = xs[_i];
        _results.push(f(x));
      }
      return _results;
    },
    each: function(xs, f) {
      var key, value;
      for (key in xs) {
        value = xs[key];
        f(key, value);
      }
      return void 0;
    },
    toArray: function(xs) {
      if (isArray(xs)) {
        return xs;
      } else {
        return [xs];
      }
    },
    contains: function(xs, x) {
      return _.indexOf(xs, x) !== -1;
    },
    id: function(x) {
      return x;
    },
    last: function(xs) {
      return xs[xs.length - 1];
    },
    all: function(xs, f) {
      var x, _i, _len;
      if (f == null) {
        f = _.id;
      }
      for (_i = 0, _len = xs.length; _i < _len; _i++) {
        x = xs[_i];
        if (!f(x)) {
          return false;
        }
      }
      return true;
    },
    any: function(xs, f) {
      var x, _i, _len;
      if (f == null) {
        f = _.id;
      }
      for (_i = 0, _len = xs.length; _i < _len; _i++) {
        x = xs[_i];
        if (f(x)) {
          return true;
        }
      }
      return false;
    },
    without: function(x, xs) {
      return _.filter((function(y) {
        return y !== x;
      }), xs);
    },
    remove: function(x, xs) {
      var i;
      i = _.indexOf(xs, x);
      if (i >= 0) {
        return xs.splice(i, 1);
      }
    },
    fold: function(xs, seed, f) {
      var x, _i, _len;
      for (_i = 0, _len = xs.length; _i < _len; _i++) {
        x = xs[_i];
        seed = f(seed, x);
      }
      return seed;
    },
    flatMap: function(f, xs) {
      return _.fold(xs, [], (function(ys, x) {
        return ys.concat(f(x));
      }));
    },
    cached: function(f) {
      var value;
      value = None;
      return function() {
        if (value === None) {
          value = f();
          f = void 0;
        }
        return value;
      };
    },
    toString: function(obj) {
      var ex, internals, key, value;
      try {
        recursionDepth++;
        if (obj == null) {
          return "undefined";
        } else if (isFunction(obj)) {
          return "function";
        } else if (isArray(obj)) {
          if (recursionDepth > 5) {
            return "[..]";
          }
          return "[" + _.map(_.toString, obj).toString() + "]";
        } else if (((obj != null ? obj.toString : void 0) != null) && obj.toString !== Object.prototype.toString) {
          return obj.toString();
        } else if (typeof obj === "object") {
          if (recursionDepth > 5) {
            return "{..}";
          }
          internals = (function() {
            var _results;
            _results = [];
            for (key in obj) {
              if (!__hasProp.call(obj, key)) continue;
              value = (function() {
                try {
                  return obj[key];
                } catch (_error) {
                  ex = _error;
                  return ex;
                }
              })();
              _results.push(_.toString(key) + ":" + _.toString(value));
            }
            return _results;
          })();
          return "{" + internals + "}";
        } else {
          return obj;
        }
      } finally {
        recursionDepth--;
      }
    }
  };

  recursionDepth = 0;

  Bacon._ = _;

  Bacon.scheduler = {
    setTimeout: function(f, d) {
      return setTimeout(f, d);
    },
    setInterval: function(f, i) {
      return setInterval(f, i);
    },
    clearInterval: function(id) {
      return clearInterval(id);
    },
    now: function() {
      return new Date().getTime();
    }
  };

  if ((typeof define !== "undefined" && define !== null) && (define.amd != null)) {
    define([], function() {
      return Bacon;
    });
    this.Bacon = Bacon;
  } else if ((typeof module !== "undefined" && module !== null) && (module.exports != null)) {
    module.exports = Bacon;
    Bacon.Bacon = Bacon;
  } else {
    this.Bacon = Bacon;
  }

}).call(this);

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],166:[function(require,module,exports){
(function (process,global){
/* @preserve
 * The MIT License (MIT)
 * 
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
/**
 * bluebird build version 2.9.14
 * Features enabled: core, race, call_get, generators, map, nodeify, promisify, props, reduce, settle, some, progress, cancel, using, filter, any, each, timers
*/
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Promise=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof _dereq_=="function"&&_dereq_;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof _dereq_=="function"&&_dereq_;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var SomePromiseArray = Promise._SomePromiseArray;
function any(promises) {
    var ret = new SomePromiseArray(promises);
    var promise = ret.promise();
    ret.setHowMany(1);
    ret.setUnwrap();
    ret.init();
    return promise;
}

Promise.any = function (promises) {
    return any(promises);
};

Promise.prototype.any = function () {
    return any(this);
};

};

},{}],2:[function(_dereq_,module,exports){
"use strict";
var firstLineError;
try {throw new Error(); } catch (e) {firstLineError = e;}
var schedule = _dereq_("./schedule.js");
var Queue = _dereq_("./queue.js");
var _process = typeof process !== "undefined" ? process : undefined;

function Async() {
    this._isTickUsed = false;
    this._lateQueue = new Queue(16);
    this._normalQueue = new Queue(16);
    var self = this;
    this.drainQueues = function () {
        self._drainQueues();
    };
    this._schedule =
        schedule.isStatic ? schedule(this.drainQueues) : schedule;
}

Async.prototype.haveItemsQueued = function () {
    return this._normalQueue.length() > 0;
};

Async.prototype._withDomain = function(fn) {
    if (_process !== undefined &&
        _process.domain != null &&
        !fn.domain) {
        fn = _process.domain.bind(fn);
    }
    return fn;
};

Async.prototype.throwLater = function(fn, arg) {
    if (arguments.length === 1) {
        arg = fn;
        fn = function () { throw arg; };
    }
    fn = this._withDomain(fn);
    if (typeof setTimeout !== "undefined") {
        setTimeout(function() {
            fn(arg);
        }, 0);
    } else try {
        this._schedule(function() {
            fn(arg);
        });
    } catch (e) {
        throw new Error("No async scheduler available\u000a\u000a    See http://goo.gl/m3OTXk\u000a");
    }
};

Async.prototype.invokeLater = function (fn, receiver, arg) {
    fn = this._withDomain(fn);
    this._lateQueue.push(fn, receiver, arg);
    this._queueTick();
};

Async.prototype.invokeFirst = function (fn, receiver, arg) {
    fn = this._withDomain(fn);
    this._normalQueue.unshift(fn, receiver, arg);
    this._queueTick();
};

Async.prototype.invoke = function (fn, receiver, arg) {
    fn = this._withDomain(fn);
    this._normalQueue.push(fn, receiver, arg);
    this._queueTick();
};

Async.prototype.settlePromises = function(promise) {
    this._normalQueue._pushOne(promise);
    this._queueTick();
};

Async.prototype._drainQueue = function(queue) {
    while (queue.length() > 0) {
        var fn = queue.shift();
        if (typeof fn !== "function") {
            fn._settlePromises();
            continue;
        }
        var receiver = queue.shift();
        var arg = queue.shift();
        fn.call(receiver, arg);
    }
};

Async.prototype._drainQueues = function () {
    this._drainQueue(this._normalQueue);
    this._reset();
    this._drainQueue(this._lateQueue);
};

Async.prototype._queueTick = function () {
    if (!this._isTickUsed) {
        this._isTickUsed = true;
        this._schedule(this.drainQueues);
    }
};

Async.prototype._reset = function () {
    this._isTickUsed = false;
};

module.exports = new Async();
module.exports.firstLineError = firstLineError;

},{"./queue.js":28,"./schedule.js":31}],3:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, tryConvertToPromise) {
var rejectThis = function(_, e) {
    this._reject(e);
};

var targetRejected = function(e, context) {
    context.promiseRejectionQueued = true;
    context.bindingPromise._then(rejectThis, rejectThis, null, this, e);
};

var bindingResolved = function(thisArg, context) {
    this._setBoundTo(thisArg);
    if (this._isPending()) {
        this._resolveCallback(context.target);
    }
};

var bindingRejected = function(e, context) {
    if (!context.promiseRejectionQueued) this._reject(e);
};

Promise.prototype.bind = function (thisArg) {
    var maybePromise = tryConvertToPromise(thisArg);
    var ret = new Promise(INTERNAL);
    ret._propagateFrom(this, 1);
    var target = this._target();
    if (maybePromise instanceof Promise) {
        var context = {
            promiseRejectionQueued: false,
            promise: ret,
            target: target,
            bindingPromise: maybePromise
        };
        target._then(INTERNAL, targetRejected, ret._progress, ret, context);
        maybePromise._then(
            bindingResolved, bindingRejected, ret._progress, ret, context);
    } else {
        ret._setBoundTo(thisArg);
        ret._resolveCallback(target);
    }
    return ret;
};

Promise.prototype._setBoundTo = function (obj) {
    if (obj !== undefined) {
        this._bitField = this._bitField | 131072;
        this._boundTo = obj;
    } else {
        this._bitField = this._bitField & (~131072);
    }
};

Promise.prototype._isBound = function () {
    return (this._bitField & 131072) === 131072;
};

Promise.bind = function (thisArg, value) {
    var maybePromise = tryConvertToPromise(thisArg);
    var ret = new Promise(INTERNAL);

    if (maybePromise instanceof Promise) {
        maybePromise._then(function(thisArg) {
            ret._setBoundTo(thisArg);
            ret._resolveCallback(value);
        }, ret._reject, ret._progress, ret, null);
    } else {
        ret._setBoundTo(thisArg);
        ret._resolveCallback(value);
    }
    return ret;
};
};

},{}],4:[function(_dereq_,module,exports){
"use strict";
var old;
if (typeof Promise !== "undefined") old = Promise;
function noConflict() {
    try { if (Promise === bluebird) Promise = old; }
    catch (e) {}
    return bluebird;
}
var bluebird = _dereq_("./promise.js")();
bluebird.noConflict = noConflict;
module.exports = bluebird;

},{"./promise.js":23}],5:[function(_dereq_,module,exports){
"use strict";
var cr = Object.create;
if (cr) {
    var callerCache = cr(null);
    var getterCache = cr(null);
    callerCache[" size"] = getterCache[" size"] = 0;
}

module.exports = function(Promise) {
var util = _dereq_("./util.js");
var canEvaluate = util.canEvaluate;
var isIdentifier = util.isIdentifier;

var getMethodCaller;
var getGetter;
if (!true) {
var makeMethodCaller = function (methodName) {
    return new Function("ensureMethod", "                                    \n\
        return function(obj) {                                               \n\
            'use strict'                                                     \n\
            var len = this.length;                                           \n\
            ensureMethod(obj, 'methodName');                                 \n\
            switch(len) {                                                    \n\
                case 1: return obj.methodName(this[0]);                      \n\
                case 2: return obj.methodName(this[0], this[1]);             \n\
                case 3: return obj.methodName(this[0], this[1], this[2]);    \n\
                case 0: return obj.methodName();                             \n\
                default:                                                     \n\
                    return obj.methodName.apply(obj, this);                  \n\
            }                                                                \n\
        };                                                                   \n\
        ".replace(/methodName/g, methodName))(ensureMethod);
};

var makeGetter = function (propertyName) {
    return new Function("obj", "                                             \n\
        'use strict';                                                        \n\
        return obj.propertyName;                                             \n\
        ".replace("propertyName", propertyName));
};

var getCompiled = function(name, compiler, cache) {
    var ret = cache[name];
    if (typeof ret !== "function") {
        if (!isIdentifier(name)) {
            return null;
        }
        ret = compiler(name);
        cache[name] = ret;
        cache[" size"]++;
        if (cache[" size"] > 512) {
            var keys = Object.keys(cache);
            for (var i = 0; i < 256; ++i) delete cache[keys[i]];
            cache[" size"] = keys.length - 256;
        }
    }
    return ret;
};

getMethodCaller = function(name) {
    return getCompiled(name, makeMethodCaller, callerCache);
};

getGetter = function(name) {
    return getCompiled(name, makeGetter, getterCache);
};
}

function ensureMethod(obj, methodName) {
    var fn;
    if (obj != null) fn = obj[methodName];
    if (typeof fn !== "function") {
        var message = "Object " + util.classString(obj) + " has no method '" +
            util.toString(methodName) + "'";
        throw new Promise.TypeError(message);
    }
    return fn;
}

function caller(obj) {
    var methodName = this.pop();
    var fn = ensureMethod(obj, methodName);
    return fn.apply(obj, this);
}
Promise.prototype.call = function (methodName) {
    var $_len = arguments.length;var args = new Array($_len - 1); for(var $_i = 1; $_i < $_len; ++$_i) {args[$_i - 1] = arguments[$_i];}
    if (!true) {
        if (canEvaluate) {
            var maybeCaller = getMethodCaller(methodName);
            if (maybeCaller !== null) {
                return this._then(
                    maybeCaller, undefined, undefined, args, undefined);
            }
        }
    }
    args.push(methodName);
    return this._then(caller, undefined, undefined, args, undefined);
};

function namedGetter(obj) {
    return obj[this];
}
function indexedGetter(obj) {
    var index = +this;
    if (index < 0) index = Math.max(0, index + obj.length);
    return obj[index];
}
Promise.prototype.get = function (propertyName) {
    var isIndex = (typeof propertyName === "number");
    var getter;
    if (!isIndex) {
        if (canEvaluate) {
            var maybeGetter = getGetter(propertyName);
            getter = maybeGetter !== null ? maybeGetter : namedGetter;
        } else {
            getter = namedGetter;
        }
    } else {
        getter = indexedGetter;
    }
    return this._then(getter, undefined, undefined, propertyName, undefined);
};
};

},{"./util.js":38}],6:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var errors = _dereq_("./errors.js");
var async = _dereq_("./async.js");
var CancellationError = errors.CancellationError;

Promise.prototype._cancel = function (reason) {
    if (!this.isCancellable()) return this;
    var parent;
    var promiseToReject = this;
    while ((parent = promiseToReject._cancellationParent) !== undefined &&
        parent.isCancellable()) {
        promiseToReject = parent;
    }
    this._unsetCancellable();
    promiseToReject._target()._rejectCallback(reason, false, true);
};

Promise.prototype.cancel = function (reason) {
    if (!this.isCancellable()) return this;
    if (reason === undefined) reason = new CancellationError();
    async.invokeLater(this._cancel, this, reason);
    return this;
};

Promise.prototype.cancellable = function () {
    if (this._cancellable()) return this;
    this._setCancellable();
    this._cancellationParent = undefined;
    return this;
};

Promise.prototype.uncancellable = function () {
    var ret = this.then();
    ret._unsetCancellable();
    return ret;
};

Promise.prototype.fork = function (didFulfill, didReject, didProgress) {
    var ret = this._then(didFulfill, didReject, didProgress,
                         undefined, undefined);

    ret._setCancellable();
    ret._cancellationParent = undefined;
    return ret;
};
};

},{"./async.js":2,"./errors.js":13}],7:[function(_dereq_,module,exports){
"use strict";
module.exports = function() {
var async = _dereq_("./async.js");
var util = _dereq_("./util.js");
var bluebirdFramePattern =
    /[\\\/]bluebird[\\\/]js[\\\/](main|debug|zalgo|instrumented)/;
var stackFramePattern = null;
var formatStack = null;
var indentStackFrames = false;
var warn;

function CapturedTrace(parent) {
    this._parent = parent;
    var length = this._length = 1 + (parent === undefined ? 0 : parent._length);
    captureStackTrace(this, CapturedTrace);
    if (length > 32) this.uncycle();
}
util.inherits(CapturedTrace, Error);

CapturedTrace.prototype.uncycle = function() {
    var length = this._length;
    if (length < 2) return;
    var nodes = [];
    var stackToIndex = {};

    for (var i = 0, node = this; node !== undefined; ++i) {
        nodes.push(node);
        node = node._parent;
    }
    length = this._length = i;
    for (var i = length - 1; i >= 0; --i) {
        var stack = nodes[i].stack;
        if (stackToIndex[stack] === undefined) {
            stackToIndex[stack] = i;
        }
    }
    for (var i = 0; i < length; ++i) {
        var currentStack = nodes[i].stack;
        var index = stackToIndex[currentStack];
        if (index !== undefined && index !== i) {
            if (index > 0) {
                nodes[index - 1]._parent = undefined;
                nodes[index - 1]._length = 1;
            }
            nodes[i]._parent = undefined;
            nodes[i]._length = 1;
            var cycleEdgeNode = i > 0 ? nodes[i - 1] : this;

            if (index < length - 1) {
                cycleEdgeNode._parent = nodes[index + 1];
                cycleEdgeNode._parent.uncycle();
                cycleEdgeNode._length =
                    cycleEdgeNode._parent._length + 1;
            } else {
                cycleEdgeNode._parent = undefined;
                cycleEdgeNode._length = 1;
            }
            var currentChildLength = cycleEdgeNode._length + 1;
            for (var j = i - 2; j >= 0; --j) {
                nodes[j]._length = currentChildLength;
                currentChildLength++;
            }
            return;
        }
    }
};

CapturedTrace.prototype.parent = function() {
    return this._parent;
};

CapturedTrace.prototype.hasParent = function() {
    return this._parent !== undefined;
};

CapturedTrace.prototype.attachExtraTrace = function(error) {
    if (error.__stackCleaned__) return;
    this.uncycle();
    var parsed = CapturedTrace.parseStackAndMessage(error);
    var message = parsed.message;
    var stacks = [parsed.stack];

    var trace = this;
    while (trace !== undefined) {
        stacks.push(cleanStack(trace.stack.split("\n")));
        trace = trace._parent;
    }
    removeCommonRoots(stacks);
    removeDuplicateOrEmptyJumps(stacks);
    error.stack = reconstructStack(message, stacks);
    util.notEnumerableProp(error, "__stackCleaned__", true);
};

function reconstructStack(message, stacks) {
    for (var i = 0; i < stacks.length - 1; ++i) {
        stacks[i].push("From previous event:");
        stacks[i] = stacks[i].join("\n");
    }
    if (i < stacks.length) {
        stacks[i] = stacks[i].join("\n");
    }
    return message + "\n" + stacks.join("\n");
}

function removeDuplicateOrEmptyJumps(stacks) {
    for (var i = 0; i < stacks.length; ++i) {
        if (stacks[i].length === 0 ||
            ((i + 1 < stacks.length) && stacks[i][0] === stacks[i+1][0])) {
            stacks.splice(i, 1);
            i--;
        }
    }
}

function removeCommonRoots(stacks) {
    var current = stacks[0];
    for (var i = 1; i < stacks.length; ++i) {
        var prev = stacks[i];
        var currentLastIndex = current.length - 1;
        var currentLastLine = current[currentLastIndex];
        var commonRootMeetPoint = -1;

        for (var j = prev.length - 1; j >= 0; --j) {
            if (prev[j] === currentLastLine) {
                commonRootMeetPoint = j;
                break;
            }
        }

        for (var j = commonRootMeetPoint; j >= 0; --j) {
            var line = prev[j];
            if (current[currentLastIndex] === line) {
                current.pop();
                currentLastIndex--;
            } else {
                break;
            }
        }
        current = prev;
    }
}

function cleanStack(stack) {
    var ret = [];
    for (var i = 0; i < stack.length; ++i) {
        var line = stack[i];
        var isTraceLine = stackFramePattern.test(line) ||
            "    (No stack trace)" === line;
        var isInternalFrame = isTraceLine && shouldIgnore(line);
        if (isTraceLine && !isInternalFrame) {
            if (indentStackFrames && line.charAt(0) !== " ") {
                line = "    " + line;
            }
            ret.push(line);
        }
    }
    return ret;
}

function stackFramesAsArray(error) {
    var stack = error.stack.replace(/\s+$/g, "").split("\n");
    for (var i = 0; i < stack.length; ++i) {
        var line = stack[i];
        if ("    (No stack trace)" === line || stackFramePattern.test(line)) {
            break;
        }
    }
    if (i > 0) {
        stack = stack.slice(i);
    }
    return stack;
}

CapturedTrace.parseStackAndMessage = function(error) {
    var stack = error.stack;
    var message = error.toString();
    stack = typeof stack === "string" && stack.length > 0
                ? stackFramesAsArray(error) : ["    (No stack trace)"];
    return {
        message: message,
        stack: cleanStack(stack)
    };
};

CapturedTrace.formatAndLogError = function(error, title) {
    if (typeof console !== "undefined") {
        var message;
        if (typeof error === "object" || typeof error === "function") {
            var stack = error.stack;
            message = title + formatStack(stack, error);
        } else {
            message = title + String(error);
        }
        if (typeof warn === "function") {
            warn(message);
        } else if (typeof console.log === "function" ||
            typeof console.log === "object") {
            console.log(message);
        }
    }
};

CapturedTrace.unhandledRejection = function (reason) {
    CapturedTrace.formatAndLogError(reason, "^--- With additional stack trace: ");
};

CapturedTrace.isSupported = function () {
    return typeof captureStackTrace === "function";
};

CapturedTrace.fireRejectionEvent =
function(name, localHandler, reason, promise) {
    var localEventFired = false;
    try {
        if (typeof localHandler === "function") {
            localEventFired = true;
            if (name === "rejectionHandled") {
                localHandler(promise);
            } else {
                localHandler(reason, promise);
            }
        }
    } catch (e) {
        async.throwLater(e);
    }

    var globalEventFired = false;
    try {
        globalEventFired = fireGlobalEvent(name, reason, promise);
    } catch (e) {
        globalEventFired = true;
        async.throwLater(e);
    }

    var domEventFired = false;
    if (fireDomEvent) {
        try {
            domEventFired = fireDomEvent(name.toLowerCase(), {
                reason: reason,
                promise: promise
            });
        } catch (e) {
            domEventFired = true;
            async.throwLater(e);
        }
    }

    if (!globalEventFired && !localEventFired && !domEventFired &&
        name === "unhandledRejection") {
        CapturedTrace.formatAndLogError(reason, "Unhandled rejection ");
    }
};

function formatNonError(obj) {
    var str;
    if (typeof obj === "function") {
        str = "[function " +
            (obj.name || "anonymous") +
            "]";
    } else {
        str = obj.toString();
        var ruselessToString = /\[object [a-zA-Z0-9$_]+\]/;
        if (ruselessToString.test(str)) {
            try {
                var newStr = JSON.stringify(obj);
                str = newStr;
            }
            catch(e) {

            }
        }
        if (str.length === 0) {
            str = "(empty array)";
        }
    }
    return ("(<" + snip(str) + ">, no stack trace)");
}

function snip(str) {
    var maxChars = 41;
    if (str.length < maxChars) {
        return str;
    }
    return str.substr(0, maxChars - 3) + "...";
}

var shouldIgnore = function() { return false; };
var parseLineInfoRegex = /[\/<\(]([^:\/]+):(\d+):(?:\d+)\)?\s*$/;
function parseLineInfo(line) {
    var matches = line.match(parseLineInfoRegex);
    if (matches) {
        return {
            fileName: matches[1],
            line: parseInt(matches[2], 10)
        };
    }
}
CapturedTrace.setBounds = function(firstLineError, lastLineError) {
    if (!CapturedTrace.isSupported()) return;
    var firstStackLines = firstLineError.stack.split("\n");
    var lastStackLines = lastLineError.stack.split("\n");
    var firstIndex = -1;
    var lastIndex = -1;
    var firstFileName;
    var lastFileName;
    for (var i = 0; i < firstStackLines.length; ++i) {
        var result = parseLineInfo(firstStackLines[i]);
        if (result) {
            firstFileName = result.fileName;
            firstIndex = result.line;
            break;
        }
    }
    for (var i = 0; i < lastStackLines.length; ++i) {
        var result = parseLineInfo(lastStackLines[i]);
        if (result) {
            lastFileName = result.fileName;
            lastIndex = result.line;
            break;
        }
    }
    if (firstIndex < 0 || lastIndex < 0 || !firstFileName || !lastFileName ||
        firstFileName !== lastFileName || firstIndex >= lastIndex) {
        return;
    }

    shouldIgnore = function(line) {
        if (bluebirdFramePattern.test(line)) return true;
        var info = parseLineInfo(line);
        if (info) {
            if (info.fileName === firstFileName &&
                (firstIndex <= info.line && info.line <= lastIndex)) {
                return true;
            }
        }
        return false;
    };
};

var captureStackTrace = (function stackDetection() {
    var v8stackFramePattern = /^\s*at\s*/;
    var v8stackFormatter = function(stack, error) {
        if (typeof stack === "string") return stack;

        if (error.name !== undefined &&
            error.message !== undefined) {
            return error.toString();
        }
        return formatNonError(error);
    };

    if (typeof Error.stackTraceLimit === "number" &&
        typeof Error.captureStackTrace === "function") {
        Error.stackTraceLimit = Error.stackTraceLimit + 6;
        stackFramePattern = v8stackFramePattern;
        formatStack = v8stackFormatter;
        var captureStackTrace = Error.captureStackTrace;

        shouldIgnore = function(line) {
            return bluebirdFramePattern.test(line);
        };
        return function(receiver, ignoreUntil) {
            Error.stackTraceLimit = Error.stackTraceLimit + 6;
            captureStackTrace(receiver, ignoreUntil);
            Error.stackTraceLimit = Error.stackTraceLimit - 6;
        };
    }
    var err = new Error();

    if (typeof err.stack === "string" &&
        err.stack.split("\n")[0].indexOf("stackDetection@") >= 0) {
        stackFramePattern = /@/;
        formatStack = v8stackFormatter;
        indentStackFrames = true;
        return function captureStackTrace(o) {
            o.stack = new Error().stack;
        };
    }

    var hasStackAfterThrow;
    try { throw new Error(); }
    catch(e) {
        hasStackAfterThrow = ("stack" in e);
    }
    if (!("stack" in err) && hasStackAfterThrow) {
        stackFramePattern = v8stackFramePattern;
        formatStack = v8stackFormatter;
        return function captureStackTrace(o) {
            Error.stackTraceLimit = Error.stackTraceLimit + 6;
            try { throw new Error(); }
            catch(e) { o.stack = e.stack; }
            Error.stackTraceLimit = Error.stackTraceLimit - 6;
        };
    }

    formatStack = function(stack, error) {
        if (typeof stack === "string") return stack;

        if ((typeof error === "object" ||
            typeof error === "function") &&
            error.name !== undefined &&
            error.message !== undefined) {
            return error.toString();
        }
        return formatNonError(error);
    };

    return null;

})([]);

var fireDomEvent;
var fireGlobalEvent = (function() {
    if (util.isNode) {
        return function(name, reason, promise) {
            if (name === "rejectionHandled") {
                return process.emit(name, promise);
            } else {
                return process.emit(name, reason, promise);
            }
        };
    } else {
        var customEventWorks = false;
        var anyEventWorks = true;
        try {
            var ev = new self.CustomEvent("test");
            customEventWorks = ev instanceof CustomEvent;
        } catch (e) {}
        if (!customEventWorks) {
            try {
                var event = document.createEvent("CustomEvent");
                event.initCustomEvent("testingtheevent", false, true, {});
                self.dispatchEvent(event);
            } catch (e) {
                anyEventWorks = false;
            }
        }
        if (anyEventWorks) {
            fireDomEvent = function(type, detail) {
                var event;
                if (customEventWorks) {
                    event = new self.CustomEvent(type, {
                        detail: detail,
                        bubbles: false,
                        cancelable: true
                    });
                } else if (self.dispatchEvent) {
                    event = document.createEvent("CustomEvent");
                    event.initCustomEvent(type, false, true, detail);
                }

                return event ? !self.dispatchEvent(event) : false;
            };
        }

        var toWindowMethodNameMap = {};
        toWindowMethodNameMap["unhandledRejection"] = ("on" +
            "unhandledRejection").toLowerCase();
        toWindowMethodNameMap["rejectionHandled"] = ("on" +
            "rejectionHandled").toLowerCase();

        return function(name, reason, promise) {
            var methodName = toWindowMethodNameMap[name];
            var method = self[methodName];
            if (!method) return false;
            if (name === "rejectionHandled") {
                method.call(self, promise);
            } else {
                method.call(self, reason, promise);
            }
            return true;
        };
    }
})();

if (typeof console !== "undefined" && typeof console.warn !== "undefined") {
    warn = function (message) {
        console.warn(message);
    };
    if (util.isNode && process.stderr.isTTY) {
        warn = function(message) {
            process.stderr.write("\u001b[31m" + message + "\u001b[39m\n");
        };
    } else if (!util.isNode && typeof (new Error().stack) === "string") {
        warn = function(message) {
            console.warn("%c" + message, "color: red");
        };
    }
}

return CapturedTrace;
};

},{"./async.js":2,"./util.js":38}],8:[function(_dereq_,module,exports){
"use strict";
module.exports = function(NEXT_FILTER) {
var util = _dereq_("./util.js");
var errors = _dereq_("./errors.js");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var keys = _dereq_("./es5.js").keys;
var TypeError = errors.TypeError;

function CatchFilter(instances, callback, promise) {
    this._instances = instances;
    this._callback = callback;
    this._promise = promise;
}

function safePredicate(predicate, e) {
    var safeObject = {};
    var retfilter = tryCatch(predicate).call(safeObject, e);

    if (retfilter === errorObj) return retfilter;

    var safeKeys = keys(safeObject);
    if (safeKeys.length) {
        errorObj.e = new TypeError("Catch filter must inherit from Error or be a simple predicate function\u000a\u000a    See http://goo.gl/o84o68\u000a");
        return errorObj;
    }
    return retfilter;
}

CatchFilter.prototype.doFilter = function (e) {
    var cb = this._callback;
    var promise = this._promise;
    var boundTo = promise._boundTo;
    for (var i = 0, len = this._instances.length; i < len; ++i) {
        var item = this._instances[i];
        var itemIsErrorType = item === Error ||
            (item != null && item.prototype instanceof Error);

        if (itemIsErrorType && e instanceof item) {
            var ret = tryCatch(cb).call(boundTo, e);
            if (ret === errorObj) {
                NEXT_FILTER.e = ret.e;
                return NEXT_FILTER;
            }
            return ret;
        } else if (typeof item === "function" && !itemIsErrorType) {
            var shouldHandle = safePredicate(item, e);
            if (shouldHandle === errorObj) {
                e = errorObj.e;
                break;
            } else if (shouldHandle) {
                var ret = tryCatch(cb).call(boundTo, e);
                if (ret === errorObj) {
                    NEXT_FILTER.e = ret.e;
                    return NEXT_FILTER;
                }
                return ret;
            }
        }
    }
    NEXT_FILTER.e = e;
    return NEXT_FILTER;
};

return CatchFilter;
};

},{"./errors.js":13,"./es5.js":14,"./util.js":38}],9:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, CapturedTrace, isDebugging) {
var contextStack = [];
function Context() {
    this._trace = new CapturedTrace(peekContext());
}
Context.prototype._pushContext = function () {
    if (!isDebugging()) return;
    if (this._trace !== undefined) {
        contextStack.push(this._trace);
    }
};

Context.prototype._popContext = function () {
    if (!isDebugging()) return;
    if (this._trace !== undefined) {
        contextStack.pop();
    }
};

function createContext() {
    if (isDebugging()) return new Context();
}

function peekContext() {
    var lastIndex = contextStack.length - 1;
    if (lastIndex >= 0) {
        return contextStack[lastIndex];
    }
    return undefined;
}

Promise.prototype._peekContext = peekContext;
Promise.prototype._pushContext = Context.prototype._pushContext;
Promise.prototype._popContext = Context.prototype._popContext;

return createContext;
};

},{}],10:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, CapturedTrace) {
var async = _dereq_("./async.js");
var Warning = _dereq_("./errors.js").Warning;
var util = _dereq_("./util.js");
var canAttachTrace = util.canAttachTrace;
var unhandledRejectionHandled;
var possiblyUnhandledRejection;
var debugging = false || (util.isNode &&
                    (!!process.env["BLUEBIRD_DEBUG"] ||
                     process.env["NODE_ENV"] === "development"));

Promise.prototype._ensurePossibleRejectionHandled = function () {
    this._setRejectionIsUnhandled();
    async.invokeLater(this._notifyUnhandledRejection, this, undefined);
};

Promise.prototype._notifyUnhandledRejectionIsHandled = function () {
    CapturedTrace.fireRejectionEvent("rejectionHandled",
                                  unhandledRejectionHandled, undefined, this);
};

Promise.prototype._notifyUnhandledRejection = function () {
    if (this._isRejectionUnhandled()) {
        var reason = this._getCarriedStackTrace() || this._settledValue;
        this._setUnhandledRejectionIsNotified();
        CapturedTrace.fireRejectionEvent("unhandledRejection",
                                      possiblyUnhandledRejection, reason, this);
    }
};

Promise.prototype._setUnhandledRejectionIsNotified = function () {
    this._bitField = this._bitField | 524288;
};

Promise.prototype._unsetUnhandledRejectionIsNotified = function () {
    this._bitField = this._bitField & (~524288);
};

Promise.prototype._isUnhandledRejectionNotified = function () {
    return (this._bitField & 524288) > 0;
};

Promise.prototype._setRejectionIsUnhandled = function () {
    this._bitField = this._bitField | 2097152;
};

Promise.prototype._unsetRejectionIsUnhandled = function () {
    this._bitField = this._bitField & (~2097152);
    if (this._isUnhandledRejectionNotified()) {
        this._unsetUnhandledRejectionIsNotified();
        this._notifyUnhandledRejectionIsHandled();
    }
};

Promise.prototype._isRejectionUnhandled = function () {
    return (this._bitField & 2097152) > 0;
};

Promise.prototype._setCarriedStackTrace = function (capturedTrace) {
    this._bitField = this._bitField | 1048576;
    this._fulfillmentHandler0 = capturedTrace;
};

Promise.prototype._isCarryingStackTrace = function () {
    return (this._bitField & 1048576) > 0;
};

Promise.prototype._getCarriedStackTrace = function () {
    return this._isCarryingStackTrace()
        ? this._fulfillmentHandler0
        : undefined;
};

Promise.prototype._captureStackTrace = function () {
    if (debugging) {
        this._trace = new CapturedTrace(this._peekContext());
    }
    return this;
};

Promise.prototype._attachExtraTrace = function (error, ignoreSelf) {
    if (debugging && canAttachTrace(error)) {
        var trace = this._trace;
        if (trace !== undefined) {
            if (ignoreSelf) trace = trace._parent;
        }
        if (trace !== undefined) {
            trace.attachExtraTrace(error);
        } else if (!error.__stackCleaned__) {
            var parsed = CapturedTrace.parseStackAndMessage(error);
            error.stack = parsed.message + "\n" + parsed.stack.join("\n");
            util.notEnumerableProp(error, "__stackCleaned__", true);
        }
    }
};

Promise.prototype._warn = function(message) {
    var warning = new Warning(message);
    var ctx = this._peekContext();
    if (ctx) {
        ctx.attachExtraTrace(warning);
    } else {
        var parsed = CapturedTrace.parseStackAndMessage(warning);
        warning.stack = parsed.message + "\n" + parsed.stack.join("\n");
    }
    CapturedTrace.formatAndLogError(warning, "");
};

Promise.onPossiblyUnhandledRejection = function (fn) {
    possiblyUnhandledRejection = typeof fn === "function" ? fn : undefined;
};

Promise.onUnhandledRejectionHandled = function (fn) {
    unhandledRejectionHandled = typeof fn === "function" ? fn : undefined;
};

Promise.longStackTraces = function () {
    if (async.haveItemsQueued() &&
        debugging === false
   ) {
        throw new Error("cannot enable long stack traces after promises have been created\u000a\u000a    See http://goo.gl/DT1qyG\u000a");
    }
    debugging = CapturedTrace.isSupported();
};

Promise.hasLongStackTraces = function () {
    return debugging && CapturedTrace.isSupported();
};

if (!CapturedTrace.isSupported()) {
    Promise.longStackTraces = function(){};
    debugging = false;
}

return function() {
    return debugging;
};
};

},{"./async.js":2,"./errors.js":13,"./util.js":38}],11:[function(_dereq_,module,exports){
"use strict";
var util = _dereq_("./util.js");
var isPrimitive = util.isPrimitive;
var wrapsPrimitiveReceiver = util.wrapsPrimitiveReceiver;

module.exports = function(Promise) {
var returner = function () {
    return this;
};
var thrower = function () {
    throw this;
};

var wrapper = function (value, action) {
    if (action === 1) {
        return function () {
            throw value;
        };
    } else if (action === 2) {
        return function () {
            return value;
        };
    }
};


Promise.prototype["return"] =
Promise.prototype.thenReturn = function (value) {
    if (wrapsPrimitiveReceiver && isPrimitive(value)) {
        return this._then(
            wrapper(value, 2),
            undefined,
            undefined,
            undefined,
            undefined
       );
    }
    return this._then(returner, undefined, undefined, value, undefined);
};

Promise.prototype["throw"] =
Promise.prototype.thenThrow = function (reason) {
    if (wrapsPrimitiveReceiver && isPrimitive(reason)) {
        return this._then(
            wrapper(reason, 1),
            undefined,
            undefined,
            undefined,
            undefined
       );
    }
    return this._then(thrower, undefined, undefined, reason, undefined);
};
};

},{"./util.js":38}],12:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var PromiseReduce = Promise.reduce;

Promise.prototype.each = function (fn) {
    return PromiseReduce(this, fn, null, INTERNAL);
};

Promise.each = function (promises, fn) {
    return PromiseReduce(promises, fn, null, INTERNAL);
};
};

},{}],13:[function(_dereq_,module,exports){
"use strict";
var es5 = _dereq_("./es5.js");
var Objectfreeze = es5.freeze;
var util = _dereq_("./util.js");
var inherits = util.inherits;
var notEnumerableProp = util.notEnumerableProp;

function subError(nameProperty, defaultMessage) {
    function SubError(message) {
        if (!(this instanceof SubError)) return new SubError(message);
        notEnumerableProp(this, "message",
            typeof message === "string" ? message : defaultMessage);
        notEnumerableProp(this, "name", nameProperty);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        } else {
            Error.call(this);
        }
    }
    inherits(SubError, Error);
    return SubError;
}

var _TypeError, _RangeError;
var Warning = subError("Warning", "warning");
var CancellationError = subError("CancellationError", "cancellation error");
var TimeoutError = subError("TimeoutError", "timeout error");
var AggregateError = subError("AggregateError", "aggregate error");
try {
    _TypeError = TypeError;
    _RangeError = RangeError;
} catch(e) {
    _TypeError = subError("TypeError", "type error");
    _RangeError = subError("RangeError", "range error");
}

var methods = ("join pop push shift unshift slice filter forEach some " +
    "every map indexOf lastIndexOf reduce reduceRight sort reverse").split(" ");

for (var i = 0; i < methods.length; ++i) {
    if (typeof Array.prototype[methods[i]] === "function") {
        AggregateError.prototype[methods[i]] = Array.prototype[methods[i]];
    }
}

es5.defineProperty(AggregateError.prototype, "length", {
    value: 0,
    configurable: false,
    writable: true,
    enumerable: true
});
AggregateError.prototype["isOperational"] = true;
var level = 0;
AggregateError.prototype.toString = function() {
    var indent = Array(level * 4 + 1).join(" ");
    var ret = "\n" + indent + "AggregateError of:" + "\n";
    level++;
    indent = Array(level * 4 + 1).join(" ");
    for (var i = 0; i < this.length; ++i) {
        var str = this[i] === this ? "[Circular AggregateError]" : this[i] + "";
        var lines = str.split("\n");
        for (var j = 0; j < lines.length; ++j) {
            lines[j] = indent + lines[j];
        }
        str = lines.join("\n");
        ret += str + "\n";
    }
    level--;
    return ret;
};

function OperationalError(message) {
    if (!(this instanceof OperationalError))
        return new OperationalError(message);
    notEnumerableProp(this, "name", "OperationalError");
    notEnumerableProp(this, "message", message);
    this.cause = message;
    this["isOperational"] = true;

    if (message instanceof Error) {
        notEnumerableProp(this, "message", message.message);
        notEnumerableProp(this, "stack", message.stack);
    } else if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
    }

}
inherits(OperationalError, Error);

var errorTypes = Error["__BluebirdErrorTypes__"];
if (!errorTypes) {
    errorTypes = Objectfreeze({
        CancellationError: CancellationError,
        TimeoutError: TimeoutError,
        OperationalError: OperationalError,
        RejectionError: OperationalError,
        AggregateError: AggregateError
    });
    notEnumerableProp(Error, "__BluebirdErrorTypes__", errorTypes);
}

module.exports = {
    Error: Error,
    TypeError: _TypeError,
    RangeError: _RangeError,
    CancellationError: errorTypes.CancellationError,
    OperationalError: errorTypes.OperationalError,
    TimeoutError: errorTypes.TimeoutError,
    AggregateError: errorTypes.AggregateError,
    Warning: Warning
};

},{"./es5.js":14,"./util.js":38}],14:[function(_dereq_,module,exports){
var isES5 = (function(){
    "use strict";
    return this === undefined;
})();

if (isES5) {
    module.exports = {
        freeze: Object.freeze,
        defineProperty: Object.defineProperty,
        getDescriptor: Object.getOwnPropertyDescriptor,
        keys: Object.keys,
        names: Object.getOwnPropertyNames,
        getPrototypeOf: Object.getPrototypeOf,
        isArray: Array.isArray,
        isES5: isES5,
        propertyIsWritable: function(obj, prop) {
            var descriptor = Object.getOwnPropertyDescriptor(obj, prop);
            return !!(!descriptor || descriptor.writable || descriptor.set);
        }
    };
} else {
    var has = {}.hasOwnProperty;
    var str = {}.toString;
    var proto = {}.constructor.prototype;

    var ObjectKeys = function (o) {
        var ret = [];
        for (var key in o) {
            if (has.call(o, key)) {
                ret.push(key);
            }
        }
        return ret;
    };

    var ObjectGetDescriptor = function(o, key) {
        return {value: o[key]};
    };

    var ObjectDefineProperty = function (o, key, desc) {
        o[key] = desc.value;
        return o;
    };

    var ObjectFreeze = function (obj) {
        return obj;
    };

    var ObjectGetPrototypeOf = function (obj) {
        try {
            return Object(obj).constructor.prototype;
        }
        catch (e) {
            return proto;
        }
    };

    var ArrayIsArray = function (obj) {
        try {
            return str.call(obj) === "[object Array]";
        }
        catch(e) {
            return false;
        }
    };

    module.exports = {
        isArray: ArrayIsArray,
        keys: ObjectKeys,
        names: ObjectKeys,
        defineProperty: ObjectDefineProperty,
        getDescriptor: ObjectGetDescriptor,
        freeze: ObjectFreeze,
        getPrototypeOf: ObjectGetPrototypeOf,
        isES5: isES5,
        propertyIsWritable: function() {
            return true;
        }
    };
}

},{}],15:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var PromiseMap = Promise.map;

Promise.prototype.filter = function (fn, options) {
    return PromiseMap(this, fn, options, INTERNAL);
};

Promise.filter = function (promises, fn, options) {
    return PromiseMap(promises, fn, options, INTERNAL);
};
};

},{}],16:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, NEXT_FILTER, tryConvertToPromise) {
var util = _dereq_("./util.js");
var wrapsPrimitiveReceiver = util.wrapsPrimitiveReceiver;
var isPrimitive = util.isPrimitive;
var thrower = util.thrower;

function returnThis() {
    return this;
}
function throwThis() {
    throw this;
}
function return$(r) {
    return function() {
        return r;
    };
}
function throw$(r) {
    return function() {
        throw r;
    };
}
function promisedFinally(ret, reasonOrValue, isFulfilled) {
    var then;
    if (wrapsPrimitiveReceiver && isPrimitive(reasonOrValue)) {
        then = isFulfilled ? return$(reasonOrValue) : throw$(reasonOrValue);
    } else {
        then = isFulfilled ? returnThis : throwThis;
    }
    return ret._then(then, thrower, undefined, reasonOrValue, undefined);
}

function finallyHandler(reasonOrValue) {
    var promise = this.promise;
    var handler = this.handler;

    var ret = promise._isBound()
                    ? handler.call(promise._boundTo)
                    : handler();

    if (ret !== undefined) {
        var maybePromise = tryConvertToPromise(ret, promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            return promisedFinally(maybePromise, reasonOrValue,
                                    promise.isFulfilled());
        }
    }

    if (promise.isRejected()) {
        NEXT_FILTER.e = reasonOrValue;
        return NEXT_FILTER;
    } else {
        return reasonOrValue;
    }
}

function tapHandler(value) {
    var promise = this.promise;
    var handler = this.handler;

    var ret = promise._isBound()
                    ? handler.call(promise._boundTo, value)
                    : handler(value);

    if (ret !== undefined) {
        var maybePromise = tryConvertToPromise(ret, promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            return promisedFinally(maybePromise, value, true);
        }
    }
    return value;
}

Promise.prototype._passThroughHandler = function (handler, isFinally) {
    if (typeof handler !== "function") return this.then();

    var promiseAndHandler = {
        promise: this,
        handler: handler
    };

    return this._then(
            isFinally ? finallyHandler : tapHandler,
            isFinally ? finallyHandler : undefined, undefined,
            promiseAndHandler, undefined);
};

Promise.prototype.lastly =
Promise.prototype["finally"] = function (handler) {
    return this._passThroughHandler(handler, true);
};

Promise.prototype.tap = function (handler) {
    return this._passThroughHandler(handler, false);
};
};

},{"./util.js":38}],17:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          apiRejection,
                          INTERNAL,
                          tryConvertToPromise) {
var errors = _dereq_("./errors.js");
var TypeError = errors.TypeError;
var util = _dereq_("./util.js");
var errorObj = util.errorObj;
var tryCatch = util.tryCatch;
var yieldHandlers = [];

function promiseFromYieldHandler(value, yieldHandlers, traceParent) {
    for (var i = 0; i < yieldHandlers.length; ++i) {
        traceParent._pushContext();
        var result = tryCatch(yieldHandlers[i])(value);
        traceParent._popContext();
        if (result === errorObj) {
            traceParent._pushContext();
            var ret = Promise.reject(errorObj.e);
            traceParent._popContext();
            return ret;
        }
        var maybePromise = tryConvertToPromise(result, traceParent);
        if (maybePromise instanceof Promise) return maybePromise;
    }
    return null;
}

function PromiseSpawn(generatorFunction, receiver, yieldHandler, stack) {
    var promise = this._promise = new Promise(INTERNAL);
    promise._captureStackTrace();
    this._stack = stack;
    this._generatorFunction = generatorFunction;
    this._receiver = receiver;
    this._generator = undefined;
    this._yieldHandlers = typeof yieldHandler === "function"
        ? [yieldHandler].concat(yieldHandlers)
        : yieldHandlers;
}

PromiseSpawn.prototype.promise = function () {
    return this._promise;
};

PromiseSpawn.prototype._run = function () {
    this._generator = this._generatorFunction.call(this._receiver);
    this._receiver =
        this._generatorFunction = undefined;
    this._next(undefined);
};

PromiseSpawn.prototype._continue = function (result) {
    if (result === errorObj) {
        return this._promise._rejectCallback(result.e, false, true);
    }

    var value = result.value;
    if (result.done === true) {
        this._promise._resolveCallback(value);
    } else {
        var maybePromise = tryConvertToPromise(value, this._promise);
        if (!(maybePromise instanceof Promise)) {
            maybePromise =
                promiseFromYieldHandler(maybePromise,
                                        this._yieldHandlers,
                                        this._promise);
            if (maybePromise === null) {
                this._throw(
                    new TypeError(
                        "A value %s was yielded that could not be treated as a promise\u000a\u000a    See http://goo.gl/4Y4pDk\u000a\u000a".replace("%s", value) +
                        "From coroutine:\u000a" +
                        this._stack.split("\n").slice(1, -7).join("\n")
                    )
                );
                return;
            }
        }
        maybePromise._then(
            this._next,
            this._throw,
            undefined,
            this,
            null
       );
    }
};

PromiseSpawn.prototype._throw = function (reason) {
    this._promise._attachExtraTrace(reason);
    this._promise._pushContext();
    var result = tryCatch(this._generator["throw"])
        .call(this._generator, reason);
    this._promise._popContext();
    this._continue(result);
};

PromiseSpawn.prototype._next = function (value) {
    this._promise._pushContext();
    var result = tryCatch(this._generator.next).call(this._generator, value);
    this._promise._popContext();
    this._continue(result);
};

Promise.coroutine = function (generatorFunction, options) {
    if (typeof generatorFunction !== "function") {
        throw new TypeError("generatorFunction must be a function\u000a\u000a    See http://goo.gl/6Vqhm0\u000a");
    }
    var yieldHandler = Object(options).yieldHandler;
    var PromiseSpawn$ = PromiseSpawn;
    var stack = new Error().stack;
    return function () {
        var generator = generatorFunction.apply(this, arguments);
        var spawn = new PromiseSpawn$(undefined, undefined, yieldHandler,
                                      stack);
        spawn._generator = generator;
        spawn._next(undefined);
        return spawn.promise();
    };
};

Promise.coroutine.addYieldHandler = function(fn) {
    if (typeof fn !== "function") throw new TypeError("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    yieldHandlers.push(fn);
};

Promise.spawn = function (generatorFunction) {
    if (typeof generatorFunction !== "function") {
        return apiRejection("generatorFunction must be a function\u000a\u000a    See http://goo.gl/6Vqhm0\u000a");
    }
    var spawn = new PromiseSpawn(generatorFunction, this);
    var ret = spawn.promise();
    spawn._run(Promise.spawn);
    return ret;
};
};

},{"./errors.js":13,"./util.js":38}],18:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, PromiseArray, tryConvertToPromise, INTERNAL) {
var util = _dereq_("./util.js");
var canEvaluate = util.canEvaluate;
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var reject;

if (!true) {
if (canEvaluate) {
    var thenCallback = function(i) {
        return new Function("value", "holder", "                             \n\
            'use strict';                                                    \n\
            holder.pIndex = value;                                           \n\
            holder.checkFulfillment(this);                                   \n\
            ".replace(/Index/g, i));
    };

    var caller = function(count) {
        var values = [];
        for (var i = 1; i <= count; ++i) values.push("holder.p" + i);
        return new Function("holder", "                                      \n\
            'use strict';                                                    \n\
            var callback = holder.fn;                                        \n\
            return callback(values);                                         \n\
            ".replace(/values/g, values.join(", ")));
    };
    var thenCallbacks = [];
    var callers = [undefined];
    for (var i = 1; i <= 5; ++i) {
        thenCallbacks.push(thenCallback(i));
        callers.push(caller(i));
    }

    var Holder = function(total, fn) {
        this.p1 = this.p2 = this.p3 = this.p4 = this.p5 = null;
        this.fn = fn;
        this.total = total;
        this.now = 0;
    };

    Holder.prototype.callers = callers;
    Holder.prototype.checkFulfillment = function(promise) {
        var now = this.now;
        now++;
        var total = this.total;
        if (now >= total) {
            var handler = this.callers[total];
            promise._pushContext();
            var ret = tryCatch(handler)(this);
            promise._popContext();
            if (ret === errorObj) {
                promise._rejectCallback(ret.e, false, true);
            } else {
                promise._resolveCallback(ret);
            }
        } else {
            this.now = now;
        }
    };

    var reject = function (reason) {
        this._reject(reason);
    };
}
}

Promise.join = function () {
    var last = arguments.length - 1;
    var fn;
    if (last > 0 && typeof arguments[last] === "function") {
        fn = arguments[last];
        if (!true) {
            if (last < 6 && canEvaluate) {
                var ret = new Promise(INTERNAL);
                ret._captureStackTrace();
                var holder = new Holder(last, fn);
                var callbacks = thenCallbacks;
                for (var i = 0; i < last; ++i) {
                    var maybePromise = tryConvertToPromise(arguments[i], ret);
                    if (maybePromise instanceof Promise) {
                        maybePromise = maybePromise._target();
                        if (maybePromise._isPending()) {
                            maybePromise._then(callbacks[i], reject,
                                               undefined, ret, holder);
                        } else if (maybePromise._isFulfilled()) {
                            callbacks[i].call(ret,
                                              maybePromise._value(), holder);
                        } else {
                            ret._reject(maybePromise._reason());
                        }
                    } else {
                        callbacks[i].call(ret, maybePromise, holder);
                    }
                }
                return ret;
            }
        }
    }
    var $_len = arguments.length;var args = new Array($_len); for(var $_i = 0; $_i < $_len; ++$_i) {args[$_i] = arguments[$_i];}
    if (fn) args.pop();
    var ret = new PromiseArray(args).promise();
    return fn !== undefined ? ret.spread(fn) : ret;
};

};

},{"./util.js":38}],19:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          PromiseArray,
                          apiRejection,
                          tryConvertToPromise,
                          INTERNAL) {
var async = _dereq_("./async.js");
var util = _dereq_("./util.js");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var PENDING = {};
var EMPTY_ARRAY = [];

function MappingPromiseArray(promises, fn, limit, _filter) {
    this.constructor$(promises);
    this._promise._captureStackTrace();
    this._callback = fn;
    this._preservedValues = _filter === INTERNAL
        ? new Array(this.length())
        : null;
    this._limit = limit;
    this._inFlight = 0;
    this._queue = limit >= 1 ? [] : EMPTY_ARRAY;
    async.invoke(init, this, undefined);
}
util.inherits(MappingPromiseArray, PromiseArray);
function init() {this._init$(undefined, -2);}

MappingPromiseArray.prototype._init = function () {};

MappingPromiseArray.prototype._promiseFulfilled = function (value, index) {
    var values = this._values;
    var length = this.length();
    var preservedValues = this._preservedValues;
    var limit = this._limit;
    if (values[index] === PENDING) {
        values[index] = value;
        if (limit >= 1) {
            this._inFlight--;
            this._drainQueue();
            if (this._isResolved()) return;
        }
    } else {
        if (limit >= 1 && this._inFlight >= limit) {
            values[index] = value;
            this._queue.push(index);
            return;
        }
        if (preservedValues !== null) preservedValues[index] = value;

        var callback = this._callback;
        var receiver = this._promise._boundTo;
        this._promise._pushContext();
        var ret = tryCatch(callback).call(receiver, value, index, length);
        this._promise._popContext();
        if (ret === errorObj) return this._reject(ret.e);

        var maybePromise = tryConvertToPromise(ret, this._promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            if (maybePromise._isPending()) {
                if (limit >= 1) this._inFlight++;
                values[index] = PENDING;
                return maybePromise._proxyPromiseArray(this, index);
            } else if (maybePromise._isFulfilled()) {
                ret = maybePromise._value();
            } else {
                return this._reject(maybePromise._reason());
            }
        }
        values[index] = ret;
    }
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= length) {
        if (preservedValues !== null) {
            this._filter(values, preservedValues);
        } else {
            this._resolve(values);
        }

    }
};

MappingPromiseArray.prototype._drainQueue = function () {
    var queue = this._queue;
    var limit = this._limit;
    var values = this._values;
    while (queue.length > 0 && this._inFlight < limit) {
        if (this._isResolved()) return;
        var index = queue.pop();
        this._promiseFulfilled(values[index], index);
    }
};

MappingPromiseArray.prototype._filter = function (booleans, values) {
    var len = values.length;
    var ret = new Array(len);
    var j = 0;
    for (var i = 0; i < len; ++i) {
        if (booleans[i]) ret[j++] = values[i];
    }
    ret.length = j;
    this._resolve(ret);
};

MappingPromiseArray.prototype.preservedValues = function () {
    return this._preservedValues;
};

function map(promises, fn, options, _filter) {
    var limit = typeof options === "object" && options !== null
        ? options.concurrency
        : 0;
    limit = typeof limit === "number" &&
        isFinite(limit) && limit >= 1 ? limit : 0;
    return new MappingPromiseArray(promises, fn, limit, _filter);
}

Promise.prototype.map = function (fn, options) {
    if (typeof fn !== "function") return apiRejection("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");

    return map(this, fn, options, null).promise();
};

Promise.map = function (promises, fn, options, _filter) {
    if (typeof fn !== "function") return apiRejection("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    return map(promises, fn, options, _filter).promise();
};


};

},{"./async.js":2,"./util.js":38}],20:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, INTERNAL, tryConvertToPromise, apiRejection) {
var util = _dereq_("./util.js");
var tryCatch = util.tryCatch;

Promise.method = function (fn) {
    if (typeof fn !== "function") {
        throw new Promise.TypeError("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    }
    return function () {
        var ret = new Promise(INTERNAL);
        ret._captureStackTrace();
        ret._pushContext();
        var value = tryCatch(fn).apply(this, arguments);
        ret._popContext();
        ret._resolveFromSyncValue(value);
        return ret;
    };
};

Promise.attempt = Promise["try"] = function (fn, args, ctx) {
    if (typeof fn !== "function") {
        return apiRejection("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    }
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    ret._pushContext();
    var value = util.isArray(args)
        ? tryCatch(fn).apply(ctx, args)
        : tryCatch(fn).call(ctx, args);
    ret._popContext();
    ret._resolveFromSyncValue(value);
    return ret;
};

Promise.prototype._resolveFromSyncValue = function (value) {
    if (value === util.errorObj) {
        this._rejectCallback(value.e, false, true);
    } else {
        this._resolveCallback(value, true);
    }
};
};

},{"./util.js":38}],21:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var util = _dereq_("./util.js");
var async = _dereq_("./async.js");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;

function spreadAdapter(val, nodeback) {
    var promise = this;
    if (!util.isArray(val)) return successAdapter.call(promise, val, nodeback);
    var ret = tryCatch(nodeback).apply(promise._boundTo, [null].concat(val));
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}

function successAdapter(val, nodeback) {
    var promise = this;
    var receiver = promise._boundTo;
    var ret = val === undefined
        ? tryCatch(nodeback).call(receiver, null)
        : tryCatch(nodeback).call(receiver, null, val);
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}
function errorAdapter(reason, nodeback) {
    var promise = this;
    if (!reason) {
        var target = promise._target();
        var newReason = target._getCarriedStackTrace();
        newReason.cause = reason;
        reason = newReason;
    }
    var ret = tryCatch(nodeback).call(promise._boundTo, reason);
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}

Promise.prototype.nodeify = function (nodeback, options) {
    if (typeof nodeback == "function") {
        var adapter = successAdapter;
        if (options !== undefined && Object(options).spread) {
            adapter = spreadAdapter;
        }
        this._then(
            adapter,
            errorAdapter,
            undefined,
            this,
            nodeback
        );
    }
    return this;
};
};

},{"./async.js":2,"./util.js":38}],22:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, PromiseArray) {
var util = _dereq_("./util.js");
var async = _dereq_("./async.js");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;

Promise.prototype.progressed = function (handler) {
    return this._then(undefined, undefined, handler, undefined, undefined);
};

Promise.prototype._progress = function (progressValue) {
    if (this._isFollowingOrFulfilledOrRejected()) return;
    this._target()._progressUnchecked(progressValue);

};

Promise.prototype._progressHandlerAt = function (index) {
    return index === 0
        ? this._progressHandler0
        : this[(index << 2) + index - 5 + 2];
};

Promise.prototype._doProgressWith = function (progression) {
    var progressValue = progression.value;
    var handler = progression.handler;
    var promise = progression.promise;
    var receiver = progression.receiver;

    var ret = tryCatch(handler).call(receiver, progressValue);
    if (ret === errorObj) {
        if (ret.e != null &&
            ret.e.name !== "StopProgressPropagation") {
            var trace = util.canAttachTrace(ret.e)
                ? ret.e : new Error(util.toString(ret.e));
            promise._attachExtraTrace(trace);
            promise._progress(ret.e);
        }
    } else if (ret instanceof Promise) {
        ret._then(promise._progress, null, null, promise, undefined);
    } else {
        promise._progress(ret);
    }
};


Promise.prototype._progressUnchecked = function (progressValue) {
    var len = this._length();
    var progress = this._progress;
    for (var i = 0; i < len; i++) {
        var handler = this._progressHandlerAt(i);
        var promise = this._promiseAt(i);
        if (!(promise instanceof Promise)) {
            var receiver = this._receiverAt(i);
            if (typeof handler === "function") {
                handler.call(receiver, progressValue, promise);
            } else if (receiver instanceof PromiseArray &&
                       !receiver._isResolved()) {
                receiver._promiseProgressed(progressValue, promise);
            }
            continue;
        }

        if (typeof handler === "function") {
            async.invoke(this._doProgressWith, this, {
                handler: handler,
                promise: promise,
                receiver: this._receiverAt(i),
                value: progressValue
            });
        } else {
            async.invoke(progress, promise, progressValue);
        }
    }
};
};

},{"./async.js":2,"./util.js":38}],23:[function(_dereq_,module,exports){
"use strict";
module.exports = function() {
var makeSelfResolutionError = function () {
    return new TypeError("circular promise resolution chain\u000a\u000a    See http://goo.gl/LhFpo0\u000a");
};
var reflect = function() {
    return new Promise.PromiseInspection(this._target());
};
var apiRejection = function(msg) {
    return Promise.reject(new TypeError(msg));
};
var util = _dereq_("./util.js");
var async = _dereq_("./async.js");
var errors = _dereq_("./errors.js");
var TypeError = Promise.TypeError = errors.TypeError;
Promise.RangeError = errors.RangeError;
Promise.CancellationError = errors.CancellationError;
Promise.TimeoutError = errors.TimeoutError;
Promise.OperationalError = errors.OperationalError;
Promise.RejectionError = errors.OperationalError;
Promise.AggregateError = errors.AggregateError;
var INTERNAL = function(){};
var APPLY = {};
var NEXT_FILTER = {e: null};
var tryConvertToPromise = _dereq_("./thenables.js")(Promise, INTERNAL);
var PromiseArray =
    _dereq_("./promise_array.js")(Promise, INTERNAL,
                                    tryConvertToPromise, apiRejection);
var CapturedTrace = _dereq_("./captured_trace.js")();
var isDebugging = _dereq_("./debuggability.js")(Promise, CapturedTrace);
 /*jshint unused:false*/
var createContext =
    _dereq_("./context.js")(Promise, CapturedTrace, isDebugging);
var CatchFilter = _dereq_("./catch_filter.js")(NEXT_FILTER);
var PromiseResolver = _dereq_("./promise_resolver.js");
var nodebackForPromise = PromiseResolver._nodebackForPromise;
var errorObj = util.errorObj;
var tryCatch = util.tryCatch;
function Promise(resolver) {
    if (typeof resolver !== "function") {
        throw new TypeError("the promise constructor requires a resolver function\u000a\u000a    See http://goo.gl/EC22Yn\u000a");
    }
    if (this.constructor !== Promise) {
        throw new TypeError("the promise constructor cannot be invoked directly\u000a\u000a    See http://goo.gl/KsIlge\u000a");
    }
    this._bitField = 0;
    this._fulfillmentHandler0 = undefined;
    this._rejectionHandler0 = undefined;
    this._progressHandler0 = undefined;
    this._promise0 = undefined;
    this._receiver0 = undefined;
    this._settledValue = undefined;
    if (resolver !== INTERNAL) this._resolveFromResolver(resolver);
}

Promise.prototype.toString = function () {
    return "[object Promise]";
};

Promise.prototype.caught = Promise.prototype["catch"] = function (fn) {
    var len = arguments.length;
    if (len > 1) {
        var catchInstances = new Array(len - 1),
            j = 0, i;
        for (i = 0; i < len - 1; ++i) {
            var item = arguments[i];
            if (typeof item === "function") {
                catchInstances[j++] = item;
            } else {
                return Promise.reject(
                    new TypeError("Catch filter must inherit from Error or be a simple predicate function\u000a\u000a    See http://goo.gl/o84o68\u000a"));
            }
        }
        catchInstances.length = j;
        fn = arguments[i];
        var catchFilter = new CatchFilter(catchInstances, fn, this);
        return this._then(undefined, catchFilter.doFilter, undefined,
            catchFilter, undefined);
    }
    return this._then(undefined, fn, undefined, undefined, undefined);
};

Promise.prototype.reflect = function () {
    return this._then(reflect, reflect, undefined, this, undefined);
};

Promise.prototype.then = function (didFulfill, didReject, didProgress) {
    if (isDebugging() && arguments.length > 0 &&
        typeof didFulfill !== "function" &&
        typeof didReject !== "function") {
        var msg = ".then() only accepts functions but was passed: " +
                util.classString(didFulfill);
        if (arguments.length > 1) {
            msg += ", " + util.classString(didReject);
        }
        this._warn(msg);
    }
    return this._then(didFulfill, didReject, didProgress,
        undefined, undefined);
};

Promise.prototype.done = function (didFulfill, didReject, didProgress) {
    var promise = this._then(didFulfill, didReject, didProgress,
        undefined, undefined);
    promise._setIsFinal();
};

Promise.prototype.spread = function (didFulfill, didReject) {
    return this.all()._then(didFulfill, didReject, undefined, APPLY, undefined);
};

Promise.prototype.isCancellable = function () {
    return !this.isResolved() &&
        this._cancellable();
};

Promise.prototype.toJSON = function () {
    var ret = {
        isFulfilled: false,
        isRejected: false,
        fulfillmentValue: undefined,
        rejectionReason: undefined
    };
    if (this.isFulfilled()) {
        ret.fulfillmentValue = this.value();
        ret.isFulfilled = true;
    } else if (this.isRejected()) {
        ret.rejectionReason = this.reason();
        ret.isRejected = true;
    }
    return ret;
};

Promise.prototype.all = function () {
    return new PromiseArray(this).promise();
};

Promise.prototype.error = function (fn) {
    return this.caught(util.originatesFromRejection, fn);
};

Promise.is = function (val) {
    return val instanceof Promise;
};

Promise.fromNode = function(fn) {
    var ret = new Promise(INTERNAL);
    var result = tryCatch(fn)(nodebackForPromise(ret));
    if (result === errorObj) {
        ret._rejectCallback(result.e, true, true);
    }
    return ret;
};

Promise.all = function (promises) {
    return new PromiseArray(promises).promise();
};

Promise.defer = Promise.pending = function () {
    var promise = new Promise(INTERNAL);
    return new PromiseResolver(promise);
};

Promise.cast = function (obj) {
    var ret = tryConvertToPromise(obj);
    if (!(ret instanceof Promise)) {
        var val = ret;
        ret = new Promise(INTERNAL);
        ret._fulfillUnchecked(val);
    }
    return ret;
};

Promise.resolve = Promise.fulfilled = Promise.cast;

Promise.reject = Promise.rejected = function (reason) {
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    ret._rejectCallback(reason, true);
    return ret;
};

Promise.setScheduler = function(fn) {
    if (typeof fn !== "function") throw new TypeError("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    var prev = async._schedule;
    async._schedule = fn;
    return prev;
};

Promise.prototype._then = function (
    didFulfill,
    didReject,
    didProgress,
    receiver,
    internalData
) {
    var haveInternalData = internalData !== undefined;
    var ret = haveInternalData ? internalData : new Promise(INTERNAL);

    if (!haveInternalData) {
        ret._propagateFrom(this, 4 | 1);
        ret._captureStackTrace();
    }

    var target = this._target();
    if (target !== this) {
        if (receiver === undefined) receiver = this._boundTo;
        if (!haveInternalData) ret._setIsMigrated();
    }

    var callbackIndex =
        target._addCallbacks(didFulfill, didReject, didProgress, ret, receiver);

    if (target._isResolved() && !target._isSettlePromisesQueued()) {
        async.invoke(
            target._settlePromiseAtPostResolution, target, callbackIndex);
    }

    return ret;
};

Promise.prototype._settlePromiseAtPostResolution = function (index) {
    if (this._isRejectionUnhandled()) this._unsetRejectionIsUnhandled();
    this._settlePromiseAt(index);
};

Promise.prototype._length = function () {
    return this._bitField & 131071;
};

Promise.prototype._isFollowingOrFulfilledOrRejected = function () {
    return (this._bitField & 939524096) > 0;
};

Promise.prototype._isFollowing = function () {
    return (this._bitField & 536870912) === 536870912;
};

Promise.prototype._setLength = function (len) {
    this._bitField = (this._bitField & -131072) |
        (len & 131071);
};

Promise.prototype._setFulfilled = function () {
    this._bitField = this._bitField | 268435456;
};

Promise.prototype._setRejected = function () {
    this._bitField = this._bitField | 134217728;
};

Promise.prototype._setFollowing = function () {
    this._bitField = this._bitField | 536870912;
};

Promise.prototype._setIsFinal = function () {
    this._bitField = this._bitField | 33554432;
};

Promise.prototype._isFinal = function () {
    return (this._bitField & 33554432) > 0;
};

Promise.prototype._cancellable = function () {
    return (this._bitField & 67108864) > 0;
};

Promise.prototype._setCancellable = function () {
    this._bitField = this._bitField | 67108864;
};

Promise.prototype._unsetCancellable = function () {
    this._bitField = this._bitField & (~67108864);
};

Promise.prototype._setIsMigrated = function () {
    this._bitField = this._bitField | 4194304;
};

Promise.prototype._unsetIsMigrated = function () {
    this._bitField = this._bitField & (~4194304);
};

Promise.prototype._isMigrated = function () {
    return (this._bitField & 4194304) > 0;
};

Promise.prototype._receiverAt = function (index) {
    var ret = index === 0
        ? this._receiver0
        : this[
            index * 5 - 5 + 4];
    if (ret === undefined && this._isBound()) {
        return this._boundTo;
    }
    return ret;
};

Promise.prototype._promiseAt = function (index) {
    return index === 0
        ? this._promise0
        : this[index * 5 - 5 + 3];
};

Promise.prototype._fulfillmentHandlerAt = function (index) {
    return index === 0
        ? this._fulfillmentHandler0
        : this[index * 5 - 5 + 0];
};

Promise.prototype._rejectionHandlerAt = function (index) {
    return index === 0
        ? this._rejectionHandler0
        : this[index * 5 - 5 + 1];
};

Promise.prototype._migrateCallbacks = function (follower, index) {
    var fulfill = follower._fulfillmentHandlerAt(index);
    var reject = follower._rejectionHandlerAt(index);
    var progress = follower._progressHandlerAt(index);
    var promise = follower._promiseAt(index);
    var receiver = follower._receiverAt(index);
    if (promise instanceof Promise) promise._setIsMigrated();
    this._addCallbacks(fulfill, reject, progress, promise, receiver);
};

Promise.prototype._addCallbacks = function (
    fulfill,
    reject,
    progress,
    promise,
    receiver
) {
    var index = this._length();

    if (index >= 131071 - 5) {
        index = 0;
        this._setLength(0);
    }

    if (index === 0) {
        this._promise0 = promise;
        if (receiver !== undefined) this._receiver0 = receiver;
        if (typeof fulfill === "function" && !this._isCarryingStackTrace())
            this._fulfillmentHandler0 = fulfill;
        if (typeof reject === "function") this._rejectionHandler0 = reject;
        if (typeof progress === "function") this._progressHandler0 = progress;
    } else {
        var base = index * 5 - 5;
        this[base + 3] = promise;
        this[base + 4] = receiver;
        if (typeof fulfill === "function")
            this[base + 0] = fulfill;
        if (typeof reject === "function")
            this[base + 1] = reject;
        if (typeof progress === "function")
            this[base + 2] = progress;
    }
    this._setLength(index + 1);
    return index;
};

Promise.prototype._setProxyHandlers = function (receiver, promiseSlotValue) {
    var index = this._length();

    if (index >= 131071 - 5) {
        index = 0;
        this._setLength(0);
    }
    if (index === 0) {
        this._promise0 = promiseSlotValue;
        this._receiver0 = receiver;
    } else {
        var base = index * 5 - 5;
        this[base + 3] = promiseSlotValue;
        this[base + 4] = receiver;
    }
    this._setLength(index + 1);
};

Promise.prototype._proxyPromiseArray = function (promiseArray, index) {
    this._setProxyHandlers(promiseArray, index);
};

Promise.prototype._resolveCallback = function(value, shouldBind) {
    if (this._isFollowingOrFulfilledOrRejected()) return;
    if (value === this)
        return this._rejectCallback(makeSelfResolutionError(), false, true);
    var maybePromise = tryConvertToPromise(value, this);
    if (!(maybePromise instanceof Promise)) return this._fulfill(value);

    var propagationFlags = 1 | (shouldBind ? 4 : 0);
    this._propagateFrom(maybePromise, propagationFlags);
    var promise = maybePromise._target();
    if (promise._isPending()) {
        var len = this._length();
        for (var i = 0; i < len; ++i) {
            promise._migrateCallbacks(this, i);
        }
        this._setFollowing();
        this._setLength(0);
        this._setFollowee(promise);
    } else if (promise._isFulfilled()) {
        this._fulfillUnchecked(promise._value());
    } else {
        this._rejectUnchecked(promise._reason(),
            promise._getCarriedStackTrace());
    }
};

Promise.prototype._rejectCallback =
function(reason, synchronous, shouldNotMarkOriginatingFromRejection) {
    if (!shouldNotMarkOriginatingFromRejection) {
        util.markAsOriginatingFromRejection(reason);
    }
    var trace = util.ensureErrorObject(reason);
    var hasStack = trace === reason;
    this._attachExtraTrace(trace, synchronous ? hasStack : false);
    this._reject(reason, hasStack ? undefined : trace);
};

Promise.prototype._resolveFromResolver = function (resolver) {
    var promise = this;
    this._captureStackTrace();
    this._pushContext();
    var synchronous = true;
    var r = tryCatch(resolver)(function(value) {
        if (promise === null) return;
        promise._resolveCallback(value);
        promise = null;
    }, function (reason) {
        if (promise === null) return;
        promise._rejectCallback(reason, synchronous);
        promise = null;
    });
    synchronous = false;
    this._popContext();

    if (r !== undefined && r === errorObj && promise !== null) {
        promise._rejectCallback(r.e, true, true);
        promise = null;
    }
};

Promise.prototype._settlePromiseFromHandler = function (
    handler, receiver, value, promise
) {
    if (promise._isRejected()) return;
    promise._pushContext();
    var x;
    if (receiver === APPLY && !this._isRejected()) {
        x = tryCatch(handler).apply(this._boundTo, value);
    } else {
        x = tryCatch(handler).call(receiver, value);
    }
    promise._popContext();

    if (x === errorObj || x === promise || x === NEXT_FILTER) {
        var err = x === promise ? makeSelfResolutionError() : x.e;
        promise._rejectCallback(err, false, true);
    } else {
        promise._resolveCallback(x);
    }
};

Promise.prototype._target = function() {
    var ret = this;
    while (ret._isFollowing()) ret = ret._followee();
    return ret;
};

Promise.prototype._followee = function() {
    return this._rejectionHandler0;
};

Promise.prototype._setFollowee = function(promise) {
    this._rejectionHandler0 = promise;
};

Promise.prototype._cleanValues = function () {
    if (this._cancellable()) {
        this._cancellationParent = undefined;
    }
};

Promise.prototype._propagateFrom = function (parent, flags) {
    if ((flags & 1) > 0 && parent._cancellable()) {
        this._setCancellable();
        this._cancellationParent = parent;
    }
    if ((flags & 4) > 0 && parent._isBound()) {
        this._setBoundTo(parent._boundTo);
    }
};

Promise.prototype._fulfill = function (value) {
    if (this._isFollowingOrFulfilledOrRejected()) return;
    this._fulfillUnchecked(value);
};

Promise.prototype._reject = function (reason, carriedStackTrace) {
    if (this._isFollowingOrFulfilledOrRejected()) return;
    this._rejectUnchecked(reason, carriedStackTrace);
};

Promise.prototype._settlePromiseAt = function (index) {
    var promise = this._promiseAt(index);
    var isPromise = promise instanceof Promise;

    if (isPromise && promise._isMigrated()) {
        promise._unsetIsMigrated();
        return async.invoke(this._settlePromiseAt, this, index);
    }
    var handler = this._isFulfilled()
        ? this._fulfillmentHandlerAt(index)
        : this._rejectionHandlerAt(index);

    var carriedStackTrace =
        this._isCarryingStackTrace() ? this._getCarriedStackTrace() : undefined;
    var value = this._settledValue;
    var receiver = this._receiverAt(index);


    this._clearCallbackDataAtIndex(index);

    if (typeof handler === "function") {
        if (!isPromise) {
            handler.call(receiver, value, promise);
        } else {
            this._settlePromiseFromHandler(handler, receiver, value, promise);
        }
    } else if (receiver instanceof PromiseArray) {
        if (!receiver._isResolved()) {
            if (this._isFulfilled()) {
                receiver._promiseFulfilled(value, promise);
            }
            else {
                receiver._promiseRejected(value, promise);
            }
        }
    } else if (isPromise) {
        if (this._isFulfilled()) {
            promise._fulfill(value);
        } else {
            promise._reject(value, carriedStackTrace);
        }
    }

    if (index >= 4 && (index & 31) === 4)
        async.invokeLater(this._setLength, this, 0);
};

Promise.prototype._clearCallbackDataAtIndex = function(index) {
    if (index === 0) {
        if (!this._isCarryingStackTrace()) {
            this._fulfillmentHandler0 = undefined;
        }
        this._rejectionHandler0 =
        this._progressHandler0 =
        this._receiver0 =
        this._promise0 = undefined;
    } else {
        var base = index * 5 - 5;
        this[base + 3] =
        this[base + 4] =
        this[base + 0] =
        this[base + 1] =
        this[base + 2] = undefined;
    }
};

Promise.prototype._isSettlePromisesQueued = function () {
    return (this._bitField &
            -1073741824) === -1073741824;
};

Promise.prototype._setSettlePromisesQueued = function () {
    this._bitField = this._bitField | -1073741824;
};

Promise.prototype._unsetSettlePromisesQueued = function () {
    this._bitField = this._bitField & (~-1073741824);
};

Promise.prototype._queueSettlePromises = function() {
    async.settlePromises(this);
    this._setSettlePromisesQueued();
};

Promise.prototype._fulfillUnchecked = function (value) {
    if (value === this) {
        var err = makeSelfResolutionError();
        this._attachExtraTrace(err);
        return this._rejectUnchecked(err, undefined);
    }
    this._setFulfilled();
    this._settledValue = value;
    this._cleanValues();

    if (this._length() > 0) {
        this._queueSettlePromises();
    }
};

Promise.prototype._rejectUncheckedCheckError = function (reason) {
    var trace = util.ensureErrorObject(reason);
    this._rejectUnchecked(reason, trace === reason ? undefined : trace);
};

Promise.prototype._rejectUnchecked = function (reason, trace) {
    if (reason === this) {
        var err = makeSelfResolutionError();
        this._attachExtraTrace(err);
        return this._rejectUnchecked(err);
    }
    this._setRejected();
    this._settledValue = reason;
    this._cleanValues();

    if (this._isFinal()) {
        async.throwLater(function(e) {
            if ("stack" in e) {
                async.invokeFirst(
                    CapturedTrace.unhandledRejection, undefined, e);
            }
            throw e;
        }, trace === undefined ? reason : trace);
        return;
    }

    if (trace !== undefined && trace !== reason) {
        this._setCarriedStackTrace(trace);
    }

    if (this._length() > 0) {
        this._queueSettlePromises();
    } else {
        this._ensurePossibleRejectionHandled();
    }
};

Promise.prototype._settlePromises = function () {
    this._unsetSettlePromisesQueued();
    var len = this._length();
    for (var i = 0; i < len; i++) {
        this._settlePromiseAt(i);
    }
};

Promise._makeSelfResolutionError = makeSelfResolutionError;
_dereq_("./method.js")(Promise, INTERNAL, tryConvertToPromise, apiRejection);
_dereq_("./bind.js")(Promise, INTERNAL, tryConvertToPromise);
_dereq_("./finally.js")(Promise, NEXT_FILTER, tryConvertToPromise);
_dereq_("./direct_resolve.js")(Promise);
_dereq_("./synchronous_inspection.js")(Promise);
_dereq_("./join.js")(Promise, PromiseArray, tryConvertToPromise, INTERNAL);
Promise.Promise = Promise;
_dereq_('./map.js')(Promise, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL);
_dereq_('./using.js')(Promise, apiRejection, tryConvertToPromise, createContext);
_dereq_('./generators.js')(Promise, apiRejection, INTERNAL, tryConvertToPromise);
_dereq_('./nodeify.js')(Promise);
_dereq_('./cancel.js')(Promise);
_dereq_('./promisify.js')(Promise, INTERNAL);
_dereq_('./props.js')(Promise, PromiseArray, tryConvertToPromise, apiRejection);
_dereq_('./race.js')(Promise, INTERNAL, tryConvertToPromise, apiRejection);
_dereq_('./reduce.js')(Promise, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL);
_dereq_('./settle.js')(Promise, PromiseArray);
_dereq_('./call_get.js')(Promise);
_dereq_('./some.js')(Promise, PromiseArray, apiRejection);
_dereq_('./progress.js')(Promise, PromiseArray);
_dereq_('./any.js')(Promise);
_dereq_('./each.js')(Promise, INTERNAL);
_dereq_('./timers.js')(Promise, INTERNAL);
_dereq_('./filter.js')(Promise, INTERNAL);
                                                         
    util.toFastProperties(Promise);                                          
    util.toFastProperties(Promise.prototype);                                
    function fillTypes(value) {                                              
        var p = new Promise(INTERNAL);                                       
        p._fulfillmentHandler0 = value;                                      
        p._rejectionHandler0 = value;                                        
        p._progressHandler0 = value;                                         
        p._promise0 = value;                                                 
        p._receiver0 = value;                                                
        p._settledValue = value;                                             
    }                                                                        
    // Complete slack tracking, opt out of field-type tracking and           
    // stabilize map                                                         
    fillTypes({a: 1});                                                       
    fillTypes({b: 2});                                                       
    fillTypes({c: 3});                                                       
    fillTypes(1);                                                            
    fillTypes(function(){});                                                 
    fillTypes(undefined);                                                    
    fillTypes(false);                                                        
    fillTypes(new Promise(INTERNAL));                                        
    CapturedTrace.setBounds(async.firstLineError, util.lastLineError);       
    return Promise;                                                          

};

},{"./any.js":1,"./async.js":2,"./bind.js":3,"./call_get.js":5,"./cancel.js":6,"./captured_trace.js":7,"./catch_filter.js":8,"./context.js":9,"./debuggability.js":10,"./direct_resolve.js":11,"./each.js":12,"./errors.js":13,"./filter.js":15,"./finally.js":16,"./generators.js":17,"./join.js":18,"./map.js":19,"./method.js":20,"./nodeify.js":21,"./progress.js":22,"./promise_array.js":24,"./promise_resolver.js":25,"./promisify.js":26,"./props.js":27,"./race.js":29,"./reduce.js":30,"./settle.js":32,"./some.js":33,"./synchronous_inspection.js":34,"./thenables.js":35,"./timers.js":36,"./using.js":37,"./util.js":38}],24:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, tryConvertToPromise,
    apiRejection) {
var util = _dereq_("./util.js");
var isArray = util.isArray;

function toResolutionValue(val) {
    switch(val) {
    case -2: return [];
    case -3: return {};
    }
}

function PromiseArray(values) {
    var promise = this._promise = new Promise(INTERNAL);
    var parent;
    if (values instanceof Promise) {
        parent = values;
        promise._propagateFrom(parent, 1 | 4);
    }
    this._values = values;
    this._length = 0;
    this._totalResolved = 0;
    this._init(undefined, -2);
}
PromiseArray.prototype.length = function () {
    return this._length;
};

PromiseArray.prototype.promise = function () {
    return this._promise;
};

PromiseArray.prototype._init = function init(_, resolveValueIfEmpty) {
    var values = tryConvertToPromise(this._values, this._promise);
    if (values instanceof Promise) {
        values = values._target();
        this._values = values;
        if (values._isFulfilled()) {
            values = values._value();
            if (!isArray(values)) {
                var err = new Promise.TypeError("expecting an array, a promise or a thenable\u000a\u000a    See http://goo.gl/s8MMhc\u000a");
                this.__hardReject__(err);
                return;
            }
        } else if (values._isPending()) {
            values._then(
                init,
                this._reject,
                undefined,
                this,
                resolveValueIfEmpty
           );
            return;
        } else {
            this._reject(values._reason());
            return;
        }
    } else if (!isArray(values)) {
        this._promise._reject(apiRejection("expecting an array, a promise or a thenable\u000a\u000a    See http://goo.gl/s8MMhc\u000a")._reason());
        return;
    }

    if (values.length === 0) {
        if (resolveValueIfEmpty === -5) {
            this._resolveEmptyArray();
        }
        else {
            this._resolve(toResolutionValue(resolveValueIfEmpty));
        }
        return;
    }
    var len = this.getActualLength(values.length);
    this._length = len;
    this._values = this.shouldCopyValues() ? new Array(len) : this._values;
    var promise = this._promise;
    for (var i = 0; i < len; ++i) {
        var isResolved = this._isResolved();
        var maybePromise = tryConvertToPromise(values[i], promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            if (isResolved) {
                maybePromise._unsetRejectionIsUnhandled();
            } else if (maybePromise._isPending()) {
                maybePromise._proxyPromiseArray(this, i);
            } else if (maybePromise._isFulfilled()) {
                this._promiseFulfilled(maybePromise._value(), i);
            } else {
                this._promiseRejected(maybePromise._reason(), i);
            }
        } else if (!isResolved) {
            this._promiseFulfilled(maybePromise, i);
        }
    }
};

PromiseArray.prototype._isResolved = function () {
    return this._values === null;
};

PromiseArray.prototype._resolve = function (value) {
    this._values = null;
    this._promise._fulfill(value);
};

PromiseArray.prototype.__hardReject__ =
PromiseArray.prototype._reject = function (reason) {
    this._values = null;
    this._promise._rejectCallback(reason, false, true);
};

PromiseArray.prototype._promiseProgressed = function (progressValue, index) {
    this._promise._progress({
        index: index,
        value: progressValue
    });
};


PromiseArray.prototype._promiseFulfilled = function (value, index) {
    this._values[index] = value;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        this._resolve(this._values);
    }
};

PromiseArray.prototype._promiseRejected = function (reason, index) {
    this._totalResolved++;
    this._reject(reason);
};

PromiseArray.prototype.shouldCopyValues = function () {
    return true;
};

PromiseArray.prototype.getActualLength = function (len) {
    return len;
};

return PromiseArray;
};

},{"./util.js":38}],25:[function(_dereq_,module,exports){
"use strict";
var util = _dereq_("./util.js");
var maybeWrapAsError = util.maybeWrapAsError;
var errors = _dereq_("./errors.js");
var TimeoutError = errors.TimeoutError;
var OperationalError = errors.OperationalError;
var haveGetters = util.haveGetters;
var es5 = _dereq_("./es5.js");

function isUntypedError(obj) {
    return obj instanceof Error &&
        es5.getPrototypeOf(obj) === Error.prototype;
}

var rErrorKey = /^(?:name|message|stack|cause)$/;
function wrapAsOperationalError(obj) {
    var ret;
    if (isUntypedError(obj)) {
        ret = new OperationalError(obj);
        ret.name = obj.name;
        ret.message = obj.message;
        ret.stack = obj.stack;
        var keys = es5.keys(obj);
        for (var i = 0; i < keys.length; ++i) {
            var key = keys[i];
            if (!rErrorKey.test(key)) {
                ret[key] = obj[key];
            }
        }
        return ret;
    }
    util.markAsOriginatingFromRejection(obj);
    return obj;
}

function nodebackForPromise(promise) {
    return function(err, value) {
        if (promise === null) return;

        if (err) {
            var wrapped = wrapAsOperationalError(maybeWrapAsError(err));
            promise._attachExtraTrace(wrapped);
            promise._reject(wrapped);
        } else if (arguments.length > 2) {
            var $_len = arguments.length;var args = new Array($_len - 1); for(var $_i = 1; $_i < $_len; ++$_i) {args[$_i - 1] = arguments[$_i];}
            promise._fulfill(args);
        } else {
            promise._fulfill(value);
        }

        promise = null;
    };
}


var PromiseResolver;
if (!haveGetters) {
    PromiseResolver = function (promise) {
        this.promise = promise;
        this.asCallback = nodebackForPromise(promise);
        this.callback = this.asCallback;
    };
}
else {
    PromiseResolver = function (promise) {
        this.promise = promise;
    };
}
if (haveGetters) {
    var prop = {
        get: function() {
            return nodebackForPromise(this.promise);
        }
    };
    es5.defineProperty(PromiseResolver.prototype, "asCallback", prop);
    es5.defineProperty(PromiseResolver.prototype, "callback", prop);
}

PromiseResolver._nodebackForPromise = nodebackForPromise;

PromiseResolver.prototype.toString = function () {
    return "[object PromiseResolver]";
};

PromiseResolver.prototype.resolve =
PromiseResolver.prototype.fulfill = function (value) {
    if (!(this instanceof PromiseResolver)) {
        throw new TypeError("Illegal invocation, resolver resolve/reject must be called within a resolver context. Consider using the promise constructor instead.\u000a\u000a    See http://goo.gl/sdkXL9\u000a");
    }
    this.promise._resolveCallback(value);
};

PromiseResolver.prototype.reject = function (reason) {
    if (!(this instanceof PromiseResolver)) {
        throw new TypeError("Illegal invocation, resolver resolve/reject must be called within a resolver context. Consider using the promise constructor instead.\u000a\u000a    See http://goo.gl/sdkXL9\u000a");
    }
    this.promise._rejectCallback(reason);
};

PromiseResolver.prototype.progress = function (value) {
    if (!(this instanceof PromiseResolver)) {
        throw new TypeError("Illegal invocation, resolver resolve/reject must be called within a resolver context. Consider using the promise constructor instead.\u000a\u000a    See http://goo.gl/sdkXL9\u000a");
    }
    this.promise._progress(value);
};

PromiseResolver.prototype.cancel = function (err) {
    this.promise.cancel(err);
};

PromiseResolver.prototype.timeout = function () {
    this.reject(new TimeoutError("timeout"));
};

PromiseResolver.prototype.isResolved = function () {
    return this.promise.isResolved();
};

PromiseResolver.prototype.toJSON = function () {
    return this.promise.toJSON();
};

module.exports = PromiseResolver;

},{"./errors.js":13,"./es5.js":14,"./util.js":38}],26:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var THIS = {};
var util = _dereq_("./util.js");
var nodebackForPromise = _dereq_("./promise_resolver.js")
    ._nodebackForPromise;
var withAppended = util.withAppended;
var maybeWrapAsError = util.maybeWrapAsError;
var canEvaluate = util.canEvaluate;
var TypeError = _dereq_("./errors").TypeError;
var defaultSuffix = "Async";
var defaultPromisified = {__isPromisified__: true};
var noCopyPropsPattern =
    /^(?:length|name|arguments|caller|prototype|__isPromisified__)$/;
var defaultFilter = function(name, func) {
    return util.isIdentifier(name) &&
        name.charAt(0) !== "_" &&
        !util.isClass(func);
};

function propsFilter(key) {
    return !noCopyPropsPattern.test(key);
}

function isPromisified(fn) {
    try {
        return fn.__isPromisified__ === true;
    }
    catch (e) {
        return false;
    }
}

function hasPromisified(obj, key, suffix) {
    var val = util.getDataPropertyOrDefault(obj, key + suffix,
                                            defaultPromisified);
    return val ? isPromisified(val) : false;
}
function checkValid(ret, suffix, suffixRegexp) {
    for (var i = 0; i < ret.length; i += 2) {
        var key = ret[i];
        if (suffixRegexp.test(key)) {
            var keyWithoutAsyncSuffix = key.replace(suffixRegexp, "");
            for (var j = 0; j < ret.length; j += 2) {
                if (ret[j] === keyWithoutAsyncSuffix) {
                    throw new TypeError("Cannot promisify an API that has normal methods with '%s'-suffix\u000a\u000a    See http://goo.gl/iWrZbw\u000a"
                        .replace("%s", suffix));
                }
            }
        }
    }
}

function promisifiableMethods(obj, suffix, suffixRegexp, filter) {
    var keys = util.inheritedDataKeys(obj);
    var ret = [];
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        var value = obj[key];
        var passesDefaultFilter = filter === defaultFilter
            ? true : defaultFilter(key, value, obj);
        if (typeof value === "function" &&
            !isPromisified(value) &&
            !hasPromisified(obj, key, suffix) &&
            filter(key, value, obj, passesDefaultFilter)) {
            ret.push(key, value);
        }
    }
    checkValid(ret, suffix, suffixRegexp);
    return ret;
}

var escapeIdentRegex = function(str) {
    return str.replace(/([$])/, "\\$");
};

var makeNodePromisifiedEval;
if (!true) {
var switchCaseArgumentOrder = function(likelyArgumentCount) {
    var ret = [likelyArgumentCount];
    var min = Math.max(0, likelyArgumentCount - 1 - 3);
    for(var i = likelyArgumentCount - 1; i >= min; --i) {
        ret.push(i);
    }
    for(var i = likelyArgumentCount + 1; i <= 3; ++i) {
        ret.push(i);
    }
    return ret;
};

var argumentSequence = function(argumentCount) {
    return util.filledRange(argumentCount, "_arg", "");
};

var parameterDeclaration = function(parameterCount) {
    return util.filledRange(
        Math.max(parameterCount, 3), "_arg", "");
};

var parameterCount = function(fn) {
    if (typeof fn.length === "number") {
        return Math.max(Math.min(fn.length, 1023 + 1), 0);
    }
    return 0;
};

makeNodePromisifiedEval =
function(callback, receiver, originalName, fn) {
    var newParameterCount = Math.max(0, parameterCount(fn) - 1);
    var argumentOrder = switchCaseArgumentOrder(newParameterCount);
    var shouldProxyThis = typeof callback === "string" || receiver === THIS;

    function generateCallForArgumentCount(count) {
        var args = argumentSequence(count).join(", ");
        var comma = count > 0 ? ", " : "";
        var ret;
        if (shouldProxyThis) {
            ret = "ret = callback.call(this, {{args}}, nodeback); break;\n";
        } else {
            ret = receiver === undefined
                ? "ret = callback({{args}}, nodeback); break;\n"
                : "ret = callback.call(receiver, {{args}}, nodeback); break;\n";
        }
        return ret.replace("{{args}}", args).replace(", ", comma);
    }

    function generateArgumentSwitchCase() {
        var ret = "";
        for (var i = 0; i < argumentOrder.length; ++i) {
            ret += "case " + argumentOrder[i] +":" +
                generateCallForArgumentCount(argumentOrder[i]);
        }

        ret += "                                                             \n\
        default:                                                             \n\
            var args = new Array(len + 1);                                   \n\
            var i = 0;                                                       \n\
            for (var i = 0; i < len; ++i) {                                  \n\
               args[i] = arguments[i];                                       \n\
            }                                                                \n\
            args[i] = nodeback;                                              \n\
            [CodeForCall]                                                    \n\
            break;                                                           \n\
        ".replace("[CodeForCall]", (shouldProxyThis
                                ? "ret = callback.apply(this, args);\n"
                                : "ret = callback.apply(receiver, args);\n"));
        return ret;
    }

    var getFunctionCode = typeof callback === "string"
                                ? ("this != null ? this['"+callback+"'] : fn")
                                : "fn";

    return new Function("Promise",
                        "fn",
                        "receiver",
                        "withAppended",
                        "maybeWrapAsError",
                        "nodebackForPromise",
                        "tryCatch",
                        "errorObj",
                        "INTERNAL","'use strict';                            \n\
        var ret = function (Parameters) {                                    \n\
            'use strict';                                                    \n\
            var len = arguments.length;                                      \n\
            var promise = new Promise(INTERNAL);                             \n\
            promise._captureStackTrace();                                    \n\
            var nodeback = nodebackForPromise(promise);                      \n\
            var ret;                                                         \n\
            var callback = tryCatch([GetFunctionCode]);                      \n\
            switch(len) {                                                    \n\
                [CodeForSwitchCase]                                          \n\
            }                                                                \n\
            if (ret === errorObj) {                                          \n\
                promise._rejectCallback(maybeWrapAsError(ret.e), true, true);\n\
            }                                                                \n\
            return promise;                                                  \n\
        };                                                                   \n\
        ret.__isPromisified__ = true;                                        \n\
        return ret;                                                          \n\
        "
        .replace("Parameters", parameterDeclaration(newParameterCount))
        .replace("[CodeForSwitchCase]", generateArgumentSwitchCase())
        .replace("[GetFunctionCode]", getFunctionCode))(
            Promise,
            fn,
            receiver,
            withAppended,
            maybeWrapAsError,
            nodebackForPromise,
            util.tryCatch,
            util.errorObj,
            INTERNAL
        );
};
}

function makeNodePromisifiedClosure(callback, receiver, _, fn) {
    var defaultThis = (function() {return this;})();
    var method = callback;
    if (typeof method === "string") {
        callback = fn;
    }
    function promisified() {
        var _receiver = receiver;
        if (receiver === THIS) _receiver = this;
        var promise = new Promise(INTERNAL);
        promise._captureStackTrace();
        var cb = typeof method === "string" && this !== defaultThis
            ? this[method] : callback;
        var fn = nodebackForPromise(promise);
        try {
            cb.apply(_receiver, withAppended(arguments, fn));
        } catch(e) {
            promise._rejectCallback(maybeWrapAsError(e), true, true);
        }
        return promise;
    }
    promisified.__isPromisified__ = true;
    return promisified;
}

var makeNodePromisified = canEvaluate
    ? makeNodePromisifiedEval
    : makeNodePromisifiedClosure;

function promisifyAll(obj, suffix, filter, promisifier) {
    var suffixRegexp = new RegExp(escapeIdentRegex(suffix) + "$");
    var methods =
        promisifiableMethods(obj, suffix, suffixRegexp, filter);

    for (var i = 0, len = methods.length; i < len; i+= 2) {
        var key = methods[i];
        var fn = methods[i+1];
        var promisifiedKey = key + suffix;
        obj[promisifiedKey] = promisifier === makeNodePromisified
                ? makeNodePromisified(key, THIS, key, fn, suffix)
                : promisifier(fn, function() {
                    return makeNodePromisified(key, THIS, key, fn, suffix);
                });
    }
    util.toFastProperties(obj);
    return obj;
}

function promisify(callback, receiver) {
    return makeNodePromisified(callback, receiver, undefined, callback);
}

Promise.promisify = function (fn, receiver) {
    if (typeof fn !== "function") {
        throw new TypeError("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    }
    if (isPromisified(fn)) {
        return fn;
    }
    var ret = promisify(fn, arguments.length < 2 ? THIS : receiver);
    util.copyDescriptors(fn, ret, propsFilter);
    return ret;
};

Promise.promisifyAll = function (target, options) {
    if (typeof target !== "function" && typeof target !== "object") {
        throw new TypeError("the target of promisifyAll must be an object or a function\u000a\u000a    See http://goo.gl/9ITlV0\u000a");
    }
    options = Object(options);
    var suffix = options.suffix;
    if (typeof suffix !== "string") suffix = defaultSuffix;
    var filter = options.filter;
    if (typeof filter !== "function") filter = defaultFilter;
    var promisifier = options.promisifier;
    if (typeof promisifier !== "function") promisifier = makeNodePromisified;

    if (!util.isIdentifier(suffix)) {
        throw new RangeError("suffix must be a valid identifier\u000a\u000a    See http://goo.gl/8FZo5V\u000a");
    }

    var keys = util.inheritedDataKeys(target);
    for (var i = 0; i < keys.length; ++i) {
        var value = target[keys[i]];
        if (keys[i] !== "constructor" &&
            util.isClass(value)) {
            promisifyAll(value.prototype, suffix, filter, promisifier);
            promisifyAll(value, suffix, filter, promisifier);
        }
    }

    return promisifyAll(target, suffix, filter, promisifier);
};
};


},{"./errors":13,"./promise_resolver.js":25,"./util.js":38}],27:[function(_dereq_,module,exports){
"use strict";
module.exports = function(
    Promise, PromiseArray, tryConvertToPromise, apiRejection) {
var util = _dereq_("./util.js");
var isObject = util.isObject;
var es5 = _dereq_("./es5.js");

function PropertiesPromiseArray(obj) {
    var keys = es5.keys(obj);
    var len = keys.length;
    var values = new Array(len * 2);
    for (var i = 0; i < len; ++i) {
        var key = keys[i];
        values[i] = obj[key];
        values[i + len] = key;
    }
    this.constructor$(values);
}
util.inherits(PropertiesPromiseArray, PromiseArray);

PropertiesPromiseArray.prototype._init = function () {
    this._init$(undefined, -3) ;
};

PropertiesPromiseArray.prototype._promiseFulfilled = function (value, index) {
    this._values[index] = value;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        var val = {};
        var keyOffset = this.length();
        for (var i = 0, len = this.length(); i < len; ++i) {
            val[this._values[i + keyOffset]] = this._values[i];
        }
        this._resolve(val);
    }
};

PropertiesPromiseArray.prototype._promiseProgressed = function (value, index) {
    this._promise._progress({
        key: this._values[index + this.length()],
        value: value
    });
};

PropertiesPromiseArray.prototype.shouldCopyValues = function () {
    return false;
};

PropertiesPromiseArray.prototype.getActualLength = function (len) {
    return len >> 1;
};

function props(promises) {
    var ret;
    var castValue = tryConvertToPromise(promises);

    if (!isObject(castValue)) {
        return apiRejection("cannot await properties of a non-object\u000a\u000a    See http://goo.gl/OsFKC8\u000a");
    } else if (castValue instanceof Promise) {
        ret = castValue._then(
            Promise.props, undefined, undefined, undefined, undefined);
    } else {
        ret = new PropertiesPromiseArray(castValue).promise();
    }

    if (castValue instanceof Promise) {
        ret._propagateFrom(castValue, 4);
    }
    return ret;
}

Promise.prototype.props = function () {
    return props(this);
};

Promise.props = function (promises) {
    return props(promises);
};
};

},{"./es5.js":14,"./util.js":38}],28:[function(_dereq_,module,exports){
"use strict";
function arrayMove(src, srcIndex, dst, dstIndex, len) {
    for (var j = 0; j < len; ++j) {
        dst[j + dstIndex] = src[j + srcIndex];
        src[j + srcIndex] = void 0;
    }
}

function Queue(capacity) {
    this._capacity = capacity;
    this._length = 0;
    this._front = 0;
}

Queue.prototype._willBeOverCapacity = function (size) {
    return this._capacity < size;
};

Queue.prototype._pushOne = function (arg) {
    var length = this.length();
    this._checkCapacity(length + 1);
    var i = (this._front + length) & (this._capacity - 1);
    this[i] = arg;
    this._length = length + 1;
};

Queue.prototype._unshiftOne = function(value) {
    var capacity = this._capacity;
    this._checkCapacity(this.length() + 1);
    var front = this._front;
    var i = (((( front - 1 ) &
                    ( capacity - 1) ) ^ capacity ) - capacity );
    this[i] = value;
    this._front = i;
    this._length = this.length() + 1;
};

Queue.prototype.unshift = function(fn, receiver, arg) {
    this._unshiftOne(arg);
    this._unshiftOne(receiver);
    this._unshiftOne(fn);
};

Queue.prototype.push = function (fn, receiver, arg) {
    var length = this.length() + 3;
    if (this._willBeOverCapacity(length)) {
        this._pushOne(fn);
        this._pushOne(receiver);
        this._pushOne(arg);
        return;
    }
    var j = this._front + length - 3;
    this._checkCapacity(length);
    var wrapMask = this._capacity - 1;
    this[(j + 0) & wrapMask] = fn;
    this[(j + 1) & wrapMask] = receiver;
    this[(j + 2) & wrapMask] = arg;
    this._length = length;
};

Queue.prototype.shift = function () {
    var front = this._front,
        ret = this[front];

    this[front] = undefined;
    this._front = (front + 1) & (this._capacity - 1);
    this._length--;
    return ret;
};

Queue.prototype.length = function () {
    return this._length;
};

Queue.prototype._checkCapacity = function (size) {
    if (this._capacity < size) {
        this._resizeTo(this._capacity << 1);
    }
};

Queue.prototype._resizeTo = function (capacity) {
    var oldCapacity = this._capacity;
    this._capacity = capacity;
    var front = this._front;
    var length = this._length;
    var moveItemsCount = (front + length) & (oldCapacity - 1);
    arrayMove(this, 0, this, oldCapacity, moveItemsCount);
};

module.exports = Queue;

},{}],29:[function(_dereq_,module,exports){
"use strict";
module.exports = function(
    Promise, INTERNAL, tryConvertToPromise, apiRejection) {
var isArray = _dereq_("./util.js").isArray;

var raceLater = function (promise) {
    return promise.then(function(array) {
        return race(array, promise);
    });
};

function race(promises, parent) {
    var maybePromise = tryConvertToPromise(promises);

    if (maybePromise instanceof Promise) {
        return raceLater(maybePromise);
    } else if (!isArray(promises)) {
        return apiRejection("expecting an array, a promise or a thenable\u000a\u000a    See http://goo.gl/s8MMhc\u000a");
    }

    var ret = new Promise(INTERNAL);
    if (parent !== undefined) {
        ret._propagateFrom(parent, 4 | 1);
    }
    var fulfill = ret._fulfill;
    var reject = ret._reject;
    for (var i = 0, len = promises.length; i < len; ++i) {
        var val = promises[i];

        if (val === undefined && !(i in promises)) {
            continue;
        }

        Promise.cast(val)._then(fulfill, reject, undefined, ret, null);
    }
    return ret;
}

Promise.race = function (promises) {
    return race(promises, undefined);
};

Promise.prototype.race = function () {
    return race(this, undefined);
};

};

},{"./util.js":38}],30:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          PromiseArray,
                          apiRejection,
                          tryConvertToPromise,
                          INTERNAL) {
var async = _dereq_("./async.js");
var util = _dereq_("./util.js");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
function ReductionPromiseArray(promises, fn, accum, _each) {
    this.constructor$(promises);
    this._promise._captureStackTrace();
    this._preservedValues = _each === INTERNAL ? [] : null;
    this._zerothIsAccum = (accum === undefined);
    this._gotAccum = false;
    this._reducingIndex = (this._zerothIsAccum ? 1 : 0);
    this._valuesPhase = undefined;
    var maybePromise = tryConvertToPromise(accum, this._promise);
    var rejected = false;
    var isPromise = maybePromise instanceof Promise;
    if (isPromise) {
        maybePromise = maybePromise._target();
        if (maybePromise._isPending()) {
            maybePromise._proxyPromiseArray(this, -1);
        } else if (maybePromise._isFulfilled()) {
            accum = maybePromise._value();
            this._gotAccum = true;
        } else {
            this._reject(maybePromise._reason());
            rejected = true;
        }
    }
    if (!(isPromise || this._zerothIsAccum)) this._gotAccum = true;
    this._callback = fn;
    this._accum = accum;
    if (!rejected) async.invoke(init, this, undefined);
}
function init() {
    this._init$(undefined, -5);
}
util.inherits(ReductionPromiseArray, PromiseArray);

ReductionPromiseArray.prototype._init = function () {};

ReductionPromiseArray.prototype._resolveEmptyArray = function () {
    if (this._gotAccum || this._zerothIsAccum) {
        this._resolve(this._preservedValues !== null
                        ? [] : this._accum);
    }
};

ReductionPromiseArray.prototype._promiseFulfilled = function (value, index) {
    var values = this._values;
    values[index] = value;
    var length = this.length();
    var preservedValues = this._preservedValues;
    var isEach = preservedValues !== null;
    var gotAccum = this._gotAccum;
    var valuesPhase = this._valuesPhase;
    var valuesPhaseIndex;
    if (!valuesPhase) {
        valuesPhase = this._valuesPhase = new Array(length);
        for (valuesPhaseIndex=0; valuesPhaseIndex<length; ++valuesPhaseIndex) {
            valuesPhase[valuesPhaseIndex] = 0;
        }
    }
    valuesPhaseIndex = valuesPhase[index];

    if (index === 0 && this._zerothIsAccum) {
        this._accum = value;
        this._gotAccum = gotAccum = true;
        valuesPhase[index] = ((valuesPhaseIndex === 0)
            ? 1 : 2);
    } else if (index === -1) {
        this._accum = value;
        this._gotAccum = gotAccum = true;
    } else {
        if (valuesPhaseIndex === 0) {
            valuesPhase[index] = 1;
        } else {
            valuesPhase[index] = 2;
            this._accum = value;
        }
    }
    if (!gotAccum) return;

    var callback = this._callback;
    var receiver = this._promise._boundTo;
    var ret;

    for (var i = this._reducingIndex; i < length; ++i) {
        valuesPhaseIndex = valuesPhase[i];
        if (valuesPhaseIndex === 2) {
            this._reducingIndex = i + 1;
            continue;
        }
        if (valuesPhaseIndex !== 1) return;
        value = values[i];
        this._promise._pushContext();
        if (isEach) {
            preservedValues.push(value);
            ret = tryCatch(callback).call(receiver, value, i, length);
        }
        else {
            ret = tryCatch(callback)
                .call(receiver, this._accum, value, i, length);
        }
        this._promise._popContext();

        if (ret === errorObj) return this._reject(ret.e);

        var maybePromise = tryConvertToPromise(ret, this._promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            if (maybePromise._isPending()) {
                valuesPhase[i] = 4;
                return maybePromise._proxyPromiseArray(this, i);
            } else if (maybePromise._isFulfilled()) {
                ret = maybePromise._value();
            } else {
                return this._reject(maybePromise._reason());
            }
        }

        this._reducingIndex = i + 1;
        this._accum = ret;
    }

    this._resolve(isEach ? preservedValues : this._accum);
};

function reduce(promises, fn, initialValue, _each) {
    if (typeof fn !== "function") return apiRejection("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    var array = new ReductionPromiseArray(promises, fn, initialValue, _each);
    return array.promise();
}

Promise.prototype.reduce = function (fn, initialValue) {
    return reduce(this, fn, initialValue, null);
};

Promise.reduce = function (promises, fn, initialValue, _each) {
    return reduce(promises, fn, initialValue, _each);
};
};

},{"./async.js":2,"./util.js":38}],31:[function(_dereq_,module,exports){
"use strict";
var schedule;
if (_dereq_("./util.js").isNode) {
    schedule = process.nextTick;
} else if (typeof MutationObserver !== "undefined") {
    schedule = function(fn) {
        var div = document.createElement("div");
        var observer = new MutationObserver(fn);
        observer.observe(div, {attributes: true});
        return function() { div.classList.toggle("foo"); };
    };
    schedule.isStatic = true;
} else if (typeof setTimeout !== "undefined") {
    schedule = function (fn) {
        setTimeout(fn, 0);
    };
} else {
    schedule = function() {
        throw new Error("No async scheduler available\u000a\u000a    See http://goo.gl/m3OTXk\u000a");
    };
}
module.exports = schedule;

},{"./util.js":38}],32:[function(_dereq_,module,exports){
"use strict";
module.exports =
    function(Promise, PromiseArray) {
var PromiseInspection = Promise.PromiseInspection;
var util = _dereq_("./util.js");

function SettledPromiseArray(values) {
    this.constructor$(values);
}
util.inherits(SettledPromiseArray, PromiseArray);

SettledPromiseArray.prototype._promiseResolved = function (index, inspection) {
    this._values[index] = inspection;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        this._resolve(this._values);
    }
};

SettledPromiseArray.prototype._promiseFulfilled = function (value, index) {
    var ret = new PromiseInspection();
    ret._bitField = 268435456;
    ret._settledValue = value;
    this._promiseResolved(index, ret);
};
SettledPromiseArray.prototype._promiseRejected = function (reason, index) {
    var ret = new PromiseInspection();
    ret._bitField = 134217728;
    ret._settledValue = reason;
    this._promiseResolved(index, ret);
};

Promise.settle = function (promises) {
    return new SettledPromiseArray(promises).promise();
};

Promise.prototype.settle = function () {
    return new SettledPromiseArray(this).promise();
};
};

},{"./util.js":38}],33:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, PromiseArray, apiRejection) {
var util = _dereq_("./util.js");
var RangeError = _dereq_("./errors.js").RangeError;
var AggregateError = _dereq_("./errors.js").AggregateError;
var isArray = util.isArray;


function SomePromiseArray(values) {
    this.constructor$(values);
    this._howMany = 0;
    this._unwrap = false;
    this._initialized = false;
}
util.inherits(SomePromiseArray, PromiseArray);

SomePromiseArray.prototype._init = function () {
    if (!this._initialized) {
        return;
    }
    if (this._howMany === 0) {
        this._resolve([]);
        return;
    }
    this._init$(undefined, -5);
    var isArrayResolved = isArray(this._values);
    if (!this._isResolved() &&
        isArrayResolved &&
        this._howMany > this._canPossiblyFulfill()) {
        this._reject(this._getRangeError(this.length()));
    }
};

SomePromiseArray.prototype.init = function () {
    this._initialized = true;
    this._init();
};

SomePromiseArray.prototype.setUnwrap = function () {
    this._unwrap = true;
};

SomePromiseArray.prototype.howMany = function () {
    return this._howMany;
};

SomePromiseArray.prototype.setHowMany = function (count) {
    this._howMany = count;
};

SomePromiseArray.prototype._promiseFulfilled = function (value) {
    this._addFulfilled(value);
    if (this._fulfilled() === this.howMany()) {
        this._values.length = this.howMany();
        if (this.howMany() === 1 && this._unwrap) {
            this._resolve(this._values[0]);
        } else {
            this._resolve(this._values);
        }
    }

};
SomePromiseArray.prototype._promiseRejected = function (reason) {
    this._addRejected(reason);
    if (this.howMany() > this._canPossiblyFulfill()) {
        var e = new AggregateError();
        for (var i = this.length(); i < this._values.length; ++i) {
            e.push(this._values[i]);
        }
        this._reject(e);
    }
};

SomePromiseArray.prototype._fulfilled = function () {
    return this._totalResolved;
};

SomePromiseArray.prototype._rejected = function () {
    return this._values.length - this.length();
};

SomePromiseArray.prototype._addRejected = function (reason) {
    this._values.push(reason);
};

SomePromiseArray.prototype._addFulfilled = function (value) {
    this._values[this._totalResolved++] = value;
};

SomePromiseArray.prototype._canPossiblyFulfill = function () {
    return this.length() - this._rejected();
};

SomePromiseArray.prototype._getRangeError = function (count) {
    var message = "Input array must contain at least " +
            this._howMany + " items but contains only " + count + " items";
    return new RangeError(message);
};

SomePromiseArray.prototype._resolveEmptyArray = function () {
    this._reject(this._getRangeError(0));
};

function some(promises, howMany) {
    if ((howMany | 0) !== howMany || howMany < 0) {
        return apiRejection("expecting a positive integer\u000a\u000a    See http://goo.gl/1wAmHx\u000a");
    }
    var ret = new SomePromiseArray(promises);
    var promise = ret.promise();
    ret.setHowMany(howMany);
    ret.init();
    return promise;
}

Promise.some = function (promises, howMany) {
    return some(promises, howMany);
};

Promise.prototype.some = function (howMany) {
    return some(this, howMany);
};

Promise._SomePromiseArray = SomePromiseArray;
};

},{"./errors.js":13,"./util.js":38}],34:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
function PromiseInspection(promise) {
    if (promise !== undefined) {
        promise = promise._target();
        this._bitField = promise._bitField;
        this._settledValue = promise._settledValue;
    }
    else {
        this._bitField = 0;
        this._settledValue = undefined;
    }
}

PromiseInspection.prototype.value = function () {
    if (!this.isFulfilled()) {
        throw new TypeError("cannot get fulfillment value of a non-fulfilled promise\u000a\u000a    See http://goo.gl/hc1DLj\u000a");
    }
    return this._settledValue;
};

PromiseInspection.prototype.error =
PromiseInspection.prototype.reason = function () {
    if (!this.isRejected()) {
        throw new TypeError("cannot get rejection reason of a non-rejected promise\u000a\u000a    See http://goo.gl/hPuiwB\u000a");
    }
    return this._settledValue;
};

PromiseInspection.prototype.isFulfilled =
Promise.prototype._isFulfilled = function () {
    return (this._bitField & 268435456) > 0;
};

PromiseInspection.prototype.isRejected =
Promise.prototype._isRejected = function () {
    return (this._bitField & 134217728) > 0;
};

PromiseInspection.prototype.isPending =
Promise.prototype._isPending = function () {
    return (this._bitField & 402653184) === 0;
};

PromiseInspection.prototype.isResolved =
Promise.prototype._isResolved = function () {
    return (this._bitField & 402653184) > 0;
};

Promise.prototype.isPending = function() {
    return this._target()._isPending();
};

Promise.prototype.isRejected = function() {
    return this._target()._isRejected();
};

Promise.prototype.isFulfilled = function() {
    return this._target()._isFulfilled();
};

Promise.prototype.isResolved = function() {
    return this._target()._isResolved();
};

Promise.prototype._value = function() {
    return this._settledValue;
};

Promise.prototype._reason = function() {
    this._unsetRejectionIsUnhandled();
    return this._settledValue;
};

Promise.prototype.value = function() {
    var target = this._target();
    if (!target.isFulfilled()) {
        throw new TypeError("cannot get fulfillment value of a non-fulfilled promise\u000a\u000a    See http://goo.gl/hc1DLj\u000a");
    }
    return target._settledValue;
};

Promise.prototype.reason = function() {
    var target = this._target();
    if (!target.isRejected()) {
        throw new TypeError("cannot get rejection reason of a non-rejected promise\u000a\u000a    See http://goo.gl/hPuiwB\u000a");
    }
    target._unsetRejectionIsUnhandled();
    return target._settledValue;
};


Promise.PromiseInspection = PromiseInspection;
};

},{}],35:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var util = _dereq_("./util.js");
var errorObj = util.errorObj;
var isObject = util.isObject;

function tryConvertToPromise(obj, context) {
    if (isObject(obj)) {
        if (obj instanceof Promise) {
            return obj;
        }
        else if (isAnyBluebirdPromise(obj)) {
            var ret = new Promise(INTERNAL);
            obj._then(
                ret._fulfillUnchecked,
                ret._rejectUncheckedCheckError,
                ret._progressUnchecked,
                ret,
                null
            );
            return ret;
        }
        var then = util.tryCatch(getThen)(obj);
        if (then === errorObj) {
            if (context) context._pushContext();
            var ret = Promise.reject(then.e);
            if (context) context._popContext();
            return ret;
        } else if (typeof then === "function") {
            return doThenable(obj, then, context);
        }
    }
    return obj;
}

function getThen(obj) {
    return obj.then;
}

var hasProp = {}.hasOwnProperty;
function isAnyBluebirdPromise(obj) {
    return hasProp.call(obj, "_promise0");
}

function doThenable(x, then, context) {
    var promise = new Promise(INTERNAL);
    var ret = promise;
    if (context) context._pushContext();
    promise._captureStackTrace();
    if (context) context._popContext();
    var synchronous = true;
    var result = util.tryCatch(then).call(x,
                                        resolveFromThenable,
                                        rejectFromThenable,
                                        progressFromThenable);
    synchronous = false;
    if (promise && result === errorObj) {
        promise._rejectCallback(result.e, true, true);
        promise = null;
    }

    function resolveFromThenable(value) {
        if (!promise) return;
        if (x === value) {
            promise._rejectCallback(
                Promise._makeSelfResolutionError(), false, true);
        } else {
            promise._resolveCallback(value);
        }
        promise = null;
    }

    function rejectFromThenable(reason) {
        if (!promise) return;
        promise._rejectCallback(reason, synchronous, true);
        promise = null;
    }

    function progressFromThenable(value) {
        if (!promise) return;
        if (typeof promise._progress === "function") {
            promise._progress(value);
        }
    }
    return ret;
}

return tryConvertToPromise;
};

},{"./util.js":38}],36:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var util = _dereq_("./util.js");
var TimeoutError = Promise.TimeoutError;

var afterTimeout = function (promise, message) {
    if (!promise.isPending()) return;
    if (typeof message !== "string") {
        message = "operation timed out";
    }
    var err = new TimeoutError(message);
    util.markAsOriginatingFromRejection(err);
    promise._attachExtraTrace(err);
    promise._cancel(err);
};

var afterValue = function(value) { return delay(+this).thenReturn(value); };
var delay = Promise.delay = function (value, ms) {
    if (ms === undefined) {
        ms = value;
        value = undefined;
        var ret = new Promise(INTERNAL);
        setTimeout(function() { ret._fulfill(); }, ms);
        return ret;
    }
    ms = +ms;
    return Promise.resolve(value)._then(afterValue, null, null, ms, undefined);
};

Promise.prototype.delay = function (ms) {
    return delay(this, ms);
};

function successClear(value) {
    var handle = this;
    if (handle instanceof Number) handle = +handle;
    clearTimeout(handle);
    return value;
}

function failureClear(reason) {
    var handle = this;
    if (handle instanceof Number) handle = +handle;
    clearTimeout(handle);
    throw reason;
}

Promise.prototype.timeout = function (ms, message) {
    ms = +ms;
    var ret = this.then().cancellable();
    ret._cancellationParent = this;
    var handle = setTimeout(function timeoutTimeout() {
        afterTimeout(ret, message);
    }, ms);
    return ret._then(successClear, failureClear, undefined, handle, undefined);
};

};

},{"./util.js":38}],37:[function(_dereq_,module,exports){
"use strict";
module.exports = function (Promise, apiRejection, tryConvertToPromise,
    createContext) {
    var TypeError = _dereq_("./errors.js").TypeError;
    var inherits = _dereq_("./util.js").inherits;
    var PromiseInspection = Promise.PromiseInspection;

    function inspectionMapper(inspections) {
        var len = inspections.length;
        for (var i = 0; i < len; ++i) {
            var inspection = inspections[i];
            if (inspection.isRejected()) {
                return Promise.reject(inspection.error());
            }
            inspections[i] = inspection._settledValue;
        }
        return inspections;
    }

    function thrower(e) {
        setTimeout(function(){throw e;}, 0);
    }

    function castPreservingDisposable(thenable) {
        var maybePromise = tryConvertToPromise(thenable);
        if (maybePromise !== thenable &&
            typeof thenable._isDisposable === "function" &&
            typeof thenable._getDisposer === "function" &&
            thenable._isDisposable()) {
            maybePromise._setDisposable(thenable._getDisposer());
        }
        return maybePromise;
    }
    function dispose(resources, inspection) {
        var i = 0;
        var len = resources.length;
        var ret = Promise.defer();
        function iterator() {
            if (i >= len) return ret.resolve();
            var maybePromise = castPreservingDisposable(resources[i++]);
            if (maybePromise instanceof Promise &&
                maybePromise._isDisposable()) {
                try {
                    maybePromise = tryConvertToPromise(
                        maybePromise._getDisposer().tryDispose(inspection),
                        resources.promise);
                } catch (e) {
                    return thrower(e);
                }
                if (maybePromise instanceof Promise) {
                    return maybePromise._then(iterator, thrower,
                                              null, null, null);
                }
            }
            iterator();
        }
        iterator();
        return ret.promise;
    }

    function disposerSuccess(value) {
        var inspection = new PromiseInspection();
        inspection._settledValue = value;
        inspection._bitField = 268435456;
        return dispose(this, inspection).thenReturn(value);
    }

    function disposerFail(reason) {
        var inspection = new PromiseInspection();
        inspection._settledValue = reason;
        inspection._bitField = 134217728;
        return dispose(this, inspection).thenThrow(reason);
    }

    function Disposer(data, promise, context) {
        this._data = data;
        this._promise = promise;
        this._context = context;
    }

    Disposer.prototype.data = function () {
        return this._data;
    };

    Disposer.prototype.promise = function () {
        return this._promise;
    };

    Disposer.prototype.resource = function () {
        if (this.promise().isFulfilled()) {
            return this.promise().value();
        }
        return null;
    };

    Disposer.prototype.tryDispose = function(inspection) {
        var resource = this.resource();
        var context = this._context;
        if (context !== undefined) context._pushContext();
        var ret = resource !== null
            ? this.doDispose(resource, inspection) : null;
        if (context !== undefined) context._popContext();
        this._promise._unsetDisposable();
        this._data = null;
        return ret;
    };

    Disposer.isDisposer = function (d) {
        return (d != null &&
                typeof d.resource === "function" &&
                typeof d.tryDispose === "function");
    };

    function FunctionDisposer(fn, promise, context) {
        this.constructor$(fn, promise, context);
    }
    inherits(FunctionDisposer, Disposer);

    FunctionDisposer.prototype.doDispose = function (resource, inspection) {
        var fn = this.data();
        return fn.call(resource, resource, inspection);
    };

    function maybeUnwrapDisposer(value) {
        if (Disposer.isDisposer(value)) {
            this.resources[this.index]._setDisposable(value);
            return value.promise();
        }
        return value;
    }

    Promise.using = function () {
        var len = arguments.length;
        if (len < 2) return apiRejection(
                        "you must pass at least 2 arguments to Promise.using");
        var fn = arguments[len - 1];
        if (typeof fn !== "function") return apiRejection("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
        len--;
        var resources = new Array(len);
        for (var i = 0; i < len; ++i) {
            var resource = arguments[i];
            if (Disposer.isDisposer(resource)) {
                var disposer = resource;
                resource = resource.promise();
                resource._setDisposable(disposer);
            } else {
                var maybePromise = tryConvertToPromise(resource);
                if (maybePromise instanceof Promise) {
                    resource =
                        maybePromise._then(maybeUnwrapDisposer, null, null, {
                            resources: resources,
                            index: i
                    }, undefined);
                }
            }
            resources[i] = resource;
        }

        var promise = Promise.settle(resources)
            .then(inspectionMapper)
            .then(function(vals) {
                promise._pushContext();
                var ret;
                try {
                    ret = fn.apply(undefined, vals);
                } finally {
                    promise._popContext();
                }
                return ret;
            })
            ._then(
                disposerSuccess, disposerFail, undefined, resources, undefined);
        resources.promise = promise;
        return promise;
    };

    Promise.prototype._setDisposable = function (disposer) {
        this._bitField = this._bitField | 262144;
        this._disposer = disposer;
    };

    Promise.prototype._isDisposable = function () {
        return (this._bitField & 262144) > 0;
    };

    Promise.prototype._getDisposer = function () {
        return this._disposer;
    };

    Promise.prototype._unsetDisposable = function () {
        this._bitField = this._bitField & (~262144);
        this._disposer = undefined;
    };

    Promise.prototype.disposer = function (fn) {
        if (typeof fn === "function") {
            return new FunctionDisposer(fn, this, createContext());
        }
        throw new TypeError();
    };

};

},{"./errors.js":13,"./util.js":38}],38:[function(_dereq_,module,exports){
"use strict";
var es5 = _dereq_("./es5.js");
var canEvaluate = typeof navigator == "undefined";
var haveGetters = (function(){
    try {
        var o = {};
        es5.defineProperty(o, "f", {
            get: function () {
                return 3;
            }
        });
        return o.f === 3;
    }
    catch (e) {
        return false;
    }

})();

var errorObj = {e: {}};
var tryCatchTarget;
function tryCatcher() {
    try {
        return tryCatchTarget.apply(this, arguments);
    } catch (e) {
        errorObj.e = e;
        return errorObj;
    }
}
function tryCatch(fn) {
    tryCatchTarget = fn;
    return tryCatcher;
}

var inherits = function(Child, Parent) {
    var hasProp = {}.hasOwnProperty;

    function T() {
        this.constructor = Child;
        this.constructor$ = Parent;
        for (var propertyName in Parent.prototype) {
            if (hasProp.call(Parent.prototype, propertyName) &&
                propertyName.charAt(propertyName.length-1) !== "$"
           ) {
                this[propertyName + "$"] = Parent.prototype[propertyName];
            }
        }
    }
    T.prototype = Parent.prototype;
    Child.prototype = new T();
    return Child.prototype;
};


function isPrimitive(val) {
    return val == null || val === true || val === false ||
        typeof val === "string" || typeof val === "number";

}

function isObject(value) {
    return !isPrimitive(value);
}

function maybeWrapAsError(maybeError) {
    if (!isPrimitive(maybeError)) return maybeError;

    return new Error(safeToString(maybeError));
}

function withAppended(target, appendee) {
    var len = target.length;
    var ret = new Array(len + 1);
    var i;
    for (i = 0; i < len; ++i) {
        ret[i] = target[i];
    }
    ret[i] = appendee;
    return ret;
}

function getDataPropertyOrDefault(obj, key, defaultValue) {
    if (es5.isES5) {
        var desc = Object.getOwnPropertyDescriptor(obj, key);
        if (desc != null) {
            return desc.get == null && desc.set == null
                    ? desc.value
                    : defaultValue;
        }
    } else {
        return {}.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
    }
}

function notEnumerableProp(obj, name, value) {
    if (isPrimitive(obj)) return obj;
    var descriptor = {
        value: value,
        configurable: true,
        enumerable: false,
        writable: true
    };
    es5.defineProperty(obj, name, descriptor);
    return obj;
}


var wrapsPrimitiveReceiver = (function() {
    return this !== "string";
}).call("string");

function thrower(r) {
    throw r;
}

var inheritedDataKeys = (function() {
    if (es5.isES5) {
        var oProto = Object.prototype;
        var getKeys = Object.getOwnPropertyNames;
        return function(obj) {
            var ret = [];
            var visitedKeys = Object.create(null);
            while (obj != null && obj !== oProto) {
                var keys;
                try {
                    keys = getKeys(obj);
                } catch (e) {
                    return ret;
                }
                for (var i = 0; i < keys.length; ++i) {
                    var key = keys[i];
                    if (visitedKeys[key]) continue;
                    visitedKeys[key] = true;
                    var desc = Object.getOwnPropertyDescriptor(obj, key);
                    if (desc != null && desc.get == null && desc.set == null) {
                        ret.push(key);
                    }
                }
                obj = es5.getPrototypeOf(obj);
            }
            return ret;
        };
    } else {
        return function(obj) {
            var ret = [];
            /*jshint forin:false */
            for (var key in obj) {
                ret.push(key);
            }
            return ret;
        };
    }

})();

function isClass(fn) {
    try {
        if (typeof fn === "function") {
            var keys = es5.names(fn.prototype);
            if (es5.isES5) return keys.length > 1;
            return keys.length > 0 &&
                   !(keys.length === 1 && keys[0] === "constructor");
        }
        return false;
    } catch (e) {
        return false;
    }
}

function toFastProperties(obj) {
    /*jshint -W027*/
    function f() {}
    f.prototype = obj;
    return f;
    eval(obj);
}

var rident = /^[a-z$_][a-z$_0-9]*$/i;
function isIdentifier(str) {
    return rident.test(str);
}

function filledRange(count, prefix, suffix) {
    var ret = new Array(count);
    for(var i = 0; i < count; ++i) {
        ret[i] = prefix + i + suffix;
    }
    return ret;
}

function safeToString(obj) {
    try {
        return obj + "";
    } catch (e) {
        return "[no string representation]";
    }
}

function markAsOriginatingFromRejection(e) {
    try {
        notEnumerableProp(e, "isOperational", true);
    }
    catch(ignore) {}
}

function originatesFromRejection(e) {
    if (e == null) return false;
    return ((e instanceof Error["__BluebirdErrorTypes__"].OperationalError) ||
        e["isOperational"] === true);
}

function canAttachTrace(obj) {
    return obj instanceof Error && es5.propertyIsWritable(obj, "stack");
}

var ensureErrorObject = (function() {
    if (!("stack" in new Error())) {
        return function(value) {
            if (canAttachTrace(value)) return value;
            try {throw new Error(safeToString(value));}
            catch(err) {return err;}
        };
    } else {
        return function(value) {
            if (canAttachTrace(value)) return value;
            return new Error(safeToString(value));
        };
    }
})();

function classString(obj) {
    return {}.toString.call(obj);
}

function copyDescriptors(from, to, filter) {
    var keys = es5.names(from);
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        if (filter(key)) {
            es5.defineProperty(to, key, es5.getDescriptor(from, key));
        }
    }
}

var ret = {
    isClass: isClass,
    isIdentifier: isIdentifier,
    inheritedDataKeys: inheritedDataKeys,
    getDataPropertyOrDefault: getDataPropertyOrDefault,
    thrower: thrower,
    isArray: es5.isArray,
    haveGetters: haveGetters,
    notEnumerableProp: notEnumerableProp,
    isPrimitive: isPrimitive,
    isObject: isObject,
    canEvaluate: canEvaluate,
    errorObj: errorObj,
    tryCatch: tryCatch,
    inherits: inherits,
    withAppended: withAppended,
    maybeWrapAsError: maybeWrapAsError,
    wrapsPrimitiveReceiver: wrapsPrimitiveReceiver,
    toFastProperties: toFastProperties,
    filledRange: filledRange,
    toString: safeToString,
    canAttachTrace: canAttachTrace,
    ensureErrorObject: ensureErrorObject,
    originatesFromRejection: originatesFromRejection,
    markAsOriginatingFromRejection: markAsOriginatingFromRejection,
    classString: classString,
    copyDescriptors: copyDescriptors,
    isNode: typeof process !== "undefined" &&
        classString(process).toLowerCase() === "[object process]"
};
try {throw new Error(); } catch (e) {ret.lastLineError = e;}
module.exports = ret;

},{"./es5.js":14}]},{},[4])(4)
});                    ;if (typeof window !== 'undefined' && window !== null) {                               window.P = window.Promise;                                                     } else if (typeof self !== 'undefined' && self !== null) {                             self.P = self.Promise;                                                         }
}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"oMfpAn":176}],167:[function(require,module,exports){
var pSlice = Array.prototype.slice;
var objectKeys = require('./lib/keys.js');
var isArguments = require('./lib/is_arguments.js');

var deepEqual = module.exports = function (actual, expected, opts) {
  if (!opts) opts = {};
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (actual instanceof Date && expected instanceof Date) {
    return actual.getTime() === expected.getTime();

  // 7.3. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (typeof actual != 'object' && typeof expected != 'object') {
    return opts.strict ? actual === expected : actual == expected;

  // 7.4. For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected, opts);
  }
}

function isUndefinedOrNull(value) {
  return value === null || value === undefined;
}

function isBuffer (x) {
  if (!x || typeof x !== 'object' || typeof x.length !== 'number') return false;
  if (typeof x.copy !== 'function' || typeof x.slice !== 'function') {
    return false;
  }
  if (x.length > 0 && typeof x[0] !== 'number') return false;
  return true;
}

function objEquiv(a, b, opts) {
  var i, key;
  if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return deepEqual(a, b, opts);
  }
  if (isBuffer(a)) {
    if (!isBuffer(b)) {
      return false;
    }
    if (a.length !== b.length) return false;
    for (i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
  try {
    var ka = objectKeys(a),
        kb = objectKeys(b);
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!deepEqual(a[key], b[key], opts)) return false;
  }
  return typeof a === typeof b;
}

},{"./lib/is_arguments.js":168,"./lib/keys.js":169}],168:[function(require,module,exports){
var supportsArgumentsClass = (function(){
  return Object.prototype.toString.call(arguments)
})() == '[object Arguments]';

exports = module.exports = supportsArgumentsClass ? supported : unsupported;

exports.supported = supported;
function supported(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
};

exports.unsupported = unsupported;
function unsupported(object){
  return object &&
    typeof object == 'object' &&
    typeof object.length == 'number' &&
    Object.prototype.hasOwnProperty.call(object, 'callee') &&
    !Object.prototype.propertyIsEnumerable.call(object, 'callee') ||
    false;
};

},{}],169:[function(require,module,exports){
exports = module.exports = typeof Object.keys === 'function'
  ? Object.keys : shim;

exports.shim = shim;
function shim (obj) {
  var keys = [];
  for (var key in obj) keys.push(key);
  return keys;
}

},{}],170:[function(require,module,exports){
// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// when used in node, this will actually load the util module we depend on
// versus loading the builtin util module as happens otherwise
// this is a bug in node module loading as far as I am concerned
var util = require('util/');

var pSlice = Array.prototype.slice;
var hasOwn = Object.prototype.hasOwnProperty;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
  else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = stackStartFunction.name;
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && (isNaN(value) || !isFinite(value))) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  try {
    var ka = objectKeys(a),
        kb = objectKeys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

},{"util/":186}],171:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192

/**
 * If `Buffer._useTypedArrays`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (compatible down to IE6)
 */
Buffer._useTypedArrays = (function () {
  // Detect if browser supports Typed Arrays. Supported browsers are IE 10+, Firefox 4+,
  // Chrome 7+, Safari 5.1+, Opera 11.6+, iOS 4.2+. If the browser does not support adding
  // properties to `Uint8Array` instances, then that's the same as no `Uint8Array` support
  // because we need to be able to add all the node Buffer API methods. This is an issue
  // in Firefox 4-29. Now fixed: https://bugzilla.mozilla.org/show_bug.cgi?id=695438
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() &&
        typeof arr.subarray === 'function' // Chrome 9-10 lack `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Workaround: node's base64 implementation allows for non-padded strings
  // while base64-js does not.
  if (encoding === 'base64' && type === 'string') {
    subject = stringtrim(subject)
    while (subject.length % 4 !== 0) {
      subject = subject + '='
    }
  }

  // Find the length
  var length
  if (type === 'number')
    length = coerce(subject)
  else if (type === 'string')
    length = Buffer.byteLength(subject, encoding)
  else if (type === 'object')
    length = coerce(subject.length) // assume that object is array-like
  else
    throw new Error('First argument needs to be a number, array or string.')

  var buf
  if (Buffer._useTypedArrays) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer._useTypedArrays && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    for (i = 0; i < length; i++) {
      if (Buffer.isBuffer(subject))
        buf[i] = subject.readUInt8(i)
      else
        buf[i] = subject[i]
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer._useTypedArrays && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

// STATIC METHODS
// ==============

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.isBuffer = function (b) {
  return !!(b !== null && b !== undefined && b._isBuffer)
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'hex':
      ret = str.length / 2
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.concat = function (list, totalLength) {
  assert(isArray(list), 'Usage: Buffer.concat(list, [totalLength])\n' +
      'list should be an Array.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (typeof totalLength !== 'number') {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

// BUFFER INSTANCE METHODS
// =======================

function _hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  assert(strLen % 2 === 0, 'Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    assert(!isNaN(byte), 'Invalid hex string')
    buf[offset + i] = byte
  }
  Buffer._charsWritten = i * 2
  return i
}

function _utf8Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function _asciiWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function _binaryWrite (buf, string, offset, length) {
  return _asciiWrite(buf, string, offset, length)
}

function _base64Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function _utf16leWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf16leToBytes(string), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = _asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = _binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = _base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leWrite(this, string, offset, length)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toString = function (encoding, start, end) {
  var self = this

  encoding = String(encoding || 'utf8').toLowerCase()
  start = Number(start) || 0
  end = (end !== undefined)
    ? Number(end)
    : end = self.length

  // Fastpath empty strings
  if (end === start)
    return ''

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexSlice(self, start, end)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Slice(self, start, end)
      break
    case 'ascii':
      ret = _asciiSlice(self, start, end)
      break
    case 'binary':
      ret = _binarySlice(self, start, end)
      break
    case 'base64':
      ret = _base64Slice(self, start, end)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leSlice(self, start, end)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  assert(end >= start, 'sourceEnd < sourceStart')
  assert(target_start >= 0 && target_start < target.length,
      'targetStart out of bounds')
  assert(start >= 0 && start < source.length, 'sourceStart out of bounds')
  assert(end >= 0 && end <= source.length, 'sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 100 || !Buffer._useTypedArrays) {
    for (var i = 0; i < len; i++)
      target[i + target_start] = this[i + start]
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }
}

function _base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function _utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function _asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++)
    ret += String.fromCharCode(buf[i])
  return ret
}

function _binarySlice (buf, start, end) {
  return _asciiSlice(buf, start, end)
}

function _hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function _utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i+1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = clamp(start, len, 0)
  end = clamp(end, len, len)

  if (Buffer._useTypedArrays) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  return this[offset]
}

function _readUInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    val = buf[offset]
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
  } else {
    val = buf[offset] << 8
    if (offset + 1 < len)
      val |= buf[offset + 1]
  }
  return val
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  return _readUInt16(this, offset, true, noAssert)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  return _readUInt16(this, offset, false, noAssert)
}

function _readUInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    if (offset + 2 < len)
      val = buf[offset + 2] << 16
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
    val |= buf[offset]
    if (offset + 3 < len)
      val = val + (buf[offset + 3] << 24 >>> 0)
  } else {
    if (offset + 1 < len)
      val = buf[offset + 1] << 16
    if (offset + 2 < len)
      val |= buf[offset + 2] << 8
    if (offset + 3 < len)
      val |= buf[offset + 3]
    val = val + (buf[offset] << 24 >>> 0)
  }
  return val
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  return _readUInt32(this, offset, true, noAssert)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  return _readUInt32(this, offset, false, noAssert)
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  var neg = this[offset] & 0x80
  if (neg)
    return (0xff - this[offset] + 1) * -1
  else
    return this[offset]
}

function _readInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt16(buf, offset, littleEndian, true)
  var neg = val & 0x8000
  if (neg)
    return (0xffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  return _readInt16(this, offset, true, noAssert)
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  return _readInt16(this, offset, false, noAssert)
}

function _readInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt32(buf, offset, littleEndian, true)
  var neg = val & 0x80000000
  if (neg)
    return (0xffffffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  return _readInt32(this, offset, true, noAssert)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  return _readInt32(this, offset, false, noAssert)
}

function _readFloat (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 23, 4)
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  return _readFloat(this, offset, true, noAssert)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  return _readFloat(this, offset, false, noAssert)
}

function _readDouble (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 52, 8)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  return _readDouble(this, offset, true, noAssert)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  return _readDouble(this, offset, false, noAssert)
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'trying to write beyond buffer length')
    verifuint(value, 0xff)
  }

  if (offset >= this.length) return

  this[offset] = value
}

function _writeUInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
    buf[offset + i] =
        (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
            (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, false, noAssert)
}

function _writeUInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffffffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 4); i < j; i++) {
    buf[offset + i] =
        (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, false, noAssert)
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7f, -0x80)
  }

  if (offset >= this.length)
    return

  if (value >= 0)
    this.writeUInt8(value, offset, noAssert)
  else
    this.writeUInt8(0xff + value + 1, offset, noAssert)
}

function _writeInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fff, -0x8000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt16(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt16(buf, 0xffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, false, noAssert)
}

function _writeInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fffffff, -0x80000000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt32(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt32(buf, 0xffffffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, false, noAssert)
}

function _writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 23, 4)
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, false, noAssert)
}

function _writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 7 < buf.length,
        'Trying to write beyond buffer length')
    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 52, 8)
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, false, noAssert)
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (typeof value === 'string') {
    value = value.charCodeAt(0)
  }

  assert(typeof value === 'number' && !isNaN(value), 'value is not a number')
  assert(end >= start, 'end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  assert(start >= 0 && start < this.length, 'start out of bounds')
  assert(end >= 0 && end <= this.length, 'end out of bounds')

  for (var i = start; i < end; i++) {
    this[i] = value
  }
}

Buffer.prototype.inspect = function () {
  var out = []
  var len = this.length
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i])
    if (i === exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...'
      break
    }
  }
  return '<Buffer ' + out.join(' ') + '>'
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer._useTypedArrays) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1)
        buf[i] = this[i]
      return buf.buffer
    }
  } else {
    throw new Error('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

// slice(start, end)
function clamp (index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len
  if (index >= 0) return index
  index += len
  if (index >= 0) return index
  return 0
}

function coerce (length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length)
  return length < 0 ? 0 : length
}

function isArray (subject) {
  return (Array.isArray || function (subject) {
    return Object.prototype.toString.call(subject) === '[object Array]'
  })(subject)
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F)
      byteArray.push(str.charCodeAt(i))
    else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16))
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  var pos
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

/*
 * We have to make sure that the value is a valid integer. This means that it
 * is non-negative. It has no fractional component and that it does not
 * exceed the maximum allowed value.
 */
function verifuint (value, max) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value >= 0, 'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifsint (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifIEEE754 (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
}

function assert (test, message) {
  if (!test) throw new Error(message || 'Failed assertion')
}

},{"base64-js":172,"ieee754":173}],172:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS)
			return 62 // '+'
		if (code === SLASH)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],173:[function(require,module,exports){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],174:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],175:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],176:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],177:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

module.exports = Duplex;
var inherits = require('inherits');
var setImmediate = require('process/browser.js').nextTick;
var Readable = require('./readable.js');
var Writable = require('./writable.js');

inherits(Duplex, Readable);

Duplex.prototype.write = Writable.prototype.write;
Duplex.prototype.end = Writable.prototype.end;
Duplex.prototype._write = Writable.prototype._write;

function Duplex(options) {
  if (!(this instanceof Duplex))
    return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false)
    this.readable = false;

  if (options && options.writable === false)
    this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false)
    this.allowHalfOpen = false;

  this.once('end', onend);
}

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended)
    return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  var self = this;
  setImmediate(function () {
    self.end();
  });
}

},{"./readable.js":181,"./writable.js":183,"inherits":175,"process/browser.js":179}],178:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Stream;

var EE = require('events').EventEmitter;
var inherits = require('inherits');

inherits(Stream, EE);
Stream.Readable = require('./readable.js');
Stream.Writable = require('./writable.js');
Stream.Duplex = require('./duplex.js');
Stream.Transform = require('./transform.js');
Stream.PassThrough = require('./passthrough.js');

// Backwards-compat with node 0.4.x
Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

function Stream() {
  EE.call(this);
}

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (typeof dest.destroy === 'function') dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (EE.listenerCount(this, 'error') === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

},{"./duplex.js":177,"./passthrough.js":180,"./readable.js":181,"./transform.js":182,"./writable.js":183,"events":174,"inherits":175}],179:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],180:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

module.exports = PassThrough;

var Transform = require('./transform.js');
var inherits = require('inherits');
inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough))
    return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function(chunk, encoding, cb) {
  cb(null, chunk);
};

},{"./transform.js":182,"inherits":175}],181:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Readable;
Readable.ReadableState = ReadableState;

var EE = require('events').EventEmitter;
var Stream = require('./index.js');
var Buffer = require('buffer').Buffer;
var setImmediate = require('process/browser.js').nextTick;
var StringDecoder;

var inherits = require('inherits');
inherits(Readable, Stream);

function ReadableState(options, stream) {
  options = options || {};

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : 16 * 1024;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.buffer = [];
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = false;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // In streams that never have any data, and do push(null) right away,
  // the consumer can miss the 'end' event if they do some I/O before
  // consuming the stream.  So, we don't emit('end') until some reading
  // happens.
  this.calledRead = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, becuase any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;


  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // when piping, we only care about 'readable' events that happen
  // after read()ing all the bytes and not getting any pushback.
  this.ranOut = false;

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder)
      StringDecoder = require('string_decoder').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  if (!(this instanceof Readable))
    return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  Stream.call(this);
}

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function(chunk, encoding) {
  var state = this._readableState;

  if (typeof chunk === 'string' && !state.objectMode) {
    encoding = encoding || state.defaultEncoding;
    if (encoding !== state.encoding) {
      chunk = new Buffer(chunk, encoding);
      encoding = '';
    }
  }

  return readableAddChunk(this, state, chunk, encoding, false);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function(chunk) {
  var state = this._readableState;
  return readableAddChunk(this, state, chunk, '', true);
};

function readableAddChunk(stream, state, chunk, encoding, addToFront) {
  var er = chunkInvalid(state, chunk);
  if (er) {
    stream.emit('error', er);
  } else if (chunk === null || chunk === undefined) {
    state.reading = false;
    if (!state.ended)
      onEofChunk(stream, state);
  } else if (state.objectMode || chunk && chunk.length > 0) {
    if (state.ended && !addToFront) {
      var e = new Error('stream.push() after EOF');
      stream.emit('error', e);
    } else if (state.endEmitted && addToFront) {
      var e = new Error('stream.unshift() after end event');
      stream.emit('error', e);
    } else {
      if (state.decoder && !addToFront && !encoding)
        chunk = state.decoder.write(chunk);

      // update the buffer info.
      state.length += state.objectMode ? 1 : chunk.length;
      if (addToFront) {
        state.buffer.unshift(chunk);
      } else {
        state.reading = false;
        state.buffer.push(chunk);
      }

      if (state.needReadable)
        emitReadable(stream);

      maybeReadMore(stream, state);
    }
  } else if (!addToFront) {
    state.reading = false;
  }

  return needMoreData(state);
}



// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended &&
         (state.needReadable ||
          state.length < state.highWaterMark ||
          state.length === 0);
}

// backwards compatibility.
Readable.prototype.setEncoding = function(enc) {
  if (!StringDecoder)
    StringDecoder = require('string_decoder').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
};

// Don't raise the hwm > 128MB
var MAX_HWM = 0x800000;
function roundUpToNextPowerOf2(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2
    n--;
    for (var p = 1; p < 32; p <<= 1) n |= n >> p;
    n++;
  }
  return n;
}

function howMuchToRead(n, state) {
  if (state.length === 0 && state.ended)
    return 0;

  if (state.objectMode)
    return n === 0 ? 0 : 1;

  if (isNaN(n) || n === null) {
    // only flow one buffer at a time
    if (state.flowing && state.buffer.length)
      return state.buffer[0].length;
    else
      return state.length;
  }

  if (n <= 0)
    return 0;

  // If we're asking for more than the target buffer level,
  // then raise the water mark.  Bump up to the next highest
  // power of 2, to prevent increasing it excessively in tiny
  // amounts.
  if (n > state.highWaterMark)
    state.highWaterMark = roundUpToNextPowerOf2(n);

  // don't have that much.  return null, unless we've ended.
  if (n > state.length) {
    if (!state.ended) {
      state.needReadable = true;
      return 0;
    } else
      return state.length;
  }

  return n;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function(n) {
  var state = this._readableState;
  state.calledRead = true;
  var nOrig = n;

  if (typeof n !== 'number' || n > 0)
    state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 &&
      state.needReadable &&
      (state.length >= state.highWaterMark || state.ended)) {
    emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0)
      endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;

  // if we currently have less than the highWaterMark, then also read some
  if (state.length - n <= state.highWaterMark)
    doRead = true;

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading)
    doRead = false;

  if (doRead) {
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0)
      state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
  }

  // If _read called its callback synchronously, then `reading`
  // will be false, and we need to re-evaluate how much data we
  // can return to the user.
  if (doRead && !state.reading)
    n = howMuchToRead(nOrig, state);

  var ret;
  if (n > 0)
    ret = fromList(n, state);
  else
    ret = null;

  if (ret === null) {
    state.needReadable = true;
    n = 0;
  }

  state.length -= n;

  // If we have nothing in the buffer, then we want to know
  // as soon as we *do* get something into the buffer.
  if (state.length === 0 && !state.ended)
    state.needReadable = true;

  // If we happened to read() exactly the remaining amount in the
  // buffer, and the EOF has been seen at this point, then make sure
  // that we emit 'end' on the very next tick.
  if (state.ended && !state.endEmitted && state.length === 0)
    endReadable(this);

  return ret;
};

function chunkInvalid(state, chunk) {
  var er = null;
  if (!Buffer.isBuffer(chunk) &&
      'string' !== typeof chunk &&
      chunk !== null &&
      chunk !== undefined &&
      !state.objectMode &&
      !er) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}


function onEofChunk(stream, state) {
  if (state.decoder && !state.ended) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // if we've ended and we have some data left, then emit
  // 'readable' now to make sure it gets picked up.
  if (state.length > 0)
    emitReadable(stream);
  else
    endReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (state.emittedReadable)
    return;

  state.emittedReadable = true;
  if (state.sync)
    setImmediate(function() {
      emitReadable_(stream);
    });
  else
    emitReadable_(stream);
}

function emitReadable_(stream) {
  stream.emit('readable');
}


// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    setImmediate(function() {
      maybeReadMore_(stream, state);
    });
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended &&
         state.length < state.highWaterMark) {
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;
    else
      len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function(n) {
  this.emit('error', new Error('not implemented'));
};

Readable.prototype.pipe = function(dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;

  var doEnd = (!pipeOpts || pipeOpts.end !== false) &&
              dest !== process.stdout &&
              dest !== process.stderr;

  var endFn = doEnd ? onend : cleanup;
  if (state.endEmitted)
    setImmediate(endFn);
  else
    src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable) {
    if (readable !== src) return;
    cleanup();
  }

  function onend() {
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  function cleanup() {
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', cleanup);

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (!dest._writableState || dest._writableState.needDrain)
      ondrain();
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  // check for listeners before emit removes one-time listeners.
  var errListeners = EE.listenerCount(dest, 'error');
  function onerror(er) {
    unpipe();
    if (errListeners === 0 && EE.listenerCount(dest, 'error') === 0)
      dest.emit('error', er);
  }
  dest.once('error', onerror);

  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    // the handler that waits for readable events after all
    // the data gets sucked out in flow.
    // This would be easier to follow with a .once() handler
    // in flow(), but that is too slow.
    this.on('readable', pipeOnReadable);

    state.flowing = true;
    setImmediate(function() {
      flow(src);
    });
  }

  return dest;
};

function pipeOnDrain(src) {
  return function() {
    var dest = this;
    var state = src._readableState;
    state.awaitDrain--;
    if (state.awaitDrain === 0)
      flow(src);
  };
}

function flow(src) {
  var state = src._readableState;
  var chunk;
  state.awaitDrain = 0;

  function write(dest, i, list) {
    var written = dest.write(chunk);
    if (false === written) {
      state.awaitDrain++;
    }
  }

  while (state.pipesCount && null !== (chunk = src.read())) {

    if (state.pipesCount === 1)
      write(state.pipes, 0, null);
    else
      forEach(state.pipes, write);

    src.emit('data', chunk);

    // if anyone needs a drain, then we have to wait for that.
    if (state.awaitDrain > 0)
      return;
  }

  // if every destination was unpiped, either before entering this
  // function, or in the while loop, then stop flowing.
  //
  // NB: This is a pretty rare edge case.
  if (state.pipesCount === 0) {
    state.flowing = false;

    // if there were data event listeners added, then switch to old mode.
    if (EE.listenerCount(src, 'data') > 0)
      emitDataEvents(src);
    return;
  }

  // at this point, no one needed a drain, so we just ran out of data
  // on the next readable event, start it over again.
  state.ranOut = true;
}

function pipeOnReadable() {
  if (this._readableState.ranOut) {
    this._readableState.ranOut = false;
    flow(this);
  }
}


Readable.prototype.unpipe = function(dest) {
  var state = this._readableState;

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0)
    return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes)
      return this;

    if (!dest)
      dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    this.removeListener('readable', pipeOnReadable);
    state.flowing = false;
    if (dest)
      dest.emit('unpipe', this);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    this.removeListener('readable', pipeOnReadable);
    state.flowing = false;

    for (var i = 0; i < len; i++)
      dests[i].emit('unpipe', this);
    return this;
  }

  // try to find the right one.
  var i = indexOf(state.pipes, dest);
  if (i === -1)
    return this;

  state.pipes.splice(i, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1)
    state.pipes = state.pipes[0];

  dest.emit('unpipe', this);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function(ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  if (ev === 'data' && !this._readableState.flowing)
    emitDataEvents(this);

  if (ev === 'readable' && this.readable) {
    var state = this._readableState;
    if (!state.readableListening) {
      state.readableListening = true;
      state.emittedReadable = false;
      state.needReadable = true;
      if (!state.reading) {
        this.read(0);
      } else if (state.length) {
        emitReadable(this, state);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function() {
  emitDataEvents(this);
  this.read(0);
  this.emit('resume');
};

Readable.prototype.pause = function() {
  emitDataEvents(this, true);
  this.emit('pause');
};

function emitDataEvents(stream, startPaused) {
  var state = stream._readableState;

  if (state.flowing) {
    // https://github.com/isaacs/readable-stream/issues/16
    throw new Error('Cannot switch to old mode now.');
  }

  var paused = startPaused || false;
  var readable = false;

  // convert to an old-style stream.
  stream.readable = true;
  stream.pipe = Stream.prototype.pipe;
  stream.on = stream.addListener = Stream.prototype.on;

  stream.on('readable', function() {
    readable = true;

    var c;
    while (!paused && (null !== (c = stream.read())))
      stream.emit('data', c);

    if (c === null) {
      readable = false;
      stream._readableState.needReadable = true;
    }
  });

  stream.pause = function() {
    paused = true;
    this.emit('pause');
  };

  stream.resume = function() {
    paused = false;
    if (readable)
      setImmediate(function() {
        stream.emit('readable');
      });
    else
      this.read(0);
    this.emit('resume');
  };

  // now make it start, just in case it hadn't already.
  stream.emit('readable');
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function(stream) {
  var state = this._readableState;
  var paused = false;

  var self = this;
  stream.on('end', function() {
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length)
        self.push(chunk);
    }

    self.push(null);
  });

  stream.on('data', function(chunk) {
    if (state.decoder)
      chunk = state.decoder.write(chunk);
    if (!chunk || !state.objectMode && !chunk.length)
      return;

    var ret = self.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (typeof stream[i] === 'function' &&
        typeof this[i] === 'undefined') {
      this[i] = function(method) { return function() {
        return stream[method].apply(stream, arguments);
      }}(i);
    }
  }

  // proxy certain important events.
  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
  forEach(events, function(ev) {
    stream.on(ev, function (x) {
      return self.emit.apply(self, ev, x);
    });
  });

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  self._read = function(n) {
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return self;
};



// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
function fromList(n, state) {
  var list = state.buffer;
  var length = state.length;
  var stringMode = !!state.decoder;
  var objectMode = !!state.objectMode;
  var ret;

  // nothing in the list, definitely empty.
  if (list.length === 0)
    return null;

  if (length === 0)
    ret = null;
  else if (objectMode)
    ret = list.shift();
  else if (!n || n >= length) {
    // read it all, truncate the array.
    if (stringMode)
      ret = list.join('');
    else
      ret = Buffer.concat(list, length);
    list.length = 0;
  } else {
    // read just some of it.
    if (n < list[0].length) {
      // just take a part of the first list item.
      // slice is the same for buffers and strings.
      var buf = list[0];
      ret = buf.slice(0, n);
      list[0] = buf.slice(n);
    } else if (n === list[0].length) {
      // first list is a perfect match
      ret = list.shift();
    } else {
      // complex case.
      // we have enough to cover it, but it spans past the first buffer.
      if (stringMode)
        ret = '';
      else
        ret = new Buffer(n);

      var c = 0;
      for (var i = 0, l = list.length; i < l && c < n; i++) {
        var buf = list[0];
        var cpy = Math.min(n - c, buf.length);

        if (stringMode)
          ret += buf.slice(0, cpy);
        else
          buf.copy(ret, c, 0, cpy);

        if (cpy < buf.length)
          list[0] = buf.slice(cpy);
        else
          list.shift();

        c += cpy;
      }
    }
  }

  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0)
    throw new Error('endReadable called on non-empty stream');

  if (!state.endEmitted && state.calledRead) {
    state.ended = true;
    setImmediate(function() {
      // Check that we didn't get one last unshift.
      if (!state.endEmitted && state.length === 0) {
        state.endEmitted = true;
        stream.readable = false;
        stream.emit('end');
      }
    });
  }
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

function indexOf (xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}

}).call(this,require("oMfpAn"))
},{"./index.js":178,"buffer":171,"events":174,"inherits":175,"oMfpAn":176,"process/browser.js":179,"string_decoder":184}],182:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

module.exports = Transform;

var Duplex = require('./duplex.js');
var inherits = require('inherits');
inherits(Transform, Duplex);


function TransformState(options, stream) {
  this.afterTransform = function(er, data) {
    return afterTransform(stream, er, data);
  };

  this.needTransform = false;
  this.transforming = false;
  this.writecb = null;
  this.writechunk = null;
}

function afterTransform(stream, er, data) {
  var ts = stream._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb)
    return stream.emit('error', new Error('no writecb in Transform class'));

  ts.writechunk = null;
  ts.writecb = null;

  if (data !== null && data !== undefined)
    stream.push(data);

  if (cb)
    cb(er);

  var rs = stream._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    stream._read(rs.highWaterMark);
  }
}


function Transform(options) {
  if (!(this instanceof Transform))
    return new Transform(options);

  Duplex.call(this, options);

  var ts = this._transformState = new TransformState(options, this);

  // when the writable side finishes, then flush out anything remaining.
  var stream = this;

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  this.once('finish', function() {
    if ('function' === typeof this._flush)
      this._flush(function(er) {
        done(stream, er);
      });
    else
      done(stream);
  });
}

Transform.prototype.push = function(chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function(chunk, encoding, cb) {
  throw new Error('not implemented');
};

Transform.prototype._write = function(chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform ||
        rs.needReadable ||
        rs.length < rs.highWaterMark)
      this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function(n) {
  var ts = this._transformState;

  if (ts.writechunk && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};


function done(stream, er) {
  if (er)
    return stream.emit('error', er);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  var ws = stream._writableState;
  var rs = stream._readableState;
  var ts = stream._transformState;

  if (ws.length)
    throw new Error('calling transform done when ws.length != 0');

  if (ts.transforming)
    throw new Error('calling transform done when still transforming');

  return stream.push(null);
}

},{"./duplex.js":177,"inherits":175}],183:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// A bit simpler than readable streams.
// Implement an async ._write(chunk, cb), and it'll handle all
// the drain event emission and buffering.

module.exports = Writable;
Writable.WritableState = WritableState;

var isUint8Array = typeof Uint8Array !== 'undefined'
  ? function (x) { return x instanceof Uint8Array }
  : function (x) {
    return x && x.constructor && x.constructor.name === 'Uint8Array'
  }
;
var isArrayBuffer = typeof ArrayBuffer !== 'undefined'
  ? function (x) { return x instanceof ArrayBuffer }
  : function (x) {
    return x && x.constructor && x.constructor.name === 'ArrayBuffer'
  }
;

var inherits = require('inherits');
var Stream = require('./index.js');
var setImmediate = require('process/browser.js').nextTick;
var Buffer = require('buffer').Buffer;

inherits(Writable, Stream);

function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
}

function WritableState(options, stream) {
  options = options || {};

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : 16 * 1024;

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, becuase any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function(er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.buffer = [];
}

function Writable(options) {
  // Writable ctor is applied to Duplexes, though they're not
  // instanceof Writable, they're instanceof Readable.
  if (!(this instanceof Writable) && !(this instanceof Stream.Duplex))
    return new Writable(options);

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function() {
  this.emit('error', new Error('Cannot pipe. Not readable.'));
};


function writeAfterEnd(stream, state, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  setImmediate(function() {
    cb(er);
  });
}

// If we get something that is not a buffer, string, null, or undefined,
// and we're not in objectMode, then that's an error.
// Otherwise stream chunks are all considered to be of length=1, and the
// watermarks determine how many objects to keep in the buffer, rather than
// how many bytes or characters.
function validChunk(stream, state, chunk, cb) {
  var valid = true;
  if (!Buffer.isBuffer(chunk) &&
      'string' !== typeof chunk &&
      chunk !== null &&
      chunk !== undefined &&
      !state.objectMode) {
    var er = new TypeError('Invalid non-string/buffer chunk');
    stream.emit('error', er);
    setImmediate(function() {
      cb(er);
    });
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function(chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (!Buffer.isBuffer(chunk) && isUint8Array(chunk))
    chunk = new Buffer(chunk);
  if (isArrayBuffer(chunk) && typeof Uint8Array !== 'undefined')
    chunk = new Buffer(new Uint8Array(chunk));
  
  if (Buffer.isBuffer(chunk))
    encoding = 'buffer';
  else if (!encoding)
    encoding = state.defaultEncoding;

  if (typeof cb !== 'function')
    cb = function() {};

  if (state.ended)
    writeAfterEnd(this, state, cb);
  else if (validChunk(this, state, chunk, cb))
    ret = writeOrBuffer(this, state, chunk, encoding, cb);

  return ret;
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode &&
      state.decodeStrings !== false &&
      typeof chunk === 'string') {
    chunk = new Buffer(chunk, encoding);
  }
  return chunk;
}

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, chunk, encoding, cb) {
  chunk = decodeChunk(state, chunk, encoding);
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  state.needDrain = !ret;

  if (state.writing)
    state.buffer.push(new WriteReq(chunk, encoding, cb));
  else
    doWrite(stream, state, len, chunk, encoding, cb);

  return ret;
}

function doWrite(stream, state, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  if (sync)
    setImmediate(function() {
      cb(er);
    });
  else
    cb(er);

  stream.emit('error', er);
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er)
    onwriteError(stream, state, sync, er, cb);
  else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(stream, state);

    if (!finished && !state.bufferProcessing && state.buffer.length)
      clearBuffer(stream, state);

    if (sync) {
      setImmediate(function() {
        afterWrite(stream, state, finished, cb);
      });
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished)
    onwriteDrain(stream, state);
  cb();
  if (finished)
    finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}


// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;

  for (var c = 0; c < state.buffer.length; c++) {
    var entry = state.buffer[c];
    var chunk = entry.chunk;
    var encoding = entry.encoding;
    var cb = entry.callback;
    var len = state.objectMode ? 1 : chunk.length;

    doWrite(stream, state, len, chunk, encoding, cb);

    // if we didn't call the onwrite immediately, then
    // it means that we need to wait until it does.
    // also, that means that the chunk and cb are currently
    // being processed, so move the buffer counter past them.
    if (state.writing) {
      c++;
      break;
    }
  }

  state.bufferProcessing = false;
  if (c < state.buffer.length)
    state.buffer = state.buffer.slice(c);
  else
    state.buffer.length = 0;
}

Writable.prototype._write = function(chunk, encoding, cb) {
  cb(new Error('not implemented'));
};

Writable.prototype.end = function(chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (typeof chunk !== 'undefined' && chunk !== null)
    this.write(chunk, encoding);

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished)
    endWritable(this, state, cb);
};


function needFinish(stream, state) {
  return (state.ending &&
          state.length === 0 &&
          !state.finished &&
          !state.writing);
}

function finishMaybe(stream, state) {
  var need = needFinish(stream, state);
  if (need) {
    state.finished = true;
    stream.emit('finish');
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished)
      setImmediate(cb);
    else
      stream.once('finish', cb);
  }
  state.ended = true;
}

},{"./index.js":178,"buffer":171,"inherits":175,"process/browser.js":179}],184:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var Buffer = require('buffer').Buffer;

function assertEncoding(encoding) {
  if (encoding && !Buffer.isEncoding(encoding)) {
    throw new Error('Unknown encoding: ' + encoding);
  }
}

var StringDecoder = exports.StringDecoder = function(encoding) {
  this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
  assertEncoding(encoding);
  switch (this.encoding) {
    case 'utf8':
      // CESU-8 represents each of Surrogate Pair by 3-bytes
      this.surrogateSize = 3;
      break;
    case 'ucs2':
    case 'utf16le':
      // UTF-16 represents each of Surrogate Pair by 2-bytes
      this.surrogateSize = 2;
      this.detectIncompleteChar = utf16DetectIncompleteChar;
      break;
    case 'base64':
      // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
      this.surrogateSize = 3;
      this.detectIncompleteChar = base64DetectIncompleteChar;
      break;
    default:
      this.write = passThroughWrite;
      return;
  }

  this.charBuffer = new Buffer(6);
  this.charReceived = 0;
  this.charLength = 0;
};


StringDecoder.prototype.write = function(buffer) {
  var charStr = '';
  var offset = 0;

  // if our last write ended with an incomplete multibyte character
  while (this.charLength) {
    // determine how many remaining bytes this buffer has to offer for this char
    var i = (buffer.length >= this.charLength - this.charReceived) ?
                this.charLength - this.charReceived :
                buffer.length;

    // add the new bytes to the char buffer
    buffer.copy(this.charBuffer, this.charReceived, offset, i);
    this.charReceived += (i - offset);
    offset = i;

    if (this.charReceived < this.charLength) {
      // still not enough chars in this buffer? wait for more ...
      return '';
    }

    // get the character that was split
    charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

    // lead surrogate (D800-DBFF) is also the incomplete character
    var charCode = charStr.charCodeAt(charStr.length - 1);
    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
      this.charLength += this.surrogateSize;
      charStr = '';
      continue;
    }
    this.charReceived = this.charLength = 0;

    // if there are no more bytes in this buffer, just emit our char
    if (i == buffer.length) return charStr;

    // otherwise cut off the characters end from the beginning of this buffer
    buffer = buffer.slice(i, buffer.length);
    break;
  }

  var lenIncomplete = this.detectIncompleteChar(buffer);

  var end = buffer.length;
  if (this.charLength) {
    // buffer the incomplete character bytes we got
    buffer.copy(this.charBuffer, 0, buffer.length - lenIncomplete, end);
    this.charReceived = lenIncomplete;
    end -= lenIncomplete;
  }

  charStr += buffer.toString(this.encoding, 0, end);

  var end = charStr.length - 1;
  var charCode = charStr.charCodeAt(end);
  // lead surrogate (D800-DBFF) is also the incomplete character
  if (charCode >= 0xD800 && charCode <= 0xDBFF) {
    var size = this.surrogateSize;
    this.charLength += size;
    this.charReceived += size;
    this.charBuffer.copy(this.charBuffer, size, 0, size);
    this.charBuffer.write(charStr.charAt(charStr.length - 1), this.encoding);
    return charStr.substring(0, end);
  }

  // or just emit the charStr
  return charStr;
};

StringDecoder.prototype.detectIncompleteChar = function(buffer) {
  // determine how many bytes we have to check at the end of this buffer
  var i = (buffer.length >= 3) ? 3 : buffer.length;

  // Figure out if one of the last i bytes of our buffer announces an
  // incomplete char.
  for (; i > 0; i--) {
    var c = buffer[buffer.length - i];

    // See http://en.wikipedia.org/wiki/UTF-8#Description

    // 110XXXXX
    if (i == 1 && c >> 5 == 0x06) {
      this.charLength = 2;
      break;
    }

    // 1110XXXX
    if (i <= 2 && c >> 4 == 0x0E) {
      this.charLength = 3;
      break;
    }

    // 11110XXX
    if (i <= 3 && c >> 3 == 0x1E) {
      this.charLength = 4;
      break;
    }
  }

  return i;
};

StringDecoder.prototype.end = function(buffer) {
  var res = '';
  if (buffer && buffer.length)
    res = this.write(buffer);

  if (this.charReceived) {
    var cr = this.charReceived;
    var buf = this.charBuffer;
    var enc = this.encoding;
    res += buf.slice(0, cr).toString(enc);
  }

  return res;
};

function passThroughWrite(buffer) {
  return buffer.toString(this.encoding);
}

function utf16DetectIncompleteChar(buffer) {
  var incomplete = this.charReceived = buffer.length % 2;
  this.charLength = incomplete ? 2 : 0;
  return incomplete;
}

function base64DetectIncompleteChar(buffer) {
  var incomplete = this.charReceived = buffer.length % 3;
  this.charLength = incomplete ? 3 : 0;
  return incomplete;
}

},{"buffer":171}],185:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],186:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":185,"inherits":175,"oMfpAn":176}],187:[function(require,module,exports){
'use strict';

var asap = require('asap')

module.exports = Promise
function Promise(fn) {
  if (typeof this !== 'object') throw new TypeError('Promises must be constructed via new')
  if (typeof fn !== 'function') throw new TypeError('not a function')
  var state = null
  var value = null
  var deferreds = []
  var self = this

  this.then = function(onFulfilled, onRejected) {
    return new Promise(function(resolve, reject) {
      handle(new Handler(onFulfilled, onRejected, resolve, reject))
    })
  }

  function handle(deferred) {
    if (state === null) {
      deferreds.push(deferred)
      return
    }
    asap(function() {
      var cb = state ? deferred.onFulfilled : deferred.onRejected
      if (cb === null) {
        (state ? deferred.resolve : deferred.reject)(value)
        return
      }
      var ret
      try {
        ret = cb(value)
      }
      catch (e) {
        deferred.reject(e)
        return
      }
      deferred.resolve(ret)
    })
  }

  function resolve(newValue) {
    try { //Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
      if (newValue === self) throw new TypeError('A promise cannot be resolved with itself.')
      if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
        var then = newValue.then
        if (typeof then === 'function') {
          doResolve(then.bind(newValue), resolve, reject)
          return
        }
      }
      state = true
      value = newValue
      finale()
    } catch (e) { reject(e) }
  }

  function reject(newValue) {
    state = false
    value = newValue
    finale()
  }

  function finale() {
    for (var i = 0, len = deferreds.length; i < len; i++)
      handle(deferreds[i])
    deferreds = null
  }

  doResolve(fn, resolve, reject)
}


function Handler(onFulfilled, onRejected, resolve, reject){
  this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null
  this.onRejected = typeof onRejected === 'function' ? onRejected : null
  this.resolve = resolve
  this.reject = reject
}

/**
 * Take a potentially misbehaving resolver function and make sure
 * onFulfilled and onRejected are only called once.
 *
 * Makes no guarantees about asynchrony.
 */
function doResolve(fn, onFulfilled, onRejected) {
  var done = false;
  try {
    fn(function (value) {
      if (done) return
      done = true
      onFulfilled(value)
    }, function (reason) {
      if (done) return
      done = true
      onRejected(reason)
    })
  } catch (ex) {
    if (done) return
    done = true
    onRejected(ex)
  }
}

},{"asap":189}],188:[function(require,module,exports){
'use strict';

//This file contains then/promise specific extensions to the core promise API

var Promise = require('./core.js')
var asap = require('asap')

module.exports = Promise

/* Static Functions */

function ValuePromise(value) {
  this.then = function (onFulfilled) {
    if (typeof onFulfilled !== 'function') return this
    return new Promise(function (resolve, reject) {
      asap(function () {
        try {
          resolve(onFulfilled(value))
        } catch (ex) {
          reject(ex);
        }
      })
    })
  }
}
ValuePromise.prototype = Object.create(Promise.prototype)

var TRUE = new ValuePromise(true)
var FALSE = new ValuePromise(false)
var NULL = new ValuePromise(null)
var UNDEFINED = new ValuePromise(undefined)
var ZERO = new ValuePromise(0)
var EMPTYSTRING = new ValuePromise('')

Promise.resolve = function (value) {
  if (value instanceof Promise) return value

  if (value === null) return NULL
  if (value === undefined) return UNDEFINED
  if (value === true) return TRUE
  if (value === false) return FALSE
  if (value === 0) return ZERO
  if (value === '') return EMPTYSTRING

  if (typeof value === 'object' || typeof value === 'function') {
    try {
      var then = value.then
      if (typeof then === 'function') {
        return new Promise(then.bind(value))
      }
    } catch (ex) {
      return new Promise(function (resolve, reject) {
        reject(ex)
      })
    }
  }

  return new ValuePromise(value)
}

Promise.from = Promise.cast = function (value) {
  var err = new Error('Promise.from and Promise.cast are deprecated, use Promise.resolve instead')
  err.name = 'Warning'
  console.warn(err.stack)
  return Promise.resolve(value)
}

Promise.denodeify = function (fn, argumentCount) {
  argumentCount = argumentCount || Infinity
  return function () {
    var self = this
    var args = Array.prototype.slice.call(arguments)
    return new Promise(function (resolve, reject) {
      while (args.length && args.length > argumentCount) {
        args.pop()
      }
      args.push(function (err, res) {
        if (err) reject(err)
        else resolve(res)
      })
      fn.apply(self, args)
    })
  }
}
Promise.nodeify = function (fn) {
  return function () {
    var args = Array.prototype.slice.call(arguments)
    var callback = typeof args[args.length - 1] === 'function' ? args.pop() : null
    try {
      return fn.apply(this, arguments).nodeify(callback)
    } catch (ex) {
      if (callback === null || typeof callback == 'undefined') {
        return new Promise(function (resolve, reject) { reject(ex) })
      } else {
        asap(function () {
          callback(ex)
        })
      }
    }
  }
}

Promise.all = function () {
  var calledWithArray = arguments.length === 1 && Array.isArray(arguments[0])
  var args = Array.prototype.slice.call(calledWithArray ? arguments[0] : arguments)

  if (!calledWithArray) {
    var err = new Error('Promise.all should be called with a single array, calling it with multiple arguments is deprecated')
    err.name = 'Warning'
    console.warn(err.stack)
  }

  return new Promise(function (resolve, reject) {
    if (args.length === 0) return resolve([])
    var remaining = args.length
    function res(i, val) {
      try {
        if (val && (typeof val === 'object' || typeof val === 'function')) {
          var then = val.then
          if (typeof then === 'function') {
            then.call(val, function (val) { res(i, val) }, reject)
            return
          }
        }
        args[i] = val
        if (--remaining === 0) {
          resolve(args);
        }
      } catch (ex) {
        reject(ex)
      }
    }
    for (var i = 0; i < args.length; i++) {
      res(i, args[i])
    }
  })
}

Promise.reject = function (value) {
  return new Promise(function (resolve, reject) { 
    reject(value);
  });
}

Promise.race = function (values) {
  return new Promise(function (resolve, reject) { 
    values.forEach(function(value){
      Promise.resolve(value).then(resolve, reject);
    })
  });
}

/* Prototype Methods */

Promise.prototype.done = function (onFulfilled, onRejected) {
  var self = arguments.length ? this.then.apply(this, arguments) : this
  self.then(null, function (err) {
    asap(function () {
      throw err
    })
  })
}

Promise.prototype.nodeify = function (callback) {
  if (typeof callback != 'function') return this

  this.then(function (value) {
    asap(function () {
      callback(null, value)
    })
  }, function (err) {
    asap(function () {
      callback(err)
    })
  })
}

Promise.prototype['catch'] = function (onRejected) {
  return this.then(null, onRejected);
}

},{"./core.js":187,"asap":189}],189:[function(require,module,exports){
(function (process){

// Use the fastest possible means to execute a task in a future turn
// of the event loop.

// linked list of tasks (single, with head node)
var head = {task: void 0, next: null};
var tail = head;
var flushing = false;
var requestFlush = void 0;
var isNodeJS = false;

function flush() {
    /* jshint loopfunc: true */

    while (head.next) {
        head = head.next;
        var task = head.task;
        head.task = void 0;
        var domain = head.domain;

        if (domain) {
            head.domain = void 0;
            domain.enter();
        }

        try {
            task();

        } catch (e) {
            if (isNodeJS) {
                // In node, uncaught exceptions are considered fatal errors.
                // Re-throw them synchronously to interrupt flushing!

                // Ensure continuation if the uncaught exception is suppressed
                // listening "uncaughtException" events (as domains does).
                // Continue in next event to avoid tick recursion.
                if (domain) {
                    domain.exit();
                }
                setTimeout(flush, 0);
                if (domain) {
                    domain.enter();
                }

                throw e;

            } else {
                // In browsers, uncaught exceptions are not fatal.
                // Re-throw them asynchronously to avoid slow-downs.
                setTimeout(function() {
                   throw e;
                }, 0);
            }
        }

        if (domain) {
            domain.exit();
        }
    }

    flushing = false;
}

if (typeof process !== "undefined" && process.nextTick) {
    // Node.js before 0.9. Note that some fake-Node environments, like the
    // Mocha test runner, introduce a `process` global without a `nextTick`.
    isNodeJS = true;

    requestFlush = function () {
        process.nextTick(flush);
    };

} else if (typeof setImmediate === "function") {
    // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
    if (typeof window !== "undefined") {
        requestFlush = setImmediate.bind(window, flush);
    } else {
        requestFlush = function () {
            setImmediate(flush);
        };
    }

} else if (typeof MessageChannel !== "undefined") {
    // modern browsers
    // http://www.nonblocking.io/2011/06/windownexttick.html
    var channel = new MessageChannel();
    channel.port1.onmessage = flush;
    requestFlush = function () {
        channel.port2.postMessage(0);
    };

} else {
    // old browsers
    requestFlush = function () {
        setTimeout(flush, 0);
    };
}

function asap(task) {
    tail = tail.next = {
        task: task,
        domain: isNodeJS && process.domain,
        next: null
    };

    if (!flushing) {
        flushing = true;
        requestFlush();
    }
};

module.exports = asap;


}).call(this,require("oMfpAn"))
},{"oMfpAn":176}],190:[function(require,module,exports){
// Some code originally from async_storage.js in
// [Gaia](https://github.com/mozilla-b2g/gaia).
(function() {
    'use strict';

    // Originally found in https://github.com/mozilla-b2g/gaia/blob/e8f624e4cc9ea945727278039b3bc9bcb9f8667a/shared/js/async_storage.js

    // Promises!
    var Promise = (typeof module !== 'undefined' && module.exports) ?
                  require('promise') : this.Promise;

    // Initialize IndexedDB; fall back to vendor-prefixed versions if needed.
    var indexedDB = indexedDB || this.indexedDB || this.webkitIndexedDB ||
                    this.mozIndexedDB || this.OIndexedDB ||
                    this.msIndexedDB;

    // If IndexedDB isn't available, we get outta here!
    if (!indexedDB) {
        return;
    }

    // Open the IndexedDB database (automatically creates one if one didn't
    // previously exist), using any options set in the config.
    function _initStorage(options) {
        var self = this;
        var dbInfo = {
            db: null
        };

        if (options) {
            for (var i in options) {
                dbInfo[i] = options[i];
            }
        }

        return new Promise(function(resolve, reject) {
            var openreq = indexedDB.open(dbInfo.name, dbInfo.version);
            openreq.onerror = function() {
                reject(openreq.error);
            };
            openreq.onupgradeneeded = function() {
                // First time setup: create an empty object store
                openreq.result.createObjectStore(dbInfo.storeName);
            };
            openreq.onsuccess = function() {
                dbInfo.db = openreq.result;
                self._dbInfo = dbInfo;
                resolve();
            };
        });
    }

    function getItem(key, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly')
                    .objectStore(dbInfo.storeName);
                var req = store.get(key);

                req.onsuccess = function() {
                    var value = req.result;
                    if (value === undefined) {
                        value = null;
                    }

                    resolve(value);
                };

                req.onerror = function() {
                    reject(req.error);
                };
            }).catch(reject);
        });

        executeDeferedCallback(promise, callback);
        return promise;
    }

    // Iterate over all items stored in database.
    function iterate(iterator, callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly')
                                     .objectStore(dbInfo.storeName);

                var req = store.openCursor();

                req.onsuccess = function() {
                    var cursor = req.result;

                    if (cursor) {
                        var result = iterator(cursor.value, cursor.key);

                        if (result !== void(0)) {
                            resolve(result);
                        } else {
                            cursor.continue();
                        }
                    } else {
                        resolve();
                    }
                };

                req.onerror = function() {
                    reject(req.error);
                };
            }).catch(reject);
        });

        executeDeferedCallback(promise, callback);

        return promise;
    }

    function setItem(key, value, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                var store = dbInfo.db.transaction(dbInfo.storeName, 'readwrite')
                              .objectStore(dbInfo.storeName);

                // The reason we don't _save_ null is because IE 10 does
                // not support saving the `null` type in IndexedDB. How
                // ironic, given the bug below!
                // See: https://github.com/mozilla/localForage/issues/161
                if (value === null) {
                    value = undefined;
                }

                var req = store.put(value, key);
                req.onsuccess = function() {
                    // Cast to undefined so the value passed to
                    // callback/promise is the same as what one would get out
                    // of `getItem()` later. This leads to some weirdness
                    // (setItem('foo', undefined) will return `null`), but
                    // it's not my fault localStorage is our baseline and that
                    // it's weird.
                    if (value === undefined) {
                        value = null;
                    }

                    resolve(value);
                };
                req.onerror = function() {
                    reject(req.error);
                };
            }).catch(reject);
        });

        executeDeferedCallback(promise, callback);
        return promise;
    }

    function removeItem(key, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                var store = dbInfo.db.transaction(dbInfo.storeName, 'readwrite')
                              .objectStore(dbInfo.storeName);

                // We use a Grunt task to make this safe for IE and some
                // versions of Android (including those used by Cordova).
                // Normally IE won't like `.delete()` and will insist on
                // using `['delete']()`, but we have a build step that
                // fixes this for us now.
                var req = store.delete(key);
                req.onsuccess = function() {
                    resolve();
                };

                req.onerror = function() {
                    reject(req.error);
                };

                // The request will be aborted if we've exceeded our storage
                // space. In this case, we will reject with a specific
                // "QuotaExceededError".
                req.onabort = function(event) {
                    var error = event.target.error;
                    if (error === 'QuotaExceededError') {
                        reject(error);
                    }
                };
            }).catch(reject);
        });

        executeDeferedCallback(promise, callback);
        return promise;
    }

    function clear(callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                var store = dbInfo.db.transaction(dbInfo.storeName, 'readwrite')
                              .objectStore(dbInfo.storeName);
                var req = store.clear();

                req.onsuccess = function() {
                    resolve();
                };

                req.onerror = function() {
                    reject(req.error);
                };
            }).catch(reject);
        });

        executeDeferedCallback(promise, callback);
        return promise;
    }

    function length(callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly')
                              .objectStore(dbInfo.storeName);
                var req = store.count();

                req.onsuccess = function() {
                    resolve(req.result);
                };

                req.onerror = function() {
                    reject(req.error);
                };
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function key(n, callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            if (n < 0) {
                resolve(null);

                return;
            }

            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly')
                              .objectStore(dbInfo.storeName);

                var advanced = false;
                var req = store.openCursor();
                req.onsuccess = function() {
                    var cursor = req.result;
                    if (!cursor) {
                        // this means there weren't enough keys
                        resolve(null);

                        return;
                    }

                    if (n === 0) {
                        // We have the first key, return it if that's what they
                        // wanted.
                        resolve(cursor.key);
                    } else {
                        if (!advanced) {
                            // Otherwise, ask the cursor to skip ahead n
                            // records.
                            advanced = true;
                            cursor.advance(n);
                        } else {
                            // When we get here, we've got the nth key.
                            resolve(cursor.key);
                        }
                    }
                };

                req.onerror = function() {
                    reject(req.error);
                };
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function keys(callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly')
                              .objectStore(dbInfo.storeName);

                var req = store.openCursor();
                var keys = [];

                req.onsuccess = function() {
                    var cursor = req.result;

                    if (!cursor) {
                        resolve(keys);
                        return;
                    }

                    keys.push(cursor.key);
                    cursor.continue();
                };

                req.onerror = function() {
                    reject(req.error);
                };
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function executeCallback(promise, callback) {
        if (callback) {
            promise.then(function(result) {
                callback(null, result);
            }, function(error) {
                callback(error);
            });
        }
    }

    function executeDeferedCallback(promise, callback) {
        if (callback) {
            promise.then(function(result) {
                deferCallback(callback, result);
            }, function(error) {
                callback(error);
            });
        }
    }

    // Under Chrome the callback is called before the changes (save, clear)
    // are actually made. So we use a defer function which wait that the
    // call stack to be empty.
    // For more info : https://github.com/mozilla/localForage/issues/175
    // Pull request : https://github.com/mozilla/localForage/pull/178
    function deferCallback(callback, result) {
        if (callback) {
            return setTimeout(function() {
                return callback(null, result);
            }, 0);
        }
    }

    var asyncStorage = {
        _driver: 'asyncStorage',
        _initStorage: _initStorage,
        iterate: iterate,
        getItem: getItem,
        setItem: setItem,
        removeItem: removeItem,
        clear: clear,
        length: length,
        key: key,
        keys: keys
    };

    if (typeof define === 'function' && define.amd) {
        define('asyncStorage', function() {
            return asyncStorage;
        });
    } else if (typeof module !== 'undefined' && module.exports) {
        module.exports = asyncStorage;
    } else {
        this.asyncStorage = asyncStorage;
    }
}).call(window);

},{"promise":188}],191:[function(require,module,exports){
// If IndexedDB isn't available, we'll fall back to localStorage.
// Note that this will have considerable performance and storage
// side-effects (all data will be serialized on save and only data that
// can be converted to a string via `JSON.stringify()` will be saved).
(function() {
    'use strict';

    // Promises!
    var Promise = (typeof module !== 'undefined' && module.exports) ?
                  require('promise') : this.Promise;
    var localStorage = null;

    // If the app is running inside a Google Chrome packaged webapp, or some
    // other context where localStorage isn't available, we don't use
    // localStorage. This feature detection is preferred over the old
    // `if (window.chrome && window.chrome.runtime)` code.
    // See: https://github.com/mozilla/localForage/issues/68
    try {
        // If localStorage isn't available, we get outta here!
        // This should be inside a try catch
        if (!this.localStorage || !('setItem' in this.localStorage)) {
            return;
        }
        // Initialize localStorage and create a variable to use throughout
        // the code.
        localStorage = this.localStorage;
    } catch (e) {
        return;
    }

    // Config the localStorage backend, using options set in the config.
    function _initStorage(options) {
        var self = this;
        var dbInfo = {};
        if (options) {
            for (var i in options) {
                dbInfo[i] = options[i];
            }
        }

        dbInfo.keyPrefix = dbInfo.name + '/';

        self._dbInfo = dbInfo;
        return Promise.resolve();
    }

    var SERIALIZED_MARKER = '__lfsc__:';
    var SERIALIZED_MARKER_LENGTH = SERIALIZED_MARKER.length;

    // OMG the serializations!
    var TYPE_ARRAYBUFFER = 'arbf';
    var TYPE_BLOB = 'blob';
    var TYPE_INT8ARRAY = 'si08';
    var TYPE_UINT8ARRAY = 'ui08';
    var TYPE_UINT8CLAMPEDARRAY = 'uic8';
    var TYPE_INT16ARRAY = 'si16';
    var TYPE_INT32ARRAY = 'si32';
    var TYPE_UINT16ARRAY = 'ur16';
    var TYPE_UINT32ARRAY = 'ui32';
    var TYPE_FLOAT32ARRAY = 'fl32';
    var TYPE_FLOAT64ARRAY = 'fl64';
    var TYPE_SERIALIZED_MARKER_LENGTH = SERIALIZED_MARKER_LENGTH +
                                        TYPE_ARRAYBUFFER.length;

    // Remove all keys from the datastore, effectively destroying all data in
    // the app's key/value store!
    function clear(callback) {
        var self = this;
        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var keyPrefix = self._dbInfo.keyPrefix;

                for (var i = localStorage.length - 1; i >= 0; i--) {
                    var key = localStorage.key(i);

                    if (key.indexOf(keyPrefix) === 0) {
                        localStorage.removeItem(key);
                    }
                }

                resolve();
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Retrieve an item from the store. Unlike the original async_storage
    // library in Gaia, we don't modify return values at all. If a key's value
    // is `undefined`, we pass that value to the callback function.
    function getItem(key, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                try {
                    var dbInfo = self._dbInfo;
                    var result = localStorage.getItem(dbInfo.keyPrefix + key);

                    // If a result was found, parse it from the serialized
                    // string into a JS object. If result isn't truthy, the key
                    // is likely undefined and we'll pass it straight to the
                    // callback.
                    if (result) {
                        result = _deserialize(result);
                    }

                    resolve(result);
                } catch (e) {
                    reject(e);
                }
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Iterate over all items in the store.
    function iterate(iterator, callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                try {
                    var keyPrefix = self._dbInfo.keyPrefix;
                    var keyPrefixLength = keyPrefix.length;
                    var length = localStorage.length;

                    for (var i = 0; i < length; i++) {
                        var key = localStorage.key(i);
                        var value = localStorage.getItem(key);

                        // If a result was found, parse it from the serialized
                        // string into a JS object. If result isn't truthy, the
                        // key is likely undefined and we'll pass it straight
                        // to the iterator.
                        if (value) {
                            value = _deserialize(value);
                        }

                        value = iterator(value, key.substring(keyPrefixLength));

                        if (value !== void(0)) {
                            resolve(value);
                            return;
                        }
                    }

                    resolve();
                } catch (e) {
                    reject(e);
                }
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Same as localStorage's key() method, except takes a callback.
    function key(n, callback) {
        var self = this;
        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                var result;
                try {
                    result = localStorage.key(n);
                } catch (error) {
                    result = null;
                }

                // Remove the prefix from the key, if a key is found.
                if (result) {
                    result = result.substring(dbInfo.keyPrefix.length);
                }

                resolve(result);
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function keys(callback) {
        var self = this;
        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                var length = localStorage.length;
                var keys = [];

                for (var i = 0; i < length; i++) {
                    if (localStorage.key(i).indexOf(dbInfo.keyPrefix) === 0) {
                        keys.push(localStorage.key(i).substring(dbInfo.keyPrefix.length));
                    }
                }

                resolve(keys);
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Supply the number of keys in the datastore to the callback function.
    function length(callback) {
        var self = this;
        var promise = new Promise(function(resolve, reject) {
            self.keys().then(function(keys) {
                resolve(keys.length);
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Remove an item from the store, nice and simple.
    function removeItem(key, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                localStorage.removeItem(dbInfo.keyPrefix + key);

                resolve();
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Deserialize data we've inserted into a value column/field. We place
    // special markers into our strings to mark them as encoded; this isn't
    // as nice as a meta field, but it's the only sane thing we can do whilst
    // keeping localStorage support intact.
    //
    // Oftentimes this will just deserialize JSON content, but if we have a
    // special marker (SERIALIZED_MARKER, defined above), we will extract
    // some kind of arraybuffer/binary data/typed array out of the string.
    function _deserialize(value) {
        // If we haven't marked this string as being specially serialized (i.e.
        // something other than serialized JSON), we can just return it and be
        // done with it.
        if (value.substring(0,
            SERIALIZED_MARKER_LENGTH) !== SERIALIZED_MARKER) {
            return JSON.parse(value);
        }

        // The following code deals with deserializing some kind of Blob or
        // TypedArray. First we separate out the type of data we're dealing
        // with from the data itself.
        var serializedString = value.substring(TYPE_SERIALIZED_MARKER_LENGTH);
        var type = value.substring(SERIALIZED_MARKER_LENGTH,
                                   TYPE_SERIALIZED_MARKER_LENGTH);

        // Fill the string into a ArrayBuffer.
        // 2 bytes for each char.
        var buffer = new ArrayBuffer(serializedString.length * 2);
        var bufferView = new Uint16Array(buffer);
        for (var i = serializedString.length - 1; i >= 0; i--) {
            bufferView[i] = serializedString.charCodeAt(i);
        }

        // Return the right type based on the code/type set during
        // serialization.
        switch (type) {
            case TYPE_ARRAYBUFFER:
                return buffer;
            case TYPE_BLOB:
                return new Blob([buffer]);
            case TYPE_INT8ARRAY:
                return new Int8Array(buffer);
            case TYPE_UINT8ARRAY:
                return new Uint8Array(buffer);
            case TYPE_UINT8CLAMPEDARRAY:
                return new Uint8ClampedArray(buffer);
            case TYPE_INT16ARRAY:
                return new Int16Array(buffer);
            case TYPE_UINT16ARRAY:
                return new Uint16Array(buffer);
            case TYPE_INT32ARRAY:
                return new Int32Array(buffer);
            case TYPE_UINT32ARRAY:
                return new Uint32Array(buffer);
            case TYPE_FLOAT32ARRAY:
                return new Float32Array(buffer);
            case TYPE_FLOAT64ARRAY:
                return new Float64Array(buffer);
            default:
                throw new Error('Unkown type: ' + type);
        }
    }

    // Converts a buffer to a string to store, serialized, in the backend
    // storage library.
    function _bufferToString(buffer) {
        var str = '';
        var uint16Array = new Uint16Array(buffer);

        try {
            str = String.fromCharCode.apply(null, uint16Array);
        } catch (e) {
            // This is a fallback implementation in case the first one does
            // not work. This is required to get the phantomjs passing...
            for (var i = 0; i < uint16Array.length; i++) {
                str += String.fromCharCode(uint16Array[i]);
            }
        }

        return str;
    }

    // Serialize a value, afterwards executing a callback (which usually
    // instructs the `setItem()` callback/promise to be executed). This is how
    // we store binary data with localStorage.
    function _serialize(value, callback) {
        var valueString = '';
        if (value) {
            valueString = value.toString();
        }

        // Cannot use `value instanceof ArrayBuffer` or such here, as these
        // checks fail when running the tests using casper.js...
        //
        // TODO: See why those tests fail and use a better solution.
        if (value && (value.toString() === '[object ArrayBuffer]' ||
                      value.buffer &&
                      value.buffer.toString() === '[object ArrayBuffer]')) {
            // Convert binary arrays to a string and prefix the string with
            // a special marker.
            var buffer;
            var marker = SERIALIZED_MARKER;

            if (value instanceof ArrayBuffer) {
                buffer = value;
                marker += TYPE_ARRAYBUFFER;
            } else {
                buffer = value.buffer;

                if (valueString === '[object Int8Array]') {
                    marker += TYPE_INT8ARRAY;
                } else if (valueString === '[object Uint8Array]') {
                    marker += TYPE_UINT8ARRAY;
                } else if (valueString === '[object Uint8ClampedArray]') {
                    marker += TYPE_UINT8CLAMPEDARRAY;
                } else if (valueString === '[object Int16Array]') {
                    marker += TYPE_INT16ARRAY;
                } else if (valueString === '[object Uint16Array]') {
                    marker += TYPE_UINT16ARRAY;
                } else if (valueString === '[object Int32Array]') {
                    marker += TYPE_INT32ARRAY;
                } else if (valueString === '[object Uint32Array]') {
                    marker += TYPE_UINT32ARRAY;
                } else if (valueString === '[object Float32Array]') {
                    marker += TYPE_FLOAT32ARRAY;
                } else if (valueString === '[object Float64Array]') {
                    marker += TYPE_FLOAT64ARRAY;
                } else {
                    callback(new Error('Failed to get type for BinaryArray'));
                }
            }

            callback(marker + _bufferToString(buffer));
        } else if (valueString === '[object Blob]') {
            // Conver the blob to a binaryArray and then to a string.
            var fileReader = new FileReader();

            fileReader.onload = function() {
                var str = _bufferToString(this.result);

                callback(SERIALIZED_MARKER + TYPE_BLOB + str);
            };

            fileReader.readAsArrayBuffer(value);
        } else {
            try {
                callback(JSON.stringify(value));
            } catch (e) {
                window.console.error("Couldn't convert value into a JSON " +
                                     'string: ', value);

                callback(e);
            }
        }
    }

    // Set a key's value and run an optional callback once the value is set.
    // Unlike Gaia's implementation, the callback function is passed the value,
    // in case you want to operate on that value only after you're sure it
    // saved, or something like that.
    function setItem(key, value, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                // Convert undefined values to null.
                // https://github.com/mozilla/localForage/pull/42
                if (value === undefined) {
                    value = null;
                }

                // Save the original value to pass to the callback.
                var originalValue = value;

                _serialize(value, function(value, error) {
                    if (error) {
                        reject(error);
                    } else {
                        try {
                            var dbInfo = self._dbInfo;
                            localStorage.setItem(dbInfo.keyPrefix + key, value);
                        } catch (e) {
                            // localStorage capacity exceeded.
                            // TODO: Make this a specific error/event.
                            if (e.name === 'QuotaExceededError' ||
                                e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                                reject(e);
                            }
                        }

                        resolve(originalValue);
                    }
                });
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function executeCallback(promise, callback) {
        if (callback) {
            promise.then(function(result) {
                callback(null, result);
            }, function(error) {
                callback(error);
            });
        }
    }

    var localStorageWrapper = {
        _driver: 'localStorageWrapper',
        _initStorage: _initStorage,
        // Default API, from Gaia/localStorage.
        iterate: iterate,
        getItem: getItem,
        setItem: setItem,
        removeItem: removeItem,
        clear: clear,
        length: length,
        key: key,
        keys: keys
    };

    if (typeof define === 'function' && define.amd) {
        define('localStorageWrapper', function() {
            return localStorageWrapper;
        });
    } else if (typeof module !== 'undefined' && module.exports) {
        module.exports = localStorageWrapper;
    } else {
        this.localStorageWrapper = localStorageWrapper;
    }
}).call(window);

},{"promise":188}],192:[function(require,module,exports){
/*
 * Includes code from:
 *
 * base64-arraybuffer
 * https://github.com/niklasvh/base64-arraybuffer
 *
 * Copyright (c) 2012 Niklas von Hertzen
 * Licensed under the MIT license.
 */
(function() {
    'use strict';

    // Sadly, the best way to save binary data in WebSQL is Base64 serializing
    // it, so this is how we store it to prevent very strange errors with less
    // verbose ways of binary <-> string data storage.
    var BASE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

    // Promises!
    var Promise = (typeof module !== 'undefined' && module.exports) ?
                  require('promise') : this.Promise;

    var openDatabase = this.openDatabase;

    var SERIALIZED_MARKER = '__lfsc__:';
    var SERIALIZED_MARKER_LENGTH = SERIALIZED_MARKER.length;

    // OMG the serializations!
    var TYPE_ARRAYBUFFER = 'arbf';
    var TYPE_BLOB = 'blob';
    var TYPE_INT8ARRAY = 'si08';
    var TYPE_UINT8ARRAY = 'ui08';
    var TYPE_UINT8CLAMPEDARRAY = 'uic8';
    var TYPE_INT16ARRAY = 'si16';
    var TYPE_INT32ARRAY = 'si32';
    var TYPE_UINT16ARRAY = 'ur16';
    var TYPE_UINT32ARRAY = 'ui32';
    var TYPE_FLOAT32ARRAY = 'fl32';
    var TYPE_FLOAT64ARRAY = 'fl64';
    var TYPE_SERIALIZED_MARKER_LENGTH = SERIALIZED_MARKER_LENGTH +
                                        TYPE_ARRAYBUFFER.length;

    // If WebSQL methods aren't available, we can stop now.
    if (!openDatabase) {
        return;
    }

    // Open the WebSQL database (automatically creates one if one didn't
    // previously exist), using any options set in the config.
    function _initStorage(options) {
        var self = this;
        var dbInfo = {
            db: null
        };

        if (options) {
            for (var i in options) {
                dbInfo[i] = typeof(options[i]) !== 'string' ?
                            options[i].toString() : options[i];
            }
        }

        return new Promise(function(resolve, reject) {
            // Open the database; the openDatabase API will automatically
            // create it for us if it doesn't exist.
            try {
                dbInfo.db = openDatabase(dbInfo.name, String(dbInfo.version),
                                         dbInfo.description, dbInfo.size);
            } catch (e) {
                return self.setDriver('localStorageWrapper')
                    .then(function() {
                        return self._initStorage(options);
                    })
                    .then(resolve)
                    .catch(reject);
            }

            // Create our key/value table if it doesn't exist.
            dbInfo.db.transaction(function(t) {
                t.executeSql('CREATE TABLE IF NOT EXISTS ' + dbInfo.storeName +
                             ' (id INTEGER PRIMARY KEY, key unique, value)', [],
                             function() {
                    self._dbInfo = dbInfo;
                    resolve();
                }, function(t, error) {
                    reject(error);
                });
            });
        });
    }

    function getItem(key, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                dbInfo.db.transaction(function(t) {
                    t.executeSql('SELECT * FROM ' + dbInfo.storeName +
                                 ' WHERE key = ? LIMIT 1', [key],
                                 function(t, results) {
                        var result = results.rows.length ?
                                     results.rows.item(0).value : null;

                        // Check to see if this is serialized content we need to
                        // unpack.
                        if (result) {
                            result = _deserialize(result);
                        }

                        resolve(result);
                    }, function(t, error) {

                        reject(error);
                    });
                });
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function iterate(iterator, callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;

                dbInfo.db.transaction(function(t) {
                    t.executeSql('SELECT * FROM ' + dbInfo.storeName, [],
                        function(t, results) {
                            var rows = results.rows;
                            var length = rows.length;

                            for (var i = 0; i < length; i++) {
                                var item = rows.item(i);
                                var result = item.value;

                                // Check to see if this is serialized content
                                // we need to unpack.
                                if (result) {
                                    result = _deserialize(result);
                                }

                                result = iterator(result, item.key);

                                // void(0) prevents problems with redefinition
                                // of `undefined`.
                                if (result !== void(0)) {
                                    resolve(result);
                                    return;
                                }
                            }

                            resolve();
                        }, function(t, error) {
                            reject(error);
                        });
                });
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function setItem(key, value, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                // The localStorage API doesn't return undefined values in an
                // "expected" way, so undefined is always cast to null in all
                // drivers. See: https://github.com/mozilla/localForage/pull/42
                if (value === undefined) {
                    value = null;
                }

                // Save the original value to pass to the callback.
                var originalValue = value;

                _serialize(value, function(value, error) {
                    if (error) {
                        reject(error);
                    } else {
                        var dbInfo = self._dbInfo;
                        dbInfo.db.transaction(function(t) {
                            t.executeSql('INSERT OR REPLACE INTO ' +
                                         dbInfo.storeName +
                                         ' (key, value) VALUES (?, ?)',
                                         [key, value], function() {
                                resolve(originalValue);
                            }, function(t, error) {
                                reject(error);
                            });
                        }, function(sqlError) { // The transaction failed; check
                                                // to see if it's a quota error.
                            if (sqlError.code === sqlError.QUOTA_ERR) {
                                // We reject the callback outright for now, but
                                // it's worth trying to re-run the transaction.
                                // Even if the user accepts the prompt to use
                                // more storage on Safari, this error will
                                // be called.
                                //
                                // TODO: Try to re-run the transaction.
                                reject(sqlError);
                            }
                        });
                    }
                });
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function removeItem(key, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                dbInfo.db.transaction(function(t) {
                    t.executeSql('DELETE FROM ' + dbInfo.storeName +
                                 ' WHERE key = ?', [key], function() {

                        resolve();
                    }, function(t, error) {

                        reject(error);
                    });
                });
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Deletes every item in the table.
    // TODO: Find out if this resets the AUTO_INCREMENT number.
    function clear(callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                dbInfo.db.transaction(function(t) {
                    t.executeSql('DELETE FROM ' + dbInfo.storeName, [],
                                 function() {
                        resolve();
                    }, function(t, error) {
                        reject(error);
                    });
                });
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Does a simple `COUNT(key)` to get the number of items stored in
    // localForage.
    function length(callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                dbInfo.db.transaction(function(t) {
                    // Ahhh, SQL makes this one soooooo easy.
                    t.executeSql('SELECT COUNT(key) as c FROM ' +
                                 dbInfo.storeName, [], function(t, results) {
                        var result = results.rows.item(0).c;

                        resolve(result);
                    }, function(t, error) {

                        reject(error);
                    });
                });
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Return the key located at key index X; essentially gets the key from a
    // `WHERE id = ?`. This is the most efficient way I can think to implement
    // this rarely-used (in my experience) part of the API, but it can seem
    // inconsistent, because we do `INSERT OR REPLACE INTO` on `setItem()`, so
    // the ID of each key will change every time it's updated. Perhaps a stored
    // procedure for the `setItem()` SQL would solve this problem?
    // TODO: Don't change ID on `setItem()`.
    function key(n, callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                dbInfo.db.transaction(function(t) {
                    t.executeSql('SELECT key FROM ' + dbInfo.storeName +
                                 ' WHERE id = ? LIMIT 1', [n + 1],
                                 function(t, results) {
                        var result = results.rows.length ?
                                     results.rows.item(0).key : null;
                        resolve(result);
                    }, function(t, error) {
                        reject(error);
                    });
                });
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function keys(callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                dbInfo.db.transaction(function(t) {
                    t.executeSql('SELECT key FROM ' + dbInfo.storeName, [],
                                 function(t, results) {
                        var keys = [];

                        for (var i = 0; i < results.rows.length; i++) {
                            keys.push(results.rows.item(i).key);
                        }

                        resolve(keys);
                    }, function(t, error) {

                        reject(error);
                    });
                });
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Converts a buffer to a string to store, serialized, in the backend
    // storage library.
    function _bufferToString(buffer) {
        // base64-arraybuffer
        var bytes = new Uint8Array(buffer);
        var i;
        var base64String = '';

        for (i = 0; i < bytes.length; i += 3) {
            /*jslint bitwise: true */
            base64String += BASE_CHARS[bytes[i] >> 2];
            base64String += BASE_CHARS[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
            base64String += BASE_CHARS[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
            base64String += BASE_CHARS[bytes[i + 2] & 63];
        }

        if ((bytes.length % 3) === 2) {
            base64String = base64String.substring(0, base64String.length - 1) + '=';
        } else if (bytes.length % 3 === 1) {
            base64String = base64String.substring(0, base64String.length - 2) + '==';
        }

        return base64String;
    }

    // Deserialize data we've inserted into a value column/field. We place
    // special markers into our strings to mark them as encoded; this isn't
    // as nice as a meta field, but it's the only sane thing we can do whilst
    // keeping localStorage support intact.
    //
    // Oftentimes this will just deserialize JSON content, but if we have a
    // special marker (SERIALIZED_MARKER, defined above), we will extract
    // some kind of arraybuffer/binary data/typed array out of the string.
    function _deserialize(value) {
        // If we haven't marked this string as being specially serialized (i.e.
        // something other than serialized JSON), we can just return it and be
        // done with it.
        if (value.substring(0,
                            SERIALIZED_MARKER_LENGTH) !== SERIALIZED_MARKER) {
            return JSON.parse(value);
        }

        // The following code deals with deserializing some kind of Blob or
        // TypedArray. First we separate out the type of data we're dealing
        // with from the data itself.
        var serializedString = value.substring(TYPE_SERIALIZED_MARKER_LENGTH);
        var type = value.substring(SERIALIZED_MARKER_LENGTH,
                                   TYPE_SERIALIZED_MARKER_LENGTH);

        // Fill the string into a ArrayBuffer.
        var bufferLength = serializedString.length * 0.75;
        var len = serializedString.length;
        var i;
        var p = 0;
        var encoded1, encoded2, encoded3, encoded4;

        if (serializedString[serializedString.length - 1] === '=') {
            bufferLength--;
            if (serializedString[serializedString.length - 2] === '=') {
                bufferLength--;
            }
        }

        var buffer = new ArrayBuffer(bufferLength);
        var bytes = new Uint8Array(buffer);

        for (i = 0; i < len; i+=4) {
            encoded1 = BASE_CHARS.indexOf(serializedString[i]);
            encoded2 = BASE_CHARS.indexOf(serializedString[i+1]);
            encoded3 = BASE_CHARS.indexOf(serializedString[i+2]);
            encoded4 = BASE_CHARS.indexOf(serializedString[i+3]);

            /*jslint bitwise: true */
            bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
            bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
            bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
        }

        // Return the right type based on the code/type set during
        // serialization.
        switch (type) {
            case TYPE_ARRAYBUFFER:
                return buffer;
            case TYPE_BLOB:
                return new Blob([buffer]);
            case TYPE_INT8ARRAY:
                return new Int8Array(buffer);
            case TYPE_UINT8ARRAY:
                return new Uint8Array(buffer);
            case TYPE_UINT8CLAMPEDARRAY:
                return new Uint8ClampedArray(buffer);
            case TYPE_INT16ARRAY:
                return new Int16Array(buffer);
            case TYPE_UINT16ARRAY:
                return new Uint16Array(buffer);
            case TYPE_INT32ARRAY:
                return new Int32Array(buffer);
            case TYPE_UINT32ARRAY:
                return new Uint32Array(buffer);
            case TYPE_FLOAT32ARRAY:
                return new Float32Array(buffer);
            case TYPE_FLOAT64ARRAY:
                return new Float64Array(buffer);
            default:
                throw new Error('Unkown type: ' + type);
        }
    }

    // Serialize a value, afterwards executing a callback (which usually
    // instructs the `setItem()` callback/promise to be executed). This is how
    // we store binary data with localStorage.
    function _serialize(value, callback) {
        var valueString = '';
        if (value) {
            valueString = value.toString();
        }

        // Cannot use `value instanceof ArrayBuffer` or such here, as these
        // checks fail when running the tests using casper.js...
        //
        // TODO: See why those tests fail and use a better solution.
        if (value && (value.toString() === '[object ArrayBuffer]' ||
                      value.buffer &&
                      value.buffer.toString() === '[object ArrayBuffer]')) {
            // Convert binary arrays to a string and prefix the string with
            // a special marker.
            var buffer;
            var marker = SERIALIZED_MARKER;

            if (value instanceof ArrayBuffer) {
                buffer = value;
                marker += TYPE_ARRAYBUFFER;
            } else {
                buffer = value.buffer;

                if (valueString === '[object Int8Array]') {
                    marker += TYPE_INT8ARRAY;
                } else if (valueString === '[object Uint8Array]') {
                    marker += TYPE_UINT8ARRAY;
                } else if (valueString === '[object Uint8ClampedArray]') {
                    marker += TYPE_UINT8CLAMPEDARRAY;
                } else if (valueString === '[object Int16Array]') {
                    marker += TYPE_INT16ARRAY;
                } else if (valueString === '[object Uint16Array]') {
                    marker += TYPE_UINT16ARRAY;
                } else if (valueString === '[object Int32Array]') {
                    marker += TYPE_INT32ARRAY;
                } else if (valueString === '[object Uint32Array]') {
                    marker += TYPE_UINT32ARRAY;
                } else if (valueString === '[object Float32Array]') {
                    marker += TYPE_FLOAT32ARRAY;
                } else if (valueString === '[object Float64Array]') {
                    marker += TYPE_FLOAT64ARRAY;
                } else {
                    callback(new Error('Failed to get type for BinaryArray'));
                }
            }

            callback(marker + _bufferToString(buffer));
        } else if (valueString === '[object Blob]') {
            // Conver the blob to a binaryArray and then to a string.
            var fileReader = new FileReader();

            fileReader.onload = function() {
                var str = _bufferToString(this.result);

                callback(SERIALIZED_MARKER + TYPE_BLOB + str);
            };

            fileReader.readAsArrayBuffer(value);
        } else {
            try {
                callback(JSON.stringify(value));
            } catch (e) {
                window.console.error("Couldn't convert value into a JSON " +
                                     'string: ', value);

                callback(null, e);
            }
        }
    }

    function executeCallback(promise, callback) {
        if (callback) {
            promise.then(function(result) {
                callback(null, result);
            }, function(error) {
                callback(error);
            });
        }
    }

    var webSQLStorage = {
        _driver: 'webSQLStorage',
        _initStorage: _initStorage,
        iterate: iterate,
        getItem: getItem,
        setItem: setItem,
        removeItem: removeItem,
        clear: clear,
        length: length,
        key: key,
        keys: keys
    };

    if (typeof define === 'function' && define.amd) {
        define('webSQLStorage', function() {
            return webSQLStorage;
        });
    } else if (typeof module !== 'undefined' && module.exports) {
        module.exports = webSQLStorage;
    } else {
        this.webSQLStorage = webSQLStorage;
    }
}).call(window);

},{"promise":188}],193:[function(require,module,exports){
(function() {
    'use strict';

    // Promises!
    var Promise = (typeof module !== 'undefined' && module.exports) ?
                  require('promise') : this.Promise;

    // Custom drivers are stored here when `defineDriver()` is called.
    // They are shared across all instances of localForage.
    var CustomDrivers = {};

    var DriverType = {
        INDEXEDDB: 'asyncStorage',
        LOCALSTORAGE: 'localStorageWrapper',
        WEBSQL: 'webSQLStorage'
    };

    var DefaultDriverOrder = [
        DriverType.INDEXEDDB,
        DriverType.WEBSQL,
        DriverType.LOCALSTORAGE
    ];

    var LibraryMethods = [
        'clear',
        'getItem',
        'iterate',
        'key',
        'keys',
        'length',
        'removeItem',
        'setItem'
    ];

    var ModuleType = {
        DEFINE: 1,
        EXPORT: 2,
        WINDOW: 3
    };

    var DefaultConfig = {
        description: '',
        driver: DefaultDriverOrder.slice(),
        name: 'localforage',
        // Default DB size is _JUST UNDER_ 5MB, as it's the highest size
        // we can use without a prompt.
        size: 4980736,
        storeName: 'keyvaluepairs',
        version: 1.0
    };

    // Attaching to window (i.e. no module loader) is the assumed,
    // simple default.
    var moduleType = ModuleType.WINDOW;

    // Find out what kind of module setup we have; if none, we'll just attach
    // localForage to the main window.
    if (typeof define === 'function' && define.amd) {
        moduleType = ModuleType.DEFINE;
    } else if (typeof module !== 'undefined' && module.exports) {
        moduleType = ModuleType.EXPORT;
    }

    // Check to see if IndexedDB is available and if it is the latest
    // implementation; it's our preferred backend library. We use "_spec_test"
    // as the name of the database because it's not the one we'll operate on,
    // but it's useful to make sure its using the right spec.
    // See: https://github.com/mozilla/localForage/issues/128
    var driverSupport = (function(self) {
        // Initialize IndexedDB; fall back to vendor-prefixed versions
        // if needed.
        var indexedDB = indexedDB || self.indexedDB || self.webkitIndexedDB ||
                        self.mozIndexedDB || self.OIndexedDB ||
                        self.msIndexedDB;

        var result = {};

        result[DriverType.WEBSQL] = !!self.openDatabase;
        result[DriverType.INDEXEDDB] = !!(function() {
            // We mimic PouchDB here; just UA test for Safari (which, as of
            // iOS 8/Yosemite, doesn't properly support IndexedDB).
            // IndexedDB support is broken and different from Blink's.
            // This is faster than the test case (and it's sync), so we just
            // do this. *SIGH*
            // http://bl.ocks.org/nolanlawson/raw/c83e9039edf2278047e9/
            //
            // We test for openDatabase because IE Mobile identifies itself
            // as Safari. Oh the lulz...
            if (typeof self.openDatabase !== 'undefined' && self.navigator &&
                self.navigator.userAgent &&
                /Safari/.test(self.navigator.userAgent) &&
                !/Chrome/.test(self.navigator.userAgent)) {
                return false;
            }
            try {
                return indexedDB &&
                       typeof indexedDB.open === 'function' &&
                       // Some Samsung/HTC Android 4.0-4.3 devices
                       // have older IndexedDB specs; if this isn't available
                       // their IndexedDB is too old for us to use.
                       // (Replaces the onupgradeneeded test.)
                       typeof self.IDBKeyRange !== 'undefined';
            } catch (e) {
                return false;
            }
        })();

        result[DriverType.LOCALSTORAGE] = !!(function() {
            try {
                return (self.localStorage &&
                        ('setItem' in self.localStorage) &&
                        (self.localStorage.setItem));
            } catch (e) {
                return false;
            }
        })();

        return result;
    })(this);

    var isArray = Array.isArray || function(arg) {
        return Object.prototype.toString.call(arg) === '[object Array]';
    };

    function callWhenReady(localForageInstance, libraryMethod) {
        localForageInstance[libraryMethod] = function() {
            var _args = arguments;
            return localForageInstance.ready().then(function() {
                return localForageInstance[libraryMethod].apply(localForageInstance, _args);
            });
        };
    }

    function extend() {
        for (var i = 1; i < arguments.length; i++) {
            var arg = arguments[i];

            if (arg) {
                for (var key in arg) {
                    if (arg.hasOwnProperty(key)) {
                        if (isArray(arg[key])) {
                            arguments[0][key] = arg[key].slice();
                        } else {
                            arguments[0][key] = arg[key];
                        }
                    }
                }
            }
        }

        return arguments[0];
    }

    function isLibraryDriver(driverName) {
        for (var driver in DriverType) {
            if (DriverType.hasOwnProperty(driver) &&
                DriverType[driver] === driverName) {
                return true;
            }
        }

        return false;
    }

    var globalObject = this;

    function LocalForage(options) {
        this._config = extend({}, DefaultConfig, options);
        this._driverSet = null;
        this._ready = false;
        this._dbInfo = null;

        // Add a stub for each driver API method that delays the call to the
        // corresponding driver method until localForage is ready. These stubs
        // will be replaced by the driver methods as soon as the driver is
        // loaded, so there is no performance impact.
        for (var i = 0; i < LibraryMethods.length; i++) {
            callWhenReady(this, LibraryMethods[i]);
        }

        this.setDriver(this._config.driver);
    }

    LocalForage.prototype.INDEXEDDB = DriverType.INDEXEDDB;
    LocalForage.prototype.LOCALSTORAGE = DriverType.LOCALSTORAGE;
    LocalForage.prototype.WEBSQL = DriverType.WEBSQL;

    // Set any config values for localForage; can be called anytime before
    // the first API call (e.g. `getItem`, `setItem`).
    // We loop through options so we don't overwrite existing config
    // values.
    LocalForage.prototype.config = function(options) {
        // If the options argument is an object, we use it to set values.
        // Otherwise, we return either a specified config value or all
        // config values.
        if (typeof(options) === 'object') {
            // If localforage is ready and fully initialized, we can't set
            // any new configuration values. Instead, we return an error.
            if (this._ready) {
                return new Error("Can't call config() after localforage " +
                                 'has been used.');
            }

            for (var i in options) {
                if (i === 'storeName') {
                    options[i] = options[i].replace(/\W/g, '_');
                }

                this._config[i] = options[i];
            }

            // after all config options are set and
            // the driver option is used, try setting it
            if ('driver' in options && options.driver) {
                this.setDriver(this._config.driver);
            }

            return true;
        } else if (typeof(options) === 'string') {
            return this._config[options];
        } else {
            return this._config;
        }
    };

    // Used to define a custom driver, shared across all instances of
    // localForage.
    LocalForage.prototype.defineDriver = function(driverObject, callback,
                                                  errorCallback) {
        var defineDriver = new Promise(function(resolve, reject) {
            try {
                var driverName = driverObject._driver;
                var complianceError = new Error(
                    'Custom driver not compliant; see ' +
                    'https://mozilla.github.io/localForage/#definedriver'
                );
                var namingError = new Error(
                    'Custom driver name already in use: ' + driverObject._driver
                );

                // A driver name should be defined and not overlap with the
                // library-defined, default drivers.
                if (!driverObject._driver) {
                    reject(complianceError);
                    return;
                }
                if (isLibraryDriver(driverObject._driver)) {
                    reject(namingError);
                    return;
                }

                var customDriverMethods = LibraryMethods.concat('_initStorage');
                for (var i = 0; i < customDriverMethods.length; i++) {
                    var customDriverMethod = customDriverMethods[i];
                    if (!customDriverMethod ||
                        !driverObject[customDriverMethod] ||
                        typeof driverObject[customDriverMethod] !== 'function') {
                        reject(complianceError);
                        return;
                    }
                }

                var supportPromise = Promise.resolve(true);
                if ('_support'  in driverObject) {
                    if (driverObject._support && typeof driverObject._support === 'function') {
                        supportPromise = driverObject._support();
                    } else {
                        supportPromise = Promise.resolve(!!driverObject._support);
                    }
                }

                supportPromise.then(function(supportResult) {
                    driverSupport[driverName] = supportResult;
                    CustomDrivers[driverName] = driverObject;
                    resolve();
                }, reject);
            } catch (e) {
                reject(e);
            }
        });

        defineDriver.then(callback, errorCallback);
        return defineDriver;
    };

    LocalForage.prototype.driver = function() {
        return this._driver || null;
    };

    LocalForage.prototype.ready = function(callback) {
        var self = this;

        var ready = new Promise(function(resolve, reject) {
            self._driverSet.then(function() {
                if (self._ready === null) {
                    self._ready = self._initStorage(self._config);
                }

                self._ready.then(resolve, reject);
            }).catch(reject);
        });

        ready.then(callback, callback);
        return ready;
    };

    LocalForage.prototype.setDriver = function(drivers, callback,
                                               errorCallback) {
        var self = this;

        if (typeof drivers === 'string') {
            drivers = [drivers];
        }

        this._driverSet = new Promise(function(resolve, reject) {
            var driverName = self._getFirstSupportedDriver(drivers);
            var error = new Error('No available storage method found.');

            if (!driverName) {
                self._driverSet = Promise.reject(error);
                reject(error);
                return;
            }

            self._dbInfo = null;
            self._ready = null;

            if (isLibraryDriver(driverName)) {
                // We allow localForage to be declared as a module or as a
                // library available without AMD/require.js.
                if (moduleType === ModuleType.DEFINE) {
                    require([driverName], function(lib) {
                        self._extend(lib);

                        resolve();
                    });

                    return;
                } else if (moduleType === ModuleType.EXPORT) {
                    // Making it browserify friendly
                    var driver;
                    switch (driverName) {
                        case self.INDEXEDDB:
                            driver = require('./drivers/indexeddb');
                            break;
                        case self.LOCALSTORAGE:
                            driver = require('./drivers/localstorage');
                            break;
                        case self.WEBSQL:
                            driver = require('./drivers/websql');
                    }

                    self._extend(driver);
                } else {
                    self._extend(globalObject[driverName]);
                }
            } else if (CustomDrivers[driverName]) {
                self._extend(CustomDrivers[driverName]);
            } else {
                self._driverSet = Promise.reject(error);
                reject(error);
                return;
            }

            resolve();
        });

        function setDriverToConfig() {
            self._config.driver = self.driver();
        }
        this._driverSet.then(setDriverToConfig, setDriverToConfig);

        this._driverSet.then(callback, errorCallback);
        return this._driverSet;
    };

    LocalForage.prototype.supports = function(driverName) {
        return !!driverSupport[driverName];
    };

    LocalForage.prototype._extend = function(libraryMethodsAndProperties) {
        extend(this, libraryMethodsAndProperties);
    };

    // Used to determine which driver we should use as the backend for this
    // instance of localForage.
    LocalForage.prototype._getFirstSupportedDriver = function(drivers) {
        if (drivers && isArray(drivers)) {
            for (var i = 0; i < drivers.length; i++) {
                var driver = drivers[i];

                if (this.supports(driver)) {
                    return driver;
                }
            }
        }

        return null;
    };

    LocalForage.prototype.createInstance = function(options) {
        return new LocalForage(options);
    };

    // The actual localForage object that we expose as a module or via a
    // global. It's extended by pulling in one of our other libraries.
    var localForage = new LocalForage();

    // We allow localForage to be declared as a module or as a library
    // available without AMD/require.js.
    if (moduleType === ModuleType.DEFINE) {
        define('localforage', function() {
            return localForage;
        });
    } else if (moduleType === ModuleType.EXPORT) {
        module.exports = localForage;
    } else {
        this.localforage = localForage;
    }
}).call(window);

},{"./drivers/indexeddb":190,"./drivers/localstorage":191,"./drivers/websql":192,"promise":188}],194:[function(require,module,exports){
var Window, data, env, global, logger, steroids;

global = typeof window !== "undefined" && window !== null ? window : (Window = require('./mock/window'), new Window());

steroids = global.steroids != null ? global.steroids : require('./mock/steroids');

logger = require('./core/logger')(steroids, global);

data = require('./core/data')(logger, global);

env = require('./core/env')(logger, global);

module.exports = {
  logger: logger,
  data: data,
  env: env,
  debug: require('./core/debug')(steroids, logger),
  app: require('./core/app')(steroids, logger),
  media: require('./core/media')(steroids, logger),
  device: require('./core/device')(steroids, logger),
  ui: require('./core/ui')(steroids, logger, global),
  data: require('./core/data')(logger, global),
  auth: require('./core/auth')(logger, global, data, env),
  internal: {
    Promise: require('bluebird'),
    Bacon: require('baconjs')
  }
};

if ((typeof window !== "undefined" && window !== null)) {
  window.supersonic = module.exports;
  window.supersonic.logger.autoFlush();
}



},{"./core/app":196,"./core/auth":201,"./core/data":204,"./core/debug":210,"./core/device":217,"./core/env":223,"./core/logger":225,"./core/media":227,"./core/ui":237,"./mock/steroids":248,"./mock/window":249,"baconjs":165,"bluebird":166}],195:[function(require,module,exports){
var Promise;

Promise = require('bluebird');

module.exports = function(steroids) {
  var getLaunchURL, getParsedParamsFromURL;
  getParsedParamsFromURL = function(url) {
    var item, part, query, result, _i, _len, _ref;
    query = url.substring(url.indexOf("?") + 1);
    result = {};
    _ref = query.split("&");
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      part = _ref[_i];
      item = part.split("=");
      result[item[0]] = decodeURIComponent(item[1]);
    }
    return result;
  };

  /*
    * @namespace supersonic.app
    * @name getLaunchURL
    * @function
    * @apiCall supersonic.app.getLaunchURL
    * @description
    * Returns the string that was used to launch the application with URL scheme.
    * @type
    * supersonic.app.getLaunchURL: () =>
    *   {
    *     launchURL: String,
    *     params: Object
    *   }
    * @returnsDescription
    * Returns an object that contains the launch URL and its parsed params. If the app hadn't been opened via its URL scheme, the returned object is `null`.
    * @define {=>String} launchURL The full URL that was used to launch this app.
    * @define {=>Object} params An object containing the parameters parsed from the URL string. Contains an empty object if no parameters were present on the launch URL.
    * @define {=>Object} params.param An object whose key matches the parameter name and value its value, e.g. `"password=monkey"` produces an object `{password: "monkey"}`
    * @exampleCoffeeScript
    * urlObject = supersonic.app.getLaunchURL()
    *
    * if urlObject?
    *   supersonic.logger.log "Got launch URL #{urlObject.launchURL} with params: #{urlObject.params}"
    * else
    *   supersonic.logger.error "Could not get a launch URL."
    *
    * @exampleJavaScript
    * var urlObject = supersonic.app.getLaunchURL();
    *
    * if (urlObject != null) {
    *   supersonic.logger.log("Got launch URL " + urlObject.launchURL + " with params: " + urlObject.params);
    * } else {
    *   supersonic.logger.error("Could not get a launch URL.");
    * }
   */
  getLaunchURL = function() {
    var launchURL;
    launchURL = steroids.app.getLaunchURL();
    if (launchURL != null) {
      return {
        launchURL: launchURL,
        params: getParsedParamsFromURL(launchURL)
      };
    } else {
      return null;
    }
  };
  return getLaunchURL;
};



},{"bluebird":166}],196:[function(require,module,exports){
var Promise, events;

Promise = require('bluebird');

events = require('../events');

module.exports = function(steroids, log) {
  return {
    sleep: require("./sleep")(steroids, log),
    getLaunchURL: require("./getLaunchURL")(steroids, log),
    splashscreen: require("./splashscreen")(steroids, log),
    openURL: require("./openURL")(steroids, log),
    statusBar: require("./statusBar")(steroids, log),
    whenResumed: function(listen) {
      return events.background.filter(function(paused) {
        return !paused;
      }).onValue(listen);
    },
    whenPaused: function(listen) {
      return events.background.filter(function(paused) {
        return paused;
      }).onValue(listen);
    }
  };
};



},{"../events":224,"./getLaunchURL":195,"./openURL":197,"./sleep":198,"./splashscreen":199,"./statusBar":200,"bluebird":166}],197:[function(require,module,exports){
var Promise, superify;

Promise = require('bluebird');

superify = require('../superify');

module.exports = function(steroids, log) {
  var openURL, s;
  s = superify('supersonic.app', log);

  /*
    * @namespace supersonic.app
    * @name openURL
    * @function
    * @apiCall supersonic.app.openURL
    * @description
    * Launches a browser to open the given URL, or the external application matching the URL scheme.
    * @type
    * supersonic.app.openURL: (URL: String) =>
    *   Promise
    * @define {String} URL The URL to be opened. URLs starting with `"http(s)://"` will be opened in the device's default browser.
    * @returnsDescription
    * [`Promise`](/supersonic/guides/technical-concepts/promises/) that is resolved when the URL is opened. The promise is rejected if the URL scheme could not be found among the URL schemes registered by the device's apps.
    * @supportsCallbacks
    * @exampleCoffeeScript
    * # Launch the default web browser
    * supersonic.app.openURL "http://www.google.com"
    *
    * # Launch an external app
    * supersonic.app.openURL("sms:1-408-555-121").then ->
    *   supersonic.logger.log "URL successfully opened"
    *
    * # Invalid schemes result in a rejected promise
    * supersonic.app.openURL("doesnotexist://).catch ->
    *   supersonic.logger.log "Could not open URL"
    * @exampleJavaScript
    * // Launch the default web browser
    * supersonic.app.openURL("http://www.google.com");
    *
    * // Launch an external app
    * supersonic.app.openURL("sms:1-408-555-121").then(function() {
    *   supersonic.logger.log("SMS app successfully opened");
    * });
    *
    * // Invalid schemes result in a rejected promise
    * supersonic.app.openURL("doesnotexist://").catch(function() {
    *   supersonic.logger.log("Could not open URL");
    * });
   */
  openURL = s.promiseF("openURL", function(url) {
    if (url == null) {
      return Promise.reject("URL is undefined");
    }
    return new Promise(function(resolve, reject) {
      return steroids.openURL({
        url: url
      }, {
        onSuccess: resolve,
        onFailure: reject
      });
    });
  });
  return openURL;
};



},{"../superify":228,"bluebird":166}],198:[function(require,module,exports){
var Promise, superify;

Promise = require('bluebird');

superify = require('../superify');

module.exports = function(steroids, log) {
  var s;
  s = superify('supersonic.app.sleep', log);
  return {

    /*
      * @namespace supersonic.app
      * @name sleep
      * @overview
      * @description
      * Allows the user to turn the device automatic sleep on or off for your app.
     */

    /*
      * @namespace supersonic.app.sleep
      * @name disable
      * @function
      * @apiCall supersonic.app.sleep.disable
      * @description
      * Disables the device automatic sleep for your app.
      * @type
      * supersonic.app.sleep.disable: () =>
      *   Promise
      * @returnsDescription
      * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that is resolved when the native side has successfully disabled automatic sleep.
      * @supportsCallbacks
      * @exampleCoffeeScript
      * supersonic.app.sleep.disable()
      * @exampleJavaScript
      * supersonic.app.sleep.disable();
     */
    disable: s.promiseF("disable", function() {
      return new Promise(function(resolve) {
        return steroids.device.disableSleep({}, {
          onSuccess: function() {
            return resolve();
          }
        });
      });
    }),

    /*
      * @namespace supersonic.app.sleep
      * @name enable
      * @function
      * @apiCall supersonic.app.sleep.enable
      * @description
      * Enables the device automatic sleep for your app.
      * @type
      * supersonic.app.sleep.enable: () =>
      *   Promise
      * @returnsDescription
      * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that is resolved when the native side has successfully enabled automatic sleep.
      * @supportsCallbacks
      * @exampleCoffeeScript
      * supersonic.app.sleep.enable()
      * @exampleJavaScript
      * supersonic.app.sleep.enable();
     */
    enable: s.promiseF("enable", function() {
      return new Promise(function(resolve) {
        return steroids.device.enableSleep({}, {
          onSuccess: function() {
            return resolve();
          }
        });
      });
    })
  };
};



},{"../superify":228,"bluebird":166}],199:[function(require,module,exports){
var Promise, superify;

Promise = require('bluebird');

superify = require('../superify');

module.exports = function(steroids, log) {
  var s;
  s = superify('supersonic.app.splashscreen', log);
  return {

    /*
      * @namespace supersonic.app
      * @name splashscreen
      * @overview
      * @description
      * The splashscreen is shown in the application startup. The initial splashscreen is hidden automatically after 3 seconds on iOS and on the pageload event on Android. Allows the user to hide and show the splashscreen programmitically. The splashscreen is defined in your project's build configuration.
     */

    /*
      * @namespace supersonic.app.splashscreen
      * @name show
      * @function
      * @apiCall supersonic.app.splashscreen.show
      * @description
      * Shows the splashscreen programmatically.
      * @type
      * supersonic.app.splashscreen.show: () =>
      *   Promise
      * @returnsDescription
      * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that is resolved when the splashscreen is shown.
      * @supportsCallbacks
      * @exampleCoffeeScript
      * supersonic.app.splashscreen.show()
      * @exampleJavaScript
      * supersonic.app.splashscreen.show();
     */
    show: s.promiseF("show", function() {
      return new Promise(function(resolve, reject) {
        return steroids.splashscreen.show({}, {
          onSuccess: function() {
            return resolve();
          },
          onFailure: function() {
            return reject();
          }
        });
      });
    }),

    /*
      * @namespace supersonic.app.splashscreen
      * @name hide
      * @function
      * @apiCall supersonic.app.splashscreen.hide
      * @description
      * Hides the splashscreen programmatically.
      * @type
      * supersonic.app.splashscreen.hide: () =>
      *   Promise
      * @returnsDescription
      * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that is resolved when the splashscreen is hidden.
      * @supportsCallbacks
      * @exampleCoffeeScript
      * supersonic.app.splashscreen.hide()
      * @exampleJavaScript
      * supersonic.app.splashscreen.hide();
     */
    hide: s.promiseF("hide", function() {
      return new Promise(function(resolve, reject) {
        return steroids.splashscreen.hide({}, {
          onSuccess: function() {
            return resolve();
          },
          onFailure: function() {
            return reject();
          }
        });
      });
    })
  };
};



},{"../superify":228,"bluebird":166}],200:[function(require,module,exports){
var Promise, superify;

Promise = require('bluebird');

superify = require('../superify');

module.exports = function(steroids, log) {
  var s;
  s = superify('supersonic.app.statusBar', log);
  return {

    /*
      * @namespace supersonic.app
      * @name statusBar
      * @overview
      * @description
      * The native status bar shown on the top of the screen, showing network strength, battery percentage etc. All changes to the status bar take effect app-wide. You can determine the initial visibility of the status bar in the `config/app.coffee` file.
     */

    /*
      * @namespace supersonic.app.statusBar
      * @name hide
      * @function
      * @apiCall supersonic.app.statusBar.hide
      * @description
      * Hides the status bar application wide.
      * @type
      * supersonic.app.statusBar.hide: () =>
      *   Promise
      * @returnsDescription
      * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that is resolved when the status bar is hidden.
      * @supportsCallbacks
      * @exampleCoffeeScript
      * supersonic.app.statusBar.hide()
      * @exampleJavaScript
      * supersonic.app.statusBar.hide();
     */
    hide: s.promiseF("hide", function() {
      return new Promise(function(resolve, reject) {
        return steroids.statusBar.hide({}, {
          onSuccess: function() {
            return resolve();
          },
          onFailure: function() {
            return reject();
          }
        });
      });
    }),

    /*
      * @namespace supersonic.app.statusBar
      * @name show
      * @function
      * @apiCall supersonic.app.statusBar.show
      * @description
      * Shows the statusBar application wide.
      * @type
      * supersonic.app.statusBar.show: (style?: String) =>
      *   Promise
      * @define {String} style="default" **iOS-only.** Used to determine text color in the status bar (the status bar background color is the same as the native navigation bar background color). Valid values are:
      * <ul>
      *   <li>`"default"`: Show black text in status bar.</li>
      *   <li>`"light"`: Show white text in status bar.</li>
      * </ul>
      * @returnsDescription
      * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that is resolved when the status bar is shown.
      * @supportsCallbacks
      * @exampleCoffeeScript
      * supersonic.app.statusBar.show("light").then ->
      *   supersonic.logger.log "Status bar shown"
      * @exampleJavaScript
      * supersonic.app.statuSBar.show("light").then(function(){
      *   supersonic.logger.log("Status bar shown");
      * });
     */
    show: s.promiseF("show", function(options) {
      var style;
      style = typeof options === "string" ? options : (options != null ? options.style : void 0) != null ? options.style : void 0;
      return new Promise(function(resolve, reject) {
        return steroids.statusBar.show({
          style: style
        }, {
          onSuccess: function() {
            return resolve();
          },
          onFailure: function() {
            return reject();
          }
        });
      });
    })
  };
};



},{"../superify":228,"bluebird":166}],201:[function(require,module,exports){
module.exports = function(logger, window, data, env) {
  var users;
  users = require("./users")(logger, window, data.session, env);
  return {
    session: data.session,
    users: users
  };
};



},{"./users":202}],202:[function(require,module,exports){
var Promise, data;

data = require('ag-data');

Promise = require('bluebird');

module.exports = function(logger, window, session, env) {
  var resourceBundle, userModel, usersResourceBundle, _ref;
  usersResourceBundle = {
    options: {
      baseUrl: (env != null ? (_ref = env.auth) != null ? _ref.endpoint : void 0 : void 0) || "",
      headers: {
        Authorization: session.getAccessToken() || ""
      }
    },
    resources: {
      users: {
        schema: {
          identifier: "id",
          fields: {
            id: {
              type: "string",
              identity: true
            },
            username: {
              type: "string"
            },
            metadata: {
              type: "object"
            },
            groups: {
              type: "array"
            },
            collection_permissions: {
              type: "array"
            },
            deleted: {
              type: "boolean"
            }
          }
        }
      }
    }
  };
  resourceBundle = data.loadResourceBundle(usersResourceBundle);
  userModel = resourceBundle.createModel("users");
  userModel.getCurrentUser = function() {
    var userId;
    if (userId = session.getUserId()) {
      return userModel.find(userId);
    } else {
      return Promise.reject(new Error("Cannot access current user without a valid session"));
    }
  };
  return userModel;
};



},{"ag-data":3,"bluebird":166}],203:[function(require,module,exports){
var Bacon, deepEqual,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Bacon = require('baconjs');

deepEqual = require('deep-equal');

module.exports = function(window) {
  var PubSubChannel, createChannel, generateUUID, inboundStream, outboundBus;
  generateUUID = function() {
    var d, uuid;
    d = new Date().getTime();
    uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      var r;
      r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c === "x" ? r : r & 0x7 | 0x8).toString(16);
    });
    return uuid;
  };
  outboundBus = function(channelName, sender) {
    var bus;
    bus = new Bacon.Bus;
    bus.map(function(message) {
      return {
        channel: channelName,
        sender: sender,
        message: message
      };
    }).onValue(function(data) {
      return window.postMessage(data);
    });
    return bus;
  };
  inboundStream = function(channelName, receiver) {
    return Bacon.fromEventTarget(window, "message").filter(function(event) {
      return (event.data.channel === channelName) && !deepEqual(event.data.sender, receiver);
    }).map(function(event) {
      return event.data.message;
    });
  };
  PubSubChannel = (function() {
    function PubSubChannel(name) {
      this.name = name;
      this.subscribe = __bind(this.subscribe, this);
      this.publish = __bind(this.publish, this);
      this.identity = generateUUID();
      this.outbound = outboundBus(this.name, this.identity);
      this.inbound = inboundStream(this.name, this.identity);
    }

    PubSubChannel.prototype.publish = function(value) {
      this.outbound.push(value);
      return this;
    };

    PubSubChannel.prototype.subscribe = function(listener) {
      return this.inbound.onValue((function(_this) {
        return function(value) {
          return listener(value, _this.publish);
        };
      })(this));
    };

    return PubSubChannel;

  })();

  /*
    * @namespace supersonic.data
    * @name channel
    * @function
    * @apiCall supersonic.data.channel
    * @description
    * Access a publish-subscribe messaging channel for cross-view communication
    * @type
    * channel: (
    *   name: String
    * ) => PubSubChannel
    * @define {String} name A shared name for parties that want to communicate on this channel
    * @exampleCoffeeScript
    * # WebView one
    * supersonic.data.channel('events').publish('you would not believe what just happened')
    * # WebView two
    * unsubscribe = supersonic.data.channel('events').subscribe (message, reply) ->
    *   reply 'well, what happened?'
    * @exampleJavaScript
    * // WebView one
    * supersonic.data.channel('events').publish('you would not believe what just happened');
    * // WebView two
    * var unsubscribe = supersonic.data.channel('events').subscribe( function(message, reply) {
    *   reply('well, what happened?');
    * });
   */
  return createChannel = function(name) {
    return new PubSubChannel(name);
  };
};



},{"baconjs":165,"deep-equal":167}],204:[function(require,module,exports){
var Session, adapters;

adapters = require('./storage/adapters');

Session = require('./session');

module.exports = function(logger, window) {
  var channel, defaultAsyncStorageAdapter, model, property, session, storage;
  channel = require('./channel')(window);
  property = require('./storage/property')(logger, window, channel);
  session = new Session(window);
  defaultAsyncStorageAdapter = adapters.localforage;
  model = require('./model')(logger, window, defaultAsyncStorageAdapter, session);
  storage = {
    adapters: adapters,
    property: property
  };
  return {
    channel: channel,
    model: model,
    storage: storage,
    session: session
  };
};



},{"./channel":203,"./model":205,"./session":206,"./storage/adapters":207,"./storage/property":209}],205:[function(require,module,exports){
var Bacon, data;

data = require('ag-data');

Bacon = require('baconjs');

module.exports = function(logger, window, getDefaultCacheStorage, session) {

  /*
    * @namespace supersonic.data
    * @name model
    * @function
    * @apiCall supersonic.data.model
    * @description
    * Provides access to Supersonic Data cloud resources. The factory function returns a new Model class that represents the resource given as a parameter.
    * @type
    * model: (
    *   name: String
    *   options?: {
    *     headers?: Object
    *     cache?:
    *       enabled: Boolean
    *       timeToLive?: Integer
    *       storage?: Object
    *   }
    * ) => Model
    * @define {String} name The name of a configured cloud resource
    * @define {Object} options May have headers to set for all requests performed through this model. May configure caching.
    * @define {Integer} timeToLive Duration of time for cached objects to stay valid, specified in milliseconds.
    * @define {Object} storage Storage adapter to use for caching. Defaults to localforage.
    * @returnsDescription
    * Returns a Model class that represents the given resource, e.g. `supersonic.data.model("car")` returns a new Car Model class, representing the `Car` resource in the cloud backend.
    * @exampleCoffeeScript
    * # Create the Task Model class
    * Task = supersonic.data.model "Task"
    *
    * # Create a new Task instance
    * takeOutTheTrash = new Task {
    *   description: "Take out the trash"
    * }
    *
    * # Persist our new Task instance to the cloud
    * takeOutTheTrash.save()
    * @exampleJavaScript
    * // Create the Task Model class
    * var Task = supersonic.data.model("Task");
    *
    * // Create a new Task instance
    * var takeOutTheTrash = new Task({
    *   description: "Take out the trash"
    * });
    *
    * // Persist our new Task instance to the cloud
    * takeOutTheTrash.save();
   */
  var createModel, withDefaults;
  withDefaults = function(options) {
    var _ref, _ref1;
    if (((_ref = options.cache) != null ? _ref.enabled : void 0) !== false) {
      if (options.cache == null) {
        options.cache = {};
      }
      options.cache.enabled = true;
    }
    if (options.cache.enabled) {
      if (options.cache.storage == null) {
        options.cache.storage = getDefaultCacheStorage();
      }
    }
    if (((_ref1 = options.headers) != null ? _ref1.Authorization : void 0) == null) {
      if (options.headers == null) {
        options.headers = {};
      }
      options.headers.Authorization = session.getAccessToken();
    }
    return options;
  };
  return createModel = (function() {
    var bundle, err, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6;
    if ((((_ref = window.parent.appgyver) != null ? (_ref1 = _ref.environment) != null ? (_ref2 = _ref1.data) != null ? _ref2.bundle : void 0 : void 0 : void 0) == null) && ((window != null ? (_ref3 = window.ag) != null ? _ref3.data : void 0 : void 0) == null)) {
      return function(name) {
        logger.error("Tried to access a cloud resource, but no resources have been configured");
        throw new Error("No cloud resources available");
      };
    }
    try {
      bundle = ((_ref4 = window.parent.appgyver) != null ? (_ref5 = _ref4.environment) != null ? (_ref6 = _ref5.data) != null ? _ref6.bundle : void 0 : void 0 : void 0) != null ? data.loadResourceBundle(window.parent.appgyver.environment.data.bundle) : data.loadResourceBundle(window.ag.data);
      return function(name, options) {
        var err;
        if (options == null) {
          options = {};
        }
        options = withDefaults(options);
        try {
          return bundle.createModel(name, options);
        } catch (_error) {
          err = _error;
          logger.error("Tried to access cloud resource '" + name + "', but it is not a configured resource");
          throw new Error("Could not load model " + name + ": " + err);
        }
      };
    } catch (_error) {
      err = _error;
      logger.error("Tried to access a cloud resource, but the configured cloud resource bundle could not be loaded");
      return function() {
        throw new Error("Could not load configured cloud resource bundle: " + err);
      };
    }
  })();
};


/*
 * @namespace supersonic.data
 * @name Model
 * @class
 * @description
 * A Supersonic Data Model class. Provides methods to query the cloud backend for records and a constructor for creating new Model instances.
 *
 * The base Model class can never be used directly. Instead, the `supersonic.data.model()` factory function must be used. The function creates a new class that inherits the base Model class and references a specific resource, as defined in the Supersonic Data cloud backend.
 *
 * Thus, to interact with the `Car` resource in your Supersonic Data cloud backend, you must create a Car Model class by calling `var Car = supersonic.data.model("Car")`.
 * @type
 * supersonic.data.Model: {
 *   all: (queryParams, options) => Object
 *   findAll: (queryParams) => Promise Collection
 *   find: (id) => Promise Model
 *   fromJson: (json) => Model
 *   one: (options) => Object
 * }
 * @methods all find findAll
 * @define {Function} all Access a stream of Collections, triggered when new data is available. A Collection contains Model instances, representing records in the backend. The stream is updated with fresh data at periodic intervals.
 * @define {Function} findAll Returns a [`Promise`](/supersonic/guides/technical-concepts/promises/) that resolves to a Collection of Model instances, representing all the records in the backend for the resource represented by this Model class.
 * @define {Function} find Returns a [`Promise`](/supersonic/guides/technical-concepts/promises/) that resolves to a Model instance representing the record with the given id.
 * @define {Function} fromJson Create a persisted Model instance from serialized data.
 * @define {Function} one Access a stream of updates to a single Model instance, triggered when new data is available.
 */


/*
 * @namespace supersonic.data
 * @name Model.all
 * @function
 * @type
 * all: (
 *   queryParams?: Object
 *   options?:
 *      interval?: Integer
 * ) =>
 *   whenChanged: (Collection) =>
 *     unsubscribe: Function
 * @description
 * Find and fetch a Collection of Model instances representing records that match the query parameters given to the function. The results of the query are made available as a stream that gets updated with the latest data every `interval` ms.
 * @define {Object} queryParams An object containing parameters for the database query, e.g. `limit: 10`.
 * @define {Object} options An optional options object.
 * @define {Integer} options.interval=1000 An integer defining how often the backend is polled for new data, in ms.
 * @returnsDescription
 * An object with the `whenChanged` property, which accepts a recurring callback function that gets triggered when new data is available.
 * @define {=>Function} whenChanged Called with a Collection matching the original query. Called every `options.interval` ms, but only when new data is available. Returns a function that can be used to unsubscribe from the update stream.
 * @define {=>Function} whenChanged.unsubscribe Call this function to stop listening for data changes.
 * @exampleCoffeeScript
 * Task = supersonic.data.model 'task'
 * unsubscribe = Task.all(queryParameters, options).whenChanged (updatedTasks)->
 *   supersonic.logger.log "First element of updated Task collection: ", updatedTasks[0]
 *
 * # Later on, we can stop listening to updates
 * unsubscribe()
 * @exampleJavaScript
 * var Task = supersonic.data.model('task');
 * var unsubscribe = Task.all(queryParameters, options).whenChanged( function(updatedTasks) {
 *   supersonic.logger.log("First element of updated Task collection: ", updatedTasks[0]);
 * });
 *
 * // Later on, we can stop listening to updates
 * unsubscribe();
 */


/*
 * @namespace supersonic.data
 * @name Model.one
 * @function
 * @type
 * one: (
 *   id: String
 *   options?:
 *     interval?: Integer
 * ) =>
 *   whenChanged: (Model) =>
 *     unsubscribe: Function
 * @description
 * Find a single record from the cloud by an id. The results are made available as a stream that gets updated with the latest data every `interval` ms.
 * @define {String} id An id string matching a record in the cloud resource represented by this Model class.
 * @define {Object} options An optional options object.
 * @define {Integer} options.interval=1000 An integer defining how often the backend is polled for new data, in ms.
 * @returnsDescription
 * An object with the `whenChanged` property, which accepts a recurring callback function that gets triggered when new data is available.
 * @define {=>Function} whenChanged Called with a Model matching the `id`. Called every `options.interval` ms, but only when new data is available. Returns a function that can be used to unsubscribe from the update stream.
 * @define {=>Function} whenChanged.unsubscribe Call this function to stop listening for data changes.
 * @exampleCoffeeScript
 * unsubscribe = supersonic.data.model('task').one('123', options).whenChanged (updatedTask)->
 *   supersonic.logger.log "Most recent data on task 123: ", updatedTask
 *
 * # Later on, we can stop listening for updates
 * unsubscribe()
 * @exampleJavaScript
 * var unsubscribe = supersonic.data.model('task').one('123', options).whenChanged( function(updatedTask) {
 *   supersonic.logger.log("Most recent data on task 123: ", updatedTask);
 * });
 *
 * // Later on, we can stop listening for updates
 * unsubscribe();
 */


/*
  * @namespace supersonic.data
  * @name Model.findAll
  * @function
  * @type
  * findAll: () => Promise collection: Collection<Model>
  * @description
  * Fetch and access all the records in the cloud resource represented by this Model class.
  * @returnsDescription
  * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that resolves with a Collection of Model instances, each of whom represents a single record.
  * @define {=>Collection<Model>} collection A Collection that contains Model instances for all the records in the cloud resource represented by this Model class.
  * @exampleCoffeeScript
  * supersonic.data.model('task').findAll().then (tasks) ->
  *   for task in tasks
  *      console.log task.description
  * @exampleJavaScript
  * supersonic.data.model('task').findAll().then( function(tasks) {
  *   for (var i = 0; i < tasks.length; i++) {
  *     console.log(tasks[i].description);
  *   }
  * });
 */


/*
  * @namespace supersonic.data
  * @name Model.find
  * @function
  * @type
  * find: (id: String) => Promise Model
  * @description
  * Find a single record from the cloud by an id. Returns a Model instance matching that record.
  * @define {String} id An id string matching a record in the cloud resource represented by this Model class.
  * @returnsDescription
  * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that gets resolved with a Model instance representing the record matching the id.
  * @exampleCoffeeScript
  * supersonic.data.model('task').find(123).then (task) ->
  *   console.log task.description
  * @exampleJavaScript
  * supersonic.data.model('task').find(123).then( function(task) {
  *   console.log(task.description);
  * });
 */


/*
  * @namespace supersonic.data
  * @name Model.fromJson
  * @function
  * @type
  * fromJson: (json: Object) => Model
  * @description
  * Restore a persisted Model instance from serialized data.
  * @define {Object} json A JSON object used to create the Model instance.
  * @exampleCoffeeScript
  * Task = supersonic.data.model('task')
  * Task.find(123).then (task) ->
  *   serialized = task.toJson()
  *   # At this point the task can be e.g. stored to localStorage
  *   # Retrieve it from the storage-compatible format using fromJson
  *   task = Task.fromJson(serialized)
  *   task.description = 'updated!'
  *   # Unlike the serialized JSON object, the restored model instance
  *   # has all the behavior intact.
  *   task.save()
  * @exampleJavaScript
  * var Task = supersonic.data.model('task');
  * Task.find(123).then( function(task) {
  *   var serialized = task.toJson();
  *   // At this point the task can be e.g. stored to localStorage
  *   // Retrieve it from the storage-compatible format using fromJson
  *   var task = Task.fromJson(serialized);
  *   task.description = 'Updated!';
  *   // Unlike the serialized JSON object, the restored model instance
  *   // has all the behavior intact.
  *   task.save();
  *  });
 */


/*
  * @namespace supersonic.data
  * @name Collection
  * @class
  * @description
  * A Supersonic Data Collection class. Represents a collection of records (represented as instances of `supersonic.data.Model`) fetched from the Supersonic Data cloud backend. A Collection always has records from a single cloud resource only, i.e. there can be a Car Collection and a Bus Collection, but never a Collection containing both Cars and Buses.
  * @type
  * Collection: {
  *   save: () => Promise
  * }
  * @methods save
  * @define {Function} save Persist all the Model instances in this collection.
 */


/*
  * @namespace supersonic.data
  * @name Collection.save
  * @function
  * @type
  * Collection.save: () => Promise
  * @description
  * Persist all Model instances in this Collection to the cloud, updating the matching records.
  * @returnsDescription
  * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that resolves once all the Model instances in the Collection have been perisisted to the cloud backend.
  * @exampleCoffeeScript
  * supersonic.data.model('task').findAll().then (tasks) ->
  *   for task in tasks
  *     task.completed = true
  *   tasks.save().then ->
  *     supersonic.logger.log "All tasks saved!"
  * @exampleJavaScript
  * supersonic.data.model('task').findAll().then( function(tasks) {
  *   for (var i = 0; i < tasks.length; i++) {
  *     tasks[i].completed = true;
  *   }
  *   tasks.save().then( function() {
  *     supersonic.logger.log("All tasks saved!");
  *   });
  * });
 */


/*
  * @namespace supersonic.data
  * @name Model-instance
  * @instance
  * @description
  * An instance of a specific Model class. Represents a single record fetched from (or not yet persisted to) the cloud backend, e.g. a single `Car`.
  *
  * The Model class reperesenting a specific resource is created by calling the `supersonic.data.model()` factory function. New instances of that Model class can then be created either via the constructor or via the various query functions available to the Model class object itself (e.g. `Car.find()`).
  *
  * ##Constructor
  * ```coffeescript
  * Model(
  *   data: Object
  * )
  * ```
  * The constructor accepts a data object containing arbitrary data that can then be persisted to the backend as a new record with `Model.save()`. There is no validation, so it's up to the developer to only input data that matches the backend's data schema. Nested properties are not supported.
  * @type
  * Model: {
  *   save: () => Promise
  *   delete: () => Promise
  * }
  * @exampleCoffeeScript
  * # Create the Task Model class
  * Task = supersonic.data.model "Task"
  *
  * # Create a new Task instance
  * takeOutTheTrash = new Task {
  *   description: "Take out the trash"
  * }
  *
  * # Persist our new Task instance to the cloud
  * takeOutTheTrash.save()
  * @exampleJavaScript
  * // Create the Task Model class
  * var Task = supersonic.data.model("Task");
  *
  * // Create a new Task instance
  * var takeOutTheTrash = new Task({
  *   description: "Take out the trash"
  * });
  *
  * // Persist our new Task instance to the cloud
  * takeOutTheTrash.save();
  * @methods save delete
  * @define {Function} save Persist the data in this Model instance to the cloud backend.
  * @define {Function} delete Remove this Model instance from the cloud backend.
 */


/*
  * @namespace supersonic.data
  * @name Model.save
  * @function
  * @type
  * Model.save: () => Promise
  * @description
  * Persist the data in this Model instance to the cloud. If the instance is new, create it in the cloud; otherwise update the existing record.
  * @exampleCoffeeScript
  * supersonic.data.model('task').find(123).then (task) ->
  *   task.done = true
  *   task.save()
  * @exampleJavaScript
  * supersonic.data.model('task').find(123).then( function(task) {
  *   task.done = true;
  *   task.save();
  * });
  * @returnsDescription
  * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that gets resolved once the Model instance has been persisted to the cloud backend.
 */


/*
  * @namespace supersonic.data
  * @name Model.delete
  * @function
  * @type
  * Model.delete: () => Promise
  * @description
  * Remove the record matching this Model instance from the cloud backend.
  * @exampleCoffeeScript
  * supersonic.data.model('task').find(123).then (task) ->
  *   if task.done
  *     task.delete()
  * @exampleJavaScript
  * supersonic.data.model('task').find(123).then( function(task) {
  *   if (task.done) {
  *     task.delete();
  *   }
  * });
  * @returnsDescription
  * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that gets resolved once the record matching this Model instance has been deleted from the cloud backend.
 */



},{"ag-data":3,"baconjs":165}],206:[function(require,module,exports){
var Session, SessionValidationError, adapters,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

adapters = require('./storage/adapters');

SessionValidationError = (function(_super) {
  __extends(SessionValidationError, _super);

  function SessionValidationError(message, errors) {
    this.message = message;
    this.errors = errors;
    Error.call(this);
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, this.constructor);
    }
    this.name = this.constructor.name;
  }

  SessionValidationError.prototype.toString = function() {
    return "" + this.name + "(" + this.message + ", " + (JSON.stringify(this.errors)) + ")";
  };

  return SessionValidationError;

})(Error);

Session = (function() {
  var isValidRawSession, validateSession;

  Session.prototype.RAW_SESSION_KEY = "__ag:data:session";

  Session.prototype.rawSession = null;

  function Session(window) {
    this.storage = new adapters.JsonLocalStorage(window);
  }

  isValidRawSession = function(session) {
    var _ref;
    return (session.access_token != null) && (((_ref = session.user_details) != null ? _ref.id : void 0) != null);
  };

  validateSession = function(rawSession) {
    if (!isValidRawSession(rawSession)) {
      throw new SessionValidationError("Invalid data for session", rawSession);
    }
  };

  Session.prototype.set = function(rawSession) {
    validateSession(rawSession);
    this.storage.setItem(this.RAW_SESSION_KEY, rawSession);
    return this.rawSession = rawSession;
  };

  Session.prototype.get = function() {
    return this.rawSession != null ? this.rawSession : this.rawSession = this.storage.getItem(this.RAW_SESSION_KEY);
  };

  Session.prototype.clear = function() {
    this.storage.removeItem(this.RAW_SESSION_KEY);
    return this.rawSession = null;
  };

  Session.prototype.getAccessToken = function() {
    var _ref;
    return (_ref = this.get()) != null ? _ref.access_token : void 0;
  };

  Session.prototype.getUserId = function() {
    var _ref, _ref1;
    return (_ref = this.get()) != null ? (_ref1 = _ref.user_details) != null ? _ref1.id : void 0 : void 0;
  };

  return Session;

})();

module.exports = Session;



},{"./storage/adapters":207}],207:[function(require,module,exports){
var JsonLocalStorage, Promise, data, localforage;

Promise = require('bluebird');

localforage = (function() {
  switch (false) {
    case !(typeof window === "undefined" || window === null):
      return {
        getItem: function() {
          return Promise.resolve();
        }
      };
    default:
      return require('localforage');
  }
})();

data = require('ag-data');

JsonLocalStorage = require('./adapters/JsonLocalStorage');

module.exports = {
  localforage: function() {
    return localforage;
  },
  memory: data.storages.memory,
  JsonLocalStorage: JsonLocalStorage
};



},{"./adapters/JsonLocalStorage":208,"ag-data":3,"bluebird":166,"localforage":193}],208:[function(require,module,exports){
var JsonLocalStorage;

JsonLocalStorage = (function() {
  function JsonLocalStorage(window) {
    this.window = window;
  }

  JsonLocalStorage.prototype.getItem = function(key) {
    var value;
    value = this.window.localStorage.getItem(key);
    if (value != null) {
      return JSON.parse(value);
    } else {
      return null;
    }
  };

  JsonLocalStorage.prototype.setItem = function(key, value) {
    return this.window.localStorage.setItem(key, JSON.stringify(value));
  };

  JsonLocalStorage.prototype.removeItem = function(key) {
    return this.window.localStorage.removeItem(key);
  };

  return JsonLocalStorage;

})();

module.exports = JsonLocalStorage;



},{}],209:[function(require,module,exports){
var Bacon,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Bacon = require('baconjs');

module.exports = function(logger, window, channel) {
  var LocalStorageProperty, createLocalStorageProperty;
  LocalStorageProperty = (function() {
    LocalStorageProperty.prototype.values = null;

    LocalStorageProperty.prototype._channel = null;

    function LocalStorageProperty(name) {
      this.name = name;
      this.unset = __bind(this.unset, this);
      this.get = __bind(this.get, this);
      this.set = __bind(this.set, this);
      this._channel = channel("supersonic.data.storage.property(" + this.name + ")");
      this.values = this._channel.outbound.merge(this._channel.inbound).toProperty(true).map((function(_this) {
        return function() {
          return _this.get();
        };
      })(this));
    }

    LocalStorageProperty.prototype.set = function(value) {
      window.localStorage.setItem(this.name, JSON.stringify(value));
      this._channel.publish(true);
      return this;
    };

    LocalStorageProperty.prototype.get = function() {
      var value;
      value = window.localStorage.getItem(this.name);
      if (value != null) {
        return JSON.parse(value);
      } else {
        return null;
      }
    };

    LocalStorageProperty.prototype.unset = function() {
      window.localStorage.removeItem(this.name);
      this._channel.publish(true);
      return this;
    };

    return LocalStorageProperty;

  })();
  return createLocalStorageProperty = function(name) {
    return new LocalStorageProperty(name);
  };
};



},{"baconjs":165}],210:[function(require,module,exports){
module.exports = function(steroids, log) {
  return {
    ping: require("./ping")(steroids, log)
  };
};



},{"./ping":211}],211:[function(require,module,exports){
var Promise, superify;

Promise = require('bluebird');

superify = require('../superify');

module.exports = function(steroids, log) {
  var ping, s;
  s = superify('supersonic.debug', log);

  /*
    * @namespace supersonic.debug
    * @name ping
    * @function
    * @apiCall supersonic.debug.ping
    * @description
    * Pings the native runtime.
    * @type
    * supersonic.debug.ping : ()
    * => Promise response: String
    * @returnsDescription
    * Returns a [`Promise`](/supersonic/guides/technical-concepts/promises/) that that gets resolved once the ping is successful. Resolves with the string `"Pong!"`.
    * @define {=>String} response The string `"Pong!"`.
    * @supportsCallbacks
    * @exampleCoffeeScript
    * supersonic.debug.ping().then (response) ->
    *   supersonic.logger.log response
    * @exampleJavaScript
    * supersonic.debug.ping().then(function(response) {
    *   supersonic.logger.log(response);
    * });
   */
  ping = s.promiseF("ping", function() {
    return new Promise(function(resolve, reject) {
      return steroids.device.ping({}, {
        onSuccess: function() {
          return resolve("Pong!");
        },
        onFailure: function() {
          return reject(new Error("Did not pong :("));
        }
      });
    });
  });
  return ping;
};



},{"../superify":228,"bluebird":166}],212:[function(require,module,exports){
var Bacon, Promise, deviceready, superify;

Promise = require('bluebird');

Bacon = require('baconjs');

deviceready = require('../events').deviceready;

superify = require('../superify');

module.exports = function(steroids, log) {
  var getAcceleration, s, watchAcceleration;
  s = superify('supersonic.device.accelerometer', log);

  /*
    * @namespace supersonic.device
    * @name accelerometer
    * @overview
    * @description
    *  Provides access to the device's accelerometer. The accelerometer is a motion sensor that detects the change (delta) in movement relative to the current device orientation, in three dimensions along the x, y, and z axis.
   */

  /*
    * @namespace supersonic.device.accelerometer
    * @name watchAcceleration
    * @function
    * @apiCall supersonic.device.accelerometer.watchAcceleration
    * @description
    * Returns a stream of acceleration updates.
    * @type
    * supersonic.device.accelerometer.watchAcceleration: (
    *   options?: {
    *     frequency?: Integer
    *   }
    * ) => Stream {
    *   x: Number,
    *   y: Number,
    *   z: Number,
    *   timestamp: Date
    * }
    * @define {Object} options={} Optional options object.
    * @define {Integer} options.frequency=40 Update interval in milliseconds.
    * @returnsDescription A [`Stream`](/supersonic/guides/technical-concepts/streams/) of acceleration objects with the following properties.
    * @define {=>Object} acceleration Acceleration object.
    * @define {=>Number} acceleration.x Amount of acceleration on the x-axis. (in m/s^2)
    * @define {=>Number} acceleration.y Amount of acceleration on the y-axis. (in m/s^2)
    * @define {=>Number} acceleration.z Amount of acceleration on the z-axis. (in m/s^2)
    * @define {=>Date} acceleration.timestamp Creation timestamp for acceleration.
    * @supportsCallbacks
    * @exampleCoffeeScript
    * options =
    *   frequency: 60
    *
    * supersonic.device.accelerometer.watchAcceleration(options).onValue (acceleration) ->
    *   supersonic.logger.log(
    *     """
    *     Acceleration X: #{acceleration.x}
    *     Acceleration Y: #{acceleration.y}
    *     Acceleration Z: #{acceleration.z}
    *     Timestamp: #{acceleration.timestamp}
    *     """
    *   )
    * @exampleJavaScript
    * var options = {
    *   frequency: 60
    * }
    *
    * supersonic.device.accelerometer.watchAcceleration(options).onValue(function(acceleration) {
    *   supersonic.logger.log(
    *     "Acceleration X: " + acceleration.x + "\n" +
    *     "Acceleration Y: " + acceleration.y + "\n" +
    *     "Acceleration Z: " + acceleration.z + "\n" +
    *     "Timestamp: " + acceleration.timestamp
    *   );
    * });
   */
  watchAcceleration = s.streamF("watchAcceleration", function(options) {
    var accelerationOptions;
    if (options == null) {
      options = {};
    }
    accelerationOptions = {
      frequency: ((options != null ? options.frequency : void 0) != null) || 40
    };
    return Bacon.fromPromise(deviceready).flatMap(function() {
      return Bacon.fromBinder(function(sink) {
        var watchId;
        watchId = window.navigator.accelerometer.watchAcceleration(function(acceleration) {
          var DOMTimeStamp;
          DOMTimeStamp = acceleration.timestamp;
          acceleration.timestamp = new Date(DOMTimeStamp);
          return sink(new Bacon.Next(acceleration));
        }, function(error) {
          return sink(new Bacon.Error(error));
        }, options);
        return function() {
          return window.navigator.accelerometer.clearWatch(watchId);
        };
      });
    });
  });

  /*
    * @namespace supersonic.device.accelerometer
    * @name getAcceleration
    * @function
    * @apiCall supersonic.device.accelerometer.getAcceleration
    * @description
    * Returns device's current acceleration.
    * @type
    * supersonic.device.accelerometer.getAcceleration: () =>
    *   Promise: {
    *     x: Number,
    *     y: Number,
    *     z: Number,
    *     timestamp: Date
    *   }
    * @returnsDescription A [`Promise`](/supersonic/guides/technical-concepts/promises/) that is resolved with the next available acceleration data. Will wait for data for an indeterminate time; use a timeout if required.
    * @define {=>Object} acceleration Acceleration object.
    * @define {=>Number} acceleration.x Amount of acceleration on the x-axis. (in m/s^2)
    * @define {=>Number} acceleration.y Amount of acceleration on the y-axis. (in m/s^2)
    * @define {=>Number} acceleration.z Amount of acceleration on the z-axis. (in m/s^2)
    * @define {=>Date} acceleration.timestamp Creation timestamp for acceleration.
    * @supportsCallbacks
    * @exampleCoffeeScript
    * supersonic.device.accelerometer.getAcceleration().then (acceleration) ->
    *   supersonic.logger.log(
    *     """
    *     Acceleration X: #{acceleration.x}
    *     Acceleration Y: #{acceleration.y}
    *     Acceleration Z: #{acceleration.z}
    *     Timestamp: #{acceleration.timestamp}
    *     """
    *   )
    * @exampleJavaScript
    * supersonic.device.accelerometer.getAcceleration().then(function(acceleration) {
    *   supersonic.logger.log(
    *     "Acceleration X: " + acceleration.x + "\n" +
    *     "Acceleration Y: " + acceleration.y + "\n" +
    *     "Acceleration Z: " + acceleration.z + "\n" +
    *     "Timestamp: " + acceleration.timestamp
    *   );
    * });
   */
  getAcceleration = s.promiseF("getAcceleration", function() {
    return new Promise(function(resolve) {
      return watchAcceleration().take(1).onValue(resolve);
    });
  });
  return {
    watchAcceleration: watchAcceleration,
    getAcceleration: getAcceleration
  };
};



},{"../events":224,"../superify":228,"baconjs":165,"bluebird":166}],213:[function(require,module,exports){
module.exports = function(steroids, log) {
  var bug, callbacks, override, whenPressed, _addCallback, _handler, _removeCallback;
  bug = log.debuggable("supersonic.device.buttons.back");

  /*
    * @namespace supersonic.device.buttons
    * @name back
    * @overview
    * @description
    * Provides access to the device's back button (Android only).
    *
    * ## Methods
    * * [whenPressed](/supersonic/api-reference/stable/supersonic/device/buttons/back/whenpressed/) – overrides device back button.
   */

  /*
   * @namespace supersonic.device.buttons.back
   * @name whenPressed
   * @function
   * @apiCall supersonic.device.buttons.back.whenPressed
   * @description
   * Override device back button (Android only).
   * @type
   * supersonic.device.buttons.back.whenPressed: () => unsubscribe: Function
   * @define {Function} unsubscribe Stop listening
   * @exampleCoffeeScript
   * supersonic.device.buttons.back.whenPressed ->
   *   supersonic.logger.log("Device back button was pressed.")
   * @exampleJavaScript
   * supersonic.device.buttons.back.whenPressed( function() {
   *   supersonic.logger.log("Device back button was pressed.");
   * });
   */
  override = false;
  callbacks = [];
  _handler = function() {
    var cb, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = callbacks.length; _i < _len; _i++) {
      cb = callbacks[_i];
      _results.push(cb.fn());
    }
    return _results;
  };
  _addCallback = function(f) {
    return callbacks.push({
      id: (new Date()).getTime(),
      fn: f
    });
  };
  _removeCallback = function(id) {
    var cb;
    if (callbacks.length === 0) {
      document.removeEventListener("backbutton", _handler, false);
      override = false;
    }
    return callbacks = (function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = callbacks.length; _i < _len; _i++) {
        cb = callbacks[_i];
        if (cb.id === id) {
          _results.push(cb);
        }
      }
      return _results;
    })();
  };
  whenPressed = function(f) {
    var id;
    id = _addCallback(f).id;
    if (!override) {
      document.addEventListener("backbutton", _handler, false);
      override = true;
    }
    return function() {
      return _removeCallback(id);
    };
  };
  return {
    whenPressed: whenPressed
  };
};



},{}],214:[function(require,module,exports){

/*
  * @namespace supersonic.device
  * @name buttons
  * @overview
  * @description The `supersonic.device.buttons.*` namespace provides you access to the device's hardware buttons.
 */
module.exports = function(steroids, log) {
  return {
    back: require("./back")(steroids, log)
  };
};



},{"./back":213}],215:[function(require,module,exports){
var Bacon, Promise, deviceready, superify;

Promise = require('bluebird');

Bacon = require('baconjs');

deviceready = require('../events').deviceready;

superify = require('../superify');

module.exports = function(steroids, log) {
  var getHeading, s, watchHeading;
  s = superify('supersonic.device.compass', log);

  /*
    * @namespace supersonic.device
    * @name compass
    * @overview
    * @description
    * Provides access to the device's compass. The compass is a sensor that detects the direction or heading that the device is pointed, typically from the top of the device. It measures the heading in degrees from 0 to 359.99, where 0 is north.
   */

  /*
    * @namespace supersonic.device.compass
    * @name watchHeading
    * @function
    * @apiCall supersonic.device.compass.watchHeading
    * @description
    * Returns a stream of compass heading updates.
    * @type
    * supersonic.device.compass.watchHeading : (
    *   options?: {
    *     frequency?: Integer,
    *     filter?: Integer
    *   }
    * ) => Stream {
    *   magneticHeading: Number,
    *   trueHeading: Number,
    *   headingAccuracy: Number,
    *   timestamp: Date
    * }
    * @define {Object} options={} Optional options object.
    * @define {Integer} options.frequency=100 Update interval in milliseconds.
    * @define {Integer} options.filter The change in degrees required to initiate an update. When this value is set, `options.frequency` is ignored.
    * @returnsDescription A [`Stream`](/supersonic/guides/technical-concepts/streams/) of heading objects with the following properties:
    * @define {=>Object} heading Heading object.
    * @define {=>Number} heading.magneticHeading  The heading in degrees from 0-359.99 at a single moment in time.
    * @define {=>Number} heading.trueHeading The heading relative to the geographic North Pole in degrees 0-359.99 at a single moment in time. A negative value indicates that the true heading couldn't be determined.
    * @define {=>Number} heading.headingAccuracy The deviation in degrees between the reported heading and the true heading.
    * @define {=>Date} heading.timestamp Creation timestamp for heading.
    * @supportsCallbacks
    * @exampleCoffeeScript
    * supersonic.device.compass.watchHeading().onValue (heading) ->
    *   supersonic.logger.log(
    *     """
    *     Magnetic heading: #{heading.magneticHeading}
    *     True heading: #{heading.trueHeading}
    *     Heading accuracy: #{heading.headingAccuracy}
    *     Timestamp: #{heading.timestamp}
    *     """
    *   )
    * @exampleJavaScript
    * supersonic.device.compass.watchHeading().onValue( function(heading) {
    *   supersonic.logger.log(
    *     "Magnetic heading: " + heading.magneticHeading + "\n" +
    *     "True heading: " + heading.trueHeading + "\n" +
    *     "Heading accuracy: " + heading.headingAccuracy + "\n" +
    *     "Timestamp: " + heading.timestamp
    *   );
    * });
   */
  watchHeading = s.streamF("watchHeading", function(options) {
    var compassOptions;
    if (options == null) {
      options = {};
    }
    compassOptions = {
      frequency: ((options != null ? options.frequency : void 0) != null) || 100,
      filter: ((options != null ? options.filter : void 0) != null) || null
    };
    return Bacon.fromPromise(deviceready).flatMap(function() {
      return Bacon.fromBinder(function(sink) {
        var watchId;
        watchId = window.navigator.compass.watchHeading(function(heading) {
          var DOMTimeStamp;
          DOMTimeStamp = heading.timestamp;
          heading.timestamp = new Date(DOMTimeStamp);
          return sink(new Bacon.Next(heading));
        }, function(error) {
          return sink(new Bacon.Error(error));
        }, compassOptions);
        return function() {
          return window.navigator.compass.clearWatch(watchId);
        };
      });
    });
  });

  /*
    * @namespace supersonic.device.compass
    * @name getHeading
    * @function
    * @apiCall supersonic.device.compass.getHeading
    * @description
    * Returns device's current heading.
    * @type
    * supersonic.device.compass.getHeading: () =>
    *   Promise: {
    *     magneticHeading: Number,
    *     trueHeading: Number,
    *     headingAccuracy: Number,
    *     timestamp: Date
    *   }
    * @returnsDescription A [`Promise`](/supersonic/guides/technical-concepts/promises/) is resolved to the next available heading data.
    * @define {=>Object} heading Heading object.
    * @define {=>Number} heading.magneticHeading  The heading in degrees from 0-359.99 at a single moment in time.
    * @define {=>Number} heading.trueHeading The heading relative to the geographic North Pole in degrees 0-359.99 at a single moment in time. A negative value indicates that the true heading couldn't be determined.
    * @define {=>Number} heading.headingAccuracy The deviation in degrees between the reported heading and the true heading.
    * @define {=>Date} heading.timestamp heading.timestamp Creation timestamp for heading.
    * @supportsCallbacks
    * @exampleCoffeeScript
    * supersonic.device.compass.getHeading().then (heading) ->
    *   supersonic.logger.log(
    *     """
    *     Magnetic heading: #{heading.magneticHeading}
    *     True heading: #{heading.trueHeading}
    *     Heading accuracy: #{heading.headingAccuracy}
    *     Timestamp: #{heading.timestamp}
    *     """
    *   )
    * @exampleJavaScript
    * supersonic.device.compass.getHeading().then( function(heading) {
    *   supersonic.logger.log(
    *     "Magnetic heading: " + heading.magneticHeading + "\n" +
    *     "True heading: " + heading.trueHeading + "\n" +
    *     "Heading accuracy: " + heading.headingAccuracy + "\n" +
    *     "Timestamp: " + heading.timestamp
    *   );
    * });
   */
  getHeading = s.promiseF("getHeading", function() {
    return new Promise(function(resolve) {
      return watchHeading().take(1).onValue(resolve);
    });
  });
  return {
    watchHeading: watchHeading,
    getHeading: getHeading
  };
};



},{"../events":224,"../superify":228,"baconjs":165,"bluebird":166}],216:[function(require,module,exports){
var Bacon, Promise, deviceready, superify;

Promise = require('bluebird');

Bacon = require('baconjs');

deviceready = require('../events').deviceready;

superify = require('../superify');

module.exports = function(steroids, log) {
  var getPosition, s, watchPosition;
  s = superify('supersonic.device.geolocation', log);

  /*
    * @namespace supersonic.device
    * @name geolocation
    * @overview
    * @description
    * Provides access to location data based on the device's GPS sensor or inferred from network signals.
   */

  /*
    * @namespace supersonic.device.geolocation
    * @name watchPosition
    * @function
    * @apiCall supersonic.device.geolocation.watchPosition
    * @description
    * Returns a stream of position updates.
    * @type
    * supersonic.device.geolocation.watchPosition : (
    *   options?: {
    *     enableHighAccuracy?: Boolean
    *   }
    * ) => Stream {
    *   coord: Object,
    *   timestamp: Date
    * }
    * @define {Object} options={} Optional options object.
    * @define {Boolean} options.enableHighAccuracy=true Provides a hint that the application needs the best possible results. By default, the device attempts to retrieve a position using network-based methods. Setting this property to true tells the framework to use more accurate methods, such as satellite positioning.
    * @returnsDescription A [`Stream`](/supersonic/guides/technical-concepts/streams/) of position objects with the following properties:
    * @define {=>Object} position Position object.
    * @define {=>Object} position.coord  A set of geographic coordinates. The `coord` object has the following properties:
    * <ul>
    *   <li>`longitude`: Longitude in decimal degrees (Number).</li>
    *   <li>`latitude`: Latitude in decimal degrees (Number).</li>
    *   <li>`altitude`: Height of the position in meters above the ellipsoid (Number).</li>
    *   <li>`accuracy`: Accuracy level of the latitude and longitude coordinates in meters (Number).</li>
    *   <li>`altitudeAccuracy`: Accuracy level of the altitude coordinate in meters (Number). Not supported by Android devices, returning null.</li>
    *   <li>`heading`: Direction of travel, specified in degrees counting clockwise relative to the true north (Number).</li>
    *   <li>`speed`: Current ground speed of the device, specified in meters per second (Number).</li>
    * </ul>
    * @define {=>Date} position.timestamp Creation timestamp for coords.
    * @supportsCallbacks
    * @exampleCoffeeScript
    * supersonic.device.geolocation.watchPosition().onValue (position) ->
    *   supersonic.logger.log(
    *     """
    *     Latitude: #{position.coords.latitude}
    *     Longitude: #{position.coords.longitude}
    *     Timestamp: #{position.timestamp}
    *     """
    *   )
    * @exampleJavaScript
    * supersonic.device.geolocation.watchPosition().onValue( function(position) {
    *   supersonic.logger.log(
    *     "Latitude: " + position.coords.latitude + "\n" +
    *     "Longitude: " + position.coords.longitude + "\n" +
    *     "Timestamp: " + position.timestamp
    *   );
    * });
   */
  watchPosition = s.streamF("watchPosition", function(options) {
    if (options == null) {
      options = {};
    }
    if (options.enableHighAccuracy == null) {
      options.enableHighAccuracy = true;
    }
    return Bacon.fromPromise(deviceready).flatMap(function() {
      return Bacon.fromBinder(function(sink) {
        var watchId;
        watchId = window.navigator.geolocation.watchPosition(function(position) {
          return sink(new Bacon.Next(position));
        }, function(error) {
          return sink(new Bacon.Error(error));
        }, options);
        return function() {
          return window.navigator.geolocation.clearWatch(watchId);
        };
      });
    });
  });

  /*
    * @namespace supersonic.device.geolocation
    * @name getPosition
    * @function
    * @apiCall supersonic.device.geolocation.getPosition
    * @description
    * Returns device's current position.
    * @type
    * supersonic.device.compass.geolocation.getPosition : () =>
    *   Promise: {
    *     coord: Object,
    *     timestamp: Date
    *   }
    * @returnsDescription A [`Promise`](/supersonic/guides/technical-concepts/promises/) is resolved to the next available position data. Will wait for data for an indeterminate time; use a timeout if required.
    * @define {=>Object} position Position object.
    * @define {=>Object} position.coord  A set of geographic coordinates.
    * @define {=>Number} coord.longitude  Longitude in decimal degrees.
    * @define {=>Number} coord.latitude  Latitude in decimal degrees.
    * @define {=>Number} coord.altitude  Height of the position in meters above the ellipsoid.
    * @define {=>Number} coord.accuracy  Accuracy level of the latitude and longitude coordinates in meters.
    * @define {=>Number} coord.altitudeAccuracy  Accuracy level of the altitude coordinate in meters. Not supported by Android devices, returning null.
    * @define {=>Number} coord.heading  Direction of travel, specified in degrees counting clockwise relative to the true north.
    * @define {=>Number} coord.speed  Current ground speed of the device, specified in meters per second.
    * @define {=>Date} position.timestamp Creation timestamp for coords.
    * @supportsCallbacks
    * @exampleCoffeeScript
    * supersonic.device.geolocation.getPosition().then (position) ->
    *   supersonic.logger.log(
    *     """
    *     Latitude: #{position.coords.latitude}
    *     Longitude: #{position.coords.longitude}
    *     Timestamp: #{position.timestamp}
    *     """
    *   )
    * @exampleJavaScript
    * supersonic.device.geolocation.getPosition().then( function(position) {
    *   supersonic.logger.log(
    *     "Latitude: " + position.coords.latitude + "\n" +
    *     "Longitude: " + position.coords.longitude + "\n" +
    *     "Timestamp: " + position.timestamp
    *   );
    * });
   */
  getPosition = s.promiseF("getPosition", function(options) {
    if (options == null) {
      options = {};
    }
    return new Promise(function(resolve) {
      return watchPosition(options).take(1).onValue(resolve);
    });
  });
  return {
    watchPosition: watchPosition,
    getPosition: getPosition
  };
};



},{"../events":224,"../superify":228,"baconjs":165,"bluebird":166}],217:[function(require,module,exports){
var Promise;

Promise = require('bluebird');

module.exports = function(steroids, log) {
  return {
    geolocation: require("./geolocation")(steroids, log),
    accelerometer: require("./accelerometer")(steroids, log),
    compass: require("./compass")(steroids, log),
    network: require("./network")(steroids, log),
    platform: require("./platform")(steroids, log),
    vibrate: require("./vibrate")(steroids, log),
    ready: require("./ready")(steroids, log),
    buttons: require("./buttons")(steroids, log),
    push: require("./push")(steroids, log)
  };
};



},{"./accelerometer":212,"./buttons":214,"./compass":215,"./geolocation":216,"./network":218,"./platform":219,"./push":220,"./ready":221,"./vibrate":222,"bluebird":166}],218:[function(require,module,exports){
var Promise, network;

Promise = require('bluebird');

network = require('../events').network;

module.exports = function(steroids, log) {
  var bug;
  bug = log.debuggable("supersonic.device.network");
  return {

    /*
      * @namespace supersonic.device
      * @name network
      * @overview
      * @description
      * Provides information about the network status of the device.
     */

    /*
      * @namespace supersonic.device.network
      * @name whenOffline
      * @function
      * @apiCall supersonic.device.network.whenOffline
      * @description
      * Detect when the device goes offline.
      * @type
      * supersonic.device.network.whenOffline: (
      *   listen: Function
      * ) => unsubscribe: Function
      * @define {Function} listen A function that is fired when the device goes offline.
      * @returnsDescription
      * Returns an unsubscribe function that can be triggered to stop listening for offline events.
      * @define {=>Function} unsubscribe Stop listening for offline events.
      * @exampleCoffeeScript
      * unsubscribe = supersonic.device.network.whenOffline ->
      *   supersonic.ui.dialog.alert "Device is offline!"
      *
      * # Later on, we can unsubscribe and stop listening for offline events
      * unsubscribe()
      * @exampleJavaScript
      * var unsubscribe = supersonic.device.network.whenOffline( function() {
      *   supersonic.ui.dialog.alert("Device is offline!");
      * });
      *
      * // Later on, we can unsubscribe and stop listening for offline events
      * unsubscribe();
     */
    whenOffline: function(listen) {
      return network.filter(function(online) {
        return !online;
      }).onValue(listen);
    },

    /*
      * @namespace supersonic.device.network
      * @name whenOnline
      * @function
      * @apiCall supersonic.device.network.whenOnline
      * @description
      * Detect when the device goes online.
      * @type
      * supersonic.device.network.whenOnline: (
      *   listen: Function
      * ) => unsubscribe: Function
      * @define {Function} listen A function that is fired when the device goes online.
      * @returnsDescription
      * Returns a function given as a parameter when the device goes online.
      * @define {=>Function} unsubscribe Stop listening for online events.
      * @exampleCoffeeScript
      * unsubscribe = supersonic.device.network.whenOnline ->
      *   supersonic.ui.dialog.alert "Device is online!"
      *
      * # Later on, we can unsubscribe and stop listening for online events
      * unsubscribe()
      * @exampleJavaScript
      * var unsubscribe = supersonic.device.network.whenOnline( function() {
      *   supersonic.ui.dialog.alert("Device is online!");
      * });
      *
      * // Later on, we can unsubscribe and stop listening for online events
      * unsubscribe();
     */
    whenOnline: function(listen) {
      return network.filter(function(online) {
        return online;
      }).onValue(listen);
    }
  };
};



},{"../events":224,"bluebird":166}],219:[function(require,module,exports){
var Promise, deviceready;

Promise = require('bluebird');

deviceready = require('../events').deviceready;

module.exports = function(steroids, log) {
  var bug, platform;
  bug = log.debuggable("supersonic.device.platform");

  /*
    * @namespace supersonic.device
    * @name platform
    * @function
    * @apiCall supersonic.device.platform
    * @description
    * Get the device's operating system name and version.
    * @type
    * supersonic.device.platform : () =>
    *   Promise {
    *     name: String,
    *     version: String,
    *     model: String
    *   }
    * @returnsDescription A [`Promise`](/supersonic/guides/technical-concepts/promises/) is resolved to the name and version of the operating system and the model of the device.
    * @define {=>Object} platform Platform object.
    * @define {=>String} platform.name  The device's operating system name.
    * @define {=>String} platform.version  The device's operating system version.
    * @define {=>String} platform.model The name of the device's model or product. The value is set by the device manufacturer and may be different across versions of the same product.
    * @exampleCoffeeScript
    * supersonic.device.platform().then (platform) ->
    *   supersonic.logger.log(
    *     """
    *     Name: #{platform.name}
    *     Version: #{platform.version}
    *     Model: #{platform.model}
    *     """
    *   )
    * @exampleJavaScript
    * supersonic.device.platform().then( function(platform) {
    *   supersonic.logger.log(
    *     "Name: " + platform.name + "\n" +
    *     "Version: " + platform.version + "\n" +
    *     "Model: " + platform.model
    *   );
    * });
   */
  platform = function() {
    return deviceready.then(function() {
      return {
        name: window.device.platform,
        version: window.device.version,
        model: window.device.model
      };
    });
  };
  return platform;
};



},{"../events":224,"bluebird":166}],220:[function(require,module,exports){
var Bacon, Promise, deviceready, superify;

Promise = require('bluebird');

Bacon = require('baconjs');

deviceready = require('../events').deviceready;

superify = require('../superify');

module.exports = function(steroids, log) {
  var backgroundNotifications, foregroundNotifications, getPlugin, register, s, unregister;
  s = superify('supersonic.device.push', log);

  /*
    * @namespace supersonic.device
    * @name push
    * @overview
    * @description
    * Provides access to Push Notification services.
   */
  getPlugin = function() {
    return deviceready.then(function() {
      var _ref;
      return (_ref = window.plugins) != null ? _ref.pushNotification : void 0;
    }).then(function(plugin) {
      if (plugin == null) {
        throw new Error("Could not load pushNotification plugin. Is the plugin installed?");
      }
      return plugin;
    });
  };

  /*
    * @namespace supersonic.device.push
    * @name register
    * @function
    * @apiCall supersonic.device.push.register
    * @type
    * supersonic.device.push.register : (
    *   options?: {
    *     senderID?: String
    *     badge?: "true" | "false"
    *     sound?: "true" | "false"
    *     alert?: "true" | "false"
    *   }
    * ) => Promise devicetoken: String
    * @define {Object} options={} Optional options object.
    * @define {String} senderID (Android specific)
    * @define {String} badge (iOS specific)
    * @define {String} sound (iOS specific)
    * @define {String} alert (iOS specific)
    * @supportsCallbacks
   */
  register = s.promiseF("register", function(options) {
    if (options == null) {
      options = {};
    }
    return getPlugin().then(function(plugin) {
      return new Promise(function(resolve, reject) {
        return plugin.register(resolve, reject, options);
      }).tap(function(devicetoken) {
        return log.info("Registered device to receive push notifications with device token / registration id: '" + devicetoken + "'");
      });
    });
  });

  /*
    * @namespace supersonic.device.push
    * @name unregister
    * @function
    * @apiCall supersonic.device.push.unregister
    * @type
    * supersonic.device.push.unregister: () => Promise
    * @supportsCallbacks
   */
  unregister = s.promiseF("unregister", function() {
    return getPlugin().then(function(plugin) {
      return new Promise(function(resolve, reject) {
        return plugin.unregister(resolve, reject);
      });
    });
  });

  /*
    * @namespace supersonic.device.push
    * @name backgroundNotifications
    * @function
    * @apiCall supersonic.device.push.backgroundNotifications
    * @type
    * supersonic.device.push.backgroundNotifications: () => Stream {
    *   message?: String
    *   alert?: String
    * }
    * @supportsCallbacks
   */
  backgroundNotifications = s.streamF("backgroundNotifications", function() {
    return Bacon.fromPromise(getPlugin()).flatMap(function(plugin) {
      return Bacon.fromBinder(function(sink) {
        plugin.onMessageInBackground(function(notification) {
          return sink(new Bacon.Next(notification));
        }, function(error) {
          return sink(new Bacon.Error(error));
        });
        return function() {};
      });
    });
  });

  /*
    * @namespace supersonic.device.push
    * @name foregroundNotifications
    * @function
    * @apiCall supersonic.device.push.foregroundNotifications
    * @type
    * supersonic.device.push.foregroundNotifications: () => Stream {
    *   message?: String
    *   alert?: String
    * }
    * @supportsCallbacks
   */
  foregroundNotifications = s.streamF("foregroundNotifications", function() {
    return Bacon.fromPromise(getPlugin()).flatMap(function(plugin) {
      return Bacon.fromBinder(function(sink) {
        plugin.onMessageInForeground(function(notification) {
          return sink(new Bacon.Next(notification));
        }, function(error) {
          return sink(new Bacon.Error(error));
        });
        return function() {};
      });
    });
  });
  return {
    register: register,
    unregister: unregister,
    backgroundNotifications: backgroundNotifications,
    foregroundNotifications: foregroundNotifications
  };
};



},{"../events":224,"../superify":228,"baconjs":165,"bluebird":166}],221:[function(require,module,exports){
var Promise, deviceready;

Promise = require('bluebird');

deviceready = require('../events').deviceready;

module.exports = function(steroids, log) {
  var bug;
  bug = log.debuggable("supersonic.device.ready");

  /*
    * @namespace supersonic.device
    * @name ready
    * @function
    * @apiCall supersonic.device.ready
    * @description
    * Find out when device is ready for plugins etc.
    * @type
    * supersonic.device.ready : => Promise
    * @returnsDescription A [`Promise`](/supersonic/guides/technical-concepts/promises/) is resolved when device ready is fired.
    * @exampleCoffeeScript
    * supersonic.device.ready.then ->
    *   supersonic.logger.log "READY!"
    * @exampleJavaScript
    * supersonic.device.ready.then( function() {
    *   supersonic.logger.log("READY!");
    * });
   */
  return deviceready;
};



},{"../events":224,"bluebird":166}],222:[function(require,module,exports){
var Promise, deviceready;

Promise = require('bluebird');

deviceready = require('../events').deviceready;

module.exports = function(steroids, log) {
  var bug, vibrate;
  bug = log.debuggable("supersonic.device.platform");

  /*
    * @namespace supersonic.device
    * @name vibrate
    * @function
    * @apiCall supersonic.device.vibrate
    * @description
    * Vibrates the device.
    * @type
    * supersonic.device.vibrate : ()
    * @exampleCoffeeScript
    * supersonic.device.vibrate()
    * @exampleJavaScript
    * supersonic.device.vibrate();
   */
  vibrate = function(ms) {
    if (ms == null) {
      ms = 1000;
    }
    return deviceready.then(function() {
      return navigator.notification.vibrate(ms);
    });
  };
  return vibrate;
};



},{"../events":224,"bluebird":166}],223:[function(require,module,exports){
module.exports = function(logger, window) {
  var _ref;
  return ((_ref = window.parent.appgyver) != null ? _ref.environment : void 0) || {
    mode: "legacy"
  };
};



},{}],224:[function(require,module,exports){
var Bacon, Promise;

Promise = require('bluebird');

Bacon = require('baconjs');

module.exports = {
  deviceready: typeof document !== "undefined" && document !== null ? new Promise(function(resolve) {
    return document.addEventListener('deviceready', resolve);
  }) : Promise.resolve(),
  background: (function() {
    var pauses, resumes;
    pauses = typeof document !== "undefined" && document !== null ? Bacon.fromEventTarget(document, "pause").map(function() {
      return true;
    }) : Bacon.once(true);
    resumes = typeof document !== "undefined" && document !== null ? Bacon.fromEventTarget(document, "resume").map(function() {
      return false;
    }) : Bacon.once(true);
    return pauses.merge(resumes).toProperty().skipDuplicates();
  })(),
  network: (function() {
    var offlines, onlines;
    offlines = typeof document !== "undefined" && document !== null ? Bacon.fromEventTarget(document, "offline").map(function() {
      return false;
    }) : Bacon.once(true);
    onlines = typeof document !== "undefined" && document !== null ? Bacon.fromEventTarget(document, "online").map(function() {
      return true;
    }) : Bacon.once(true);
    return offlines.merge(onlines).toProperty().skipDuplicates();
  })(),
  visibility: (function() {
    var visibilityState;
    visibilityState = typeof document !== "undefined" && document !== null ? {
      changes: Bacon.fromEventTarget(document, 'visibilitychange'),
      defaultState: document.visibilityState
    } : {
      changes: Bacon.once({
        target: {
          visibilitystate: 'visible'
        }
      }),
      defaultState: 'hidden'
    };
    return visibilityState.changes.map(function(event) {
      var _ref, _ref1;
      if (((_ref = event.detail) != null ? _ref.visibilityState : void 0) != null) {
        return event.detail.visibilityState;
      } else {
        return (_ref1 = event.target) != null ? _ref1.visibilityState : void 0;
      }
    }).toProperty(visibilityState.defaultState).map(function(stateString) {
      switch (stateString) {
        case "visible":
          return true;
        case "hidden":
          return false;
        default:
          return false;
      }
    });
  })()
};



},{"baconjs":165,"bluebird":166}],225:[function(require,module,exports){
var Bacon, Promise, logMessageEnvelope, logMessageStream, startFlushing,
  __slice = [].slice;

Promise = require('bluebird');

Bacon = require('baconjs');

logMessageEnvelope = function(window) {
  return function(level) {
    return function(message) {
      var e;
      return {
        message: (function() {
          try {
            return JSON.stringify((function() {
              switch (typeof message) {
                case 'function':
                  return message.toString();
                default:
                  return message;
              }
            })());
          } catch (_error) {
            e = _error;
            return "Failed to log message: " + (e.toString());
          }
        })(),
        date: new Date().getTime(),
        level: level,
        location: window.location.href,
        screen_id: window.AG_SCREEN_ID,
        layer_id: window.AG_LAYER_ID,
        view_id: window.AG_VIEW_ID
      };
    };
  };
};

startFlushing = function(messageStream, sink) {
  return messageStream.onValue(sink);
};

logMessageStream = function(toEnvelope) {
  var stream;
  stream = new Bacon.Bus;
  return {
    "in": function(message) {
      return stream.push(message);
    },
    out: stream.map(toEnvelope)
  };
};

module.exports = function(steroids, window) {
  var autoFlush, defaultLogEndPoint, sendToEndPoint, shouldAutoFlush;
  defaultLogEndPoint = function() {
    return new Promise(function(resolve) {
      return steroids.app.host.getURL({}, {
        onSuccess: function(url) {
          return resolve("" + url + "/__appgyver/logger");
        }
      });
    });
  };
  shouldAutoFlush = function() {
    return new Promise(function(resolve, reject) {
      return steroids.app.getMode({}, {
        onSuccess: function(mode) {
          if (mode === "scanner") {
            return resolve("Inside Scanner, autoflush allowed");
          } else {
            return reject("Not in a Scanner app, disabling autoflush for logging");
          }
        }
      });
    });
  };
  sendToEndPoint = function(logEndPoint) {
    return function(envelope) {
      var xhr;
      xhr = new window.XMLHttpRequest();
      xhr.open("POST", logEndPoint, true);
      xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      xhr.send(JSON.stringify(envelope));
      return xhr;
    };
  };
  autoFlush = function(messageStream) {
    return function() {
      return shouldAutoFlush().then(function() {
        return defaultLogEndPoint().then(function(endPoint) {
          return startFlushing(messageStream, sendToEndPoint(endPoint));
        });
      }, function(reason) {
        return console.log(reason);
      });
    };
  };
  return (function(toEnvelopeForLevel) {
    var log, messages, streamsPerLogLevel;
    messages = new Bacon.Bus;
    streamsPerLogLevel = {
      info: logMessageStream(toEnvelopeForLevel('info')),
      warn: logMessageStream(toEnvelopeForLevel('warn')),
      error: logMessageStream(toEnvelopeForLevel('error')),
      debug: logMessageStream(toEnvelopeForLevel('debug'))
    };
    messages.plug(streamsPerLogLevel.info.out);
    messages.plug(streamsPerLogLevel.warn.out);
    messages.plug(streamsPerLogLevel.error.out);
    messages.plug(streamsPerLogLevel.debug.out);
    streamsPerLogLevel.info.out.onValue(function(envelope) {
      return console.log("supersonic.logger.info:", JSON.parse(envelope.message));
    });
    streamsPerLogLevel.warn.out.onValue(function(envelope) {
      return console.log("supersonic.logger.warn:", JSON.parse(envelope.message));
    });
    streamsPerLogLevel.error.out.onValue(function(envelope) {
      return console.error("supersonic.logger.error:", JSON.parse(envelope.message));
    });
    return log = {
      autoFlush: autoFlush(messages),
      log: streamsPerLogLevel.info["in"],
      debuggable: function(namespace) {
        return function(name, f) {
          return function() {
            var args;
            args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
            log.debug("" + namespace + "." + name + " called");
            return f.apply(null, args).then(function(value) {
              log.debug("" + namespace + "." + name + " resolved");
              return value;
            }, function(error) {
              var msg;
              msg = (error != null ? error.errorDescription : void 0) != null ? error.errorDescription : JSON.stringify(error);
              log.error("" + namespace + "." + name + " rejected: " + msg);
              return Promise.reject(error);
            });
          };
        };
      },

      /*
        * @namespace supersonic
        * @name logger
        * @overview
        * @description Log messages directly to web console.
       */

      /*
        * @namespace supersonic.logger
        * @name info
        * @function
        * @apiCall supersonic.logger.info
        * @description
        * Logs info level messages.
        * @type
        * supersonic.logger.info: (message: String)
        * @define {String} message Message to log.
        * @exampleCoffeeScript
        * supersonic.logger.info("Just notifying you that X is going on")
        * @exampleJavaScript
        * supersonic.logger.info("Just notifying you that X is going on");
       */
      info: streamsPerLogLevel.info["in"],

      /*
        * @namespace supersonic.logger
        * @name warn
        * @function
        * @apiCall supersonic.logger.warn
        * @description
        * Logs warn level messages.
        * @type
        * supersonic.logger.warn: (message: String)
        * @define {String} message Message to log.
        * @exampleCoffeeScript
        * supersonic.logger.warn("Something that probably should not be happening... is happening.")
        * @exampleJavaScript
        * supersonic.logger.warn("Something that probably should not be happening... is happening.");
       */
      warn: streamsPerLogLevel.warn["in"],

      /*
        * @namespace supersonic.logger
        * @name error
        * @function
        * @apiCall supersonic.logger.error
        * @description
        * Logs error level messages.
        * @type
        * supersonic.logger.error: (message: String)
        * @define {String} message Message to log.
        * @exampleCoffeeScript
        * supersonic.logger.error("Something failed")
        * @exampleJavaScript
        * supersonic.logger.error("Something failed");
       */
      error: streamsPerLogLevel.error["in"],

      /*
        * @namespace supersonic.logger
        * @name debug
        * @function
        * @apiCall supersonic.logger.debug
        * @description
        * Logs debug level messages.
        * @type
        * supersonic.logger.debug: (message: String)
        * @define {String} message Message to log.
        * @exampleCoffeeScript
        * supersonic.logger.debug("This information is here only for your debugging convenience")
        * @exampleJavaScript
        * supersonic.logger.debug("This information is here only for your debugging convenience");
       */
      debug: streamsPerLogLevel.debug["in"]
    };
  })(logMessageEnvelope(window));
};



},{"baconjs":165,"bluebird":166}],226:[function(require,module,exports){
var Promise, deviceready, superify;

Promise = require('bluebird');

superify = require('../superify');

deviceready = require('../events').deviceready;


/*
  * @namespace supersonic.media
  * @name camera
  * @overview
  * @description
  * Provides access to the device's default camera application and photo library.
 */

module.exports = function(steroids, log) {
  var getFromPhotoLibrary, s, takePicture;
  s = superify('supersonic.media.camera', log);

  /*
    * @namespace supersonic.media.camera
    * @name takePicture
    * @function
    * @apiCall supersonic.media.camera.takePicture
    * @description
    * Allows users to take pictures using the device's default camera. The camera is presented as a modal on top of your app. This means that your app will continue to run and e.g. execute JavaScript while the user is taking a photo.
    * @type
    * supersonic.supersonic.media.camera.takePicture : (
    *   options?: {
    *     quality?: Integer,
    *     destinationType?: String,
    *     allowEdit?: Boolean,
    *     encodingType?: String,
    *     targetWidth?: Integer,
    *     targetHeight?: Integer,
    *     correctOrientation?: Boolean,
    *     saveToPhotoAlbum?: Boolean,
    *     cameraDirection?: String
    *   }
    * ) => Promise: result: String
    * @define {Object} options={} Optional options object.
    * @define {Integer} options.quality=100 Quality of the saved image, expressed as a range of 0-100, where 100 is full resolution with no loss from file compression.
    * @define {String} options.destinationType="fileURI" Choose the format of the return value. Available formats:
    * <ul>
    *   <li> `dataURL`: Return image as a Base64-encoded string
    *   <li> `fileURI`: Return image file URI
    * </ul>
    * @define {Boolean} options.allowEdit=false Allow simple editing of the taken picture before accepting it. Note that Android ignores the `allowEdit` parameter.
    * @define {String} options.encodingType="jpeg" Choose the returned image file's encoding. Available encoding types:
    * <ul>
    *   <li> `jpeg`: Return a JPEG encoded image.
    *   <li> `png`: Return a PNG encoded image.
    * </ul>
    * @define {Integer} options.targetWidth Target width in pixels to scale image. Must be used with `options.targetHeight`. Aspect ratio remains constant.
    * @define {Integer} options.targetHeight Target height in pixels to scale image. Must be used with `options.targetWidth`. Aspect ratio remains constant.
    * @define {Boolean} options.correctOrientation=true Rotate the image to correct for the orientation of the device during capture.
    * @define {Boolean} options.saveToPhotoAlbum=false Save the image to the photo album on the device after capture.
    * @define {String} options.cameraDirection="back" Choose the camera to use (front-facing or back-facing). On Android, this property is ignored and the back-facing camera is always used. Available directions:
    * <ul>
    *   <li> `back`: Use the back-facing camera.
    *   <li> `front`: Use the front-facing camera.
    * </ul>
    * @returnsDescription
    * Returns a [`Promise`](/supersonic/guides/technical-concepts/promises/) that is resolved with the the image file URI (default) or Base64 encoding of the image data as an argument depending on the `destinationType option.
    * @define {=>String} result Image file URI (default) or Base64 encoding of the image data as an argument depending on the `destinationType` option.
    * @supportsCallbacks
    * @exampleCoffeeScript
    * options =
    *   quality: 50
    *   allowEdit: true
    *   targetWidth: 300
    *   targetHeight: 300
    *   encodingType: "png"
    *   saveToPhotoAlbum: true
    * supersonic.media.camera.takePicture(options).then (result) ->
    *   # Do something with the image URI
    * @exampleJavaScript
    * var options = {
    *   quality: 50,
    *   allowEdit: true,
    *   targetWidth: 300,
    *   targetHeight: 300,
    *   encodingType: "png",
    *   saveToPhotoAlbum: true
    * };
    * supersonic.media.camera.takePicture(options).then( function(result){
    *   // Do something with the image URI
    * });
   */
  takePicture = s.promiseF("takePicture", function(options) {
    var getCameraOptions;
    if (options == null) {
      options = {};
    }
    getCameraOptions = function() {
      var cameraDirection, cameraOptions, destinationType, encodingType;
      destinationType = (function() {
        if ((options != null ? options.destinationType : void 0) != null) {
          switch (options.destinationType) {
            case "dataURL":
              return Camera.DestinationType.DATA_URL;
            case "fileURI":
              return Camera.DestinationType.FILE_URI;
            case "nativeURI":
              return Camera.DestinationType.NATIVE_URI;
          }
        } else {
          return Camera.DestinationType.FILE_URI;
        }
      })();
      encodingType = (function() {
        if ((options != null ? options.encodingType : void 0) != null) {
          switch (options.encodingType) {
            case "jpeg":
              return Camera.EncodingType.JPEG;
            case "png":
              return Camera.EncodingType.PNG;
          }
        } else {
          return Camera.EncodingType.JPEG;
        }
      })();
      cameraDirection = (function() {
        if ((options != null ? options.cameraDirection : void 0) != null) {
          switch (options.cameraDirection) {
            case "back":
              return Camera.Direction.BACK;
            case "front":
              return Camera.Direction.FRONT;
          }
        } else {
          return Camera.Direction.BACK;
        }
      })();
      return cameraOptions = {
        quality: (options != null ? options.quality : void 0) || 100,
        destinationType: destinationType,
        allowEdit: ((options != null ? options.allowEdit : void 0) != null) || false,
        encodingType: encodingType,
        targetWidth: options != null ? options.targetWidth : void 0,
        targetHeight: options != null ? options.targetHeight : void 0,
        correctOrientation: ((options != null ? options.correctOrientation : void 0) != null) || true,
        saveToPhotoAlbum: ((options != null ? options.saveToPhotoAlbum : void 0) != null) || false,
        cameraDirection: cameraDirection
      };
    };
    return deviceready.then(getCameraOptions).then(function(cameraOptions) {
      return new Promise(function(resolve, reject) {
        return navigator.camera.getPicture(resolve, reject, cameraOptions);
      });
    });
  });

  /*
    * @namespace supersonic.media.camera
    * @name getFromPhotoLibrary
    * @function
    * @apiCall supersonic.media.camera.getFromPhotoLibrary
    * @description
    * Allows users to select photos from the device's photo library. The photo library is presented as a modal on top of your app. This means that your app will continue to run and e.g. execute JavaScript while the user is selecting a photo.
    * @type
    * supersonic.supersonic.media.camera.getFromPhotoLibrary : (
    *   options?: {
    *     quality?: Integer,
    *     destinationType?: String,
    *     allowEdit?: Boolean,
    *     encodingType?: String,
    *     targetWidth?: Integer,
    *     targetHeight?: Integer,
    *     mediaType?: String,
    *     correctOrientation?: Boolean,
    *   }
    * )
    * => Promise: result: String
    * @define {Object} options={} Optional options object.
    * @define {Integer} options.quality=100 Quality of the saved image, expressed as a range of 0-100, where 100 is full resolution with no loss from file compression.
    * @define {String} options.destinationType="fileURI" Choose the format of the return value. Available formats:
    * <ul>
    *   <li> `dataURL`: Return image as a Base64-encoded string
    *   <li> `fileURI`: Return image file URI
    * </ul>
    * @define {Boolean} options.allowEdit=false Allow simple editing of image before selection. Note that Android ignores the `allowEdit parameter.
    * @define {String} options.encodingType="jpeg" Choose the returned image file's encoding. Available encoding types:
    * <ul>
    *   <li> `jpeg`: Return a JPEG encoded image.
    *   <li> `png`: Return a PNG encoded image.
    * </ul>
    * @define {Integer} options.targetWidth Target width in pixels to scale image. Must be used with `options.targetHeight`. Aspect ratio remains constant.
    * @define {Integer} options.targetHeight Target height in pixels to scale image. Must be used with `options.targetWidth`. Aspect ratio remains constant.
    * @define {String} options.mediaType="picture" Set the type of media to select from. Available media types:
    * <ul>
    *   <li> `picture`: Allow selection of still pictures only.
    *   <li> `video`: Allow selection of video only. This setting will cause the returned promise to always resolve with a `fileURI`.
    *   <li> `allMedia`: Allow selection from all media types.
    * </ul>
    * @define {Boolean} options.correctOrientation=true Rotate the image to correct for the orientation of the device during capture.
    * @returnsDescription
    * Returns a [`Promise`](/supersonic/guides/technical-concepts/promises/) that is resolved with the the image file URI (default) or Base64 encoding of the image data as an argument depending on the `destinationType` option.
    * @define {=>String} result Image file URI (default) or Base64 encoding of the image data as an argument depending on the `destinationType` option.
    * @supportsCallbacks
    * @exampleCoffeeScript
    * options =
    *   quality: 50
    *   allowEdit: true
    *   targetWidth: 300
    *   targetHeight: 300
    *   encodingType: "png"
    * supersonic.media.camera.getFromPhotoLibrary(options).then (result) ->
    *   # Do something with the image URI
    * @exampleJavaScript
    * var options = {
    *   quality: 50,
    *   allowEdit: true,
    *   targetWidth: 300,
    *   targetHeight: 300,
    *   encodingType: "png",
    * };
    * supersonic.media.camera.getFromPhotoLibrary(options).then( function(result){
    *   // Do something with the image URI
    * });
   */
  getFromPhotoLibrary = s.promiseF("getFromPhotoLibrary", function(options) {
    var getCameraOptions;
    if (options == null) {
      options = {};
    }
    getCameraOptions = function() {
      var cameraOptions, destinationType, encodingType, mediaType;
      destinationType = (function() {
        if ((options != null ? options.destinationType : void 0) != null) {
          switch (options.destinationType) {
            case "dataURL":
              return Camera.DestinationType.DATA_URL;
            case "fileURI":
              return Camera.DestinationType.FILE_URI;
            case "nativeURI":
              return Camera.DestinationType.NATIVE_URI;
          }
        } else {
          return Camera.DestinationType.FILE_URI;
        }
      })();
      encodingType = (function() {
        if ((options != null ? options.encodingType : void 0) != null) {
          switch (options.encodingType) {
            case "jpeg":
              return Camera.EncodingType.JPEG;
            case "png":
              return Camera.EncodingType.PNG;
          }
        } else {
          return Camera.EncodingType.JPEG;
        }
      })();
      mediaType = (function() {
        if ((options != null ? options.mediaType : void 0) != null) {
          switch (options.mediaType) {
            case "picture":
              return Camera.MediaType.PICTURE;
            case "video":
              return Camera.MediaType.VIDEO;
            case "allMedia":
              return Camera.MediaType.ALLMEDIA;
          }
        } else {
          return Camera.MediaType.PICTURE;
        }
      })();
      return cameraOptions = {
        sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
        quality: (options != null ? options.quality : void 0) || 100,
        destinationType: destinationType,
        allowEdit: ((options != null ? options.allowEdit : void 0) != null) || false,
        encodingType: encodingType,
        targetWidth: options != null ? options.targetWidth : void 0,
        targetHeight: options != null ? options.targetHeight : void 0,
        mediaType: mediaType,
        correctOrientation: ((options != null ? options.correctOrientation : void 0) != null) || true
      };
    };
    return deviceready.then(getCameraOptions).then(function(cameraOptions) {
      return new Promise(function(resolve, reject) {
        return navigator.camera.getPicture(resolve, reject, cameraOptions);
      });
    });
  });
  return {
    takePicture: takePicture,
    getFromPhotoLibrary: getFromPhotoLibrary
  };
};



},{"../events":224,"../superify":228,"bluebird":166}],227:[function(require,module,exports){
var Promise;

Promise = require('bluebird');

module.exports = function(steroids, log) {
  return {
    camera: require("./camera")(steroids, log)
  };
};



},{"./camera":226,"bluebird":166}],228:[function(require,module,exports){
var Bacon,
  __slice = [].slice;

Bacon = require('baconjs');

module.exports = function(namespace, logger) {
  return {

    /*
    Callbackifies and debuggifies a Promise-returning function
     */
    promiseF: function(name, f) {
      return function() {
        var args, callbacks, _i;
        args = 2 <= arguments.length ? __slice.call(arguments, 0, _i = arguments.length - 1) : (_i = 0, []), callbacks = arguments[_i++];
        if (!(((callbacks != null ? callbacks.onSuccess : void 0) != null) || ((callbacks != null ? callbacks.onFailure : void 0) != null))) {
          args = __slice.call(args).concat([callbacks]);
          callbacks = null;
        }
        logger.debug("" + namespace + "." + name + " called");
        return f.apply(null, args).then(function(value) {
          logger.debug("" + namespace + "." + name + " resolved");
          if ((callbacks != null ? callbacks.onSuccess : void 0) != null) {
            return typeof callbacks.onSuccess === "function" ? callbacks.onSuccess(value) : void 0;
          } else {
            return value;
          }
        }, function(error) {
          var msg;
          msg = (error != null ? error.errorDescription : void 0) != null ? error.errorDescription : JSON.stringify(error);
          logger.error("" + namespace + "." + name + " rejected: " + msg);
          if ((callbacks != null ? callbacks.onFailure : void 0) != null) {
            return callbacks.onFailure(error);
          } else {
            return Promise.reject(error);
          }
        });
      };
    },

    /*
    Callbackify and debuggify a stream-returning function
     */
    streamF: function(name, f) {
      return function() {
        var args, callbacks, stream, _i;
        args = 2 <= arguments.length ? __slice.call(arguments, 0, _i = arguments.length - 1) : (_i = 0, []), callbacks = arguments[_i++];
        if (!(((callbacks != null ? callbacks.onSuccess : void 0) != null) || ((callbacks != null ? callbacks.onFailure : void 0) != null))) {
          args = __slice.call(args).concat([callbacks]);
          callbacks = null;
        }
        logger.debug("" + namespace + "." + name + " called");
        stream = f.apply(null, args).mapError(function(error) {
          logger.error("" + namespace + "." + name + " produced an error: " + error);
          return new Bacon.Error(err);
        });
        if ((callbacks != null ? callbacks.onSuccess : void 0) != null) {
          stream.onValue(callbacks.onSuccess);
        }
        if ((callbacks != null ? callbacks.onFailure : void 0) != null) {
          stream.onError(callbacks.onFailure);
        }
        return stream;
      };
    }
  };
};



},{"baconjs":165}],229:[function(require,module,exports){
var Promise;

Promise = require('bluebird');

module.exports = function(steroids, log) {

  /*
    * @namespace supersonic.ui
    * @name NavigationBarButton
    * @class
    * @description
    * A navigation bar button, for use with `supersonic.ui.navigationBar.update`.
    * @type
    * supersonic.ui.NavigationBarButton: (
    *   title: String
    *   onTap: Function
    *   styleClass: String
    *   styleId: String
    *   styleCSS: String
    * )
    * @define {String} title The title text for the button.
    * @define {Function} onTap A function that gets executed when the navigation bar button is tapped.
    * @define {String} styleClass A native CSS style class to be applied for the button.
    * @define {String} styleId A native CSS style id to be applied for the button.
    * @define {String} styleCSS Custom native CSS to be applied for the button.
    * @exampleCoffeeScript
    * options =
    *   title: "Settings"
    *   onTap: ->
    *     supersonic.ui.layers.push "common#settings"
    *   styleId: "settings"
    *
    * button = new supersonic.ui.NavigationBarButton options
    * @exampleJavaScript
    * var options = {
    *   title: "Settings",
    *   onTap: function() {
    *     supersonic.ui.layers.push("common#settings");
    *   }
    *   styleId: "settings"
    *
    * var button = new supersonic.ui.NavigationBarButton(options)
   */
  var NavigationBarButton;
  NavigationBarButton = (function() {
    function NavigationBarButton(options) {
      var btn, key;
      btn = new steroids.buttons.NavigationBarButton();
      for (key in options) {
        btn[key] = options[key];
      }
      return btn;
    }

    return NavigationBarButton;

  })();
  return function(options) {
    return new NavigationBarButton(options);
  };
};



},{"bluebird":166}],230:[function(require,module,exports){
var Promise, parseRoute,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

Promise = require('bluebird');

parseRoute = require('./views/parseRoute');

module.exports = function(steroids, log) {

  /*
    * @namespace supersonic.ui
    * @name View
    * @class
    * @description
    * A Supersonic View. At the heart of a View instance is its location property: a Supersonic route or an URL that is used to determine which HTML file the View will render when it's pushed to the navigation stack (e.g. with `supersonic.ui.layers.push` or `supersonic.ui.modal.show`).
    *
    * If you just define a location for the View, the target HTML document will start loading only after the View is pushed to the navigation stack. The new View animates onto the screen instantly, but a loading spinner is shown until the DOM is loaded.
    *
    * A View can also have an identifier (a custom string), which enables you to **start** it. Started Views are loaded into memory straight away and continue running until they are stopped, regardless of their position in the navigation stack. To unload a started View from memory, you need to use the `stop()` API call.
    *
    * The View constructor accepts either a location string (Supersonic route or URL) or an options object with `location` and (optional) `id` properties.
    * @type
    * View: {
    *   getLocation: () => location: String
    *   getId: () => id: String
    *   isStarted: () => Promise => isStarted: Boolean
    *   setId: (id: String) => Promise => newId: String
    *   start: (newId?: String) => Promise
    *   stop: () => Promise
    * }
    * @define {Function} getLocation Returns the View's location as a string.
    * @define {Function} getId Returns the View's identifier as a string. An identifier is used to reference a started View.
    * @define {Function} isStarted Returns a promise that resolves to `true` if the View instance's identifier matches a started View. The promise resolves to `false` if the View doesn't have an identifier, or if a matching started View cannot be found.
    * @define {Function} setId Sets the View's identifier. Returns a promise that is resolved with the new identifier. The promise will be rejected if trying to change the identifier of a started View.
    * @define {Function} start Starts the View, causing it load itself into memory and remain active even when not in a navigation stack. Returns a promise that is resolved once the View has been started successfully. The promise will be rejected if the view could not be started. Causes for rejection include:
    * <ul>
    *  <li>There already exists a started View with the same identifier as this View instance.</li>
    *  <li>The View has no identifier set and one isn't provided as a parameter to this API call.</li>
    * </ul>
    * @define {Function} stop Stops the View, unloading it from memory. Returns a promise that is resolved once the View has been successfully stopped. A View can only be stopped if its identifier matches an existing started View. The promise is rejected if the View cannot be stopped.
    * @exampleCoffeeScript
    * # Constructor (id is optional)
    * view = new supersonic.ui.View
    *   location: "example#learn-more"
    *   id: "learnMore"
    *
    * # Returns "example#learn-more"
    * supersonic.logger.log view.getLocation()
    *
    * # Returns "learnMore"
    * supersonic.logger.log view.getId()
    *
    * # Is the view started yet?
    * view.isStarted.then (started) ->
    *   # started will be false initially
    *
    * # Starting a view
    * view.start()
    *
    * # Stop a view
    * view.stop()
    *
    * # Set a new identifier for the view
    * view.setId("more").then (newId) ->
    *    supersonic.logger.log newId
    *
    * @exampleJavaScript
    * // Constructor (id is optional)
    * var view = new supersonic.ui.View({
    *   location: "example#learn-more",
    *   id: "learnMore"
    * });
    *
    * // Returns "example#learn-more"
    * supersonic.logger.log(view.getLocation());
    *
    * // Returns "learnMore"
    * supersonic.logger.log(view.getId());
    *
    * // Is the view started yet?
    * view.isStarted.then( function(started) {
    *   // started will be false initially
    * });
    *
    * // Starting a view
    * view.start();
    *
    * // Stop a view
    * view.stop();
    *
    * // Set a new identifier for the view
    * view.setId("learn").then( function(newId) {
    *    supersonic.logger.log(newId);
    * });
    *
   */
  var View, getApplicationState;
  getApplicationState = function() {
    return new Promise(function(resolve, reject) {
      return steroids.getApplicationState({}, {
        onSuccess: resolve,
        onFailure: reject
      });
    });
  };
  View = (function() {
    View.prototype._webView = null;

    View.prototype.id = null;

    function View(options) {
      var _ref;
      this.options = options != null ? options : {};
      if (((_ref = this.options.constructor) != null ? _ref.name : void 0) === "String") {
        this.options = {
          location: this.options
        };
      }
      if (!this.options.location) {
        throw new Error("Cannot initialize a View without any parameters");
      }
      this.id = this.options.id;
      this.location = this.options.location;
      this._webView = new steroids.views.WebView({
        location: parseRoute(this.location)
      });
    }

    View.prototype.isStarted = function() {
      return new Promise((function(_this) {
        return function(resolve, reject) {
          if (_this.id == null) {
            resolve(false);
          }
          return getApplicationState().then(function(state) {
            var preload, _ref;
            if (_ref = _this.id, __indexOf.call((function() {
              var _i, _len, _ref1, _results;
              _ref1 = state.preloads;
              _results = [];
              for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
                preload = _ref1[_i];
                _results.push(preload.id);
              }
              return _results;
            })(), _ref) >= 0) {
              _this._webView.id = _this.id;
              return resolve(true);
            } else {
              return resolve(false);
            }
          });
        };
      })(this));
    };

    View.prototype.getId = function() {
      return this.id;
    };

    View.prototype.setId = function(newId) {
      return new Promise((function(_this) {
        return function(resolve, reject) {
          return _this.isStarted().then(function(started) {
            if (!started) {
              _this.id = newId;
              _this._webView.id = newId;
              return resolve(newId);
            } else {
              return reject(new Error("Cannot change View identifier after it has been started. Stop the View first and then change the identifier."));
            }
          });
        };
      })(this));
    };

    View.prototype.getLocation = function() {
      return this.location;
    };

    View.prototype.start = function(newId) {
      return new Promise((function(_this) {
        return function(resolve, reject) {
          var preload;
          preload = function(webView) {
            return webView.preload({}, {
              onSuccess: function() {
                this.id = webView.id;
                return resolve();
              },
              onFailure: function(error) {
                return reject(new Error(error.errorDescription));
              }
            });
          };
          if (newId != null) {
            return _this.setId(newId).then(function() {
              return preload(_this._webView);
            });
          } else if (!_this.id) {
            return reject(new Error("Cannot start a View without an identifier."));
          } else {
            _this._webView.id = _this.id;
            return preload(_this._webView);
          }
        };
      })(this));
    };

    View.prototype.stop = function() {
      return new Promise((function(_this) {
        return function(resolve, reject) {
          var webView;
          webView = _this._webView;
          webView.id = _this.getId();
          return webView.unload({}, {
            onSuccess: function() {
              _this._webView.id = null;
              return resolve();
            },
            onFailure: function(error) {
              return reject(new Error(error.errorMessage));
            }
          });
        };
      })(this));
    };

    View.prototype.on = function(event, callback) {
      return new Promise((function(_this) {
        return function(resolve, reject) {
          var e, handlerId;
          try {
            handlerId = _this._webView.on(event, callback);
            return resolve(handlerId);
          } catch (_error) {
            e = _error;
            return reject(e);
          }
        };
      })(this));
    };

    View.prototype.off = function(event, eventHandlerId) {
      return new Promise((function(_this) {
        return function(resolve, reject) {
          var e;
          try {
            _this._webView.off(event, eventHandlerId);
            return resolve();
          } catch (_error) {
            e = _error;
            return reject(e);
          }
        };
      })(this));
    };

    return View;

  })();
  return View;
};



},{"./views/parseRoute":246,"bluebird":166}],231:[function(require,module,exports){
var Promise,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

Promise = require('bluebird');

module.exports = function(steroids, log) {
  var SUPPORTED_ANIMATION_TYPES, SUPPORTED_CURVES, bug, _getReversedCurve;
  bug = log.debuggable("supersonic.ui.animate");

  /*
    * @namespace supersonic.ui
    * @name animate
    * @function
    * @description
    * Performs an in-place animation on the current view.
    * @type
    * animate: (
    *   animationType: String
    *   options?:
    *     duration?: Number
    *     curve?: String
    * ) => Animation
    * @define {String} animationType The animation type. Valid values are:
    * <ul>
    *   <li>`fade`: Dissolves the view into the next one.
    *   <li>`flipVerticalFromBottom`: Flips the view around its horizontal axis from bottom to top.
    *   <li>`flipVerticalFromTop`: Flips the view around its horizontal axis from top to bottom.
    *   <li>`flipHorizontalFromLeft`: Flips the view around its vertical axis from left to right.
    *   <li>`flipHorizontalFromRight`: Flips the view around its vertical axis from right to left.
    *   <li>`slideFromLeft`: Slides the view from left to right.
    *   <li>`slideFromRight`: Slides the view from right to left.
    *   <li>`slideFromTop`: Slides the view down from top.
    *   <li>`slideFromBottom`: Slides the view up from bottom.
    * </ul>
    * @define {Object} options= An object of additional options for the animation.
    * @define {String} options.duration=0.8 The duration, in seconds, of the animation.
    * @define {String} options.curve=easeInOut The velocity curve of the animation. Valid values are:
    * <ul>
    *   <li>`easeInOut`: An ease-in ease-out curve causes the animation to begin slowly, accelerate through the middle of its duration, and then slow down again before completing.
    *   <li>`easeIn`: An ease-in curve causes the animation to begin slowly, and then speed up as it progresses.
    *   <li>`easeOut`: An ease-out curve causes the animation to begin quickly, and then slow down as it completes.
    *   <li>`linear`: A linear animation curve causes the animation to occur evenly over its duration.
    * </ul>
    * @returnsDescription
    * A `supersonic.ui.Animation` object.
    * @define {=>Object} animation A `supersonic.ui.Animation` object.
    * @define {=>function} animation.perform  A function returning a [`Promise`](/supersonic/guides/technical-concepts/promises/) that resolves when the animation is about to start.
    * @exampleCoffeeScript
    * supersonic.ui.animate("curlDown").perform()
    *
    * # With options
    * options =
    *    duration: 1.2
    *    curve: "linear"
    * supersonic.ui.animate("curlDown", options).perform().then ->
    *    supersonic.logger.log "About to start an animation"
    * @exampleJavaScript
    * supersonic.ui.animate("curlDown").perform();
    *
    * // With options
    * var options = {
    *    duration: 1.2,
    *    curve: "linear"
    * }
    * supersonic.ui.animate("curlDown", options).perform().then( function() {
    *    supersonic.logger.log("About to start an animation");
    * });
   */
  SUPPORTED_CURVES = ["easeInOut", "easeIn", "easeOut", "linear"];
  SUPPORTED_ANIMATION_TYPES = ["curlDown", "curlUp", "fade", "flipHorizontalFromRight", "flipHorizontalFromLeft", "flipVerticalFromTop", "flipVerticalFromBottom", "slideFromTop", "slideFromRight", "slideFromLeft", "slideFromBottom"];
  _getReversedCurve = function(curve) {
    switch (curve) {
      case "easeIn":
        return "easeOut";
      case "easeOut":
        return "easeIn";
      default:
        return curve;
    }
  };
  return function(animationType, options) {
    var animation, config, _perform, _ref;
    if (options == null) {
      options = {};
    }
    config = {};
    if (__indexOf.call(SUPPORTED_ANIMATION_TYPES, animationType) < 0) {
      throw new Error("AnimationType '" + animationType + "' is not supported'. Available types: " + (JSON.stringify(SUPPORTED_ANIMATION_TYPES)));
    }
    config.transition = animationType;
    if (options.reversedAnimationType != null) {
      config.reversedTransition = options.reversedAnimationType;
    }
    if (options.curve != null) {
      if (_ref = options.curve, __indexOf.call(SUPPORTED_CURVES, _ref) < 0) {
        throw new Error("Animation curve '" + options.curve + "' is not supported. Available curves: " + (JSON.stringify(SUPPORTED_CURVES)));
      }
      config.curve = options.curve;
    }
    if (options.reversedCurve != null) {
      config.reversedCurve = options.reversedCurve;
    } else if (config.curve != null) {
      config.reversedCurve = _getReversedCurve(config.curve);
    }
    if (options.duration != null) {
      config.duration = options.duration;
      if (options.reversedDuration == null) {
        config.reversedDuration = options.duration;
      }
    }
    animation = new steroids.Animation(config);
    _perform = animation.perform;
    animation.perform = function() {
      var onAnimationEndedDeferred, onAnimationStartedDeferred, promise, status;
      onAnimationStartedDeferred = Promise.pending();
      onAnimationEndedDeferred = Promise.pending();
      status = {
        started: onAnimationStartedDeferred.promise,
        ended: onAnimationEndedDeferred.promise
      };
      promise = new Promise(function(resolve, reject) {
        return _perform({}, {
          onSuccess: function() {
            return resolve(status);
          },
          onFailure: function(err) {
            return reject(err);
          },
          onAnimationStarted: function() {
            return onAnimationStartedDeferred.resolve(status.ended);
          },
          onAnimationEnded: function() {
            return onAnimationEndedDeferred.resolve();
          }
        });
      });
      return promise["catch"](function(err) {
        onAnimationStartedDeferred.reject(err);
        return onAnimationEndedDeferred.reject(err);
      });
    };
    return animation;
  };
};



},{"bluebird":166}],232:[function(require,module,exports){
var Promise, deviceready, superify;

Promise = require('bluebird');

deviceready = require('../../events').deviceready;

superify = require('../../superify');

module.exports = function(steroids, log) {
  var alert, s;
  s = superify('supersonic.ui.dialog', log);

  /*
    * @namespace supersonic.ui.dialog
    * @name alert
    * @function
    * @apiCall supersonic.ui.dialog.alert
    * @description
    * Shows a native alert dialog.
    * @type
    * supersonic.ui.dialog.alert : (
    *   title?: String,
    *   options?: {
    *     message?: String,
    *     buttonName?: String
    *   }
    * ) => Promise
    * @define {String} title="Alert" Alert dialog title text.
    * @define {Object} options={} An optional options object.
    * @define {String} options.message="" Optional message text shown under the title.
    * @define {String} options.buttonLabel="OK" Custom button text for the alert dialog.
    * @returnsDescription
    * A [`Promise`](/supersonic/guides/technical-concepts/promises/), resolved when the the button in the alert dialog is tapped.
    * @supportsCallbacks
    * @exampleCoffeeScript
    * options =
    *   message: "A longer message with \n\n\n\nmultiple lines."
    *   buttonLabel: "Close"
    *
    * supersonic.ui.dialog.alert("Custom title!", options).then ->
    *   supersonic.logger.log "Alert closed."
    * @exampleJavaScript
    * var options = {
    *   message: "A longer message with \n\n\n\nmultiple lines.",
    *   buttonLabel: "Close"
    * };
    *
    * supersonic.ui.dialog.alert("Custom title!", options).then(function() {
    *   supersonic.logger.log("Alert closed.");
    * });
   */
  alert = s.promiseF("alert", function(title, options) {
    var buttonLabel, message;
    if (options == null) {
      options = {};
    }
    title = title || "Alert";
    message = (options != null ? options.message : void 0) || new String;
    buttonLabel = (options != null ? options.buttonLabel : void 0) || "OK";
    return deviceready.then(function() {
      return new Promise(function(resolve) {
        return navigator.notification.alert(message, resolve, title, buttonLabel);
      });
    });
  });
  return alert;
};



},{"../../events":224,"../../superify":228,"bluebird":166}],233:[function(require,module,exports){
var Promise, deviceready, superify;

Promise = require('bluebird');

deviceready = require('../../events').deviceready;

superify = require('../../superify');

module.exports = function(steroids, log) {
  var confirm, s;
  s = superify('supersonic.ui.dialog', log);

  /*
    * @namespace supersonic.ui.dialog
    * @name confirm
    * @function
    * @apiCall supersonic.ui.dialog.confirm
    * @description
    * Shows a native confirm dialog.
    * @type
    * supersonic.ui.dialog.confirm : (
    *   title?: String,
    *   options?: {
    *     message?: String,
    *     buttonLabels?: Array<String>
    *   }
    * ) => Promise buttonIndex: Integer
    * @define {String} title="Confirm" Title text for the confirm dialog.
    * @define {Object} options={} Optional options object.
    * @define {String} message="" Additional message
    * @define {Array<String>} buttonLabels=["OK","Cancel"] Array of strings specifying button labels.
    * @returnsDescription
    * Returns a [`Promise`](/supersonic/guides/technical-concepts/promises/). Once the confirm dialog is dismissed (by tapping on one of the buttons), the promise resolves with the index of the button tapped.
    * @define {=>Integer} buttonIndex Index of the button tapped by the user.
    * @supportsCallbacks
    * @exampleCoffeeScript
    * options =
    *   message: "Please reply honestly, now."
    *   buttonLabels: ["Yes", "No"]
    *
    * supersonic.ui.dialog.confirm("Are you awesome?", options).then (index)->
    *   if result.index is 0
    *     supersonic.logger.log "User is awesome!"
    *   else
    *     supersonic.logger.log "User wasn't awesome. :("
    * @exampleJavaScript
    * var options = {
    *   message: "Please reply honestly, now.",
    *   buttonLabels: ["Yes", "No"]
    * };
    *
    * supersonic.ui.dialog.confirm("Are you awesome?", options).then(function(index) {
    *   if (index == 0) {
    *     supersonic.logger.log("User is awesome!");
    *   } else {
    *     supersonic.logger.log("User wasn't awesome. :(");
    *   }
    * });
   */
  confirm = s.promiseF("confirm", function(title, options) {
    var buttonLabels, message;
    if (options == null) {
      options = {};
    }
    title = title || "Confirm";
    message = (options != null ? options.message : void 0) || new String;
    buttonLabels = (options != null ? options.buttonLabels : void 0) || ["OK", "Cancel"];
    return deviceready.then(function() {
      return new Promise(function(resolve) {
        return navigator.notification.confirm(message, resolve, title, buttonLabels);
      });
    }).then(function(index) {
      return index - 1;
    });
  });
  return confirm;
};



},{"../../events":224,"../../superify":228,"bluebird":166}],234:[function(require,module,exports){

/*
  * @namespace supersonic.ui
  * @name dialog
  * @overview
  * @description The `supersonic.ui.dialog.*` namespace provides you with APIs for presenting different kinds of dialogs for the user.
 */
module.exports = function(steroids, log) {
  return {
    alert: require("./alert")(steroids, log),
    confirm: require("./confirm")(steroids, log),
    prompt: require("./prompt")(steroids, log)
  };
};



},{"./alert":232,"./confirm":233,"./prompt":235}],235:[function(require,module,exports){
var Promise, deviceready, superify;

Promise = require('bluebird');

deviceready = require('../../events').deviceready;

superify = require('../../superify');

module.exports = function(steroids, log) {
  var prompt, s;
  s = superify('supersonic.ui.dialog', log);

  /*
    * @namespace supersonic.ui.dialog
    * @name prompt
    * @function
    * @apiCall supersonic.ui.dialog.prompt
    * @description
    * Displays a native prompt dialog.
    * @type
    * supersonic.ui.dialog.prompt : (
    *   title?: String,
    *   options?: {
    *     message?: String,
    *     buttonLabels?: Array<String>,
    *     defaultText?: String
    *   }
    * ) => Promise { buttonIndex: Integer, input: String }
    * @define {String} title="Prompt" Title text for the prompt dialog.
    * @define {Object} options={} Optional options object.
    * @define {String} options.message="" Additional message shown under the title.
    * @define {Array<String>} options.buttonLables=["OK","Cancel"] Array of strings specifying button labels.
    * @define {String} options.defaultText="" Default value for the prompt input textbox.
    * @returnsDescription
    * Returns a [`Promise`](/supersonic/guides/technical-concepts/promises/). Once the prompt dialog is dismissed (by tapping on one of the buttons), the promise is resolved with an object that has the following properties.
    * @define {=>Object} result Result object.
    * @define {=>Integer} result.buttonIndex Index of the button tapped by the user.
    * @define {=>String} result.input String inputted by user.
    * @supportsCallbacks
    * @exampleCoffeeScript
    * options =
    *   title: "Please type some text and click on the desired color"
    *   buttonLabels: ["Blue", "Red", "Yellow"]
    *   defaultText: "Type here"
    *
    * supersonic.ui.dialog.prompt("Colorize text", options).then (result)->
    *   supersonic.logger.log "User clicked button number #{result.buttonIndex} with text #{result.input}"
    * @exampleJavaScript
    * var options = {
    *   title: "Please type some text and click on the desired color",
    *   buttonLabels: ["Blue", "Red", "Yellow"],
    *   defaultText: "Type here"
    * };
    *
    * supersonic.ui.dialog.prompt("Colorize text", options).then(function(result) {
    *   supersonic.logger.log("User clicked button number " + result.buttonIndex + " with text " + result.input);
    * });
   */
  prompt = s.promiseF("prompt", function(title, options) {
    var buttonLabels, defaultText, msg;
    if (options == null) {
      options = {};
    }
    title = title || "Prompt";
    msg = (options != null ? options.message : void 0) || new String;
    buttonLabels = (options != null ? options.buttonLabels : void 0) || ["OK", "Cancel"];
    defaultText = (options != null ? options.defaultText : void 0) || new String;
    return deviceready.then(function() {
      return new Promise(function(resolve) {
        return navigator.notification.prompt(msg, resolve, title, buttonLabels, defaultText);
      });
    }).then(function(result) {
      return {
        buttonIndex: result.buttonIndex - 1,
        input: result.input1
      };
    });
  });
  return prompt;
};



},{"../../events":224,"../../superify":228,"bluebird":166}],236:[function(require,module,exports){
var Promise, superify;

Promise = require('bluebird');

superify = require('../superify');

module.exports = function(steroids, log) {
  var s;
  s = superify('supersonic.ui.drawers', log);
  return {

    /*
      * @namespace supersonic.ui
      * @name drawers
      * @overview
      * @description The `supersonic.ui.drawers` namespace provides methods to work with drawers.
     */

    /*
      * @namespace supersonic.ui.drawers
      * @name init
      * @function
      * @description
      * Initializes a View as a drawer on the given side.
      * @type
      * supersonic.ui.drawers.init: (
      *  locationOrId: String
      *  options?:
      *    side: String
      *    width: Integer
      * ) => Promise
      * @define {String} locationOrId View location or identifier to be used as a drawer.
      * @define {Object} options Options object to define how the drawer will be shown.
      * @define {String} options.side="left" The side on which the drawer will be shown. Possible values are `left` and `right`
      * @define {String} options.width=200 The width of drawer.
      * @returnsDescription
      * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that will be resolved once the drawer has been initialized.
      * @supportsCallbacks
      * @exampleJavaScript
      * var options = {
      *   side: "left",
      *   width: 150
      * }
      *
      * supersonic.ui.drawers.init("drawers#left", options);
      *
      * // You can also pass in a started View
      * supersonic.ui.views.find("leftDrawer").then( function(leftDrawer) {
      *   supersonic.ui.drawers.init(leftDrawer);
      * });
      * @exampleCoffeeScript
      * options =
      *   side: left
      *   width: 150
      *
      * supersonic.ui.drawers.init "drawers#left", options
      *
      * # You can also pass in a started View
      * supersonic.ui.views.find("leftDrawer").then (leftDrawer)->
      *   supersonic.ui.drawers.init leftDrawer
     */
    init: s.promiseF("init", function(viewOrId, options) {
      if (options == null) {
        options = {};
      }
      return new Promise(function(resolve, reject) {
        var _doInit;
        if (steroids.nativeBridge.constructor.name === "FreshAndroidBridge") {
          reject(new Error("Android does not support enabling drawers on runtime."));
          return;
        }
        _doInit = function(drawerView) {
          var params, side, webview;
          params = {};
          webview = drawerView._webView;
          side = options.side != null ? options.side : "left";
          if ((options != null ? options.width : void 0) != null) {
            webview.widthOfDrawerInPixels = options.width;
          }
          params[side] = webview;
          return steroids.drawers.update(params, {
            onSuccess: resolve,
            onFailure: function(error) {
              return reject(new Error(error.errorDescription));
            }
          });
        };
        return supersonic.ui.views.find(viewOrId).then(function(view) {
          return view.isStarted().then(function(started) {
            if (started) {
              return _doInit(view);
            } else {
              return view.start(view.getLocation()).then(function() {
                return _doInit(view);
              });
            }
          });
        });
      });
    }),

    /*
      * @namespace supersonic.ui.drawers
      * @name open
      * @function
      * @description
      * Opens the drawer on the given side.
      * @type
      * supersonic.ui.drawers.open: (
      *  side?: String
      * ) => Promise
      * @define {String} side=left The side of the drawer to be opened. Valid values are `left` and `right`.
      * @returnsDescription
      * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that will be resolved once the drawer has been opened. If there is no drawer initialized on the given side, the promise will be rejected.
      * @supportsCallbacks
      * @exampleJavaScript
      * supersonic.ui.drawers.open("left").then( function() {
      *   supersonic.logger.debug("Drawer was shown");
      * });
      * @exampleCoffeeScript
      * supersonic.ui.drawers.open("left").then ->
      *   supersonic.logger.debug "Drawer was shown"
     */
    open: s.promiseF("open", function(side, options) {
      var edge;
      if (side == null) {
        side = "left";
      }
      edge = side === "right" ? steroids.screen.edges.RIGHT : steroids.screen.edges.LEFT;
      return new Promise(function(resolve, reject) {
        return steroids.drawers.show({
          edge: edge
        }, {
          onSuccess: resolve,
          onFailure: reject
        });
      });
    }),

    /*
      * @namespace supersonic.ui.drawers
      * @name close
      * @function
      * @description
      * Closes an open drawer.
      * @type
      * supersonic.ui.drawers.close: () => Promise
      * @returnsDescription
      * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that will be resolved once the drawer has been closed. If there are no open drawers, the promise will be rejected.
      * @supportsCallbacks
      * @exampleJavaScript
      * supersonic.ui.drawers.close().then( function() {
      *   supersonic.logger.debug("Drawer was closed");
      * });
      * @exampleCoffeeScript
      * supersonic.ui.drawers.close().then ->
      *   supersonic.logger.debug "Drawer was closed"
     */
    close: s.promiseF("close", function() {
      return new Promise(function(resolve, reject) {
        return steroids.drawers.hide({}, {
          onSuccess: resolve,
          onFailure: reject
        });
      });
    }),

    /*
      * @namespace supersonic.ui.drawers
      * @name updateOptions
      * @function
      * @description
      * Updates options for drawers.
      * supersonic.ui.drawers.updateOptions(options);
      * @type
      * supersonic.ui.drawers.updateOptions: (
      *   options:
      *     shadow: Boolean
      *     animation:
      *       type: String
      *       duration: Number
      *     gestures:
      *       open: Array<String>
      *       close: Array<String>
      * ) => Promise
      *
      * @define {Boolean} shadow=true If `true`, a shadow effect will be rendered in the drawer.
      * @define {Object} animation **iOS-only.** An object defining the type and duration of the animation shown when opening or closing the drawer.
      * @define {String} animation.type=slide The animation type. Valid values are: `slide`, `slideAndScale`, `swingingDoor` and `parallax`
      * @define {Number} animation.duration=0.8 The duration (in seconds) of the animation. Applies only when the drawer is opened or closed programmatically or with a tap gesture. With swipe gestures, the animation follows the user's finger.
      * @define {Object} gestures An object defining the gestures that can be used for opening or closing the drawer. Passing a null or empty `gestures` object disables all drawer gestures.
      * @define {Array<String>} gestures.open An array of gesture types that can be used to open the drawer, e.g. `["PanNavBar", "PanCenterView"]`. Available gestures are:
      * <ul>
      *   <li>`PanNavBar`: Open the drawer by panning (swiping) on the navigation bar.
      *   <li>`PanBezelCenterView`: Open the drawer by panning from the edge of the center view. The area that catches the gesture is 20 dips (device-independent pixels) from the edge of the device screen.
      *   <li>`PanCenterView`: Open the drawer by panning anywhere in the center view.
      * </ul>
      * @define {Array<String>} gestures.close An array of gesture types that can be used to close the drawer, e.g. `["TapNavBar", "TapCenterView"]`. Available gestures are:
      * <ul>
      *   <li>`PanNavBar`: As with `gestures.open`.
      *   <li>`PanBezelCenterView`:  As with `gestures.open`.
      *   <li>`PanCenterView`: As with `gestures.open`.
      *   <li>`TapNavBar`: Close the drawer by tapping on the navigation bar of the center view.
      *   <li>`TapCenterView`:  Close the drawer by tapping anywhere in the center view.
      *   <li>`PanDrawerView`: Close the drawer by panning (swiping) anywhere in the drawer view.
      * </ul>
      * @returnsDescription
      * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that will be resolved once the drawer options are updated.
      * @supportsCallbacks
      * @exampleCoffeeScript
      * supersonic.ui.drawers.updateOptions(
      *   shadow: true
      *   animation:
      *     type: "slide"
      *     duration: 1.0
      *   gestures:
      *     open: ["PanNavBar", "PanCenterView"]
      *     close: ["TapNavBar", "TapCenterview"]
      * )
      * @exampleJavaScript
      * supersonic.ui.drawers.updateOptions({
      *   shadow: true,
      *   animation: {
      *     type: "slide",
      *     duration: 1.0
      *   },
      *   gestures: {
      *     open: ["PanNavBar", "PanCenterView"],
      *     close: ["TapNavBar", "TapCenterview"]
      *   }
      * });
     */
    updateOptions: s.promiseF("updateOptions", function(options) {
      var animation, animation_type, config, _ref, _ref1, _ref2;
      config = {};
      if ((options != null ? options.animation : void 0) != null) {
        animation_type = typeof options.animation === "string" ? options.animation : options.animation.type;
        animation = (function() {
          switch (animation_type) {
            case "slide":
              return steroids.drawers.defaultAnimations.SLIDE;
            case "slideAndScale":
              return steroids.drawers.defaultAnimations.SLIDE_AND_SCALE;
            case "swingingDoor":
              return steroids.drawers.defaultAnimations.SWINGING_DOOR;
            case "parallax":
              return steroids.drawers.defaultAnimations.PARALLAX;
          }
        })();
        if ((options != null ? (_ref = options.animation) != null ? _ref.duration : void 0 : void 0) != null) {
          animation.duration = animation.reversedDuration = options.animation.duration;
        }
        config.animation = animation;
      }
      if ((options != null ? options.shadow : void 0) != null) {
        config.showShadow = options.shadow;
      }
      if ((options != null ? (_ref1 = options.gestures) != null ? _ref1.open : void 0 : void 0) != null) {
        config.openGestures = options.gestures.open;
      }
      if ((options != null ? (_ref2 = options.gestures) != null ? _ref2.close : void 0 : void 0) != null) {
        config.closeGestures = options.gestures.close;
      }
      return new Promise(function(resolve, reject) {
        return steroids.drawers.update({
          options: config
        }, {
          onSuccess: resolve,
          onFailure: reject
        });
      });
    }),

    /*
      * @namespace supersonic.ui.drawers
      * @name whenWillShow
      * @function
      * @apiCall supersonic.ui.drawers.whenWillShow
      * @description
      * Detect when drawer will show
      * @type
      * supersonic.ui.drawers.whenWillShow: () => unsubscribe: Function
      * @define {Function} unsubscribe Stop listening
      * @exampleCoffeeScript
      * supersonic.ui.drawers.whenWillShow () ->
      *   supersonic.logger.log "Drawers will show"
      * @exampleJavaScript
      * supersonic.ui.drawers.whenWillShow(function() {
      *   supersonic.logger.log("Drawers will show");
      * });
     */
    whenWillShow: function(f) {
      var id;
      id = steroids.drawers.on("willshow", f);
      return function() {
        return steroids.drawers.off("willshow", id);
      };
    },

    /*
      * @namespace supersonic.ui.drawers
      * @name whenDidShow
      * @function
      * @apiCall supersonic.ui.drawers.whenDidShow
      * @description
      * Detect when drawer did show
      * @type
      * supersonic.ui.drawers.whenDidShow: () => unsubscribe: Function
      * @define {Function} unsubscribe Stop listening
      * @exampleCoffeeScript
      * supersonic.ui.drawers.whenDidShow () ->
      *   supersonic.logger.log "Drawers did show"
      * @exampleJavaScript
      * supersonic.ui.drawers.whenDidShow(function() {
      *   supersonic.logger.log("Drawers did show");
      * });
     */
    whenDidShow: function(f) {
      var id;
      id = steroids.drawers.on("didshow", f);
      return function() {
        return steroids.drawers.off("didshow", id);
      };
    },

    /*
      * @namespace supersonic.ui.drawers
      * @name whenWillClose
      * @function
      * @apiCall supersonic.ui.drawers.whenWillClose
      * @description
      * Detect when drawer will close
      * @type
      * supersonic.ui.drawers.whenWillClose: () => unsubscribe: Function
      * @define {Function} unsubscribe Stop listening
      * @exampleCoffeeScript
      * supersonic.ui.drawers.whenWillClose () ->
      *   supersonic.logger.log "Drawers will close"
      * @exampleJavaScript
      * supersonic.ui.drawers.whenWillClose(function() {
      *   supersonic.logger.log("Drawers will close");
      * });
     */
    whenWillClose: function(f) {
      var id;
      id = steroids.drawers.on("willclose", f);
      return function() {
        return steroids.drawers.off("willclose", id);
      };
    },

    /*
      * @namespace supersonic.ui.drawers
      * @name whenDidClose
      * @function
      * @apiCall supersonic.ui.drawers.whenDidClose
      * @description
      * Detect when drawer did close
      * @type
      * supersonic.ui.drawers.whenDidClose: () => unsubscribe: Function
      * @define {Function} unsubscribe Stop listening
      * @exampleCoffeeScript
      * supersonic.ui.drawers.whenDidClose () ->
      *   supersonic.logger.log "Drawers did close"
      * @exampleJavaScript
      * supersonic.ui.drawers.whenDidClose(function() {
      *   supersonic.logger.log("Drawers did close");
      * });
     */
    whenDidClose: function(f) {
      var id;
      id = steroids.drawers.on("didclose", f);
      return function() {
        return steroids.drawers.off("didclose", id);
      };
    }
  };
};



},{"../superify":228,"bluebird":166}],237:[function(require,module,exports){
module.exports = function(steroids, log, global) {
  return {
    View: require("./View")(steroids, log),
    screen: require("./screen")(steroids, log),
    views: require("./views")(steroids, log, global),
    layers: require("./layers")(steroids, log),
    drawers: require("./drawers")(steroids, log),
    tabs: require("./tabs")(steroids, log),
    modal: require("./modal")(steroids, log),
    dialog: require("./dialog")(steroids, log),
    initialView: require("./initialView")(steroids, log),
    navigationBar: require("./navigationBar")(steroids, log),
    NavigationBarButton: require("./NavigationBarButton")(steroids, log),
    animate: require("./animate")(steroids, log)
  };
};



},{"./NavigationBarButton":229,"./View":230,"./animate":231,"./dialog":234,"./drawers":236,"./initialView":238,"./layers":239,"./modal":240,"./navigationBar":241,"./screen":242,"./tabs":243,"./views":244}],238:[function(require,module,exports){
var Promise, superify;

Promise = require("bluebird");

superify = require('../superify');

module.exports = function(steroids, log) {
  var s;
  s = superify('supersonic.ui.initialView', log);
  return {

    /*
      * @namespace supersonic.ui
      * @name initialView
      * @overview
      * @description
      * Methods for showing and dismissing the Initial View. The Initial View is a special view that is defined in `config/structure.coffee` and is shown before any other views in your app are loaded. For more information, please see the [Initial View guide](/supersonic/guides/navigation/navigating-between-views/initial-view/).
     */

    /*
      * @namespace supersonic.ui.initialView
      * @name show
      * @function
      * @description
      * Shows the Initial View. This causes all other views in your app to be reset and removed from memory, including started Views.
      * @type
      * supersonic.ui.initialView: (
      *   showAnimation?: Animation
      * ) => Promise
      * @define {Animation} showAnimation=animation("fade") A `supersonic.ui.Animation` object that defines the animation used to dismiss the Initial View (and show your actual app's root view). Defaults to `supersonic.ui.animation("fade")`
      * @returnsDescription
      * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that is resolved when the Initial View starts to dismiss. If there the Initial View is not present on the screen, the promise will be rejected.
      * @supportsCallbacks
      * @exampleCoffeeScript
      * supersonic.ui.initialView.show()
      * @exampleJavaScript
      * supersonic.ui.initialView.show();
     */
    show: s.promiseF("show", function(showAnimation) {
      var animation;
      if (showAnimation == null) {
        showAnimation = "fade";
      }
      animation = typeof showAnimation === "string" ? supersonic.ui.animate(showAnimation) : showAnimation;
      return new Promise(function(resolve, reject) {
        return steroids.initialView.show({
          animation: animation
        }, {
          onSuccess: resolve,
          onFailure: reject
        });
      });
    }),

    /*
      * @namespace supersonic.ui.initialView
      * @name dismiss
      * @function
      * @description
      * Dismiss the Initial View and load the rest of your app.
      * @type
      * supersonic.ui.initialView: (
      *   dismissAnimation?: Animation
      * ) => Promise
      * @define {Animation} dismissAnimation= A `supersonic.ui.Animation` object that defines the animation used to dismiss the Initial View (and show your actual app's root view).
      * @returnsDescription
      * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that is resolved when the Initial View starts to dismiss. If there the Initial View is not present on the screen, the promise will be rejected.
      * @supportsCallbacks
      * @exampleCoffeeScript
      * supersonic.ui.initialView.dismiss()
      * @exampleJavaScript
      * supersonic.ui.initialView.dismiss();
     */
    dismiss: s.promiseF("dismiss", function(showAnimation) {
      var animation;
      if (showAnimation == null) {
        showAnimation = "fade";
      }
      animation = typeof showAnimation === "string" ? supersonic.ui.animate(showAnimation) : showAnimation;
      return new Promise(function(resolve, reject) {
        return steroids.initialView.dismiss({
          animation: animation
        }, {
          onSuccess: resolve,
          onFailure: reject
        });
      });
    })
  };
};



},{"../superify":228,"bluebird":166}],239:[function(require,module,exports){
var Promise, superify;

Promise = require('bluebird');

superify = require('../superify');

module.exports = function(steroids, log) {
  var s;
  s = superify('supersonic.ui.layers', log);
  return {

    /*
      * @namespace supersonic.ui
      * @name layers
      * @overview
      * @description
      * Provides methods to work with native navigation stack, i.e. "layers".
     */

    /*
      * @namespace supersonic.ui.layers
      * @name push
      * @function
      * @description
      * Pushes a View on top of the navigation stack.
      * @type
      * supersonic.ui.layers.push: (
      *   view: View|String
      *   options?:
      *     params?: Object|String
      *     animation?: Animation
      * ) => Promise
      * @define {View|String} view A View or View identifier to be pushed on top of the navigation stack.
      * @define {Object} options An optional options object.
      * @define {String|Object} options.params An object or JSON string of optional parameters to be passed to the target View, accessible via `supersonic.ui.views.current.params.onValue(callback)`.
      * @define {Animation} options.animation=slideFromRight **(iOS-only)** A custom transition animation, definable by calling `supersonic.ui.animate()`.
      * @returnsDescription
      * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that gets resolved with the provided View instance once the push has started. If the view cannot be pushed, the promise is rejected.
      * @supportsCallbacks
      * @exampleCoffeeScript
      * view = new supersonic.ui.View "example#settings"
      * supersonic.ui.layers.push view
      *
      * supersonic.ui.views.find("settingsView").then (startedView) ->
      *   supersonic.ui.layers.push startedView
      *
      * # Push with custom animation
      * customAnimation = supersonic.ui.animate "flipVerticalFromTop"
      * supersonic.ui.layers.push view, { animation: customAnimation }
      *
      * @exampleJavaScript
      * var view = new supersonic.ui.View("example#settings");
      * supersonic.ui.layers.push(view);
      *
      * supersonic.ui.views.find("settingsView").then( function(startedView) {
      *   supersonic.ui.layers.push(startedView);
      * });
      *
      * // Push with custom animation
      * var customAnimation = supersonic.ui.animate("flipVerticalFromTop");
      * supersonic.ui.layers.push(view, { animation: customAnimation });
     */
    push: s.promiseF("push", function(viewOrId, options) {
      if (options == null) {
        options = {};
      }
      return new Promise(function(resolve, reject) {
        return supersonic.ui.views.find(viewOrId).tap(function(view) {
          return view.isStarted().then(function(started) {
            if (options.params == null) {
              return;
            }
            if (started) {
              return supersonic.data.channel("view-params-" + view.id).publish(options.params);
            } else {
              return view._webView.setParams(options.params);
            }
          });
        }).then(function(view) {
          return steroids.layers.push({
            view: view._webView,
            animation: options.animation
          }, {
            onSuccess: function() {
              return resolve(view);
            },
            onFailure: function(error) {
              return reject(new Error(error.errorDescription));
            }
          });
        });
      });
    }),

    /*
      * @namespace supersonic.ui.layers
      * @name pop
      * @function
      * @description
      * Pops the topmost view from the navigation stack. Doesn't have to be called from the topmost view.
      * @type
      * supersonic.ui.layers.pop: () => Promise
      * @returnsDescription
      * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that gets resolved once the view starts to pop. If the view cannot be popped (i.e. there is only the root view in the navigation stack), the promise is rejected. Note that a popped view only lives on for a very short time before it is purged from the app's memory, so be careful to not do too complex things with the promise. It is different if you are popping a started View, since it will remain running outside the navigation stack.
      * @supportsCallbacks
      * @exampleCoffeeScript
      * supersonic.ui.layers.pop()
      * @exampleJavaScript
      * supersonic.ui.layers.pop();
     */
    pop: s.promiseF("pop", function() {
      return new Promise(function(resolve, reject) {
        return steroids.layers.pop({}, {
          onSuccess: function() {
            return resolve();
          },
          onFailure: function(error) {
            return reject(error);
          }
        });
      });
    }),

    /*
      * @namespace supersonic.ui.layers
      * @name popAll
      * @function
      * @description
      * Pops all views except for the root view from the navigation stack. Doesn't have to be called from the topmost view.
      * @type
      * supersonic.ui.layers.popAll: () => Promise
      * @returnsDescription
      * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that gets resolved once the views start to pop. If there are no views to pop (i.e. there is only the root view in the navigation stack), the promise is rejected. Note that popped views only live on for a very short time before they are purged from the app's memory, so be careful to not do too complex things with the promise. It is different if you are popping started Views, since they will remain running outside the navigation stack.
      * @supportsCallbacks
      * @exampleCoffeeScript
      * supersonic.ui.layers.popAll()
      * @exampleJavaScript
      * supersonic.ui.layers.popAll();
     */
    popAll: s.promiseF("popAll", function() {
      return new Promise(function(resolve, reject) {
        return steroids.layers.popAll({}, {
          onSuccess: function() {
            return resolve();
          },
          onFailure: function(error) {
            return reject(new Error(error.errorDescription));
          }
        });
      });
    }),

    /*
      * @namespace supersonic.ui.layers
      * @name replace
      * @function
      * @description
      * Replaces the current view stack with a started View. If called from a drawer, replaces the view stack in the center view.
      * @type
      * supersonic.ui.layers.replace: (
      *   view: View|String
      * ) => Promise
      * @define {View|String} view A started View or View identifier matching a started View to be pushed on top of the navigation stack. If the View is not started, the replace is unsuccessful.
      * @returnsDescription
      * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that gets resolved once the replace is successful. If the replace is unsuccessful, the promise is rejected.
      * @supportsCallbacks
      * @exampleCoffeeScript
      * view = new supersonic.ui.View "example#settings"
      * view.start("settings").then (startedView) ->
      *   supersonic.ui.layers.replace startedView
      *
      * # You can also use the View identifier
      * supersonic.ui.layers.replace "settings"
      * @exampleJavaScript
      * view = new supersonic.ui.View("example#settings");
      * view.start("settings").then( function(startedView) {
      *   supersonic.ui.layers.replace(startedView);
      * });
      *
      * // You can also use the View identifier
      * supersonic.ui.layers.replace("settings");
     */
    replace: s.promiseF("replace", function(viewOrId) {
      return new Promise(function(resolve, reject) {
        return supersonic.ui.views.find(viewOrId).then(function(view) {
          return steroids.layers.replace(view._webView, {
            onSuccess: function() {
              return resolve;
            },
            onFailure: function(error) {
              return reject(error);
            }
          });
        });
      });
    })
  };
};



},{"../superify":228,"bluebird":166}],240:[function(require,module,exports){
var Promise, superify;

Promise = require('bluebird');

superify = require('../superify');

module.exports = function(steroids, log) {
  var s;
  s = superify('supersonic.ui.modal', log);
  return {

    /*
      * @namespace supersonic.ui
      * @name modal
      * @overview
      * @description
      * Provides methods to show and hide modals. A modal appears on top of your entire app and contains its own navigation stack.
     */

    /*
      * @namespace supersonic.ui.modal
      * @name show
      * @function
      * @description
      * Shows the given View or started View as a modal.
      * @type
      * supersonic.ui.modal.show: (
      *   view: View
      *   options?:
      *     animate?: Boolean
      * ) => Promise
      * @define {View} view The View or started View to be shown as a modal.
      * @define {Object} options The options object for defining how the modal will be shown.
      * @define {Boolean} options.animate=true If set to `false`, the modal will be shown immediately, without the default "slide-from-bottom" animation.
      * @returnsDescription
      * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that is resolved when the modal starts to show. If there modal cannot be shown (e.g. the view is invalid), the promise is rejected.
      * @supportsCallbacks
      * @exampleCoffeeScript
      * modalView = new supersonic.ui.View "example#settings"
      * options =
      *   animate: true
      *
      * supersonic.ui.modal.show modalView, options
      * @exampleJavaScript
      * var modalView = new supersonic.ui.View("example#settings");
      * var options = {
      *   animate: true
      * }
      *
      * supersonic.ui.modal.show(modalView, options);
     */
    show: s.promiseF("show", function(viewOrId, options) {
      if (options == null) {
        options = {};
      }
      return new Promise(function(resolve, reject) {
        return supersonic.ui.views.find(viewOrId).tap(function(view) {
          return view.isStarted().then(function(started) {
            if (options.params == null) {
              return;
            }
            if (started) {
              supersonic.logger.log("Sending parameters (" + options.params + ") to view (id: " + view.id + ")");
              return supersonic.data.channel("view-params-" + view.id).publish(options.params);
            } else {
              return view._webView.setParams(options.params);
            }
          });
        }).then(function(view) {
          options.view = view._webView;
          options.disableAnimation = (function() {
            if ((options != null ? options.animate : void 0) != null) {
              switch (options.animate) {
                case true:
                  return false;
                case false:
                  return true;
              }
            } else {
              return false;
            }
          })();
          return steroids.modal.show(options, {
            onSuccess: function() {
              return resolve(view);
            },
            onFailure: function(error) {
              return reject(new Error(error.errorDescription));
            }
          });
        });
      });
    }),

    /*
      * @namespace supersonic.ui.modal
      * @name hide
      * @function
      * @description
      * Hides the (topmost) modal on screen.
      * @type
      * supersonic.ui.modal.hide: (
      *   options?:
      *     animate?: Boolean
      * ) => Promise
      * @define {Object} options The options object for defining how the modal will be hidden.
      * @define {Boolean} options.animate=true If set to `false`, the modal will be hidden immediately, without the default "slide-from-top" animation.
      * @returnsDescription
      * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that is resolved when the modal starts to hide. If there is no modal on screen, the promise is rejected.
      * @supportsCallbacks
      * @exampleCoffeeScript
      * options =
      *   animate: false
      *
      * supersonic.ui.modal.hide options
      * @exampleJavaScript
      * var options = {
      *   animate: false
      * }
      *
      * supersonic.ui.modal.hide(options);
     */
    hide: s.promiseF("hide", function(options) {
      if (options == null) {
        options = {};
      }
      options.disableAnimation = (function() {
        if ((options != null ? options.animate : void 0) != null) {
          switch (options.animate) {
            case true:
              return false;
            case false:
              return true;
          }
        } else {
          return false;
        }
      })();
      return new Promise(function(resolve, reject) {
        return steroids.modal.hide(options, {
          onSuccess: resolve,
          onFailure: function(error) {
            return reject(error);
          }
        });
      });
    }),

    /*
      * @namespace supersonic.ui.modal
      * @name hideAll
      * @function
      * @description
      * Hides all modals on screen.
      * @type
      * supersonic.ui.modal.hideAll: (
      *   options?:
      *     animate?: Boolean
      * ) => Promise
      * @define {Object} options The options object for defining how the modals will be hidden.
      * @define {Boolean} options.animate=true If set to `false`, the modals will be hidden immediately, without the default "slide-from-top" animation.
      * @returnsDescription
      * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that is resolved when the modals start to hide. If there are no modals on screen, the promise is rejected.
      * @supportsCallbacks
      * @exampleCoffeeScript
      * options =
      *   animate: false
      *
      * supersonic.ui.modal.hideAll options
      * @exampleJavaScript
      * var options = {
      *   animate: false
      * }
      *
      * supersonic.ui.modal.hideAll(options);
     */
    hideAll: s.promiseF("hideAll", function(options) {
      if (options == null) {
        options = {};
      }
      options.disableAnimation = (function() {
        if ((options != null ? options.animate : void 0) != null) {
          switch (options.animate) {
            case true:
              return false;
            case false:
              return true;
          }
        } else {
          return false;
        }
      })();
      return new Promise(function(resolve, reject) {
        return steroids.modal.hideAll(options, {
          onSuccess: resolve,
          onFailure: function(error) {
            return reject(error);
          }
        });
      });
    })
  };
};



},{"../superify":228,"bluebird":166}],241:[function(require,module,exports){
var Promise, superify;

Promise = require('bluebird');

superify = require('../superify');

module.exports = function(steroids, log) {
  var s;
  s = superify('supersonic.ui.navigationBar', log);
  return {

    /*
      * @namespace supersonic.ui
      * @name navigationBar
      * @overview
      * @description
      * Provides methods to work with the native navigation bar. For more information, see the [Navigation Bar guide](/supersonic/guides/ui/native-components/navigation-bar/).
     */

    /*
      * @namespace supersonic.ui.navigationBar
      * @name show
      * @function
      * @description
      * Shows the native navigation bar for the current view.
      * @type
      * supersonic.ui.navigationBar.show: (
      *   options?:
      *     animated?: Boolean
      * ) => Promise
      * @define {Object} options={} An object of optional parameters which define how the navigation bar will be shown.
      * @define {Boolean} options.animated=true Determines if the navigation bar will be shown with an animation.
      * @returnsDescription
      * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that will be resolved after the navigation bar is shown.
      * @supportsCallbacks
      * @exampleCoffeeScript
      * supersonic.ui.navigationBar.show()
      *
      * # with options
      * options =
      *   animated: false
      * supersonic.ui.navigationBar.show(options).then ->
      *   supersonic.logger.log "Navigation bar shown without animation."
      * @exampleJavaScript
      * supersonic.ui.navigationBar.show();
      *
      * // with options
      * var options = {
      *   animated: false
      * }
      *
      * supersonic.ui.navigationBar.show(options).then( function() {
      *   supersonic.logger.debug("Navigation bar shown without animation.");
      * });
      *
     */
    show: s.promiseF("show", function(options) {
      var filteredParams;
      if (options == null) {
        options = {};
      }
      filteredParams = {
        animated: options.animated
      };
      return new Promise(function(resolve, reject) {
        return steroids.view.navigationBar.show(filteredParams, {
          onSuccess: resolve,
          onFailure: reject
        });
      });
    }),

    /*
      * @namespace supersonic.ui.navigationBar
      * @name hide
      * @function
      * @description
      * Hides the native navigation bar for the current view.
      * @type
      * supersonic.ui.navigationBar.hide: (
      *   options?:
      *     animated?: Boolean
      * ) => Promise
      * @define {Object} options An object of optional parameters which define how the navigation bar will be hidden.
      * @define {Boolean} animated=true If `false`, the navigation bar will be hidden without an animation.
      * @returnsDescription
      * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that will be resolved after the navigation bar is hidden. If the navigation bar cannot be hidden (e.g. it is already hidden), the promise will be rejected.
      * @supportsCallbacks
      * @exampleCoffeeScript
      * supersonic.ui.navigationBar.hide()
      *
      * # with options
      * options =
      *   animated: true
      *
      * supersonic.ui.navigationBar.hide(options).then ->
      *   supersonic.logger.debug "Navigation bar hidden without animation."
      *
      * @exampleJavaScript
      * supersonic.ui.navigationBar.hide();
      *
      * // with options
      * var options = {
      *   animated: true
      * }
      *
      * supersonic.ui.navigationBar.hide(options).then( function() {
      *   supersonic.logger.debug("Navigation bar hidden without animation.");
      * });
     */
    hide: s.promiseF("hide", function(options) {
      if (options == null) {
        options = {};
      }
      return new Promise(function(resolve, reject) {
        return steroids.view.navigationBar.hide(options, {
          onSuccess: resolve,
          onFailure: reject
        });
      });
    }),

    /*
      * @namespace supersonic.ui.navigationBar
      * @name update
      * @function
      * @description
      * Updates the navigation bar. Only properties defined in the options object are affected. Other properties will continue to use the previous (or default) value.
      * @type
      * supersonic.ui.navigationBar.update: (
      *   options:
      *     title?: String
      *     overrideBackButton?: Boolean
      *     backButton?: NavigationBarButton
      *     buttons?:
      *       left?: Array<NavigationBarButton>
      *       right?: Array<NavigationBarButton>
      * )
      * @define {Object} options An object of optional parameters which defines how the navigation bar will be updated.
      * @define {String} title Navigation bar title text.
      * @define {Boolean} overrideBackButton=false If `true`, the automatic back button will not be shown. If defined, the first left button will be shown on its place.
      * @define {NavigationBarButton} backButton A supersonic.ui.NavigationBarButton that will be used in place of the native back button.
      * @define {Object} buttons= An object determining the buttons that will be shown on either side of the navigation bar.
      * @define {Array<NavigationBarButton} buttons.left=[] An array of NavigationBarButtons to be shown on the left side of the navigation bar (i.e. left side of the title text/image). Passing an empty array will remove all buttons.
      * @define {Array<NavigationBarButton} buttons.right=[] An array of NavigationBarButtons to be shown on the right side of the navigation bar (i.e. right side of the title text/image). Passing an empty array will remove all buttons.
      * @returnsDescription
      * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that will be resolved after the navigation bar has been updated. If the navigation bar cannot be updated, the promise will be rejected.
      * @supportsCallbacks
      * @exampleJavaScript
      * leftButton = new supersonic.ui.NavigationBarButton( {
      *   title: "Left",
      *   onTap: function() {
      *     supersonic.ui.dialog.alert("Left button tapped!");
      *   }
      * });
      *
      * options = {
      *   title: "New title",
      *   overrideBackButton: true,
      *   buttons: {
      *     left: [leftButton]
      *   }
      * }
      *
      * supersonic.ui.navigationBar.update(options);
      * @exampleCoffeeScript
      * leftButton = new supersonic.ui.NavigationBarButton
      *   title: "Left"
      *   onTap: ->
      *     supersonic.ui.dialog.alert "Left button tapped!"
      *
      * options =
      *   title: "New title"
      *   overrideBackButton: true
      *   buttons:
      *     left: [leftButton]
      *
      * supersonic.ui.navigationBar.update options
     */
    update: s.promiseF("update", function(options) {
      return new Promise(function(resolve, reject) {
        return steroids.view.navigationBar.update(options, {
          onSuccess: resolve,
          onFailure: reject
        });
      });
    }),

    /*
      * @namespace supersonic.ui.navigationBar
      * @name setClass
      * @function
      * @description
      * Adds a CSS class name to the navigation bar. Any previous CSS classes will be overriden. **Note:** At the moment, setting CSS classes for the navigation bar affects the whole navigation stack, not just the current view.
      * @type
      * setClass: (
      *   className: String
      * ) => Promise
      * @define {String} className="" A string of one or more CSS class names, separated by spaces.
      * @returnsDescription
      * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that will be resolved after the navigation bar CSS class is set.
      * @supportsCallbacks
      * @exampleCoffeeScript
      * supersonic.ui.navigationBar.setClass("my-class").then ()->
      *   supersonic.logger.log "Navigation bar class was set."
      * @exampleJavaScript
      * supersonic.ui.navigationBar.setClass("my-class").then(function() {
      *   supersonic.logger.log("Navigation bar class was set.");
      * });
      *
     */
    setClass: s.promiseF("setClass", function(className) {
      return new Promise(function(resolve, reject) {
        return steroids.view.navigationBar.setStyleClass(className, {
          onSuccess: resolve,
          onFailure: reject
        });
      });
    }),

    /*
      * @namespace supersonic.ui.navigationBar
      * @name setStyle
      * @function
      * @description
      * Sets inline CSS styling to the navigation bar. Any previous inline styles are overridden. **Note:** At the moment, setting inline CSS styles for the navigation bar affects the whole navigation stack, not just the current view.
      * @type
      * setStyle: (
      *   inlineCssString: String
      * ) => Promise
      * @define {String} inlineCssString="" A string of inline CSS styling.
      * @returnsDescription
      * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that will be resolved after the navigation bar style is set.
      * @supportsCallbacks
      * @exampleCoffeeScript
      * supersonic.ui.navigationBar.setStyle("background-color: #ff0000;").then ()->
      *   supersonic.logger.log "Navigation bar style was set."
      * @exampleJavaScript
      * supersonic.ui.navigationBar.setStyle("background-color: #ff0000;").then(function() {
      *   supersonic.logger.log("Navigation bar style was set.");
      * });
      *
     */
    setStyle: s.promiseF("setStyle", function(inlineCssString) {
      return new Promise(function(resolve, reject) {
        return steroids.view.navigationBar.setStyleCSS(inlineCssString, {
          onSuccess: resolve,
          onFailure: reject
        });
      });
    }),

    /*
      * @namespace supersonic.ui.navigationBar
      * @name setStyleId
      * @function
      * @description
      * Sets a CSS style id for navigation bar. Any previous id will be overridden. **Note:** At the moment, setting a CSS style id for the navigation bar affects the whole navigation stack, not just the current view.
      * @apiCall supersonic.ui.navigationBar.setStyleId
      * @type
      * setStyleId: (
      *   id: String
      * ) => Promise
      * @define {String} id="" The style id to set.
      * @returnsDescription
      * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that will be resolved after the navigation bar style id is set.
      * @supportsCallbacks
      * @exampleCoffeeScript
      * supersonic.ui.navigationBar.setStyleId("the-button").then ()->
      *   supersonic.logger.log "Navigation bar style id was set."
      * @exampleJavaScript
      * supersonic.ui.navigationBar.setStyleId("the-button").then(function() {
      *   supersonic.logger.log("Navigation bar style id was set.");
      * });
      *
     */
    setStyleId: s.promiseF("setStyleId", function(styleId) {
      return new Promise(function(resolve, reject) {
        return steroids.view.navigationBar.setStyleId(styleId, {
          onSuccess: resolve,
          onFailure: reject
        });
      });
    })
  };
};



},{"../superify":228,"bluebird":166}],242:[function(require,module,exports){
var Promise, superify;

Promise = require('bluebird');

superify = require('../superify');

module.exports = function(steroids, log) {
  var s;
  s = superify('supersonic.ui.screen', log);
  return {

    /*
      * @namespace supersonic.ui
      * @name screen
      * @overview
      * @description
      * Methods and properties to control the visible part of the application.
     */

    /*
      * @namespace supersonic.ui.screen
      * @name setAllowedRotations
      * @apiCall supersonic.ui.screen.setAllowedRotations
      * @function
      * @type
      * setAllowedRotations : (
      *   orientations: Array<String>
      *) => Promise
      * @description
      * Determine which of the four possible screen rotations are enabled on your device. By default all rotations are allowed, with the exception of custom builds where the build settings have been used to lock the app into a certain rotation scheme. Modals are not affected by setting allowed rotations in other views and conversely setting allowed rotations in a modal does not affect the rest of the app.
      * @define {Array<String>} rotations Allowed rotations. Possible values are `"portrait"`, `"portraitUpsideDown"`, `"landscapeLeft"` and `"landscapeRight"`.
      * @returnsDescription
      * Returns a [`Promise`](/supersonic/guides/technical-concepts/promises/) that is resolved when the allowed rotations are set.
      * @supportsCallbacks
      * @exampleCoffeeScript
      * supersonic.ui.screen.setAllowedRotations ["landscapeLeft", "landscapeRight"]
      * @exampleJavaScript
      * supersonic.ui.screen.setAllowedRotations(["landscapeLeft", "landscapeRight"]);
     */
    setAllowedRotations: s.promiseF("setAllowedRotations", function(rotations) {
      return new Promise(function(resolve, reject) {
        return steroids.screen.setAllowedRotations({
          allowedRotations: rotations
        }, {
          onSuccess: resolve,
          onFailure: reject
        });
      });
    }),

    /*
      * @namespace supersonic.ui.screen
      * @name rotateTo
      * @function
      * @description
      * Rotate the screen to one of the four preset orientations. Allowed rotations must be set with `supersonic.ui.screen.setAllowedRotations`, or the call to supersonic.ui.screen.rotate will fail.
      * @type
      * rotateTo : (
      *   orientation: String
      *) => Promise
      * @define {String} orientation Possible values "portrait", "portraitUpsideDown", "landscapeLeft", "landscapeRight".
      * @returnsDescription
      * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that is resolved when the screen is rotated.
      * @supportsCallbacks
      * @exampleCoffeeScript
      * supersonic.ui.screen.rotateTo "landscapeLeft"
      *
      * # With options
      * options =
      *  orientation: "landscapeLeft"
      * supersonic.ui.screen.rotateTo(options).then ->
      *  supersonic.logger.log "Screen has been rotated."
      * @exampleJavaScript
      * supersonic.ui.screen.rotateTo("landscapeLeft");
      *
      * // With options
      * var options = {
      *  orientation: "landscapeLeft"
      * };
      * supersonic.ui.screen.rotateTo(options).then( function() {
      *  supersonic.logger.log("Screen has been rotated.")
      * });
     */
    rotateTo: s.promiseF("rotateTo", function(options) {
      var orientation;
      orientation = typeof options === "string" ? options : (options != null ? options.orientation : void 0) != null ? options.orientation : void 0;
      return new Promise(function(resolve, reject) {
        return steroids.screen.rotate({
          orientation: orientation
        }, {
          onSuccess: resolve,
          onFailure: reject
        });
      });
    })
  };
};



},{"../superify":228,"bluebird":166}],243:[function(require,module,exports){
var Promise, parseRoute, superify;

Promise = require('bluebird');

parseRoute = require('./views/parseRoute');

superify = require('../superify');

module.exports = function(steroids, log) {
  var s;
  s = superify('supersonic.ui.tabs', log);
  return {

    /*
      * @namespace supersonic.ui
      * @name tabs
      * @overview
      * @description
      * Methods for showing and dismissing the tab bar.
     */

    /*
      * @namespace supersonic.ui.tabs
      * @name show
      * @function
      * @description
      * Shows the tab bar
      * @type
      * supersonic.ui.tabs.show: (
      * ) => Promise
      * @returnsDescription
      * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that is resolved when the tab bar has been shown. If tab bar could not be shown, the promise will be rejected.
      * @supportsCallbacks
      * @exampleCoffeeScript
      * supersonic.ui.tabs.show()
      * @exampleJavaScript
      * supersonic.ui.tabs.show();
     */
    show: s.promiseF("show", function() {
      return new Promise(function(resolve, reject) {
        return steroids.tabBar.show({}, {
          onSuccess: resolve,
          onFailure: reject
        });
      });
    }),

    /*
      * @namespace supersonic.ui.tabs
      * @name hide
      * @function
      * @description
      * Hides the tab bar
      * @type
      * supersonic.ui.tabs.hide: (
      * ) => Promise
      * @returnsDescription
      * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that is resolved when the tab bar has been hidden. If tab bar could not be hidden, the promise will be rejected.
      * @supportsCallbacks
      * @exampleCoffeeScript
      * supersonic.ui.tabs.hide()
      * @exampleJavaScript
      * supersonic.ui.tabs.hide();
     */
    hide: s.promiseF("hide", function() {
      return new Promise(function(resolve, reject) {
        return steroids.tabBar.hide({}, {
          onSuccess: resolve,
          onFailure: reject
        });
      });
    }),

    /*
      * @namespace supersonic.ui.tabs
      * @name update
      * @function
      * @description
      * Updates the tab bar
      * @type
      * supersonic.ui.tabs.update: (
      *  tabsArray: Array
      * ) => Promise
      * @define {Array<Object>} tabsArray An array of tab configurations: {title: "Hello", badge: "1"}
      * @returnsDescription
      * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that is resolved when the tab bar has been updated. If tab bar could not be updated, the promise will be rejected.
      * @supportsCallbacks
      * @exampleCoffeeScript
      * supersonic.ui.tabs.update [{title: "Hello", badge: "1"}]
      * @exampleJavaScript
      * supersonic.ui.tabs.update([{title: "Hello", badge: "1"}]);
     */
    update: s.promiseF("update", function(tabsArray) {
      return new Promise(function(resolve, reject) {
        return steroids.tabBar.update({
          tabs: tabsArray
        }, {
          onSuccess: resolve,
          onFailure: reject
        });
      });
    }),

    /*
      * @namespace supersonic.ui.tabs
      * @name replace
      * @function
      * @description
      * Replaces the tab bar
      * @type
      * supersonic.ui.tabs.replace: (
      *  tabsArray: Array
      * ) => Promise
      * @define {Array<Object>} tabsArray An array of tab configurations: {title: "Hello", badge: "1", location: "myroute#index"}
      * @returnsDescription
      * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that is resolved when the tab bar has been replaced. If tab bar could not be replaced, the promise will be rejected.
      * @supportsCallbacks
      * @exampleCoffeeScript
      * supersonic.ui.tabs.replace [{title: "Web", location: "http://www.google.com"}]
      * @exampleJavaScript
      * supersonic.ui.tabs.replace([{title: "Web", location: "http://www.google.com"}]);
     */
    replace: s.promiseF("replace", function(tabsArray) {
      var tab, _i, _len;
      for (_i = 0, _len = tabsArray.length; _i < _len; _i++) {
        tab = tabsArray[_i];
        tab.location = parseRoute(tab.location, {
          prefix: "http://localhost/"
        });
      }
      return new Promise(function(resolve, reject) {
        return steroids.tabBar.replace({
          tabs: tabsArray
        }, {
          onSuccess: resolve,
          onFailure: reject
        });
      });
    }),

    /*
      * @namespace supersonic.ui.tabs
      * @name select
      * @function
      * @description
      * Selects the tab bar
      * @type
      * supersonic.ui.tabs.select: (
      *  tabIndex: Integer
      * ) => Promise
      * @define {Integer} tabIndex An index number of the tab to select. First tab from the left is 0, second one is 1 and so on.
      * @returnsDescription
      * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that is resolved when the tab bar has been selected. If tab bar could not be selected, the promise will be rejected.
      * @supportsCallbacks
      * @exampleCoffeeScript
      * supersonic.ui.tabs.select 1
      * @exampleJavaScript
      * supersonic.ui.tabs.select(1);
     */
    select: s.promiseF("select", function(tabIndex) {
      return new Promise(function(resolve, reject) {
        return steroids.tabBar.selectTab({
          index: tabIndex
        }, {
          onSuccess: resolve,
          onFailure: reject
        });
      });
    }),

    /*
      * @namespace supersonic.ui.tabs
      * @name updateCurrentTab
      * @function
      * @description
      * Selects the tab bar
      * @type
      * supersonic.ui.tabs.updateCurrentTab: (
      *  config: Object
      * ) => Promise
      * @define {Object} config An tab configuration object.
      * @returnsDescription
      * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that is resolved when the current tab has been updated. If tab could not be updated, the promise will be rejected.
      * @supportsCallbacks
      * @exampleCoffeeScript
      * supersonic.ui.tabs.updateCurrentTab {title: "Hello"}
      * @exampleJavaScript
      * supersonic.ui.tabs.updateCurrentTab({title: "Hello"});
     */
    updateCurrentTab: s.promiseF("updateCurrentTab", function(config) {
      if (config == null) {
        config = {};
      }
      if (!(typeof config === "object" && Object.keys(config).length)) {
        throw new Error("Could not update current tab without configuration object");
      }
      return new Promise(function(resolve, reject) {
        return steroids.tabBar.currentTab.update(config, {
          onSuccess: resolve,
          onFailure: reject
        });
      });
    }),

    /*
      * @namespace supersonic.ui.tabs
      * @name setStyleClass
      * @function
      * @description
      * Adds a CSS style class for the native tab bar.
      * @type
      * supersonic.ui.tabs.setStyleClass: (
      *  className: String
      * ) => Promise
      * @define {String} className Name of the class to set for tab bar.
      * @returnsDescription
      * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that is resolved once the new style class has been set. If class could not be set, the promise will be rejected.
      * @supportsCallbacks
      * @exampleCoffeeScript
      * supersonic.ui.tabs.setStyleClass "my-awesome-tabs"
      * @exampleJavaScript
      * supersonic.ui.tabs.setStyleClass("my-awesome-tabs");
     */
    setStyleClass: s.promiseF("setStyleClass", function(className) {
      return new Promise(function(resolve, reject) {
        return steroids.tabBar.setStyleClass(className, {
          onSuccess: resolve,
          onFailure: reject
        });
      });
    }),

    /*
      * @namespace supersonic.ui.tabs
      * @name setStyleId
      * @function
      * @description
      * Adds a CSS style id for the native tab bar.
      * @type
      * supersonic.ui.tabs.setStyleId: (
      *  id: String
      * ) => Promise
      * @define {String} id Id of the class to set for tab bar.
      * @returnsDescription
      * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that is resolved once the new style id has been set. If id could not be set, the promise will be rejected.
      * @supportsCallbacks
      * @exampleCoffeeScript
      * supersonic.ui.tabs.setStyleId "graybg"
      * @exampleJavaScript
      * supersonic.ui.tabs.setStyleId("graybg");
     */
    setStyleId: s.promiseF("setStyleId", function(id) {
      return new Promise(function(resolve, reject) {
        return steroids.tabBar.setStyleId(id, {
          onSuccess: resolve,
          onFailure: reject
        });
      });
    }),

    /*
      * @namespace supersonic.ui.tabs
      * @name setStyleCSS
      * @function
      * @description
      * Adds a CSS style id for the native tab bar.
      * @type
      * supersonic.ui.tabs.setStyleCSS: (
      *  css: String
      * ) => Promise
      * @define {String} css Stylesheet to set for tab bar.
      * @returnsDescription
      * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that is resolved once the new style css has been set. If style css could not be set, the promise will be rejected.
      * @supportsCallbacks
      * @exampleCoffeeScript
      * supersonic.ui.tabs.setStyleCSS "background-color: red;"
      * @exampleJavaScript
      * supersonic.ui.tabs.setStyleCSS("background-color: red;");
     */
    setStyleCSS: s.promiseF("setStyleCSS", function(css) {
      return new Promise(function(resolve, reject) {
        return steroids.tabBar.setStyleCSS(css, {
          onSuccess: resolve,
          onFailure: reject
        });
      });
    }),

    /*
      * @namespace supersonic.ui.tabs
      * @name whenWillChange
      * @function
      * @apiCall supersonic.ui.tabs.whenWillChange
      * @description
      * Detect when tabs will change
      * @type
      * supersonic.ui.tabs.whenWillChange: () => unsubscribe: Function
      * @define {Function} unsubscribe Stop listening
      * @exampleCoffeeScript
      * supersonic.ui.tabs.whenWillChange().then ()->
      *   supersonic.logger.log("Tab will change")
      * @exampleJavaScript
      * supersonic.ui.tabs.whenWillChange().then( function() {
      *   supersonic.logger.log("Tab will change");
      * });
     */
    whenWillChange: function(f) {
      var id;
      id = steroids.tabBar.on("willchange", f);
      return function() {
        return steroids.tabBar.off("willchange", id);
      };
    },

    /*
      * @namespace supersonic.ui.tabs
      * @name whenDidChange
      * @function
      * @apiCall supersonic.ui.tabs.whenDidChange
      * @description
      * Detect when tabs did change
      * @type
      * supersonic.ui.tabs.whenDidChange: () => unsubscribe: Function
      * @define {Function} unsubscribe Stop listening
      * @exampleCoffeeScript
      * supersonic.ui.tabs.whenDidChange().then ()->
      *   supersonic.logger.log("Tabs did change")
      * @exampleJavaScript
      * supersonic.ui.tabs.whenDidChange().then( function() {
      *   supersonic.logger.log("Tabs did change");
      * });
     */
    whenDidChange: function(f) {
      var id;
      id = steroids.tabBar.on("didchange", f);
      return function() {
        return steroids.tabBar.off("didchange", id);
      };
    }
  };
};



},{"../superify":228,"./views/parseRoute":246,"bluebird":166}],244:[function(require,module,exports){
var Promise, superify;

Promise = require('bluebird');

superify = require('../superify');

module.exports = function(steroids, log, global) {
  var View, find, getApplicationState, s, start, stop;
  View = require("./View")(steroids, log);
  s = superify('supersonic.ui.views', log);

  /*
    * @namespace supersonic.ui
    * @name views
    * @overview
    * @description
    * The `supersonic.ui.views` namespace contains functions for manipulating and accessing View objects.
   */
  getApplicationState = function() {
    return new Promise(function(resolve, reject) {
      return steroids.getApplicationState({}, {
        onSuccess: resolve,
        onFailure: reject
      });
    });
  };

  /*
    * @namespace supersonic.ui.views
    * @name find
    * @function
    * @apiCall supersonic.ui.views.find
    * @description
    * Get a new view instance by a view identifier.
    * @type
    * supersonic.ui.views.find: (
    *  id: String
    * ) => Promise view: View
    * @define {String} id A string matching the identifier of a view.
    * @returnsDescription
    * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that resolves with a View instance representing the given identifier.
    * @define {View} view A new View instance matching the identifier given as a parameter.
    * @supportsCallbacks
    * @exampleCoffeeScript
    * supersonic.ui.views.find("myCarsView").then (startedView) ->
    *   supersonic.logger.log "myCarsView location: #{startedView.getLocation()}"
    * @exampleJavaScript
    * supersonic.ui.views.find("myCarsView").then( function(startedView) {
    *   supersonic.logger.log("myCarsView location: " + startedView.getLocation());
    * });
   */
  find = s.promiseF("find", function(viewOrId) {
    return new Promise(function(resolve, reject) {
      if (viewOrId.constructor.name === "View") {
        resolve(viewOrId);
        return;
      }
      return getApplicationState().then(function(state) {
        var preload, view, _i, _len, _ref;
        _ref = state.preloads;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          preload = _ref[_i];
          if (preload.id === viewOrId) {
            view = new View({
              id: preload.id,
              location: preload.startURL
            });
            view._webView.id = preload.id;
            resolve(view);
            return;
          }
        }
        return resolve(new View({
          location: viewOrId,
          id: viewOrId
        }));
      });
    });
  });

  /*
    * @namespace supersonic.ui.views
    * @name start
    * @function
    * @apiCall supersonic.ui.views.start
    * @description
    * Start a View in the background, allowing it to remain running even when it's not in a navigation stack or used in a drawer.
    *  view: View|String
    * ) => Promise View
    * @define {View|String} view The View that will be started in the background. Alternatively, you can directly pass an identifier string.
    * @returnsDescription
    *  A [`Promise`](/supersonic/guides/technical-concepts/promises/) that resolves with the given View object. If the view identifier is already in use by another started View, the promise will be rejected.
    * @supportsCallbacks
    * @exampleCoffeeScript
    * # With shorthand
    * supersonic.ui.views.start("cars#show").then (carsShowView) ->
    *   # The id is "cars#show"
    *   supersonic.logger.log "carsShowView id: #{carsShowView.getId()}"
    *
    * # With View object
    * view = new supersonic.ui.View
    *   location: "cars#edit"
    *   id: "carsEdit"
    *
    * supersonic.ui.views.start(view).then (carsEditView) ->
    *   # The id is "carsEdit"
    *   supersonic.logger.log "carsEditView id: #{carsEditView.getId()}"
    *   supersonic.layers.push carsEditView
    *
    * @exampleJavaScript
    * // With shorthand
    * supersonic.ui.views.start("cars#show").then( function(carsShowView) {
    *   // The id is "cars#show"
    *   supersonic.logger.log("carsShowView id: " + carsShowView.getId());
    * });
    *
    * // With View object
    * var view = new supersonic.ui.View({
    *   location: "cars#edit",
    *   id: "carsEdit"
    * });
    *
    * supersonic.ui.views.start(view).then( function(carsEditView) {
    *   // The id is "carsEdit"
    *   supersonic.logger.log("carsEditView id: " + carsEditView.getId());
    *   supersonic.layers.push carsEditView
    * });
   */
  start = s.promiseF("start", function(viewOrId) {
    return supersonic.ui.views.find(viewOrId).then(function(view) {
      return view.start().then(function() {
        return view;
      });
    });
  });

  /*
    * @namespace supersonic.ui.views
    * @name stop
    * @function
    * @apiCall supersonic.ui.views.stop
    * @description
    * Stop a View running in the background. It will be destroyed and any memory used freed. A View that is in use (e.g. in the navigation stack) cannot be stopped.
    * @type
    * supersonic.ui.views.stop: (
    *  viewOrId: View|String
    * ) => Promise View
    * @define {View|String} viewOrId The View that will be stopped. Alternatively, you can directly pass an identifier string.
    * @returnsDescription
    * A [`Promise`](/supersonic/guides/technical-concepts/promises/) that resolves after the View has been stopped. If the View or identifier doesn't match a started View, the promise will be rejected.
    * @supportsCallbacks
    * @exampleCoffeeScript
    * supersonic.ui.views.stop("carsShowView").then ->
    *   supersonic.logger.log "View was successfully stopped!"
    * @exampleJavaScript
    * supersonic.ui.views.stop("carsShowView").then( function() {
    *   supersonic.logger.log("View was succesfully stopped!");
    * });
   */
  stop = s.promiseF("stop", function(viewOrId) {
    return supersonic.ui.views.find(viewOrId).then(function(view) {
      return view.stop().then(function() {
        return view;
      });
    });
  });
  return {
    find: find,
    start: start,
    stop: stop,
    current: require('./views/current')(steroids, log, global)
  };
};



},{"../superify":228,"./View":230,"./views/current":245,"bluebird":166}],245:[function(require,module,exports){
var Bacon, Promise, channel, events;

Bacon = require('baconjs');

Promise = require('bluebird');

events = require('../../events');

channel = require('../../data/channel');

module.exports = function(steroids, log, global) {
  var isStarted, parameterBus, viewObject, _ref;
  parameterBus = new Bacon.Bus;
  viewObject = {
    params: parameterBus.toProperty(steroids != null ? (_ref = steroids.view) != null ? _ref.params : void 0 : void 0),
    id: null
  };
  isStarted = function() {
    return new Promise(function(resolve, reject) {
      return steroids.getApplicationState({}, {
        onSuccess: function(state) {
          var matches, preload;
          matches = (function() {
            var _i, _len, _ref1, _ref2, _results;
            _ref1 = state.preloads;
            _results = [];
            for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
              preload = _ref1[_i];
              if ((_ref2 = global.location.href) === preload.URL || _ref2 === preload.location) {
                _results.push(preload);
              }
            }
            return _results;
          })();
          if (matches.length) {
            if (typeof id === "undefined" || id === null) {
              viewObject.id = matches[0].id;
            }
            return resolve();
          } else {
            return reject();
          }
        },
        onFailure: function() {
          return reject(new Error("Could not get application state"));
        }
      });
    });
  };
  isStarted().then(function() {
    var channelId, unlisten, viewChannel;
    if (viewObject.id == null) {
      return;
    }
    channelId = "view-params-" + viewObject.id;
    unlisten = null;
    viewChannel = channel(global)(channelId);
    return parameterBus.plug(viewChannel.inbound);
  }, function() {
    return console.log("View " + global.location.href + " is not started, wont register channel");
  });

  /*
    * @namespace supersonic.ui.views
    * @name current
    * @overview
    * @description
    * Provides access to the current view and it's visibility state.
    *
    * ## Methods
    * * [whenVisible](/supersonic/api-reference/stable/supersonic/ui/views/current/whenvisible/) – registers a listener that is triggered when the view becomes visible.
    * * [whenHidden](/supersonic/api-reference/stable/supersonic/ui/views/current/whenhidden/) – registers a listener that is triggered when the view becomes hidden.
    * * [params.onValue](/supersonic/api-reference/stable/supersonic/ui/views/current/params-onvalue/) – access the parameters passed to this view by a navigation action.
   */
  viewObject.visibility = events.visibility;

  /*
    * @namespace supersonic.ui.views.current
    * @name whenVisible
    * @function
    * @apiCall supersonic.ui.views.current.whenVisible
    * @description
    * Trigger a function when the current view becomes visible.
    * @type
    * supersonic.ui.views.current.whenVisible: (
    *   listen: Function
    * ) => unsubscribe: Function
    * @define {Function} listen A function that is triggered when the view becomes visible.
    * @returnsDescription
    * A function that can be used to unsubscribe from listening to view visibility events.
    * @define {=>Function} unsubscribe When called, stops listening for view visibility events.
    * @exampleCoffeeScript
    * stopListening = supersonic.ui.views.current.whenVisible ->
    *   supersonic.logger.debug "This view is now visible"
    *   stopListening()
    * @exampleJavaScript
    * var stopListening = supersonic.ui.views.current.whenVisible( function() {
    *   supersonic.logger.debug("This view is now visible");
    *   stopListening();
    * });
   */
  viewObject.whenVisible = function(listen) {
    return events.visibility.filter(function(visible) {
      return visible;
    }).onValue(listen);
  };

  /*
    * @namespace supersonic.ui.views.current
    * @name whenHidden
    * @function
    * @apiCall supersonic.ui.views.current.whenHidden
    * @description
    * Trigger a function when the current view becomes hidden.
    * @type
    * supersonic.ui.views.current.whenHidden: (
    *   listen: Function
    * ) => unsubscribe: Function
    * @define {Function} listen A function that is triggered when the view becomes hidden.
    * @returnsDescription
    * A function that can be used to unsubscribe from view visibility events.
    * @define {=>Function} unsubscribe When called, stops listening for view visibility events.
    * @exampleCoffeeScript
    * stopListening = supersonic.ui.views.current.whenHidden ->
    *   supersonic.logger.debug "This view is now hidden."
    *   stopListening()
    * @exampleJavaScript
    * var stopListening = supersonic.ui.views.current.whenHidden( function() {
    *   supersonic.logger.debug("This view is now hidden");
    *   stopListening();
    * });
   */
  viewObject.whenHidden = function(listen) {
    return events.visibility.filter(function(visible) {
      return !visible;
    }).onValue(listen);
  };
  return viewObject;

  /*
    * @namespace supersonic.ui.views.current
    * @name params.onValue
    * @function
    * @apiCall supersonic.ui.views.current.params.onValue
    * @description
    * A [stream](/supersonic/guides/technical-concepts/streams) that contains the latest navigation parameters passed to this view. Note that the stream always contains the latest parameters if they are available, so even if parameters have been set for this view already, you can still use the stream to access them.
    * @type
    * supersonic.ui.views.current.params.onValue: (
    *   callback: Function
    * ) => unsubscribe: Function
    * @define {Function} callback A function that gets triggered every time the view receives new navigation parameters. The function gets triggered with the new parameters object as as a parameter.
    * @returnsDescription
    * A function that can be used to unsubscribe from the parameters stream.
    * @define {=>Function} unsubscribe When called, unsubscribes from the parameters stream.
    * @exampleCoffeeScript
    * stopListening = supersonic.ui.views.current.params.onValue (params)->
    *   supersonic.logger.debug "New value for the id param is: #{params.id}"
    *
    * # Later on, we can stop listening to the stream.
    * stopListening()
    * @exampleJavaScript
    * var stopListening = supersonic.ui.views.current.params.onValue( function(params) {
    *   supersonic.logger.debug("Newest value for the id param is: " + params.id);
    * });
    *
    * // Later on, we can stop listening to the stream.
    * stopListening();
   */
};



},{"../../data/channel":203,"../../events":224,"baconjs":165,"bluebird":166}],246:[function(require,module,exports){
module.exports = function(location, options) {
  var module, parts, path, query, routePattern, view, whole;
  if (options == null) {
    options = {};
  }
  routePattern = /^([\w\-]+)#([\w\-\/]+)(\?.+)?$/;
  parts = routePattern.exec(location);
  if (parts != null) {
    whole = parts[0], module = parts[1], view = parts[2], query = parts[3];
    path = "app/" + module + "/" + view + ".html" + (query || '');
    if (options.prefix != null) {
      path = "" + options.prefix + path;
    }
    return path;
  } else {
    return location;
  }
};



},{}],247:[function(require,module,exports){
var createLocalStorage;

module.exports = createLocalStorage = function() {
  var storage;
  storage = {};
  return {
    getItem: function(key) {
      return storage[key];
    },
    setItem: function(key, value) {
      return storage[key] = value;
    },
    removeItem: function(key) {
      return delete storage[key];
    }
  };
};



},{}],248:[function(require,module,exports){
var __slice = [].slice;

module.exports = (function() {
  var callbacks, fakeEvent, removeEvent, triggerEvent, uniqueId;
  callbacks = {};
  uniqueId = function(length) {
    var id;
    if (length == null) {
      length = 8;
    }
    id = "";
    while (id.length < length) {
      id += Math.random().toString(36).substr(2);
    }
    return id.substr(0, length);
  };
  fakeEvent = function(namespace) {
    if (callbacks[namespace] == null) {
      callbacks[namespace] = {};
    }
    return function(event_name, f) {
      var cbObj;
      cbObj = {
        id: uniqueId(),
        fn: f
      };
      if (callbacks[namespace][event_name] != null) {
        callbacks[namespace][event_name].push(cbObj);
      } else {
        callbacks[namespace][event_name] = [cbObj];
      }
      return cbObj.id;
    };
  };
  removeEvent = function(namespace) {
    return function(event_name, id) {
      var cb;
      callbacks[namespace][event_name] = (function() {
        var _i, _len, _ref, _results;
        _ref = callbacks[namespace][event_name];
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          cb = _ref[_i];
          if (cb.id !== id) {
            _results.push(cb);
          }
        }
        return _results;
      })();
      return true;
    };
  };
  triggerEvent = function() {
    var argz, cb, cbs, event_name, namespace, _i, _len, _results;
    namespace = arguments[0], event_name = arguments[1], argz = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
    cbs = callbacks[namespace][event_name];
    if (cbs != null) {
      _results = [];
      for (_i = 0, _len = cbs.length; _i < _len; _i++) {
        cb = cbs[_i];
        _results.push(cb.fn.apply(null, argz));
      }
      return _results;
    }
  };
  return {
    __trigger_event: triggerEvent,
    device: {
      ping: function() {}
    },
    app: {
      host: {
        getURL: function() {}
      },
      getMode: function() {}
    },
    tabBar: {
      on: fakeEvent("steroids.tabBar.on"),
      off: removeEvent("steroids.tabBar.on")
    },
    drawers: {
      on: fakeEvent("steroids.drawers.on"),
      off: removeEvent("steroids.drawers.on")
    }
  };
})();



},{}],249:[function(require,module,exports){
var Window, localStorage;

localStorage = require('./localStorage');

Window = (function() {
  function Window() {
    this.parent = this;
    this.localStorage = localStorage();
  }

  Window.prototype.location = {
    href: ''
  };

  Window.prototype.AG_SCREEN_ID = 0;

  Window.prototype.AG_LAYER_ID = 0;

  Window.prototype.AG_VIEW_ID = 0;

  return Window;

})();

module.exports = Window;



},{"./localStorage":247}]},{},[194])