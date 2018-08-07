'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.subscribe = subscribe;
exports.clean = clean;
exports.middleware = middleware;

exports.default = function () {
  for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
    args[_key4] = arguments[_key4];
  }

  if (!arguments.length) {
    //flux();
    return getState();
  }

  if (!(args[1] instanceof Function) && (typeof args[0] === 'string' || typeof args[0] === 'number')) {
    return dispatch.apply(undefined, args);
  }

  if (args.length === 1) {
    if (args[0] instanceof Function) {
      // flux(subscriber);
      return reducer(args[0]);
    }

    return init(args[0]);
  }
  return connect.apply(undefined, args);
};

exports.hoc = hoc;

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var defaultState = {};
var currentState = defaultState;
var subscribers = [];
var reducers = [];
var actionQueue = [];
var middlewares = [];
var hocs = [];

function init(intialState) {
  if (currentState !== defaultState) {
    throw new Error('State is already changed');
  }
  currentState = intialState;
}

function connect() {
  var configure = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var component = arguments[1];

  if (!hocs.length) return component;
  return hocs.reduce(function (wrappedComponent, _ref) {
    var props = _ref.props,
        wrapper = _ref.wrapper;

    var hasParam = false;
    var args = props.map(function (prop) {
      if (prop in configure) {
        hasParam = true;
        return configure[prop];
      }
      return undefined;
    });

    if (!hasParam) return wrappedComponent;
    return wrapper.apply(undefined, _toConsumableArray(args))(wrappedComponent);
  }, component);
}

function subscribe(subscriber) {
  for (var _len = arguments.length, customArgs = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    customArgs[_key - 1] = arguments[_key];
  }

  if (customArgs.length) {
    var originalSubscriber = subscriber;
    subscriber = function subscriber() {
      for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      originalSubscriber.apply(undefined, customArgs.concat(args));
    };
  }
  subscribers.push(subscriber);
  var unsubscribed = false;
  return function () {
    if (unsubscribed) return;
    unsubscribed = true;
    var index = subscribers.indexOf(subscriber);
    if (index !== -1) {
      subscribers.splice(index, 1);
    }
  };
}

var callReducer = debounce(0, function () {
  var lastState = currentState;
  var queue = actionQueue.slice();
  var resolves = [];
  actionQueue.length = 0;
  queue.forEach(function (reduceContext) {
    resolves.push(reduceContext.resolve);
    function next(context) {
      return reducers.reduce(function (state, reducer) {
        var result = reducer(state, context);
        if (result === undefined) return state;
        return result;
      }, context.getState());
    }

    currentState = middlewares.reduce(function (next, middleware) {
      return function () {
        return middleware(next).apply(undefined, arguments);
      };
    }, next)(_extends({}, reduceContext, {
      getState: getState
    }));
  });
  resolves.forEach(function (resolve) {
    return resolve();
  });
  if (lastState !== currentState) {
    subscribers.forEach(function (subscriber) {
      return subscriber(currentState);
    });
  }
});

function getState() {
  return currentState;
}

function dispatch(action, payload) {
  return new Promise(function (resolve) {
    actionQueue.push({ action: action, payload: payload, resolve: resolve });
    callReducer();
  });
}

function reducer(value) {
  reducers.push(value);
}

function debounce(interval, func) {
  var timerId = void 0;
  return function () {
    clearTimeout(timerId);

    for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
      args[_key3] = arguments[_key3];
    }

    timerId = setTimeout.apply(undefined, [func, interval].concat(args));
  };
}

function clean() {
  subscribers.length = 0;
  reducers.length = 0;
  actionQueue.length = 0;
  middlewares.length = 0;
  hocs.length = 0;
  currentState = defaultState;
}

function middleware() {
  middlewares.push.apply(middlewares, arguments);
}

function hoc(props, wrapper) {
  hocs.push({ props: props.split(/\s+/), wrapper: wrapper });
}
//# sourceMappingURL=index.js.map