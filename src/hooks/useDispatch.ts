import { useReduxContext } from './useReduxContext';

export function useDispatch() {
  const context = useReduxContext();

  return context.store.dispatch;
}
