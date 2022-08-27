import hoistNonReactStatics from 'hoist-non-react-statics';
import {
  createElement,
  forwardRef as forwardReactRef,
  memo,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { bindActionCreators } from 'redux';
import { useDispatch, useSelector } from './hooks';
import { isShallowEqual } from './utils/hooks';

import type { ComponentType } from 'react';
import type { AnyAction } from 'redux';
import type { IsEqual, Selector } from './types';

interface AnyProps {
  [key: string]: any;
  shouldUpdateWhenStateChanges?: boolean;
}

type SelectorWithOwnProps<State, OwnProps, SelectedState> = (
  state: State,
  ownProps: OwnProps
) => SelectedState;

interface AnyActionCreators {
  [key: string]: (...args: any[]) => AnyAction;
}
type AnyActionCreatorsDynamic<ActionCreators extends AnyActionCreators> =
  () => ActionDispatchers<ActionCreators>;
type AnyActionCreatorsDynamicWithProps<
  ActionCreators extends AnyActionCreators,
  OwnProps
> = (ownProps: OwnProps) => ActionDispatchers<ActionCreators>;
type ActionDispatchers<ActionCreators extends AnyActionCreators> = {
  [Key in keyof ActionCreators]: (
    ...args: Parameters<ActionCreators[Key]>
  ) => void;
};

type MergeProps<
  SelectedStateProps,
  ActionDispatcherProps extends ActionDispatchers<AnyActionCreators>,
  OwnProps,
  MergedProps
> = (
  props: OwnProps,
  actionDispatcherProps: ActionDispatcherProps | undefined,
  selectedStateProps: SelectedStateProps | undefined
) => MergedProps;

interface Options<
  State,
  SelectedStateProps,
  ActionCreators extends AnyActionCreators,
  OwnProps,
  MergedProps
> {
  actionCreators?: ActionCreators;
  areOwnPropsEqual?: IsEqual<OwnProps>;
  areMergedPropsEqual?: IsEqual<MergedProps>;
  areStatePropsEqual?: IsEqual<SelectedStateProps>;
  getSelectedState?:
    | Selector<State, SelectedStateProps>
    | SelectorWithOwnProps<State, OwnProps, SelectedStateProps>;
  mergeConnectedProps?: MergeProps<
    SelectedStateProps,
    ActionDispatchers<ActionCreators>,
    OwnProps,
    MergedProps
  >;
  forwardRef?: boolean;
  includeOwnProps?: boolean;
  shouldUpdateWhenStateChanges?: boolean;
}

const EMPTY_PROPS = {};

function defaultMergeProps(
  ownProps: any,
  actionCreators: any,
  selectedStateProps: any
) {
  return Object.assign({}, ownProps, actionCreators, selectedStateProps);
}

function useSelectedStatePropsNone<SelectedStateProps>() {
  return EMPTY_PROPS as SelectedStateProps;
}
function useSelectedStatePropsOnly<SelectedStateProps, State>(
  options: Options<any, any, any, any, any>
) {
  return useSelector(
    options.getSelectedState as Selector<State, SelectedStateProps>,
    options
  );
}
function useSelectedStatePropsWithOwnProps<SelectedStateProps, State, OwnProps>(
  options: Options<any, any, any, any, any>,
  ownProps: OwnProps
) {
  const composedSelector: Selector<State, SelectedStateProps> = (state) =>
    options.getSelectedState!(state, ownProps);

  return useSelector(composedSelector, options);
}
function getUseSelectedStateProps(options: Options<any, any, any, any, any>) {
  if (options.getSelectedState) {
    return options.includeOwnProps
      ? useSelectedStatePropsWithOwnProps
      : useSelectedStatePropsOnly;
  }

  return useSelectedStatePropsNone;
}

function useActionCreatorsNone<ActionCreators extends AnyActionCreators>() {
  return EMPTY_PROPS as ActionDispatchers<ActionCreators>;
}
function useActionCreatorsDynamic<
  ActionCreators extends AnyActionCreators,
  _OwnProps,
  ActionCreatorsDynamic extends AnyActionCreatorsDynamic<ActionCreators>
>(actionCreators: ActionCreatorsDynamic): ActionDispatchers<ActionCreators> {
  const dispatch = useDispatch();
  const boundActionCreators = useMemo(
    () => bindActionCreators(actionCreators(), dispatch) as any,
    [dispatch]
  );

  return boundActionCreators;
}
function useActionCreatorsDynamicWithProps<
  ActionCreators extends AnyActionCreators,
  OwnProps,
  ActionCreatorsDynamicWithProps extends AnyActionCreatorsDynamicWithProps<
    ActionCreators,
    OwnProps
  >
>(
  actionCreators: ActionCreatorsDynamicWithProps,
  ownProps: OwnProps
): ActionDispatchers<ActionCreators> {
  const dispatch = useDispatch();
  const boundActionCreators = useMemo(
    () => bindActionCreators(actionCreators(ownProps), dispatch) as any,
    [ownProps, dispatch]
  );

  return boundActionCreators;
}
function useActionCreatorsStatic<ActionCreators extends AnyActionCreators>(
  actionCreators: ActionCreators
): ActionDispatchers<ActionCreators> {
  const dispatch = useDispatch();
  const boundActionCreators = useMemo(
    () => bindActionCreators(actionCreators as any, dispatch),
    [actionCreators, dispatch]
  );

  return boundActionCreators;
}
function getUseActionCreators(options: Options<any, any, any, any, any>) {
  const { actionCreators, includeOwnProps } = options;

  if (actionCreators) {
    if (typeof actionCreators === 'object') {
      return useActionCreatorsStatic;
    }

    if (typeof actionCreators === 'function') {
      return includeOwnProps
        ? useActionCreatorsDynamicWithProps
        : useActionCreatorsDynamic;
    }
  }

  return useActionCreatorsNone;
}

function useMergeConnectedProps<
  SelectedStateProps,
  ActionDispatcherProps extends ActionDispatchers<AnyActionCreators>,
  OwnProps,
  MergedProps
>(
  props: OwnProps,
  actionDispatcherProps: ActionDispatcherProps | undefined,
  selectedStateProps: SelectedStateProps | undefined,
  mergeProps: MergeProps<
    SelectedStateProps,
    ActionDispatcherProps,
    OwnProps,
    MergedProps
  >,
  isEqual: IsEqual<MergedProps>
) {
  const prevMergedProps = useRef<MergedProps>(EMPTY_PROPS as MergedProps);
  const nextMergedProps = mergeProps(
    props,
    actionDispatcherProps,
    selectedStateProps
  );
  const mergedConnectedProps = isEqual(prevMergedProps.current, nextMergedProps)
    ? prevMergedProps.current
    : nextMergedProps;

  useEffect(() => {
    prevMergedProps.current = mergedConnectedProps;
  }, [mergedConnectedProps]);

  return mergedConnectedProps;
}

function createUseConnectedProps<
  State,
  OwnProps extends AnyProps,
  SelectedStateProps extends AnyProps,
  ActionCreators extends AnyActionCreators,
  MergedProps extends OwnProps &
    ActionDispatchers<ActionCreators> &
    SelectedStateProps
>({
  actionCreators,
  areMergedPropsEqual = isShallowEqual,
  areStatePropsEqual = isShallowEqual,
  getSelectedState,
  mergeConnectedProps = defaultMergeProps,
  includeOwnProps = false,
  shouldUpdateWhenStateChanges = !!getSelectedState,
}: Options<State, SelectedStateProps, ActionCreators, OwnProps, MergedProps>) {
  const options = {
    actionCreators,
    areMergedPropsEqual,
    areStatePropsEqual,
    getSelectedState,
    mergeConnectedProps,
    includeOwnProps,
    shouldUpdateWhenStateChanges,
  };
  const useSelectedState = getUseSelectedStateProps(options);
  const useActionCreators: any = getUseActionCreators(options);

  return function useConnectedProps(props: OwnProps) {
    const shouldUpdate =
      shouldUpdateWhenStateChanges &&
      props.shouldUpdateWhenStateChanges !== false;

    const normalizedOptions = useMemo(
      () =>
        Object.assign({}, options, {
          shouldUpdateWhenStateChanges: shouldUpdate,
        }),
      [shouldUpdate]
    );

    const [ref, ownProps] = useMemo<[any, OwnProps]>(() => {
      const { __internalRef = null, ...ownProps } = props;

      return [__internalRef, ownProps as OwnProps];
    }, [props]);

    const selectedStateProps = useSelectedState<
      SelectedStateProps,
      State,
      OwnProps
    >(normalizedOptions, ownProps);
    const actionCreatorProps: ActionDispatchers<ActionCreators> =
      useActionCreators(actionCreators!, ownProps);
    const mergedConnectedProps = useMergeConnectedProps<
      SelectedStateProps,
      ActionDispatchers<ActionCreators>,
      OwnProps,
      MergedProps
    >(
      ownProps,
      actionCreatorProps,
      selectedStateProps,
      mergeConnectedProps,
      areMergedPropsEqual
    );

    return [ref, mergedConnectedProps];
  };
}

export function createWithConnectedProps<
  State,
  OwnProps extends AnyProps,
  SelectedStateProps extends AnyProps,
  ActionCreators extends AnyActionCreators = {},
  MergedProps extends OwnProps &
    ActionDispatchers<ActionCreators> &
    SelectedStateProps = OwnProps &
    ActionDispatchers<ActionCreators> &
    SelectedStateProps
>(
  options: Options<
    State,
    SelectedStateProps,
    ActionCreators,
    OwnProps,
    MergedProps
  > = {} as Options<
    State,
    SelectedStateProps,
    ActionCreators,
    OwnProps,
    MergedProps
  >
) {
  const { areOwnPropsEqual = isShallowEqual } = options;
  const useConnectedProps = createUseConnectedProps(options);

  return function withConnectedProps(
    Component: ComponentType<MergedProps>
  ): ComponentType<OwnProps> {
    const Memoized = memo(
      Component,
      areOwnPropsEqual
    ) as unknown as ComponentType<MergedProps>;

    const Connected: any = function Connected(props: OwnProps) {
      const [ref, connectedProps] = useConnectedProps(props);

      return useMemo(
        () =>
          createElement(Memoized, Object.assign({}, connectedProps, { ref })),
        [ref, connectedProps]
      );
    };

    Connected.displayName = `Connected(${
      Component.displayName || Component.name || 'Anonymous'
    })`;

    if (options.forwardRef) {
      const ForwardedConnected = forwardReactRef(
        (props: OwnProps, ref: any) => {
          return useMemo(
            () =>
              createElement(
                Connected,
                Object.assign({}, props, { __internalRef: ref })
              ),
            [props, ref]
          );
        }
      ) as unknown as ComponentType<OwnProps>;

      ForwardedConnected.displayName = Connected.displayName;

      return hoistNonReactStatics(ForwardedConnected, Component);
    }

    return hoistNonReactStatics(Connected, Component);
  };
}
