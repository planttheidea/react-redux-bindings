import { useContext } from 'react';
import { Context } from '../Context';

export function useReduxContext() {
  const context = useContext(Context);

  if (!context) {
    throw new Error(
      'Could not find `react-redux-bindings` context value; please ensure the component is wrapped in a <Provider>.'
    );
  }

  return context;
}
