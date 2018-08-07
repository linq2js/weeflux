const defaultState = {};
let currentState = defaultState;
const subscribers = [];
const reducers = [];
const actionQueue = [];
const middlewares = [];
const hocs = [];

function init(intialState) {
  if (currentState !== defaultState) {
    throw new Error('State is already changed');
  }
  currentState = intialState;
}

function connect(configure = {}, component) {
  if (!hocs.length) return component;
  return hocs.reduce((wrappedComponent, { props, wrapper }) => {
    let hasParam = false;
    const args = props.map(prop => {
      if (prop in configure) {
        hasParam = true;
        return configure[prop];
      }
      return undefined;
    });

    if (!hasParam) return wrappedComponent;
    return wrapper(...args)(wrappedComponent);
  }, component);
}

export function subscribe(subscriber, ...customArgs) {
  if (customArgs.length) {
    const originalSubscriber = subscriber;
    subscriber = function(...args) {
      originalSubscriber(...customArgs, ...args);
    };
  }
  subscribers.push(subscriber);
  let unsubscribed = false;
  return function() {
    if (unsubscribed) return;
    unsubscribed = true;
    const index = subscribers.indexOf(subscriber);
    if (index !== -1) {
      subscribers.splice(index, 1);
    }
  };
}

const callReducer = debounce(0, function() {
  let lastState = currentState;
  const queue = actionQueue.slice();
  actionQueue.length = 0;
  queue.forEach(reduceContext => {
    function next(context) {
      return reducers.reduce((state, reducer) => {
        const result = reducer(state, context);
        if (result === undefined) return state;
        return result;
      }, context.getState());
    }

    currentState = middlewares.reduce(
      (next, middleware) => (...args) => middleware(next)(...args),
      next
    )({
      ...reduceContext,
      getState
    });
  });

  if (lastState !== currentState) {
    subscribers.forEach(subscriber => subscriber(currentState));
  }
});

function getState() {
  return currentState;
}

function dispatch(action, payload) {
  actionQueue.push({ action, payload });
  callReducer();
}

function reducer(value) {
  reducers.push(value);
}

function debounce(interval, func) {
  let timerId;
  return function(...args) {
    clearTimeout(timerId);
    timerId = setTimeout(func, interval, ...args);
  };
}

export function clean() {
  subscribers.length = 0;
  reducers.length = 0;
  actionQueue.length = 0;
  middlewares.length = 0;
  hocs.length = 0;
  currentState = defaultState;
}

export function middleware(...values) {
  middlewares.push(...values);
}

export default function(...args) {
  if (!arguments.length) {
    //flux();
    return getState();
  }

  if (
    !(args[1] instanceof Function) &&
    (typeof args[0] === 'string' || typeof args[0] === 'number')
  ) {
    return dispatch(...args);
  }

  if (args.length === 1) {
    if (args[0] instanceof Function) {
      // flux(subscriber);
      return reducer(args[0]);
    }

    return init(args[0]);
  }
  return connect(...args);
}

export function hoc(props, wrapper) {
  hocs.push({ props: props.split(/\s+/), wrapper });
}