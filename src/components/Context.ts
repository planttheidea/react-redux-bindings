import {
  createContext,
  createElement,
  useEffect,
  useMemo,
  useLayoutEffect,
} from 'react';
import StoreSubscription from '../utils/StoreSubscription';

import type { ReactNode } from 'react';
import type { Action as BaseAction, AnyAction, Store } from 'redux';

interface ProviderProps<State = any, Action extends BaseAction = AnyAction> {
  children: ReactNode | ReactNode[];
  serverState?: State;
  store: Store<State, Action>;
}

const IS_CLIENT =
  typeof window !== 'undefined' &&
  typeof window.document !== 'undefined' &&
  typeof window.document.createElement !== 'undefined';

const useIsomorphicLayoutEffect = IS_CLIENT ? useLayoutEffect : useEffect;

export type ContextType<State = any, Action extends BaseAction = AnyAction> = {
  getServerState: null | (() => State);
  id: number;
  store: Store<State, Action>;
  subscription: StoreSubscription;
};

export const Context = createContext<ContextType>({
  getServerState: null,
  id: 0,
  store: null,
  subscription: null,
} as any);

export const Consumer = Context.Consumer;

export function Provider<Action extends BaseAction = AnyAction, State = any>({
  children,
  serverState,
  store,
}: ProviderProps<State, Action>) {
  const context = useMemo<ContextType<State, Action>>(
    () => ({
      getServerState: serverState ? () => serverState : null,
      id: 0,
      store,
      subscription: new StoreSubscription(store, null),
    }),
    [store]
  );

  const initialState = useMemo(() => store.getState(), [store]);

  useIsomorphicLayoutEffect(() => {
    const { subscription } = context;

    subscription.startListening();

    if (initialState !== store.getState()) {
      subscription.onStateUpdate();
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [context, initialState]);

  return createElement(Context.Provider, { value: context }, children);
}
