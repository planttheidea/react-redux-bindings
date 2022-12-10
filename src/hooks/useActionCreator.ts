import { useMemo, useRef } from 'react';
import { useDispatch } from './useDispatch';

import { AnyActionCreator, AnyActionDispatcher } from '../types';

export function useActionCreator<ActionCreator extends AnyActionCreator>(
  actionCreator: ActionCreator
): AnyActionDispatcher<Parameters<ActionCreator>> {
  const dispatch = useDispatch();

  const actionCreatorRef = useRef(actionCreator);
  actionCreatorRef.current = actionCreator;

  return useMemo(
    () =>
      (...args: Parameters<ActionCreator>) => {
        dispatch(actionCreatorRef.current(...args));
      },
    [dispatch]
  );
}
