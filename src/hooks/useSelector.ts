import {
  MutableRefObject,
  useDebugValue,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { useSyncExternalStore } from 'use-sync-external-store/shim';
import { useReduxContext } from './useReduxContext';
import { isSameValueZeroEqual } from '../utils/equality';

import type { Store } from 'redux';
import type { IsEqual, Selector, SelectorOptions } from '../types';

type GetState<SelectedState> = () => SelectedState;

interface SelectorInstance<State, SelectedState> {
  /** "h"as a derived state value */
  h: boolean;
  /** "l"istening for state updates */
  l: boolean;
  /** "s"elector of state */
  s: Selector<State, SelectedState>;
  /** "v"alue of latest derived state */
  v: SelectedState;
}

function createMemoizedSelector<State, SelectedState>(
  instance: SelectorInstance<State, SelectedState>,
  store: Store<any>,
  getServerState: null | (() => State),
  isEqual: IsEqual<SelectedState>
): [GetState<SelectedState>, GetState<SelectedState> | undefined] {
  // Track the memoized state using closure variables that are local to this
  // memoized instance of a getSnapshot function. Intentionally not using a
  // useRef hook, because that state would be shared across all concurrent
  // copies of the hook/component.
  let hasMemo = false;
  let prevState: State;
  let prevDerivedState: SelectedState = {} as SelectedState;

  function memoizedSelector(nextState: State) {
    if (!instance.l) {
      return prevDerivedState;
    }

    if (!hasMemo) {
      // The first time the hook is called, there is no memoized result.
      hasMemo = true;
      prevState = nextState;

      const nextDerivedState = instance.s(nextState);

      // Even if the selector has changed, the currently rendered selection
      // may be equal to the new selection. We should attempt to reuse the
      // current value if possible, to preserve downstream memoizations.
      if (instance.h) {
        const currentStateProps = instance.v;

        if (isEqual(currentStateProps, nextDerivedState)) {
          return (prevDerivedState = currentStateProps);
        }
      }

      return (prevDerivedState = nextDerivedState);
    }

    // We may be able to reuse the previous invocation's result.
    if (isSameValueZeroEqual(prevState, nextState)) {
      // The snapshot is the same as last time. Reuse the previous selection.
      return prevDerivedState;
    }

    // The snapshot has changed, so we need to compute a new selection.
    const nextDerivedState = instance.s(nextState);

    // If a custom isEqual function is provided, use that to check if the data
    // has changed. If it hasn't, return the previous selection. That signals
    // to React that the selections are conceptually equal, and we can bail
    // out of rendering.
    if (isEqual(prevDerivedState, nextDerivedState)) {
      return prevDerivedState;
    }

    prevState = nextState;

    return (prevDerivedState = nextDerivedState);
  }

  const getState = () => memoizedSelector(store.getState());
  const getStateFromServer = getServerState
    ? () => memoizedSelector(getServerState())
    : undefined;

  return [getState, getStateFromServer];
}

function useInstance<State, SelectedState>(
  selector: Selector<State, SelectedState>
): MutableRefObject<SelectorInstance<State, SelectedState>> {
  const instance = useRef<SelectorInstance<State, SelectedState>>();
  if (instance.current) {
    instance.current.s = selector;
  } else {
    instance.current = {
      h: false,
      l: true,
      s: selector,
      v: null as unknown as SelectedState,
    };
  }

  return instance as MutableRefObject<SelectorInstance<State, SelectedState>>;
}

export function useSelector<State = any, SelectedState = any>(
  selector: Selector<State, SelectedState>,
  {
    isEqual = isSameValueZeroEqual,
    shouldUpdateWhenStateChanges = true,
  }: SelectorOptions<SelectedState> = {}
) {
  const instance = useInstance(selector);

  const { getServerState, store, subscription } = useReduxContext();

  const [getDerivedState, getServerDerivedState] = useMemo(
    () =>
      createMemoizedSelector<State, SelectedState>(
        instance.current!,
        store,
        getServerState,
        isEqual
      ),
    [store, getServerState, isEqual]
  );

  const selectedState = useSyncExternalStore(
    subscription.addSubscriber,
    getDerivedState,
    getServerDerivedState
  );

  useEffect(() => {
    const mutableInstance = instance.current!;

    mutableInstance.h = true;
    mutableInstance.l = shouldUpdateWhenStateChanges;
    mutableInstance.v = selectedState;
  }, [shouldUpdateWhenStateChanges, selectedState]);

  useDebugValue(selectedState);

  return selectedState;
}
