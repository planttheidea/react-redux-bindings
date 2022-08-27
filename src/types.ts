export type AnyActionCreator = (...args: any[]) => any;
export type AnyActionDispatcher<Args extends unknown[]> = (
  ...args: Args
) => void;

export type IsEqual<Props> = (prevProps: Props, nextProps: Props) => boolean;

export type Selector<State, SelectedState> = (state: State) => SelectedState;
export type SelectorWithOwnProps<State, OwnProps, SelectedState> = (
  state: State,
  ownProps: OwnProps
) => SelectedState;

export interface SelectorOptions<SelectedState> {
  isEqual?: IsEqual<SelectedState>;
  shouldUpdateWhenStateChanges?: boolean;
}
