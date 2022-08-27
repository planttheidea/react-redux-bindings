import { createContext, createElement, useMemo } from 'react';
import { ReactReduxContextValue } from 'react-redux';
import StoreSubscription from './utils/StoreSubscription';
import { useIsomorphicLayoutEffect } from './utils/hooks';

import type { Context as ReactContext, ReactNode } from 'react';
import type { Action as BaseAction, AnyAction, Store } from 'redux';

interface ProviderProps<Action extends BaseAction = AnyAction, State = any> {
  children: ReactNode | ReactNode[];
  serverState?: State;
  store: Store<State, Action>;
}

export type ContextType<State = any, Action extends BaseAction = AnyAction> = {
  getServerState: null | (() => State);
  id: number;
  store: Store<State, Action>;
  subscription: StoreSubscription;
};

export type ReactReduxContextType<
  State = any,
  Action extends BaseAction = AnyAction
> = ReactContext<ReactReduxContextValue<State, Action>>;

export const Context = createContext<ContextType>({
  getServerState: null,
  id: 0,
  store: null,
  subscription: null,
} as any);

export const ReactReduxContext = Context as unknown as ReactReduxContextType;

export const Consumer = Context.Consumer;

export function Provider<Action extends BaseAction = AnyAction, State = any>({
  children,
  serverState,
  store,
}: ProviderProps<Action, State>) {
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
