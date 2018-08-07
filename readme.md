# Weeflux

A state management based on flux architecture

```jsx
import React from "react";
import { render } from "react-dom";
import flux, { clean, middleware, subscribe, hoc } from "./weeflux";
import uuid from "uuid";
import produce from "immer";

clean();

// inject immer for state updating
const immerMiddleware = next => context => {
  return produce(context.getState(), draft =>
    next({
      ...context,
      getState() {
        return draft;
      }
    })
  );
};

// logging middleware
const logMiddleware = next => context => {
  const before = context.getState();
  console.log("before", context.action, before);
  const after = next(context);
  console.log("after", context.action, after);
  return after;
};

// install middlewares
middleware(immerMiddleware);
middleware(logMiddleware);

// define some actions
const actions = {
  add: "add",
  remove: "remove",
  textChanged: "text-changed"
};

// init state
flux({
  todos: {},
  ids: [],
  text: ""
});

// subscription
subscribe(console.log, "state-changed");

// reducer for todo actions
flux((state, { action, payload }) => {
  switch (action) {
    case actions.add:
      const id = uuid();
      state.todos[id] = { text: payload };
      state.ids.push(id);
      break;
    case actions.remove:
      delete state.todos[payload];
      state.ids.splice(state.ids.indexOf(payload), 1);
      break;
  }
});

// dispatch some actions
flux(actions.add, "Task 1");
flux(actions.add, "Task 2");
flux(actions.add, "Task 3");

// register hoc, this hoc will be activated if component options contains stateToProps prop
hoc("stateToProps", stateToProps => Component => {
  return class WrappedComponent extends React.Component {
    componentDidMount() {
      this.unsubscribe = subscribe(() => this.forceUpdate());
    }

    componentWillUnmount() {
      this.unsubscribe();
    }
    render() {
      const props = stateToProps(flux(), this.props);
      return <Component {...props} />;
    }
  };
});

// reducer for text
flux((state, { action, payload }) => {
  if (action === actions.textChanged) {
    state.text = payload;
  }
});

const stateToProps = state => ({ text: state.text });

const Input = flux({ stateToProps }, props => (
  <input
    type="text"
    value={props.text}
    onChange={e => flux(actions.textChanged, e.target.value)}
  />
));

const Output = flux({ stateToProps }, props => <div>{props.text}</div>);

const App = () => (
  <div>
    <Input />
    <Output />
  </div>
);

render(<App />, document.getElementById("root"));
```
