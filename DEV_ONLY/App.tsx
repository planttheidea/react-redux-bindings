import React, {
  ForwardedRef,
  memo,
  Ref,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import { unstable_batchedUpdates } from 'react-dom';
import { createStore } from 'redux';
import {
  Provider,
  createWithConnectedProps,
  setBatch,
  useActionCreator,
  useDispatch,
  useSelector,
  useStore,
} from '../src';

setBatch(unstable_batchedUpdates as any);

interface State {
  count: number;
}

const store = createStore<State, any, void, void>(
  (state = { count: 0 }, action) => {
    switch (action.type) {
      case 'INCREMENT':
        return { ...state, count: state.count + 1 };

      case 'DECREMENT':
        return { ...state, count: state.count - 1 };

      default:
        return state;
    }
  }
);

// @ts-expect-error - Surfacing store on `globalThis` for debugging
globalThis.store = store;

function DispatchOnly() {
  const dispatch = useDispatch();

  console.log({ dispatch });

  return null;
}

function StoreOnly() {
  const store = useStore();

  console.log({ store, state: store.getState() });

  return null;
}

interface SelectorOnlyProps {
  multiplier: number;
}

function SelectorOnly(props: SelectorOnlyProps) {
  const original = useSelector<State, number>(({ count }) => count);
  const multiplied = useSelector<State, number>(
    ({ count }) => count * props.multiplier
  );

  return (
    <div>
      <div>Original: {original}</div>
      <div>Multiplied: {multiplied}</div>
    </div>
  );
}

function Buttons() {
  const decrement = useActionCreator(() => ({ type: 'DECREMENT' }));
  const increment = useActionCreator(() => ({ type: 'INCREMENT' }));

  return (
    <div>
      <button onClick={increment} type="button">
        Increment
      </button>
      <button onClick={decrement} type="button">
        Decrement
      </button>
    </div>
  );
}

interface Props {
  limit: number;
  name: string;
  shouldUpdateWhenStateChanges?: boolean;
}

interface SelectedState {
  count: number;
  isEven: boolean;
  limited: number;
}

function RenderedChildren(props: Props & SelectedState) {
  const renders = useRef<number>(0);

  return (
    <>
      <div>Name: {props.name}</div>
      <div>Count: {props.count}</div>
      <div>Even: {String(props.isEven)}</div>
      <div>Limited: {props.limited}</div>
      <div>Renders: {++renders.current}</div>
    </>
  );
}

function Renderer(props: Props & SelectedState) {
  return (
    <div>
      <RenderedChildren {...props} />
    </div>
  );
}

const RendererWithRef = React.forwardRef(
  (props: Props & SelectedState, ref: ForwardedRef<HTMLDivElement>) => (
    <div ref={ref}>
      <RenderedChildren {...props} />
    </div>
  )
);

RendererWithRef.displayName = 'RendererWithRef';

function Component(props: Props) {
  const derivedState = useSelector<State, SelectedState>((state) => ({
    count: state.count,
    isEven: state.count % 2 === 0,
    limited: Math.min(state.count, props.limit),
  }));

  return <Renderer {...props} {...derivedState} />;
}

const RendererMemo = memo(Renderer);

function ComponentMemo(props: Props) {
  const derivedState = useSelector<State, SelectedState>((state) => ({
    count: state.count,
    isEven: state.count % 2 === 0,
    limited: Math.min(state.count, props.limit),
  }));

  return <RendererMemo {...props} {...derivedState} />;
}

const withConnectedProps = createWithConnectedProps<
  State,
  Props & { ref?: Ref<HTMLDivElement> | null },
  SelectedState
>({
  getSelectedState: (state, ownProps) => ({
    count: state.count,
    isEven: state.count % 2 === 0,
    limited: Math.min(state.count, ownProps.limit),
  }),
  forwardRef: true,
  includeOwnProps: true,
});

const ConnectedComponent = withConnectedProps(RendererWithRef);

function TemporarilyDisconnectedComponent(props: Required<Props>) {
  const derivedState = useSelector<State, SelectedState>(
    (state) => ({
      count: state.count,
      isEven: state.count % 2 === 0,
      limited: Math.min(state.count, props.limit),
    }),
    { shouldUpdateWhenStateChanges: props.shouldUpdateWhenStateChanges }
  );

  return <RendererMemo {...props} {...derivedState} />;
}

const TemporarilyDisconnectedConnectedComponent =
  withConnectedProps(RendererWithRef);

export default function App() {
  const [, forceUpdate] = useReducer((state) => !state, false);

  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate();
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const [shouldUpdateWhenStateChanges, setShouldListenForStateChanges] =
    useState(false);

  useEffect(() => {
    setTimeout(() => setShouldListenForStateChanges(true), 3000);
  }, []);

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log(ref.current);
  });

  const [limit, setLimit] = useState(5);

  useEffect(() => {
    setTimeout(() => setLimit(10), 10000);
  }, []);

  return (
    <Provider store={store}>
      <h1>App</h1>

      <Buttons />

      <br />

      <DispatchOnly />
      <StoreOnly />
      <SelectorOnly multiplier={2} />

      <br />

      <Component limit={limit} name="Component props only" />

      <br />

      <ComponentMemo limit={limit} name="Component props with React.memo()" />

      <br />

      <TemporarilyDisconnectedComponent
        limit={10}
        name="Component with disabled state updates for 3 seconds"
        shouldUpdateWhenStateChanges={shouldUpdateWhenStateChanges}
      />

      <br />

      <ConnectedComponent limit={limit} name="Connected Component" ref={ref} />

      <br />

      <TemporarilyDisconnectedConnectedComponent
        limit={10}
        name="Connected Component with disabled state updates for 3 seconds"
        shouldUpdateWhenStateChanges={shouldUpdateWhenStateChanges}
      />
    </Provider>
  );
}
