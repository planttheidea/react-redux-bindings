import { useReduxContext } from './useReduxContext';

export function useStore() {
  const context = useReduxContext();

  return context.store;
}
